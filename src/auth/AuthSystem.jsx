/*
 * Copyright © 2025-2026 Cameron Fox
 * Licensed under the Apache License, Version 2.0
 * File: src/auth/AuthSystem.jsx
 * Last updated: 2026-05-09
 */

import React, { useState, useCallback } from 'react';

let useTranslation;
try {
  ({ useTranslation } = require('react-i18next'));
} catch {
  useTranslation = () => ({ t: (key, fallback) => fallback || key });
}

const API = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  mfaEnable: '/api/auth/mfa/enable',
  biometric: '/api/auth/biometric/register',
};

const STORAGE = { token: 'nexus_token', role: 'nexus_role', user: 'nexus_user' };

function calcStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 13) score++;
  if (pw.length >= 18) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return 1;
  if (score <= 3) return 2;
  if (score <= 5) return 3;
  return 4;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-400', 'bg-green-500'];

function StrengthMeter({ password }) {
  const level = calcStrength(password);
  return (
    <div className="mt-1">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded ${i <= level ? STRENGTH_COLORS[level] : 'bg-gray-600'}`}
          />
        ))}
      </div>
      {password && (
        <p className="text-xs mt-0.5 text-gray-400">{STRENGTH_LABELS[level]}</p>
      )}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-gray-700 text-white rounded px-3 py-2 pr-10 border border-gray-600 focus:outline-none focus:border-indigo-500"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function validatePassword(pw) {
  if (pw.length < 13) return 'Password must be at least 13 characters.';
  if (!/[A-Z]/.test(pw)) return 'Must include an uppercase letter.';
  if (!/[a-z]/.test(pw)) return 'Must include a lowercase letter.';
  if (!/\d/.test(pw)) return 'Must include a digit.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Must include a special character.';
  return null;
}

async function apiFetch(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

export default function AuthSystem({ onAuthSuccess }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login'); // login | register | mfaSetup | mfaEnable
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [role, setRole] = useState('user');
  const [requireMFA, setRequireMFA] = useState(false);
  const [mfaQR, setMfaQR] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricMsg, setBiometricMsg] = useState('');

  const sessionToken = pendingUser?.token || localStorage.getItem(STORAGE.token);

  const storeUser = useCallback((user) => {
    localStorage.setItem(STORAGE.token, user.token);
    localStorage.setItem(STORAGE.role, user.role);
    localStorage.setItem(STORAGE.user, JSON.stringify(user));
    onAuthSuccess && onAuthSuccess(user);
  }, [onAuthSuccess]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch(API.login, { email, password, mfaToken: mfaToken || undefined });
      if (data.requireMFA) {
        setRequireMFA(true);
      } else {
        storeUser({ id: data.id, token: data.token, role: data.role, username: data.username });
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
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    setLoading(true);
    try {
      const data = await apiFetch(API.register, { username, email, password, role });
      setPendingUser({ id: data.id, username: data.username, email: data.email, role: data.role });
      setMfaQR(data.mfaSetupQR || '');
      setMfaSecret(data.mfaSecret || '');
      setMode('mfaSetup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch(API.mfaEnable, { token: mfaToken }, sessionToken);
      setMode('mfaEnable');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishMFA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loginData = await apiFetch(API.login, { email, password, mfaToken });
      storeUser({ id: loginData.id, token: loginData.token, role: loginData.role, username: loginData.username });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async (type) => {
    setBiometricMsg('');
    if (!sessionToken) { setBiometricMsg(t('auth.biometric.noSession', 'Log in first to register biometrics.')); return; }
    const typeMap = { fingerprint: 'fingerprint', face_id: 'face_id', touch_id: 'touch_id', retina: 'retina' };
    let credential = null;
    if (navigator.credentials && window.PublicKeyCredential) {
      try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const opts = {
          publicKey: {
            challenge,
            rp: { name: 'Nexus AI Pro' },
            user: { id: new TextEncoder().encode(email || 'user'), name: email || 'user', displayName: username || 'User' },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            timeout: 60000,
            attestation: 'none',
          },
        };
        const cred = await navigator.credentials.create(opts);
        credential = cred ? { id: cred.id, type: cred.type } : null;
      } catch {
        // WebAuthn failed; proceed without credential payload
      }
    } else {
      setBiometricMsg(t('auth.biometric.unsupported', 'WebAuthn is unsupported on this device. Registering via server only.'));
    }
    try {
      await apiFetch(API.biometric, { type: typeMap[type], credential }, sessionToken);
      setBiometricMsg(t('auth.biometric.success', `${type} registered successfully.`));
    } catch (err) {
      setBiometricMsg(err.message);
    }
  };

  const inputCls = 'w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:outline-none focus:border-indigo-500';
  const btnCls = 'w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded transition disabled:opacity-50';
  const linkCls = 'text-indigo-400 hover:text-indigo-300 text-sm cursor-pointer underline';

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-white text-center">
          {mode === 'login' && t('auth.login.title', 'Sign In')}
          {mode === 'register' && t('auth.register.title', 'Create Account')}
          {mode === 'mfaSetup' && t('auth.mfa.setupTitle', 'Set Up MFA')}
          {mode === 'mfaEnable' && t('auth.mfa.enableTitle', 'Verify MFA')}
        </h1>

        {error && (
          <div className="bg-red-900/50 border border-red-600 text-red-300 rounded px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">{t('auth.email', 'Email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">{t('auth.password', 'Password')}</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" id="login-pw" />
            </div>
            {requireMFA && (
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('auth.mfa.token', 'MFA Token')}</label>
                <input type="text" value={mfaToken} onChange={(e) => setMfaToken(e.target.value)} className={inputCls} placeholder="6-digit code" maxLength={6} />
              </div>
            )}
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? t('auth.loading', 'Please wait…') : t('auth.login.submit', 'Sign In')}
            </button>
            <p className="text-center text-gray-400 text-sm">
              {t('auth.noAccount', "Don't have an account?")}{' '}
              <span className={linkCls} onClick={() => { setMode('register'); setError(''); }}>{t('auth.register.link', 'Register')}</span>
            </p>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">{t('auth.username', 'Username')}</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className={inputCls} placeholder="johndoe" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">{t('auth.email', 'Email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">{t('auth.password', 'Password')}</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 13 chars" id="reg-pw" />
              <StrengthMeter password={password} />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">{t('auth.role', 'Role')}</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                <option value="user">{t('auth.roles.user', 'User')}</option>
                <option value="admin">{t('auth.roles.admin', 'Admin')}</option>
                <option value="moderator">{t('auth.roles.moderator', 'Moderator')}</option>
                <option value="viewer">{t('auth.roles.viewer', 'Viewer')}</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? t('auth.loading', 'Please wait…') : t('auth.register.submit', 'Create Account')}
            </button>
            <p className="text-center text-gray-400 text-sm">
              {t('auth.hasAccount', 'Already have an account?')}{' '}
              <span className={linkCls} onClick={() => { setMode('login'); setError(''); }}>{t('auth.login.link', 'Sign In')}</span>
            </p>
          </form>
        )}

        {/* MFA SETUP (after register) */}
        {mode === 'mfaSetup' && (
          <form onSubmit={handleEnableMFA} className="space-y-4">
            <p className="text-gray-300 text-sm">{t('auth.mfa.scanPrompt', 'Scan this QR code with your authenticator app, or enter the secret manually.')}</p>
            {mfaQR && (
              <div className="flex justify-center">
                <img src={mfaQR} alt="MFA QR Code" className="rounded border border-gray-600" style={{ width: 180, height: 180, imageRendering: 'pixelated' }} />
              </div>
            )}
            {mfaSecret && (
              <div className="bg-gray-700 rounded px-3 py-2">
                <p className="text-xs text-gray-400 mb-1">{t('auth.mfa.manualSecret', 'Manual entry secret:')}</p>
                <p className="text-white font-mono text-sm break-all select-all">{mfaSecret}</p>
              </div>
            )}
            <div>
              <label className="block text-gray-300 text-sm mb-1">{t('auth.mfa.tokenLabel', 'Enter 6-digit TOTP code to activate')}</label>
              <input type="text" value={mfaToken} onChange={(e) => setMfaToken(e.target.value)} required className={inputCls} placeholder="123456" maxLength={6} />
            </div>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? t('auth.loading', 'Please wait…') : t('auth.mfa.activate', 'Activate MFA')}
            </button>
            <button type="button" className="w-full text-gray-400 hover:text-white text-sm py-1" onClick={() => { setMode('login'); setError(''); }}>
              {t('auth.skip', 'Skip for now')}
            </button>
          </form>
        )}

        {/* MFA ENABLE VERIFY */}
        {mode === 'mfaEnable' && (
          <form onSubmit={handleFinishMFA} className="space-y-4">
            <p className="text-green-400 text-sm text-center">{t('auth.mfa.activated', 'MFA activated! Verify with your code to continue.')}</p>
            <div>
              <label className="block text-gray-300 text-sm mb-1">{t('auth.mfa.token', 'MFA Token')}</label>
              <input type="text" value={mfaToken} onChange={(e) => setMfaToken(e.target.value)} required className={inputCls} placeholder="6-digit code" maxLength={6} />
            </div>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? t('auth.loading', 'Please wait…') : t('auth.mfa.verify', 'Verify & Continue')}
            </button>
          </form>
        )}

        {/* BIOMETRIC SECTION */}
        {(mode === 'login' || mode === 'mfaEnable') && (
          <div className="border-t border-gray-700 pt-4 space-y-3">
            <p className="text-gray-400 text-sm font-medium">{t('auth.biometric.title', 'Biometric Registration')}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'fingerprint', label: t('auth.biometric.fingerprint', 'Register Fingerprint') },
                { type: 'face_id',     label: t('auth.biometric.faceId',      'Register Face ID') },
                { type: 'touch_id',    label: t('auth.biometric.touchId',     'Register Touch ID') },
                { type: 'retina',      label: t('auth.biometric.retina',      'Register Retina Scan') },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleBiometric(type)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium py-2 px-3 rounded border border-gray-600 transition"
                >
                  {label}
                </button>
              ))}
            </div>
            {biometricMsg && (
              <p className="text-xs text-yellow-300 bg-yellow-900/30 rounded px-2 py-1">{biometricMsg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
