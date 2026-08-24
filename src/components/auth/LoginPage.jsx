/**
 * src/components/auth/LoginPage.jsx
 * Login Page Component
 * Updated: 2026-08-24
 *
 * Supports: email/password, biometric (WebAuthn), 2FA/MFA
 * Multi-language, emoji/special chars in usernames
 * Role-based routing post-login
 */
import React, { useState, useEffect } from 'react';
import { AuthService, BiometricService } from '../../auth/AuthService.js';
import { useTranslation } from 'react-i18next';

const ROLE_ROUTES = {
  admin: '/admin',
  developer: '/dev',
  moderator: '/moderator',
  user: '/dashboard',
};

export default function LoginPage({ onSuccess, onNavigate }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login'); // login | mfa | biometric
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvail, setBiometricAvail] = useState(false);
  const [savedUserId, setSavedUserId] = useState(null);

  useEffect(() => {
    BiometricService.isPlatformAuthAvailable().then(setBiometricAvail);
    setSavedUserId(localStorage.getItem('nexus:lastUserId'));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await AuthService.login({ email, password });
      if (result.requiresMfa) {
        setTempToken(result.tempToken);
        setMode('mfa');
      } else {
        const role = result.user?.role || 'user';
        if (result.user?.id) localStorage.setItem('nexus:lastUserId', result.user.id);
        onSuccess?.(result, ROLE_ROUTES[role] || '/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (!mfaCode) { setError('MFA code is required'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await AuthService.verifyMfa({ tempToken, code: mfaCode });
      const role = result.user?.role || 'user';
      onSuccess?.(result, ROLE_ROUTES[role] || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!savedUserId) { setError('No saved user found. Please log in with password first.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await AuthService.loginBiometric(savedUserId);
      const role = result.user?.role || 'user';
      onSuccess?.(result, ROLE_ROUTES[role] || '/dashboard');
    } catch (err) {
      setError(err.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1.5px solid #334155', background: '#0f172a',
    color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  };
  const btnStyle = (variant = 'primary') => ({
    width: '100%', padding: '13px', borderRadius: 10,
    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: 15, fontWeight: 600,
    background: variant === 'primary'
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : variant === 'bio'
      ? 'linear-gradient(135deg, #059669, #0d9488)'
      : '#1e293b',
    color: '#fff',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s',
  });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.9)', backdropFilter: 'blur(20px)',
        borderRadius: 20, padding: 40, width: '100%', maxWidth: 420,
        border: '1px solid rgba(99,102,241,0.3)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔷</div>
          <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700, margin: 0 }}>Nexus AI Pro</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '8px 0 0' }}>
            {mode === 'mfa' ? t('auth.twoFactorAuth') : t('auth.signIn')}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* MFA Mode */}
        {mode === 'mfa' && (
          <form onSubmit={handleMfaVerify}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>
                Authenticator Code
              </label>
              <input
                type="text"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                placeholder="000000"
                style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: 22, fontWeight: 700 }}
                maxLength={6}
                inputMode="numeric"
                autoFocus
              />
            </div>
            <button type="submit" style={btnStyle()} disabled={loading}>
              {loading ? '⏳ Verifying...' : '✓ Verify Code'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setTempToken(null); setMfaCode(''); setError(''); }}
              style={{ ...btnStyle('ghost'), marginTop: 10, background: 'transparent', color: '#6366f1' }}
            >
              ← Back to Login
            </button>
          </form>
        )}

        {/* Login Mode */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                autoComplete="email"
                required
              />
            </div>

            <div style={{ marginBottom: 24, position: 'relative' }}>
              <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>
                {t('auth.password')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••••"
                style={{ ...inputStyle, paddingRight: 44 }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: 36, background: 'none',
                  border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16,
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <button type="submit" style={btnStyle()} disabled={loading}>
              {loading ? '⏳ Signing in...' : `🔐 ${t('auth.signIn')}`}
            </button>

            {biometricAvail && savedUserId && (
              <button
                type="button"
                onClick={handleBiometric}
                style={{ ...btnStyle('bio'), marginTop: 10 }}
                disabled={loading}
              >
                🫆 {t('auth.biometricLogin')}
              </button>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => onNavigate?.('forgot-password')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 13 }}
              >
                {t('auth.forgotPassword')}
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('register')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 13 }}
              >
                {t('auth.createAccount')} →
              </button>
            </div>
          </form>
        )}

        {/* Security badges */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24,
          flexWrap: 'wrap',
        }}>
          {['🔒 AES-256', '🛡️ E2E Encrypted', '🔐 JWT Secure'].map(b => (
            <span key={b} style={{
              fontSize: 11, color: '#475569', padding: '3px 8px',
              border: '1px solid #1e293b', borderRadius: 20,
            }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
