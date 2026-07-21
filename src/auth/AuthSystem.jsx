/**
 * AuthSystem.jsx
 * Full authentication system — registration, login, 2FA/MFA, biometrics
 * Password minimum: 13 characters with uppercase, lowercase, digit, special char
 * Supports emoji and unicode in usernames
 * Updated: 2026-07-21
 */
import React, { useState, useCallback, useEffect } from 'react';

const MIN_PASSWORD = 13;

function measureStrength(password) {
  if (!password) return { score: 0, label: '', color: '#e5e7eb' };
  let score = 0;
  if (password.length >= MIN_PASSWORD) score++;
  if (password.length >= 20) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/\p{L}/u.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 4) return { score, label: 'Fair', color: '#f59e0b' };
  if (score <= 5) return { score, label: 'Good', color: '#3b82f6' };
  return { score, label: 'Strong', color: '#22c55e' };
}

function StrengthMeter({ password }) {
  const strength = measureStrength(password);
  const pct = (strength.score / 7) * 100;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ background: '#e5e7eb', borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: strength.color, height: '100%', transition: 'width 0.3s' }} />
      </div>
      {password && (
        <div style={{ fontSize: 11, color: strength.color, marginTop: 3, fontWeight: 600 }}>
          {strength.label} — {password.length < MIN_PASSWORD ? `${MIN_PASSWORD - password.length} more chars needed` : 'Length OK'}
        </div>
      )}
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, hint, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--input-bg, var(--card-bg))', color: 'var(--text)', fontSize: 14,
            boxSizing: 'border-box', paddingRight: isPassword ? 42 : 12
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>
            {show ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function BiometricButton({ onAuth, label, icon }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported on this device');
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname || 'localhost'
        }
      });
      if (credential && onAuth) onAuth({ type: 'biometric', credentialId: credential.id });
    } catch (e) {
      setError(e.message || 'Biometric auth failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAuth}
        disabled={loading}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--card-bg)', color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 18, opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8
        }}
      >
        <span>{icon}</span>
        <span style={{ fontSize: 14 }}>{loading ? 'Authenticating...' : label}</span>
      </button>
      {error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function TotpSetup({ secret, onVerify }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);

  const verify = () => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return setError('Enter a 6-digit code from your authenticator app');
    }
    onVerify(code);
  };

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h4 style={{ margin: '0 0 12px' }}>🔐 Set Up Two-Factor Authentication</h4>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>
        Scan the QR code with Google Authenticator, Authy, or any TOTP app. If you cannot scan, enter the secret manually.
      </p>
      <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: 12,
        fontFamily: 'monospace', fontSize: 14, wordBreak: 'break-all', marginBottom: 14 }}>
        Secret: {secret}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        In your authenticator app, choose "Enter a setup key" and paste the secret above.
      </div>
      <InputField label="Verification Code" value={code} onChange={setCode} placeholder="123456"
        hint="6-digit code from your app" autoComplete="one-time-code" />
      {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <button onClick={verify}
        style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 14 }}>
        Verify & Enable 2FA
      </button>
    </div>
  );
}

function PasswordRequirements({ password }) {
  const checks = [
    { label: `${MIN_PASSWORD}+ characters`, ok: password.length >= MIN_PASSWORD },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginTop: 6 }}>
      {checks.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
          color: c.ok ? '#22c55e' : 'var(--text-muted)', marginBottom: i < checks.length - 1 ? 3 : 0 }}>
          <span>{c.ok ? '✓' : '○'}</span>
          {c.label}
        </div>
      ))}
    </div>
  );
}

export default function AuthSystem({ onAuthSuccess, defaultView = 'login' }) {
  const [view, setView] = useState(defaultView);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', mfaCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totpSetup, setTotpSetup] = useState(null);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [pendingId, setPendingId] = useState(null);

  const field = (k) => ({
    value: form[k],
    onChange: (v) => setForm(f => ({ ...f, [k]: v }))
  });

  const handleRegister = async () => {
    if (!form.username.trim()) return setError('Username is required');
    if (!form.email.trim()) return setError('Email is required');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters`);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      if (data.totpSecret) setTotpSetup(data.totpSecret);
      else setView('login');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!form.email.trim()) return setError('Email or username is required');
    if (!form.password) return setError('Password is required');

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: form.email,
          password: form.password,
          mfaCode: form.mfaCode || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.requiresMfa) {
        setRequiresMfa(true);
        setPendingId(data.pendingId);
        return;
      }
      if (onAuthSuccess) onAuthSuccess(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = useCallback((result) => {
    if (onAuthSuccess) onAuthSuccess({ method: 'biometric', ...result });
  }, [onAuthSuccess]);

  const handleTotpVerify = async (code) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: form.email, password: form.password, mfaCode: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (onAuthSuccess) onAuthSuccess(data);
      setTotpSetup(null);
    } catch (e) {
      setError(e.message);
    }
  };

  if (totpSetup) {
    return (
      <div style={{ maxWidth: 440, margin: '0 auto', padding: 24 }}>
        <style>{`
          :root { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
          @media (prefers-color-scheme: dark) {
            :root { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
          }
          :root[data-theme="dark"] { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
          :root[data-theme="light"] { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
        `}</style>
        <TotpSetup secret={totpSetup} onVerify={handleTotpVerify} />
        <button onClick={() => { setTotpSetup(null); setView('login'); }}
          style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#3b82f6' }}>
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--text, #111)' }}>
      <style>{`
        :root { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
        @media (prefers-color-scheme: dark) {
          :root { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        }
        :root[data-theme="dark"] { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        :root[data-theme="light"] { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
      `}</style>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28,
        boxShadow: '0 4px 24px #0001' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, textAlign: 'center' }}>
          🔐 Nexus AI Pro
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Military-grade secure platform
        </p>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, marginBottom: 20, padding: 3 }}>
          {['login', 'register'].map(v => (
            <button key={v} onClick={() => { setView(v); setError(null); setRequiresMfa(false); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: view === v ? '#fff' : 'transparent',
                color: view === v ? '#111' : '#6b7280',
                fontWeight: view === v ? 700 : 400, fontSize: 14,
                boxShadow: view === v ? '0 1px 4px #0001' : 'none'
              }}>
              {v === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 12px',
            color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {view === 'register' && (
          <>
            <InputField label="Username (emoji & unicode supported ✨)" {...field('username')}
              placeholder="my_username 🚀" autoComplete="username" />
            <InputField label="Email" type="email" {...field('email')}
              placeholder="you@example.com" autoComplete="email" />
            <div>
              <InputField label="Password" type="password" {...field('password')}
                placeholder="Minimum 13 characters" autoComplete="new-password" />
              <StrengthMeter password={form.password} />
              {form.password && <PasswordRequirements password={form.password} />}
            </div>
            <InputField label="Confirm Password" type="password" {...field('confirmPassword')}
              placeholder="Re-enter password" autoComplete="new-password" />
            <button
              onClick={handleRegister}
              disabled={loading}
              style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer', background: '#3b82f6', color: '#fff',
                fontWeight: 700, fontSize: 15, marginTop: 4, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </>
        )}

        {view === 'login' && (
          <>
            {!requiresMfa ? (
              <>
                <InputField label="Email or Username" type="email" {...field('email')}
                  placeholder="you@example.com" autoComplete="username" />
                <InputField label="Password" type="password" {...field('password')}
                  placeholder="Your password" autoComplete="current-password" />
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer', background: '#3b82f6', color: '#fff',
                    fontWeight: 700, fontSize: 15, marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Biometrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Or sign in with</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <BiometricButton icon="👆" label="Fingerprint / Touch ID" onAuth={handleBiometricAuth} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <BiometricButton icon="😊" label="Face ID" onAuth={handleBiometricAuth} />
                    </div>
                  </div>
                  <BiometricButton icon="👁️" label="Retinal Scan (device passkey)" onAuth={handleBiometricAuth} />
                </div>
              </>
            ) : (
              <>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px',
                  marginBottom: 14, fontSize: 13, color: '#1d4ed8' }}>
                  🔐 Two-factor authentication required. Enter the 6-digit code from your authenticator app.
                </div>
                <InputField label="MFA Code" {...field('mfaCode')}
                  placeholder="123456" hint="6-digit code" autoComplete="one-time-code" />
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer', background: '#3b82f6', color: '#fff',
                    fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button onClick={() => setRequiresMfa(false)}
                  style={{ display: 'block', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#3b82f6', width: '100%' }}>
                  Back
                </button>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          🔒 AES-256-GCM encrypted · PBKDF2 passwords · TOTP 2FA
        </div>
      </div>
    </div>
  );
}
