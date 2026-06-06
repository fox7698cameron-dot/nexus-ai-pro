// src/auth/LoginPage.jsx
// 2026-06-06 | Login & Registration UI with MFA, biometrics, password strength, i18n

import React, { useState, useEffect } from 'react';
import {
  login, register, verifyMfa, loginWithBiometric, hasBiometricCredential,
  validatePasswordStrength, getPasswordStrengthScore, STRENGTH_LABELS, STRENGTH_COLORS
} from './AuthService.js';

const LANGS = ['English', 'Español', 'Français', 'Deutsch', '日本語', '中文', 'العربية', 'Português', '한국어', 'Italiano'];

export default function LoginPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'mfa'
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '', displayName: '', locale: 'en', mfaCode: '' });
  const [mfaSession, setMfaSession] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState([]);
  const [pwScore, setPwScore] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    setBiometricAvailable(hasBiometricCredential());
  }, []);

  useEffect(() => {
    if (mode === 'register' && form.password) {
      const { errors } = validatePasswordStrength(form.password);
      setPwErrors(errors);
      setPwScore(getPasswordStrengthScore(form.password));
    } else {
      setPwErrors([]);
      setPwScore(0);
    }
  }, [form.password, mode]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login({ email: form.email, password: form.password });
      if (result.requiresMfa) {
        setMfaSession(result.sessionId);
        setMode('mfa');
      } else {
        onAuthenticated(result.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const { valid, errors } = validatePasswordStrength(form.password);
    if (!valid) { setError(errors[0]); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const result = await register({
        email: form.email,
        username: form.username,
        password: form.password,
        displayName: form.displayName,
        locale: form.locale
      });
      onAuthenticated(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyMfa({ sessionId: mfaSession, mfaCode: form.mfaCode });
      onAuthenticated(result.user);
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
      const result = await loginWithBiometric();
      onAuthenticated(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = STRENGTH_COLORS[pwScore] || '#999';
  const scoreLabel = STRENGTH_LABELS[pwScore] || '';

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #333',
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  };

  const btnStyle = (primary) => ({
    width: '100%', padding: '12px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
    fontWeight: '600', fontSize: '14px', transition: 'opacity 0.2s',
    background: primary ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#1a1a1a',
    color: '#fff', opacity: loading ? 0.6 : 1,
    border: primary ? 'none' : '1px solid #333'
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: '#111', borderRadius: '16px', border: '1px solid #222', padding: '32px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '700' }}>Nexus AI Pro</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>
            {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create your account' : 'Enter authentication code'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* MFA step */}
        {mode === 'mfa' && (
          <form onSubmit={handleMfa}>
            <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px' }}>
              Open your authenticator app and enter the 6-digit code.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <input style={{ ...inputStyle, letterSpacing: '8px', textAlign: 'center', fontSize: '20px' }}
                type="text" inputMode="numeric" maxLength={6} value={form.mfaCode} onChange={set('mfaCode')}
                placeholder="000000" autoFocus autoComplete="one-time-code" />
            </div>
            <button type="submit" style={btnStyle(true)} disabled={loading}>
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>
            <button type="button" style={{ ...btnStyle(false), marginTop: '8px' }} onClick={() => { setMode('login'); setMfaSession(null); }}>
              Back
            </button>
          </form>
        )}

        {/* Login step */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input style={inputStyle} type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••••••••" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" style={btnStyle(true)} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            {biometricAvailable && (
              <button type="button" style={{ ...btnStyle(false), marginTop: '8px' }} onClick={handleBiometric} disabled={loading}>
                🔐 Sign in with Biometrics
              </button>
            )}

            <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
              No account?{' '}
              <button type="button" onClick={() => { setMode('register'); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '13px' }}>
                Create one
              </button>
            </p>
          </form>
        )}

        {/* Register step */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Email *</label>
                <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div>
                <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Username *</label>
                <input style={inputStyle} type="text" value={form.username} onChange={set('username')} placeholder="cool_user🎮" required minLength={2} maxLength={32} />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Display Name</label>
              <input style={inputStyle} type="text" value={form.displayName} onChange={set('displayName')} placeholder="Your Name" maxLength={100} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Password * (min 13 chars)</label>
              <div style={{ position: 'relative' }}>
                <input style={inputStyle} type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••••••••" required minLength={13} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Password strength meter */}
            {form.password && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(pwScore / 5) * 100}%`, background: scoreColor, transition: 'all 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: scoreColor }}>{scoreLabel}</span>
                  {pwErrors.map((e, i) => (
                    <span key={i} style={{ fontSize: '10px', color: '#f87171' }}>⚠ {e}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Confirm Password *</label>
              <input style={{ ...inputStyle, borderColor: form.confirmPassword && form.confirmPassword !== form.password ? '#ef4444' : '#333' }}
                type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••••••••" required autoComplete="new-password" />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Language</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.locale} onChange={set('locale')}>
                {LANGS.map((l, i) => <option key={i} value={l.toLowerCase().slice(0, 2)}>{l}</option>)}
              </select>
            </div>

            <button type="submit" style={btnStyle(true)} disabled={loading || pwErrors.length > 0}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '13px' }}>
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
