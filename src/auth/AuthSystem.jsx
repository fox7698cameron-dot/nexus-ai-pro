// src/auth/AuthSystem.jsx
// Date: 2026-07-08
// Full auth UI: register, login, 2FA, biometrics, MFA, role-based routing

import React, { useState, useCallback, useEffect } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Shield, Fingerprint,
  ScanFace, Smartphone, QrCode, Key, CheckCircle, AlertCircle,
  Loader2, LogIn, UserPlus, ChevronDown, Globe
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' }, { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' }, { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' }, { code: 'hi', name: 'हिन्दी' }
];

function PasswordStrengthBar({ password }) {
  const [strength, setStrength] = useState(null);

  useEffect(() => {
    if (!password) { setStrength(null); return; }
    const fetchStrength = async () => {
      try {
        const r = await fetch(`/api/auth/password-strength?password=${encodeURIComponent(password)}`);
        if (r.ok) setStrength(await r.json());
      } catch {}
    };
    const t = setTimeout(fetchStrength, 300);
    return () => clearTimeout(t);
  }, [password]);

  if (!strength || !password) return null;

  const colors = { Weak: 'bg-red-500', Fair: 'bg-orange-500', Strong: 'bg-yellow-500', 'Very Strong': 'bg-green-500' };
  const widths = { Weak: '25%', Fair: '50%', Strong: '75%', 'Very Strong': '100%' };

  return (
    <div className="mt-1">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${colors[strength.label] || 'bg-gray-400'}`}
          style={{ width: widths[strength.label] || '0%' }}
        />
      </div>
      <p className={`text-xs mt-0.5 font-medium ${strength.label === 'Very Strong' ? 'text-green-600' : strength.label === 'Weak' ? 'text-red-500' : 'text-orange-500'}`}>
        {strength.label} · min 13 chars, upper, lower, digit, special required
      </p>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, icon: Icon, error, rightElement, autoComplete }) {
  const [showPwd, setShowPwd] = useState(false);
  const actualType = type === 'password' ? (showPwd ? 'text' : 'password') : type;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          type={actualType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full px-3 py-2.5 ${Icon ? 'pl-9' : ''} ${type === 'password' ? 'pr-10' : ''} rounded-xl border ${
            error ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
          } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {rightElement && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function TwoFactorSetup({ token, onComplete }) {
  const [step, setStep] = useState('setup'); // setup, confirm
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startSetup = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (r.ok) {
        const d = await r.json();
        setQrCode(d.qrCode);
        setSecret(d.secret);
        setStep('confirm');
      }
    } catch (e) {
      setError('Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async () => {
    if (code.length !== 6) { setError('Enter a 6-digit code'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (r.ok) {
        const d = await r.json();
        setBackupCodes(d.backupCodes);
        setStep('done');
        onComplete?.();
      } else {
        setError('Invalid code');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'setup') {
    return (
      <div className="text-center space-y-4">
        <Shield size={48} className="mx-auto text-blue-500" />
        <h3 className="font-bold text-gray-900 dark:text-white">Set up Two-Factor Authentication</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
        <button onClick={startSetup} disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          Generate QR Code
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        {qrCode && <img src={qrCode} alt="2FA QR Code" className="mx-auto w-48 h-48 rounded-xl border border-gray-200 dark:border-gray-600" />}
        <p className="text-xs text-gray-500 text-center font-mono">{secret}</p>
        <InputField
          label="Enter 6-digit verification code"
          value={code}
          onChange={setCode}
          placeholder="000000"
          icon={Key}
          error={error}
        />
        <button onClick={confirmSetup} disabled={loading || code.length !== 6} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          Verify & Enable 2FA
        </button>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-2" />
          <h3 className="font-bold text-gray-900 dark:text-white">2FA Enabled!</h3>
        </div>
        {backupCodes && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Save these backup codes:</p>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 font-mono text-sm grid grid-cols-2 gap-1">
              {backupCodes.map((code, i) => <span key={i} className="text-gray-700 dark:text-gray-300">{code}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function MFAVerify({ pendingToken, userId, onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const verify = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, code, userId })
      });
      if (r.ok) {
        const d = await r.json();
        onSuccess(d);
      } else {
        setError('Invalid code. Try again.');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Smartphone size={40} className="mx-auto text-blue-500 mb-2" />
        <h3 className="font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Enter the 6-digit code from your authenticator app</p>
      </div>
      <InputField label="Verification Code" value={code} onChange={setCode} placeholder="000000" icon={Key} error={error} />
      <button onClick={verify} disabled={loading || code.length !== 6} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
        Verify
      </button>
      <button onClick={onCancel} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
    </div>
  );
}

export default function AuthSystem({ onAuthSuccess, defaultView = 'login' }) {
  const [view, setView] = useState(defaultView); // login | register | mfa | 2fa-setup
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [pendingMFA, setPendingMFA] = useState(null);
  const [token, setToken] = useState(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPwd, setRegConfirmPwd] = useState('');
  const [regLanguage, setRegLanguage] = useState('en');

  const clearErrors = () => setErrors({});

  const handleLogin = useCallback(async (e) => {
    e?.preventDefault();
    clearErrors();
    if (!loginEmail || !loginPassword) {
      setErrors({ form: 'Email and password required' });
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const d = await r.json();
      if (!r.ok) {
        setErrors({ form: d.error || 'Login failed' });
        return;
      }
      if (d.requiresMfa) {
        setPendingMFA({ pendingToken: d.pendingToken, userId: d.userId || '' });
        setView('mfa');
        return;
      }
      onAuthSuccess?.({ tokens: d.tokens, user: d.user });
    } catch {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [loginEmail, loginPassword, onAuthSuccess]);

  const handleRegister = useCallback(async (e) => {
    e?.preventDefault();
    clearErrors();
    if (!regUsername || !regEmail || !regPassword) {
      setErrors({ form: 'All fields are required' });
      return;
    }
    if (regPassword !== regConfirmPwd) {
      setErrors({ confirmPwd: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword, language: regLanguage })
      });
      const d = await r.json();
      if (!r.ok) {
        setErrors({ form: d.errors?.join(', ') || d.error || 'Registration failed' });
        return;
      }
      // Auto-login after registration
      const loginR = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword })
      });
      const loginD = await loginR.json();
      if (loginR.ok && loginD.tokens) {
        onAuthSuccess?.({ tokens: loginD.tokens, user: loginD.user });
      } else {
        setView('login');
      }
    } catch {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [regUsername, regEmail, regPassword, regConfirmPwd, regLanguage, onAuthSuccess]);

  const handleBiometric = useCallback(async (type) => {
    // In production: use WebAuthn / platform biometric APIs
    // For now: simulate credential collection
    const credentialData = {
      type,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      simulatedHash: Math.random().toString(36).slice(2)
    };

    if (!loginEmail) {
      setErrors({ form: 'Enter email to use biometric login' });
      return;
    }

    // Find userId by email first
    setLoading(true);
    try {
      const r = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loginEmail, credentialType: type, credentialData })
      });
      const d = await r.json();
      if (r.ok && d.tokens) {
        onAuthSuccess?.({ tokens: d.tokens, user: d.user });
      } else {
        setErrors({ form: d.error || 'Biometric verification failed' });
      }
    } catch {
      setErrors({ form: 'Biometric not available' });
    } finally {
      setLoading(false);
    }
  }, [loginEmail, onAuthSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-3">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-blue-300 text-sm">Enterprise AI Platform</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
          {view === 'login' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LogIn size={20} className="text-blue-500" /> Sign In
              </h2>

              {errors.form && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle size={14} /> {errors.form}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3">
                <InputField label="Email" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="you@example.com" icon={Mail} autoComplete="email" />
                <InputField label="Password" type="password" value={loginPassword} onChange={setLoginPassword} placeholder="Enter password" icon={Lock} autoComplete="current-password" />

                <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  Sign In
                </button>
              </form>

              {/* Biometric options */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-600" /></div>
                <div className="relative flex justify-center text-xs text-gray-400"><span className="bg-white dark:bg-gray-800 px-2">or use biometrics</span></div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
                  { type: 'face_id', label: 'Face ID', icon: ScanFace },
                  { type: 'touch_id', label: 'Touch ID', icon: Fingerprint }
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => handleBiometric(type)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    <Icon size={20} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>

              <button onClick={() => { setView('register'); clearErrors(); }} className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Don't have an account? Register
              </button>
            </div>
          )}

          {view === 'register' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus size={20} className="text-green-500" /> Create Account
              </h2>

              {errors.form && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle size={14} /> {errors.form}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3">
                <InputField
                  label="Username (supports emoji & special characters)"
                  value={regUsername}
                  onChange={setRegUsername}
                  placeholder="e.g. User🎮#Pro, 狐七698"
                  icon={User}
                  autoComplete="username"
                />
                <InputField label="Email" type="email" value={regEmail} onChange={setRegEmail} placeholder="you@example.com" icon={Mail} autoComplete="email" />
                <div>
                  <InputField
                    label="Password (13+ chars required)"
                    type="password"
                    value={regPassword}
                    onChange={setRegPassword}
                    placeholder="Minimum 13 characters"
                    icon={Lock}
                    autoComplete="new-password"
                  />
                  <PasswordStrengthBar password={regPassword} />
                </div>
                <InputField
                  label="Confirm Password"
                  type="password"
                  value={regConfirmPwd}
                  onChange={setRegConfirmPwd}
                  placeholder="Confirm password"
                  icon={Lock}
                  error={errors.confirmPwd}
                  autoComplete="new-password"
                />

                {/* Language selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <Globe size={14} /> Language
                  </label>
                  <select
                    value={regLanguage}
                    onChange={e => setRegLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SUPPORTED_LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Create Account
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center">
                Usernames support Unicode, emoji, and special characters.
                Passwords must be 13+ characters with uppercase, lowercase, number, and special character.
              </p>

              <button onClick={() => { setView('login'); clearErrors(); }} className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Already have an account? Sign In
              </button>
            </div>
          )}

          {view === 'mfa' && pendingMFA && (
            <MFAVerify
              pendingToken={pendingMFA.pendingToken}
              userId={pendingMFA.userId}
              onSuccess={(d) => onAuthSuccess?.({ tokens: d.tokens, user: d.user })}
              onCancel={() => setView('login')}
            />
          )}

          {view === '2fa-setup' && token && (
            <TwoFactorSetup
              token={token}
              onComplete={() => setView('login')}
            />
          )}
        </div>

        <p className="text-center text-xs text-blue-300/60 mt-4">
          Secured with AES-256-GCM encryption · Multi-platform support
        </p>
      </div>
    </div>
  );
}
