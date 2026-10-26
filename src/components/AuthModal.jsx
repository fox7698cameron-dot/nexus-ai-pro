// src/components/AuthModal.jsx
// Updated: 2026-10-26 — Full auth flow: login, register, biometrics, 2FA/MFA, password strength

import React, { useState, useCallback, useEffect } from 'react';
import { t } from '../i18n/index.js';

// Password strength scorer (0-4)
function scorePassword(pw) {
  let score = 0;
  if (!pw) return 0;
  if (pw.length >= 13) score++;
  if (pw.length >= 20) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, Math.floor(score * 4 / 6));
}

function getStrengthLabel(score) {
  return [t('veryWeak','Very Weak'), t('weak','Weak'), t('fair','Fair'), t('strong','Strong'), t('veryStrong','Very Strong')][score] || '';
}

function getStrengthColor(score) {
  return ['#ef4444','#f97316','#f59e0b','#22c55e','#10b981'][score];
}

function validatePassword(pw) {
  return {
    length: pw.length >= 13,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

const PRESET_AVATARS = ['🦊','🐺','🦁','🐯','🦅','🐉','🌟','⚡','🔥','🌊','🎯','💎'];

const ROLE_OPTIONS = [
  { value: 'user', label: 'User', desc: 'Standard access' },
  { value: 'developer', label: 'Developer', desc: 'Developer tools & API access' },
];

// WebAuthn biometric registration
async function registerBiometric(username) {
  if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Nexus AI Pro', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(username),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60000,
    },
  });
  return credential;
}

// WebAuthn biometric login
async function authenticateWithBiometric() {
  if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      userVerification: 'required',
      timeout: 60000,
    },
  });
  return assertion;
}

export default function AuthModal({ onSuccess, onClose, initialView = 'login' }) {
  const [view, setView] = useState(initialView); // login | register | forgot | 2fa | biometric-setup
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', displayName: '',
    phone: '', language: 'en', role: 'user', avatar: '🦊',
    rememberMe: false, totpCode: '', backupCode: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pwValidation, setPwValidation] = useState({});
  const [pwScore, setPwScore] = useState(0);
  const [backupCodes, setBackupCodes] = useState([]);
  const [qrUri, setQrUri] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');

  useEffect(() => {
    window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(ok => setBiometricAvailable(ok))
      .catch(() => setBiometricAvailable(false));
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: val }));
    if (name === 'password') {
      setPwValidation(validatePassword(val));
      setPwScore(scorePassword(val));
    }
    setError('');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailOrUsername: form.email || form.username,
          password: form.password,
          rememberMe: form.rememberMe,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('error','Login failed'));
      if (data.requires2fa) { setView('2fa'); setLoading(false); return; }
      if (form.rememberMe) {
        try { localStorage.setItem('nexus:remember', JSON.stringify({ user: data.user?.username })); } catch (_) {}
      }
      setSuccess(t('success','Logged in!'));
      setTimeout(() => onSuccess?.(data), 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const v = validatePassword(form.password);
    if (!Object.values(v).every(Boolean)) {
      setError('Password does not meet requirements'); setLoading(false); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match'); setLoading(false); return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          displayName: form.displayName || form.username,
          role: form.role,
          language: form.language,
          avatar: selectedAvatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('error','Registration failed'));
      setSuccess('Account created! Please log in.');
      setTimeout(() => setView('login'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess('Reset email sent. Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: form.totpCode, backupCode: form.backupCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setSuccess('2FA verified!');
      setTimeout(() => onSuccess?.(data), 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const assertion = await authenticateWithBiometric();
      const res = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: assertion.id,
          rawId: Array.from(new Uint8Array(assertion.rawId)),
          response: {
            clientDataJSON: Array.from(new Uint8Array(assertion.response.clientDataJSON)),
            authenticatorData: Array.from(new Uint8Array(assertion.response.authenticatorData)),
            signature: Array.from(new Uint8Array(assertion.response.signature)),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Biometric authentication failed');
      setSuccess('Biometric verified!');
      setTimeout(() => onSuccess?.(data), 600);
    } catch (err) {
      setError(err.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupBiometric = async () => {
    setLoading(true);
    setError('');
    try {
      const credential = await registerBiometric(form.username || form.email);
      const res = await fetch('/api/auth/biometric/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          response: {
            clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
            attestationObject: Array.from(new Uint8Array(credential.response.attestationObject)),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Biometric registration failed');
      setSuccess('Biometric registered successfully!');
    } catch (err) {
      setError(err.message || 'Biometric setup failed — may not be supported on this device');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setQrUri(data.qrUri || '');
      setBackupCodes(data.backupCodes || []);
      setView('2fa-setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = `/api/auth/social/${provider}`;
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text).then(() => setSuccess('Backup codes copied!'));
  };

  const s = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '16px',
    },
    modal: {
      background: 'var(--bg-2, #1a1b2e)', border: '1px solid var(--border, #2a2b3d)',
      borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px',
      maxHeight: '90vh', overflowY: 'auto', color: 'var(--text-1, #f0f0f0)',
      position: 'relative',
    },
    title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-1, #f0f0f0)' },
    sub: { fontSize: '0.875rem', color: 'var(--text-3, #888)', marginBottom: '24px' },
    field: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-2, #ccc)', fontWeight: 500 },
    input: {
      width: '100%', padding: '10px 14px', background: 'var(--bg-3, #0f1020)',
      border: '1px solid var(--border, #2a2b3d)', borderRadius: '8px',
      color: 'var(--text-1, #f0f0f0)', fontSize: '1rem', outline: 'none',
      boxSizing: 'border-box',
    },
    pwWrap: { position: 'relative' },
    pwToggle: {
      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3, #888)',
      fontSize: '0.85rem',
    },
    btn: {
      width: '100%', padding: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600,
      fontSize: '1rem', cursor: 'pointer', marginTop: '8px',
    },
    btnOutline: {
      width: '100%', padding: '10px', background: 'transparent',
      border: '1px solid var(--border, #2a2b3d)', borderRadius: '8px', color: 'var(--text-1, #f0f0f0)',
      fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', marginTop: '6px',
    },
    btnSocial: {
      flex: 1, padding: '10px 8px', background: 'var(--bg-3, #0f1020)',
      border: '1px solid var(--border, #2a2b3d)', borderRadius: '8px',
      color: 'var(--text-1, #f0f0f0)', cursor: 'pointer', fontSize: '0.85rem',
    },
    error: {
      padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
      borderRadius: '8px', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '16px',
    },
    successMsg: {
      padding: '10px 14px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
      borderRadius: '8px', color: '#86efac', fontSize: '0.875rem', marginBottom: '16px',
    },
    link: { color: '#818cf8', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.875rem', padding: 0 },
    divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0', color: 'var(--text-3,#888)', fontSize: '0.8rem' },
    divLine: { flex: 1, height: '1px', background: 'var(--border, #2a2b3d)' },
    closeBtn: {
      position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none',
      color: 'var(--text-3, #888)', cursor: 'pointer', fontSize: '1.2rem',
    },
  };

  const StrengthBar = () => {
    if (!form.password) return null;
    const v = pwValidation;
    const checks = [
      { label: t('minChars','13+ characters'), ok: v.length },
      { label: t('requiresUpper','Uppercase letter'), ok: v.upper },
      { label: t('requiresLower','Lowercase letter'), ok: v.lower },
      { label: t('requiresNumber','Number'), ok: v.number },
      { label: t('requiresSpecial','Special character'), ok: v.special },
    ];
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: i <= pwScore ? getStrengthColor(pwScore) : 'var(--bg-4,#222)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        <div style={{ fontSize: '0.75rem', color: getStrengthColor(pwScore), fontWeight: 600, marginBottom: '8px' }}>
          {getStrengthLabel(pwScore)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize: '0.72rem', color: c.ok ? '#86efac' : 'var(--text-3,#888)' }}>
              {c.ok ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderLogin = () => (
    <form onSubmit={handleLogin}>
      <h2 style={s.title}>{t('signIn','Sign In')}</h2>
      <p style={s.sub}>Welcome back to Nexus AI Pro</p>
      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.successMsg}>{success}</div>}
      <div style={s.field}>
        <label style={s.label}>{t('email','Email or Username')}</label>
        <input style={s.input} name="email" value={form.email} onChange={handleChange}
          type="text" autoComplete="username email" required />
      </div>
      <div style={s.field}>
        <label style={s.label}>{t('password','Password')}</label>
        <div style={s.pwWrap}>
          <input style={{ ...s.input, paddingRight: '48px' }} name="password" value={form.password}
            onChange={handleChange} type={showPw ? 'text' : 'password'} autoComplete="current-password" required />
          <button type="button" style={s.pwToggle} onClick={() => setShowPw(p => !p)} aria-label="Toggle password">
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input type="checkbox" name="rememberMe" checked={form.rememberMe} onChange={handleChange} />
          {t('rememberMe','Remember me')}
        </label>
        <button type="button" style={s.link} onClick={() => setView('forgot')}>
          {t('forgotPassword','Forgot Password?')}
        </button>
      </div>
      <button type="submit" style={s.btn} disabled={loading}>
        {loading ? t('loading','Loading...') : t('signIn','Sign In')}
      </button>
      {biometricAvailable && (
        <button type="button" style={{ ...s.btnOutline, marginTop: '10px' }} onClick={handleBiometricLogin} disabled={loading}>
          🔒 {t('biometricLogin','Biometric Login')} (Face ID / Touch ID / Fingerprint)
        </button>
      )}
      <div style={s.divider}><div style={s.divLine} />{t('orContinueWith','Or continue with')}<div style={s.divLine} /></div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" style={s.btnSocial} onClick={() => handleSocialLogin('google')}>🔵 Google</button>
        <button type="button" style={s.btnSocial} onClick={() => handleSocialLogin('github')}>⬛ GitHub</button>
        <button type="button" style={s.btnSocial} onClick={() => handleSocialLogin('apple')}>🍎 Apple</button>
      </div>
      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: 'var(--text-3,#888)' }}>
        No account?{' '}
        <button type="button" style={s.link} onClick={() => setView('register')}>
          {t('register','Register')}
        </button>
      </p>
    </form>
  );

  const renderRegister = () => (
    <form onSubmit={handleRegister}>
      <h2 style={s.title}>{t('signUp','Create Account')}</h2>
      <p style={s.sub}>Join Nexus AI Pro</p>
      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.successMsg}>{success}</div>}
      <div style={s.field}>
        <label style={s.label}>{t('username','Username')} (emojis & special chars allowed)</label>
        <input style={s.input} name="username" value={form.username} onChange={handleChange}
          type="text" minLength={3} pattern="[\w\W]+" autoComplete="username" required />
      </div>
      <div style={s.field}>
        <label style={s.label}>{t('displayName','Display Name')}</label>
        <input style={s.input} name="displayName" value={form.displayName} onChange={handleChange}
          type="text" autoComplete="name" />
      </div>
      <div style={s.field}>
        <label style={s.label}>{t('email','Email')}</label>
        <input style={s.input} name="email" value={form.email} onChange={handleChange}
          type="email" autoComplete="email" required />
      </div>
      <div style={s.field}>
        <label style={s.label}>{t('password','Password')} (13+ characters required)</label>
        <div style={s.pwWrap}>
          <input style={{ ...s.input, paddingRight: '48px' }} name="password" value={form.password}
            onChange={handleChange} type={showPw ? 'text' : 'password'} autoComplete="new-password" required minLength={13} />
          <button type="button" style={s.pwToggle} onClick={() => setShowPw(p => !p)}>
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>
        <StrengthBar />
      </div>
      <div style={s.field}>
        <label style={s.label}>{t('confirmPassword','Confirm Password')}</label>
        <div style={s.pwWrap}>
          <input style={{ ...s.input, paddingRight: '48px' }} name="confirmPassword" value={form.confirmPassword}
            onChange={handleChange} type={showConfirmPw ? 'text' : 'password'} autoComplete="new-password" required minLength={13} />
          <button type="button" style={s.pwToggle} onClick={() => setShowConfirmPw(p => !p)}>
            {showConfirmPw ? '🙈' : '👁️'}
          </button>
        </div>
        {form.confirmPassword && form.password !== form.confirmPassword && (
          <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '4px' }}>Passwords do not match</div>
        )}
      </div>
      <div style={s.field}>
        <label style={s.label}>Role</label>
        <select style={s.input} name="role" value={form.role} onChange={handleChange}>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
        </select>
      </div>
      <div style={s.field}>
        <label style={s.label}>{t('language','Language')}</label>
        <select style={s.input} name="language" value={form.language} onChange={handleChange}>
          {[{code:'en',nativeName:'English'},{code:'es',nativeName:'Español'},{code:'fr',nativeName:'Français'},
            {code:'de',nativeName:'Deutsch'},{code:'ja',nativeName:'日本語'},{code:'zh',nativeName:'简体中文'},
            {code:'ko',nativeName:'한국어'},{code:'pt',nativeName:'Português'},{code:'ar',nativeName:'العربية'},
            {code:'ru',nativeName:'Русский'},{code:'it',nativeName:'Italiano'},{code:'hi',nativeName:'हिन्दी'}
          ].map(l => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
        </select>
      </div>
      <div style={s.field}>
        <label style={s.label}>Avatar</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {PRESET_AVATARS.map(a => (
            <button key={a} type="button"
              style={{
                width: '40px', height: '40px', fontSize: '1.4rem', cursor: 'pointer',
                borderRadius: '8px', border: selectedAvatar === a ? '2px solid #6366f1' : '2px solid transparent',
                background: 'var(--bg-3,#0f1020)',
              }}
              onClick={() => setSelectedAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" style={s.btn} disabled={loading || !Object.values(pwValidation).every(Boolean)}>
        {loading ? t('loading','Creating account...') : t('signUp','Create Account')}
      </button>
      <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.875rem', color: 'var(--text-3,#888)' }}>
        Already have an account?{' '}
        <button type="button" style={s.link} onClick={() => setView('login')}>{t('login','Login')}</button>
      </p>
    </form>
  );

  const renderForgot = () => (
    <form onSubmit={handleForgotPassword}>
      <h2 style={s.title}>{t('forgotPassword','Forgot Password')}</h2>
      <p style={s.sub}>Enter your email to receive a reset link</p>
      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.successMsg}>{success}</div>}
      <div style={s.field}>
        <label style={s.label}>{t('email','Email')}</label>
        <input style={s.input} name="email" value={form.email} onChange={handleChange} type="email" required />
      </div>
      <button type="submit" style={s.btn} disabled={loading}>
        {loading ? t('loading','Sending...') : t('submit','Send Reset Link')}
      </button>
      <button type="button" style={s.btnOutline} onClick={() => setView('login')}>{t('back','Back to Login')}</button>
    </form>
  );

  const render2FA = () => (
    <form onSubmit={handle2FA}>
      <h2 style={s.title}>{t('twoFactorAuth','Two-Factor Authentication')}</h2>
      <p style={s.sub}>Enter the 6-digit code from your authenticator app, or a backup code</p>
      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.successMsg}>{success}</div>}
      <div style={s.field}>
        <label style={s.label}>{t('enterCode','Authenticator Code')}</label>
        <input style={{ ...s.input, textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.5rem' }}
          name="totpCode" value={form.totpCode} onChange={handleChange}
          type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="000000" />
      </div>
      <div style={{ ...s.field, marginTop: '16px' }}>
        <label style={s.label}>{t('backupCodes','Or enter a backup code')}</label>
        <input style={s.input} name="backupCode" value={form.backupCode} onChange={handleChange}
          type="text" placeholder="xxxx-xxxx-xxxx" />
      </div>
      <button type="submit" style={s.btn} disabled={loading}>
        {loading ? t('loading','Verifying...') : t('confirm','Verify')}
      </button>
    </form>
  );

  const render2FASetup = () => (
    <div>
      <h2 style={s.title}>Set Up 2FA</h2>
      <p style={s.sub}>Scan this QR code with your authenticator app</p>
      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.successMsg}>{success}</div>}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        {qrUri ? (
          <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUri)}&size=200x200`}
            alt="2FA QR Code" style={{ borderRadius: '8px', border: '4px solid white' }} />
        ) : (
          <div style={{ padding: '60px 20px', background: 'var(--bg-3,#0f1020)', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-3,#888)' }}>Scan QR code in your authenticator app</p>
          </div>
        )}
      </div>
      {backupCodes.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>{t('backupCodes','Backup Codes')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
            {backupCodes.map((code, i) => (
              <code key={i} style={{
                padding: '6px 10px', background: 'var(--bg-3,#0f1020)',
                borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace',
                color: 'var(--text-1,#f0f0f0)',
              }}>{code}</code>
            ))}
          </div>
          <button type="button" style={s.btnOutline} onClick={copyBackupCodes}>
            📋 {t('copyAll','Copy All Backup Codes')}
          </button>
        </div>
      )}
      <button type="button" style={{ ...s.btnOutline, marginTop: '12px' }} onClick={() => setView('login')}>
        Done
      </button>
    </div>
  );

  const renderBiometricSetup = () => (
    <div>
      <h2 style={s.title}>{t('setupBiometric','Set Up Biometric')}</h2>
      <p style={s.sub}>Register your device's biometric for faster, secure login</p>
      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.successMsg}>{success}</div>}
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
        <p style={{ color: 'var(--text-2,#ccc)', marginBottom: '8px' }}>
          Supports: {t('fingerprint','Fingerprint')} · {t('faceId','Face ID')} · {t('touchId','Touch ID')}
        </p>
        <p style={{ color: 'var(--text-3,#888)', fontSize: '0.85rem' }}>
          Your biometric data never leaves your device
        </p>
      </div>
      <button type="button" style={s.btn} onClick={handleSetupBiometric} disabled={loading || !biometricAvailable}>
        {loading ? 'Setting up...' : biometricAvailable ? '🔒 Register Biometric' : 'Not Available on This Device'}
      </button>
      <button type="button" style={{ ...s.btnOutline, marginTop: '8px' }} onClick={() => setView('login')}>
        {t('back','Back')}
      </button>
    </div>
  );

  const views = { login: renderLogin, register: renderRegister, forgot: renderForgot,
    '2fa': render2FA, '2fa-setup': render2FASetup, 'biometric-setup': renderBiometricSetup };

  return (
    <div style={s.overlay} role="dialog" aria-modal="true">
      <div style={s.modal}>
        {onClose && <button style={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>}
        {(views[view] || renderLogin)()}
        {view === 'login' && biometricAvailable && (
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button type="button" style={s.link} onClick={() => setView('biometric-setup')}>
              {t('setupBiometric','Set Up Biometric')}
            </button>
            {' · '}
            <button type="button" style={s.link} onClick={handleSetup2FA}>
              {t('twoFactorAuth','Set Up 2FA')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
