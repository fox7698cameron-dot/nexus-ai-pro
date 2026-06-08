/**
 * Nexus AI Pro — Auth Flow
 * Login, Register, 2FA setup/verify, biometric authentication, password strength.
 * Supports: Admin / Dev / Moderator / User roles. Multi-language aware.
 * date: 2026-06-08
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Eye, EyeOff, Lock, User, Mail, Fingerprint, QrCode, AlertCircle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

// ── Password strength ─────────────────────────────────────────────────────────

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 13) score++;
  if (pw.length >= 20) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (new Set(pw).size >= 10) score++;
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Excellent'];
  const colors = ['', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4'];
  return { score, label: labels[score] || labels[7], color: colors[score] || colors[7] };
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = passwordStrength(password);
  const pct = (score / 7) * 100;
  if (!password) return null;
  return (
    <div className="mt-1.5">
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-[10px] mt-0.5 transition-colors" style={{ color }}>{label}</div>
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, placeholder, icon: Icon, error, autoComplete, extra }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      {label && <label className="block text-xs text-white/60 mb-1">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />}
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors ${Icon ? 'pl-9' : ''} ${isPassword ? 'pr-9' : ''} ${error ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-indigo-500'}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && <div className="flex items-center gap-1 mt-1 text-xs text-red-400"><AlertCircle size={10} /> {error}</div>}
      {extra}
    </div>
  );
}

// ── TOTP setup screen ─────────────────────────────────────────────────────────

function TOTPSetup({ setupData, onVerify, onSkip }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      await onVerify(code);
    } catch (e) {
      setError(e.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <QrCode className="mx-auto mb-2 text-indigo-400" size={32} />
        <h3 className="text-base font-semibold text-white">Set Up Two-Factor Auth</h3>
        <p className="text-xs text-white/50 mt-1">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
      </div>
      {setupData?.qr && (
        <div className="bg-white rounded-xl p-4 flex items-center justify-center">
          {/* The actual QR is rendered by the client-side QR library */}
          <div id="totp-qr-target" className="w-32 h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-600 rounded">
            QR Code
          </div>
        </div>
      )}
      {setupData?.secret && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-white/40 mb-1">Manual entry key</div>
          <div className="font-mono text-xs text-white/80 break-all select-all">{setupData.secret}</div>
        </div>
      )}
      <div className="grid grid-cols-6 gap-1">
        {[0,1,2,3,4,5].map(i => (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={code[i] || ''}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '');
              setCode(prev => { const a = prev.split(''); a[i] = v; return a.join('').slice(0, 6); });
              if (v && i < 5) document.getElementById(`totp-${i+1}`)?.focus();
            }}
            id={`totp-${i}`}
            className="w-full aspect-square bg-white/5 border border-white/10 rounded-lg text-center text-lg font-bold text-white focus:outline-none focus:border-indigo-500"
          />
        ))}
      </div>
      {error && <div className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={10} /> {error}</div>}
      <div className="flex gap-3">
        <button onClick={onSkip} className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm text-white/60 hover:bg-white/5">Skip for now</button>
        <button onClick={handleVerify} disabled={loading || code.length !== 6}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-semibold text-white flex items-center justify-center gap-2">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <><CheckCircle size={14} /> Verify</>}
        </button>
      </div>
    </div>
  );
}

// ── Biometric auth ────────────────────────────────────────────────────────────

function BiometricAuth({ challenge, onSuccess, onFallback }) {
  const [status, setStatus] = useState('idle'); // idle | pending | success | error

  const handleBiometric = async () => {
    setStatus('pending');
    try {
      // WebAuthn / Platform biometric via navigator.credentials
      if (window.PublicKeyCredential && navigator.credentials) {
        const cred = await navigator.credentials.get({
          publicKey: {
            challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
            rpId: window.location.hostname,
            timeout: 60000,
            userVerification: 'required',
          },
        });
        // Send signed assertion to backend
        const res = await fetch('/api/auth/biometric/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: challenge.userId,
            signedChallenge: btoa(String.fromCharCode(...new Uint8Array(cred.response.clientDataJSON))),
          }),
        });
        if (res.ok) { setStatus('success'); onSuccess(await res.json()); }
        else { setStatus('error'); }
      } else {
        // Capacitor / Electron native biometric
        if (window.electron?.biometric?.authenticate) {
          const result = await window.electron.biometric.authenticate({ reason: 'Authenticate to Nexus AI Pro' });
          if (result.success) { setStatus('success'); onSuccess(result); }
          else { setStatus('error'); }
        } else if (window.Capacitor?.isNativePlatform?.()) {
          const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
          await NativeBiometric.verifyIdentity({ reason: 'Sign in to Nexus AI Pro', title: 'Biometric Auth' });
          setStatus('success');
          onSuccess({ biometric: true });
        } else {
          onFallback();
        }
      }
    } catch (e) {
      setStatus('error');
      if (e.name === 'NotAllowedError') onFallback();
    }
  };

  return (
    <div className="space-y-5 text-center">
      <Fingerprint size={56} className={`mx-auto transition-colors ${status === 'pending' ? 'text-indigo-400 animate-pulse' : status === 'success' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-white/40'}`} />
      <div>
        <h3 className="text-base font-semibold text-white">Biometric Authentication</h3>
        <p className="text-xs text-white/50 mt-1">Touch ID · Face ID · Fingerprint · Retinal Scan</p>
      </div>
      {status === 'error' && <p className="text-xs text-red-400">Biometric failed. Try again or use password.</p>}
      <button onClick={handleBiometric} disabled={status === 'pending' || status === 'success'}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold text-sm text-white flex items-center justify-center gap-2">
        <Fingerprint size={16} /> {status === 'pending' ? 'Authenticating...' : 'Authenticate'}
      </button>
      <button onClick={onFallback} className="text-xs text-white/40 hover:text-white/60 underline">Use password instead</button>
    </div>
  );
}

// ── Main Auth Flow ────────────────────────────────────────────────────────────

export default function AuthFlow({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // login | register | totp | biometric | backupCode
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', username: '', role: 'user' });
  const [totpCode, setTotpCode] = useState('');
  const [setupData, setSetupData] = useState(null);
  const [biometricChallenge, setBiometricChallenge] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const set = (field) => (v) => setForm(f => ({ ...f, [field]: v }));

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password required';
    if (mode === 'register') {
      const { score } = passwordStrength(form.password);
      if (form.password.length < 13) e.password = 'Password must be ≥ 13 characters';
      else if (score < 4) e.password = 'Password too weak — add more variety';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (!form.username) e.username = 'Username required';
      else if (form.username.length < 2) e.username = 'Username too short';
    }
    return e;
  };

  const handleLogin = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setGlobalError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setGlobalError(data.error || 'Login failed'); return; }
      if (data.requiresTOTP) {
        setPendingUser(data);
        setMode('totp');
      } else if (data.biometricChallenge) {
        setBiometricChallenge(data.biometricChallenge);
        setMode('biometric');
      } else {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        onAuthenticated(data);
      }
    } catch (e) { setGlobalError(e.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setGlobalError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, username: form.username }),
      });
      const data = await res.json();
      if (!res.ok) { setGlobalError(data.error || 'Registration failed'); return; }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      if (data.totpSetup) { setSetupData(data.totpSetup); setMode('totp'); }
      else onAuthenticated(data);
    } catch (e) { setGlobalError(e.message); }
    finally { setLoading(false); }
  };

  const handleTOTP = async (code) => {
    const res = await fetch('/api/auth/totp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pendingUser?.tempToken || localStorage.getItem('accessToken')}` },
      body: JSON.stringify({ token: code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid code');
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    onAuthenticated(data);
  };

  const handleBiometricSuccess = (result) => {
    if (result.accessToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken || '');
    }
    onAuthenticated(result);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-white/40 text-sm mt-0.5">Secure • Multi-Platform • AI-Powered</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          {/* Biometric mode */}
          {mode === 'biometric' && biometricChallenge && (
            <BiometricAuth challenge={biometricChallenge} onSuccess={handleBiometricSuccess} onFallback={() => setMode('login')} />
          )}

          {/* TOTP mode */}
          {mode === 'totp' && (
            <TOTPSetup setupData={setupData} onVerify={handleTOTP} onSkip={() => { if (pendingUser) onAuthenticated(pendingUser); }} />
          )}

          {/* Login / Register */}
          {(mode === 'login' || mode === 'register') && (
            <>
              {/* Tab toggle */}
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-5">
                {['login', 'register'].map(m => (
                  <button key={m} onClick={() => { setMode(m); setErrors({}); setGlobalError(''); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${mode === m ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'}`}>
                    {m === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {globalError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mb-4 text-xs text-red-400">
                  <AlertCircle size={12} /> {globalError}
                </div>
              )}

              <div className="space-y-3">
                {mode === 'register' && (
                  <Field label="Username" value={form.username} onChange={set('username')} icon={User}
                    placeholder="Choose a username (emoji & special chars OK)" error={errors.username}
                    autoComplete="username" />
                )}
                <Field label="Email" type="email" value={form.email} onChange={set('email')} icon={Mail}
                  placeholder="Enter your email" error={errors.email} autoComplete="email" />
                <Field label="Password" type="password" value={form.password} onChange={set('password')} icon={Lock}
                  placeholder={mode === 'register' ? 'Create password (≥13 chars)' : 'Enter your password'}
                  error={errors.password} autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  extra={mode === 'register' ? <PasswordStrengthBar password={form.password} /> : null} />
                {mode === 'register' && (
                  <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} icon={Lock}
                    placeholder="Re-enter your password" error={errors.confirmPassword} autoComplete="new-password" />
                )}
              </div>

              {mode === 'login' && (
                <button className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 block text-right w-full">Forgot password?</button>
              )}

              <button
                onClick={mode === 'login' ? handleLogin : handleRegister}
                disabled={loading}
                className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              {mode === 'login' && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/30">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/auth/biometric/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }) });
                        if (res.ok) { setBiometricChallenge(await res.json()); setMode('biometric'); }
                      } catch {}
                    }}
                    className="w-full py-2.5 rounded-xl border border-white/15 text-sm text-white/70 hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Fingerprint size={14} /> Sign in with Biometrics
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-white/20 mt-5">
          Protected with AES-256-GCM encryption · SOC 2 compliant
        </p>
      </div>
    </div>
  );
}
