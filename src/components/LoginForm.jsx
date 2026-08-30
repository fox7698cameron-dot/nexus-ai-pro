/**
 * src/components/LoginForm.jsx
 * Full-featured login form with biometrics, MFA, and password strength
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 */

import React, { useState, useCallback } from 'react';
import { PasswordStrengthMeter }         from '../auth/PasswordStrengthMeter.jsx';

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiPost(endpoint, body) {
  const res = await fetch(`/api/auth/${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {{ onSuccess?: (user: object) => void, mode?: 'login'|'register' }} props
 */
function LoginForm({ onSuccess, mode: initialMode = 'login' }) {
  const [mode,          setMode]          = useState(initialMode);   // login | register | mfa | biometric
  const [email,         setEmail]         = useState('');
  const [username,      setUsername]      = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [mfaToken,      setMfaToken]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [info,          setInfo]          = useState('');
  const [mfaType,       setMfaType]       = useState(null);

  const storeTokens = useCallback((data) => {
    try {
      if (data.accessToken)  localStorage.setItem('nexus:accessToken',  data.accessToken);
      if (data.refreshToken) localStorage.setItem('nexus:refreshToken', data.refreshToken);
      if (data.sessionId)    localStorage.setItem('nexus:sessionId',    data.sessionId);
      if (data.user)         localStorage.setItem('nexus:user',         JSON.stringify(data.user));
    } catch { /* ignore storage errors */ }
  }, []);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const data = await apiPost('login', { email, password, mfaToken: mfaToken || undefined });

      if (data.mfaRequired) {
        setMfaType(data.mfaType);
        setMode('mfa');
        setInfo(`Enter your ${data.mfaType === 'totp' ? 'authenticator app' : data.mfaType} code`);
      } else {
        storeTokens(data);
        onSuccess?.(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, mfaToken, storeTokens, onSuccess]);

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await apiPost('register', { username, email, password });
      storeTokens(data);
      onSuccess?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [username, email, password, storeTokens, onSuccess]);

  const handleBiometric = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      // 1. Get challenge from server
      const { challenge, rpId } = await apiPost('biometric/challenge', {});

      // 2. Request platform authenticator (Touch ID / Face ID / fingerprint)
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge:        Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          rpId,
          userVerification: 'required',
          timeout:          60_000,
        },
      });

      if (!credential) throw new Error('Biometric authentication cancelled');

      // 3. Verify with server
      const data = await apiPost('biometric/verify', {
        credentialId: credential.id,
        userId:       localStorage.getItem('nexus:lastUserId') ?? '',
        clientDataJSON:    btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
        authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
        signature:         btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
      });

      storeTokens(data);
      onSuccess?.(data.user);
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Biometric authentication denied or not available' : err.message);
    } finally {
      setLoading(false);
    }
  }, [storeTokens, onSuccess]);

  const biometricSupported = typeof window !== 'undefined'
    && 'credentials' in navigator
    && 'PublicKeyCredential' in window;

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const s = {
    container: {
      background:    '#111827',
      borderRadius:  16,
      padding:       32,
      maxWidth:      400,
      width:         '100%',
      boxSizing:     'border-box',
      fontFamily:    'Inter, -apple-system, sans-serif',
    },
    title: { fontSize: 22, fontWeight: 700, color: '#f9fafb', marginBottom: 4, textAlign: 'center' },
    sub:   { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
    label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#9ca3af', marginBottom: 4 },
    input: {
      width: '100%', padding: '10px 12px', background: '#1f2937', border: '1px solid #374151',
      borderRadius: 8, color: '#f9fafb', fontSize: 14, boxSizing: 'border-box', outline: 'none',
    },
    btn: {
      width: '100%', padding: '11px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 16,
    },
    btnSecondary: {
      width: '100%', padding: '10px', background: '#1f2937', border: '1px solid #374151',
      borderRadius: 8, color: '#e5e7eb', fontSize: 13, cursor: 'pointer', marginTop: 8,
    },
    error:   { background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#fca5a5', marginBottom: 16 },
    info:    { background: '#0c1a33', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#93c5fd', marginBottom: 16 },
    divider: { textAlign: 'center', color: '#4b5563', fontSize: 12, margin: '16px 0' },
    link:    { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, padding: 0 },
  };

  return (
    <div style={s.container}>
      <h2 style={s.title}>
        {mode === 'register' ? '✨ Create Account' : mode === 'mfa' ? '🔐 Two-Factor Auth' : '🔒 Sign In'}
      </h2>
      <p style={s.sub}>
        {mode === 'register'
          ? 'Join Nexus AI Pro'
          : mode === 'mfa'
          ? `Enter your ${mfaType === 'totp' ? 'authenticator code' : 'OTP'}`
          : 'Welcome back'}
      </p>

      {error && <div style={s.error}>⚠️ {error}</div>}
      {info  && <div style={s.info}>ℹ️ {info}</div>}

      {/* ── MFA mode ── */}
      {mode === 'mfa' && (
        <form onSubmit={handleLogin}>
          <label style={s.label}>Verification Code</label>
          <input
            style={s.input} type="text" inputMode="numeric" pattern="[0-9]*"
            placeholder="000000" maxLength={10} value={mfaToken}
            onChange={e => setMfaToken(e.target.value)} autoFocus required
          />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>
          <button style={s.btnSecondary} type="button" onClick={() => { setMode('login'); setMfaToken(''); setError(''); }}>
            ← Back to Login
          </button>
        </form>
      )}

      {/* ── Register mode ── */}
      {mode === 'register' && (
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Username</label>
            <input
              style={s.input} type="text" placeholder="Your username (emoji ok! 🚀)"
              value={username} onChange={e => setUsername(e.target.value)} required autoFocus
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={s.label}>Password (13+ chars required)</label>
            <div style={{ position: 'relative' }}>
              <input
                style={s.input} type={showPassword ? 'text' : 'password'}
                placeholder="Strong passphrase + 🔐"
                value={password} onChange={e => setPassword(e.target.value)} required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <PasswordStrengthMeter password={password} showRequirements showSuggestions />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
          <div style={s.divider}>Already have an account?</div>
          <button style={s.btnSecondary} type="button" onClick={() => { setMode('login'); setError(''); }}>
            Sign In Instead
          </button>
        </form>
      )}

      {/* ── Login mode ── */}
      {mode === 'login' && (
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input style={s.input} type={showPassword ? 'text' : 'password'}
                placeholder="Your password" value={password}
                onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing In…' : '🔒 Sign In'}
          </button>

          {biometricSupported && (
            <>
              <div style={s.divider}>— or —</div>
              <button style={{ ...s.btnSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                type="button" onClick={handleBiometric} disabled={loading}>
                <span>👆</span> Sign in with Biometrics (Face ID / Touch ID / Fingerprint)
              </button>
            </>
          )}

          <div style={s.divider}>Don't have an account?</div>
          <button style={s.btnSecondary} type="button" onClick={() => { setMode('register'); setError(''); }}>
            ✨ Create Account
          </button>
        </form>
      )}
    </div>
  );
}

export default LoginForm;
