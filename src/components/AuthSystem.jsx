/**
 * AuthSystem.jsx
 * Nexus AI Pro — Authentication System
 * Registration, login, biometrics, 2FA/MFA, role-aware
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import React, { useState, useCallback, useEffect } from 'react';

// ── i18n shim (replace with real i18n import) ─────────────────────────────────
const UI_STRINGS = {
  'auth.register':         'Create Account',
  'auth.login':            'Sign In',
  'auth.username':         'Username',
  'auth.email':            'Email',
  'auth.password':         'Password',
  'auth.confirm_password': 'Confirm Password',
  'auth.language':         'Language / Region',
  'auth.remember_me':      'Remember me',
  'auth.forgot_password':  'Forgot password?',
  'auth.biometric':        'Use Biometric Login',
  'auth.setup_2fa':        'Set up 2-Factor Auth',
  'auth.mfa_code':         'Enter verification code',
  'auth.back_to_login':    'Back to sign in',
  'auth.have_account':     'Already have an account?',
  'auth.no_account':       "Don't have an account?",
  'auth.or':               'or continue with',
  'auth.strength_weak':    'Weak',
  'auth.strength_fair':    'Fair',
  'auth.strength_strong':  'Strong',
  'auth.strength_very_strong': 'Very Strong',
};
const t = (key) => UI_STRINGS[key] ?? key;

// ── Supported languages ───────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'ar-SA', label: 'العربية' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'ko-KR', label: '한국어' },
  { code: 'ru-RU', label: 'Русский' },
];

// ── Password validation ───────────────────────────────────────────────────────
/**
 * @param {string} pw
 * @returns {{ score: number, errors: string[], label: string }}
 */
function analyzePassword(pw) {
  const errors = [];
  if (pw.length < 13)                       errors.push('At least 13 characters');
  if (!/[A-Z]/.test(pw))                    errors.push('One uppercase letter');
  if (!/[a-z]/.test(pw))                    errors.push('One lowercase letter');
  if (!/[0-9]/.test(pw))                    errors.push('One number');
  if (!/[^A-Za-z0-9]/.test(pw))            errors.push('One special character');
  const score = 5 - errors.length;
  const labels = ['', t('auth.strength_weak'), t('auth.strength_weak'), t('auth.strength_fair'), t('auth.strength_strong'), t('auth.strength_very_strong')];
  return { score, errors, label: labels[score] ?? '' };
}

// ── PasswordStrengthMeter ─────────────────────────────────────────────────────
function PasswordStrengthMeter({ password }) {
  const { score, errors, label } = analyzePassword(password);
  const colors = ['', '#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38a169'];
  if (!password) return null;
  return (
    <div className="pw-meter">
      <div className="pw-meter-bar-track">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="pw-meter-seg" style={{ background: i <= score ? colors[score] : 'var(--border)' }} />
        ))}
      </div>
      <div className="pw-meter-label" style={{ color: colors[score] }}>{label}</div>
      {errors.length > 0 && (
        <ul className="pw-errors">
          {errors.map(e => <li key={e}>✗ {e}</li>)}
        </ul>
      )}
    </div>
  );
}

// ── Biometric helper ──────────────────────────────────────────────────────────
async function attemptBiometric() {
  // WebAuthn (FIDO2) on desktop/web
  if (window.PublicKeyCredential) {
    try {
      // Use get() with a challenge from the server; this is a simplified flow
      const challengeRes = await fetch('/api/auth/webauthn/challenge', { method: 'POST' });
      if (!challengeRes.ok) throw new Error('Challenge fetch failed');
      const { challenge, allowCredentials } = await challengeRes.json();

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          allowCredentials: (allowCredentials ?? []).map(c => ({
            ...c,
            id: Uint8Array.from(atob(c.id), x => x.charCodeAt(0)),
          })),
          timeout: 60000,
          userVerification: 'preferred',
        },
      });
      return { type: 'webauthn', credential: assertion };
    } catch {
      // Fall through to Capacitor
    }
  }
  // Capacitor NativeBiometric (mobile)
  if (typeof window !== 'undefined' && window.Capacitor) {
    try {
      const { NativeBiometric } = await import('@capawesome-team/capacitor-native-biometric');
      const result = await NativeBiometric.verifyIdentity({
        reason: 'Authenticate to Nexus AI Pro',
        title: 'Biometric Login',
      });
      return { type: 'native', result };
    } catch (e) {
      throw new Error('Biometric authentication failed: ' + e.message);
    }
  }
  throw new Error('Biometric authentication not available on this device');
}

// ── AuthSystem component ──────────────────────────────────────────────────────
/**
 * @param {{ onAuth: (user: object, token: string) => void }} props
 */
export default function AuthSystem({ onAuth }) {
  const [screen, setScreen] = useState('login'); // login | register | mfa | forgot | setup2fa
  const [form, setForm]     = useState({ username: '', email: '', password: '', confirmPassword: '', rememberMe: false, language: 'en-US', mfaCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [qrCode, setQrCode]   = useState(null); // 2FA TOTP QR
  const [showPw, setShowPw]   = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      if (data.mfaRequired) { setScreen('mfa'); return; }
      sessionStorage.setItem('nexus_token', data.accessToken);
      onAuth?.(data.user, data.accessToken);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Register ─────────────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { score } = analyzePassword(form.password);
    if (score < 4) { setError('Password does not meet strength requirements.'); setLoading(false); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); setLoading(false); return; }
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, language: form.language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed');
      if (data.setup2fa) { setQrCode(data.qrCode); setScreen('setup2fa'); return; }
      sessionStorage.setItem('nexus_token', data.accessToken);
      onAuth?.(data.user, data.accessToken);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── MFA verify ───────────────────────────────────────────────────────────────
  const handleMFA = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: form.mfaCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'MFA failed');
      sessionStorage.setItem('nexus_token', data.accessToken);
      onAuth?.(data.user, data.accessToken);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Forgot password ──────────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setError('Reset email sent! Check your inbox.');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Biometric ────────────────────────────────────────────────────────────────
  const handleBiometric = async () => {
    setLoading(true); setError(null);
    try {
      const cred = await attemptBiometric();
      const res  = await fetch('/api/auth/biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Biometric auth failed');
      sessionStorage.setItem('nexus_token', data.accessToken);
      onAuth?.(data.user, data.accessToken);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="auth-root">
      <style>{AUTH_CSS}</style>
      <div className="auth-card">
        <div className="auth-logo">⬡ Nexus AI Pro</div>

        {error && <div className="auth-error">{error}</div>}

        {/* Login */}
        {screen === 'login' && (
          <form onSubmit={handleLogin} autoComplete="on">
            <h2>{t('auth.login')}</h2>
            <label>{t('auth.email')}
              <input type="email" required autoComplete="email"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </label>
            <label>{t('auth.password')}
              <div className="pw-wrap">
                <input type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </label>
            <div className="auth-row">
              <label className="check-label">
                <input type="checkbox" checked={form.rememberMe} onChange={e => set('rememberMe', e.target.checked)} />
                {t('auth.remember_me')}
              </label>
              <button type="button" className="auth-link" onClick={() => setScreen('forgot')}>
                {t('auth.forgot_password')}
              </button>
            </div>
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Signing in…' : t('auth.login')}
            </button>
            <button type="button" className="auth-btn-biometric" onClick={handleBiometric} disabled={loading}>
              🔑 {t('auth.biometric')}
            </button>
            <div className="auth-divider"><span>{t('auth.or')}</span></div>
            <div className="social-login-row">
              <button type="button" className="social-btn" disabled>G Google</button>
              <button type="button" className="social-btn" disabled>GitHub</button>
              <button type="button" className="social-btn" disabled>Discord</button>
            </div>
            <p className="auth-switch">
              {t('auth.no_account')} <button type="button" className="auth-link" onClick={() => setScreen('register')}>Sign up</button>
            </p>
          </form>
        )}

        {/* Register */}
        {screen === 'register' && (
          <form onSubmit={handleRegister} autoComplete="on">
            <h2>{t('auth.register')}</h2>
            <label>{t('auth.username')}
              <input required autoComplete="username"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="e.g. dev_🚀 or CameronFox" />
              <small className="field-hint">Supports emoji, unicode, and special characters</small>
            </label>
            <label>{t('auth.email')}
              <input type="email" required autoComplete="email"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </label>
            <label>{t('auth.password')}
              <div className="pw-wrap">
                <input type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                  value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </label>
            <PasswordStrengthMeter password={form.password} />
            <label>{t('auth.confirm_password')}
              <input type="password" required autoComplete="new-password"
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
            </label>
            <label>{t('auth.language')}
              <select value={form.language} onChange={e => set('language', e.target.value)}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Creating account…' : t('auth.register')}
            </button>
            <p className="auth-switch">
              {t('auth.have_account')} <button type="button" className="auth-link" onClick={() => setScreen('login')}>Sign in</button>
            </p>
          </form>
        )}

        {/* MFA */}
        {screen === 'mfa' && (
          <form onSubmit={handleMFA}>
            <h2>{t('auth.mfa_code')}</h2>
            <p className="mfa-hint">Enter the 6-digit code from your authenticator app.</p>
            <label>Verification Code
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required
                value={form.mfaCode} onChange={e => set('mfaCode', e.target.value)}
                placeholder="000000" className="mfa-input" />
            </label>
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" className="auth-link" onClick={() => setScreen('login')}>
              {t('auth.back_to_login')}
            </button>
          </form>
        )}

        {/* Forgot password */}
        {screen === 'forgot' && (
          <form onSubmit={handleForgot}>
            <h2>Reset Password</h2>
            <label>{t('auth.email')}
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
            </label>
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button type="button" className="auth-link" onClick={() => setScreen('login')}>
              {t('auth.back_to_login')}
            </button>
          </form>
        )}

        {/* 2FA Setup */}
        {screen === 'setup2fa' && (
          <div>
            <h2>{t('auth.setup_2fa')}</h2>
            <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).</p>
            {qrCode && (
              <div className="qr-placeholder">
                <img src={qrCode} alt="TOTP QR Code" style={{ width: 180, height: 180 }} />
              </div>
            )}
            <p className="mfa-hint">After scanning, enter the code below to confirm setup.</p>
            <form onSubmit={handleMFA}>
              <label>Verification Code
                <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required
                  value={form.mfaCode} onChange={e => set('mfaCode', e.target.value)}
                  placeholder="000000" className="mfa-input" />
              </label>
              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? 'Confirming…' : 'Confirm Setup'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const AUTH_CSS = `
:root{--bg:#0f1117;--surface:#1a1d27;--border:#2a2d3a;--text:#e2e8f0;--muted:#718096;--radius:12px;}
@media(prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#f7f8fc;--surface:#fff;--border:#e2e8f0;--text:#1a202c;--muted:#4a5568;}}
.auth-root{min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif;}
.auth-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:32px;width:100%;max-width:420px;}
.auth-logo{font-size:1.4rem;font-weight:700;text-align:center;margin-bottom:20px;color:#63b3ed;}
.auth-card h2{margin:0 0 20px;font-size:1.3rem;text-align:center;color:var(--text);}
.auth-card form{display:flex;flex-direction:column;gap:14px;}
.auth-card label{display:flex;flex-direction:column;gap:4px;font-size:.88rem;color:var(--muted);}
.auth-card input,.auth-card select{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 12px;font-size:.95rem;}
.auth-card input:focus,.auth-card select:focus{outline:none;border-color:#3182ce;}
.pw-wrap{position:relative;}
.pw-wrap input{width:100%;box-sizing:border-box;padding-right:40px;}
.pw-toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;}
.auth-row{display:flex;justify-content:space-between;align-items:center;}
.check-label{display:flex;align-items:center;gap:6px;font-size:.85rem;color:var(--text);cursor:pointer;}
.auth-link{background:none;border:none;color:#63b3ed;cursor:pointer;font-size:.85rem;text-decoration:underline;}
.auth-btn-primary{background:#3182ce;color:#fff;border:none;border-radius:8px;padding:12px;font-size:1rem;cursor:pointer;font-weight:600;}
.auth-btn-primary:hover:not(:disabled){background:#2b6cb0;}
.auth-btn-primary:disabled{opacity:.6;cursor:not-allowed;}
.auth-btn-biometric{background:none;border:1px solid var(--border);color:var(--text);border-radius:8px;padding:10px;font-size:.9rem;cursor:pointer;}
.auth-divider{display:flex;align-items:center;gap:12px;color:var(--muted);font-size:.8rem;margin:4px 0;}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:var(--border);}
.social-login-row{display:flex;gap:8px;}
.social-btn{flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px;font-size:.82rem;cursor:pointer;}
.auth-switch{text-align:center;font-size:.85rem;color:var(--muted);margin:0;}
.auth-error{background:rgba(245,101,101,.15);color:#fc8181;border:1px solid #fc8181;border-radius:8px;padding:10px 14px;font-size:.88rem;margin-bottom:8px;}
.pw-meter{display:flex;flex-direction:column;gap:4px;}
.pw-meter-bar-track{display:flex;gap:4px;}
.pw-meter-seg{flex:1;height:5px;border-radius:3px;transition:background .3s;}
.pw-meter-label{font-size:.78rem;}
.pw-errors{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:2px;}
.pw-errors li{font-size:.77rem;color:#f56565;}
.field-hint{font-size:.75rem;color:var(--muted);font-style:italic;}
.mfa-hint{font-size:.85rem;color:var(--muted);margin:0;}
.mfa-input{letter-spacing:.3em;font-size:1.4rem;text-align:center;}
.qr-placeholder{display:flex;justify-content:center;margin:12px 0;}
`;
