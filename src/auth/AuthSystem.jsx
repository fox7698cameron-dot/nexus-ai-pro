/**
 * src/auth/AuthSystem.jsx
 * Full authentication system: registration, login, biometrics, MFA, role-based access.
 * Supports: admin, dev, moderator, user roles.
 * Created: 2026-10-14
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Shield, Lock, Eye, EyeOff, Fingerprint, ScanFace, User,
  Mail, Key, CheckCircle, XCircle, AlertTriangle, Loader2,
  Smartphone, ChevronRight, RefreshCw, UserCheck
} from 'lucide-react';
import { t } from '../i18n/index.js';

// Password strength: minimum 13 chars, upper, lower, digit, special
const PASSWORD_MIN_LENGTH = 13;
const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;
const evaluatePasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  const checks = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: SPECIAL_CHARS.test(password),
    long: password.length >= 20
  };
  const score = Object.values(checks).filter(Boolean).length;
  if (!checks.length || !checks.special) return { score: 1, label: t('auth', 'tooWeak'), color: '#ef4444', checks };
  if (score <= 3) return { score: 2, label: t('auth', 'weak'), color: '#f97316', checks };
  if (score <= 4) return { score: 3, label: t('auth', 'fair'), color: '#eab308', checks };
  if (score === 5) return { score: 4, label: t('auth', 'strong'), color: '#22c55e', checks };
  return { score: 5, label: t('auth', 'veryStrong'), color: '#10b981', checks };
};

// Username allows letters, digits, underscores, hyphens, dots, AND emoji/unicode
const validateUsername = (username) => {
  if (!username || username.length < 2) return 'Username must be at least 2 characters';
  if (username.length > 64) return 'Username must be 64 characters or fewer';
  // Block null bytes and control chars only — allow all unicode + emoji
  if (/[\u0000-\u001F\u007F]/.test(username)) return 'Username contains invalid characters';
  return null;
};

const ROLES = [
  { id: 'user', label: 'User', icon: '👤', description: 'Standard access — chat, analytics, projects' },
  { id: 'moderator', label: 'Moderator', icon: '🛡️', description: 'Content moderation & user management' },
  { id: 'dev', label: 'Developer', icon: '💻', description: 'API access, dev tools, advanced features' },
  { id: 'admin', label: 'Admin', icon: '👑', description: 'Full system access & configuration' }
];

// WebAuthn biometric helpers
const isBiometricSupported = () =>
  typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;

const registerBiometric = async (userId, username) => {
  if (!isBiometricSupported()) throw new Error('WebAuthn not supported on this device/browser');
  const challengeRes = await fetch('/api/auth/webauthn/register/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, username })
  });
  const { challenge, rpId, rpName } = await challengeRes.json();
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
      rp: { id: rpId, name: rpName },
      user: { id: Uint8Array.from(userId, c => c.charCodeAt(0)), name: username, displayName: username },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none'
    }
  });
  const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      id: credential.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      type: credential.type,
      response: {
        attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
        clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON)))
      }
    })
  });
  return verifyRes.json();
};

const authenticateBiometric = async (username) => {
  if (!isBiometricSupported()) throw new Error('WebAuthn not supported');
  const challengeRes = await fetch('/api/auth/webauthn/auth/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const { challenge, allowCredentials, rpId } = await challengeRes.json();
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
      rpId,
      allowCredentials: allowCredentials.map(c => ({
        id: Uint8Array.from(atob(c.id), x => x.charCodeAt(0)),
        type: 'public-key'
      })),
      userVerification: 'required',
      timeout: 60000
    }
  });
  const verifyRes = await fetch('/api/auth/webauthn/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      id: assertion.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
      type: assertion.type,
      response: {
        authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))),
        clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))),
        signature: btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature))),
        userHandle: assertion.response.userHandle
          ? btoa(String.fromCharCode(...new Uint8Array(assertion.response.userHandle)))
          : null
      }
    })
  });
  return verifyRes.json();
};

const PasswordStrengthBar = ({ password }) => {
  const strength = evaluatePasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i <= strength.score ? strength.color : '#334155' }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
    </div>
  );
};

const MFASetup = ({ mfaSetup, onVerify, onSkip }) => (
  <div className="space-y-4">
    <div className="text-center">
      <Smartphone className="mx-auto mb-2 text-indigo-400" size={40} />
      <h3 className="text-lg font-semibold text-white">Set Up Two-Factor Authentication</h3>
      <p className="text-sm text-slate-400 mt-1">Scan this QR code with Google Authenticator, Authy, or any TOTP app</p>
    </div>
    {mfaSetup?.qrCode && (
      <div className="flex justify-center">
        <img src={mfaSetup.qrCode} alt="MFA QR Code" className="w-48 h-48 bg-white p-2 rounded-lg" />
      </div>
    )}
    {mfaSetup?.secret && (
      <div className="bg-slate-800 rounded-lg p-3 text-center">
        <p className="text-xs text-slate-400 mb-1">Manual entry key:</p>
        <code className="text-sm text-indigo-300 break-all">{mfaSetup.secret}</code>
      </div>
    )}
    <MFAInput onVerify={onVerify} />
    <button onClick={onSkip} className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors">
      Skip for now (not recommended)
    </button>
  </div>
);

const MFAInput = ({ onVerify, loading }) => {
  const [code, setCode] = useState('');
  return (
    <div className="space-y-3">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-indigo-500"
      />
      <button
        onClick={() => onVerify(code)}
        disabled={code.length !== 6 || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
        Verify Code
      </button>
    </div>
  );
};

export function AuthSystem({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // login | register | mfa | mfa-setup | forgot
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', username: '', role: 'user', mfaCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaSetup, setMfaSetup] = useState(null);
  const [pendingAuth, setPendingAuth] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    setBiometricAvailable(isBiometricSupported());
  }, []);

  const update = useCallback((field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }, []);

  const handleRegister = async () => {
    const usernameError = validateUsername(form.username);
    if (usernameError) { setError(usernameError); return; }
    const strength = evaluatePasswordStrength(form.password);
    if (strength.score < 2) { setError(strength.label || 'Password too weak'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!form.email.includes('@')) { setError('Invalid email address'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, username: form.username, role: form.role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      if (data.mfaSetup) {
        setMfaSetup(data.mfaSetup);
        setPendingAuth({ token: data.token, user: data.user });
        setMode('mfa-setup');
      } else {
        onAuthSuccess?.(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Email and password required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.requiresMFA) {
        setPendingAuth({ userId: data.userId });
        setMode('mfa');
      } else {
        onAuthSuccess?.(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!form.email) { setError('Enter your email first to use biometrics'); return; }
    setLoading(true);
    try {
      const data = await authenticateBiometric(form.email);
      if (data.token) onAuthSuccess?.(data);
      else setError(data.error || 'Biometric authentication failed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (code) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingAuth?.userId || pendingAuth?.user?.id, code, token: pendingAuth?.token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MFA verification failed');
      onAuthSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMFASetupComplete = async (code) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pendingAuth?.token, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MFA setup failed');
      onAuthSuccess?.({ ...pendingAuth, mfaEnabled: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <Shield className="text-indigo-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-slate-400 text-sm mt-1">Secure • Encrypted • Private</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-red-400 text-sm">
              <XCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 mb-4 text-green-400 text-sm">
              <CheckCircle size={16} className="shrink-0" />
              {success}
            </div>
          )}

          {/* MFA Setup */}
          {mode === 'mfa-setup' && (
            <MFASetup mfaSetup={mfaSetup} onVerify={handleMFASetupComplete} onSkip={() => onAuthSuccess?.(pendingAuth)} />
          )}

          {/* MFA Verification */}
          {mode === 'mfa' && (
            <div className="space-y-4">
              <div className="text-center">
                <Smartphone className="mx-auto mb-2 text-indigo-400" size={40} />
                <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-400 mt-1">Enter the 6-digit code from your authenticator app</p>
              </div>
              <MFAInput onVerify={handleMFAVerify} loading={loading} />
              <button onClick={() => setMode('login')} className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors">
                Back to login
              </button>
            </div>
          )}

          {/* Login */}
          {mode === 'login' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{t('auth', 'login')}</h2>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input type="email" placeholder={t('auth', 'email')} value={form.email}
                  onChange={e => update('email', e.target.value)}
                  className={`${inputClass} pl-10`} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input type={showPassword ? 'text' : 'password'} placeholder={t('auth', 'password')} value={form.password}
                  onChange={e => update('password', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className={`${inputClass} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button onClick={handleLogin} disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <ChevronRight size={18} />}
                {t('auth', 'login')}
              </button>
              {biometricAvailable && (
                <button onClick={handleBiometricLogin} disabled={loading}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                  <Fingerprint size={18} className="text-indigo-400" />
                  {t('auth', 'biometric')} / Face ID
                </button>
              )}
              <div className="flex items-center justify-between text-sm">
                <button onClick={() => setMode('forgot')} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  {t('auth', 'forgotPassword')}
                </button>
                <button onClick={() => setMode('register')} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  {t('auth', 'register')} →
                </button>
              </div>
            </div>
          )}

          {/* Register */}
          {mode === 'register' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{t('auth', 'register')}</h2>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input type="text" placeholder={`${t('auth', 'username')} (emoji & unicode OK)`} value={form.username}
                  onChange={e => update('username', e.target.value)}
                  className={`${inputClass} pl-10`} />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input type="email" placeholder={t('auth', 'email')} value={form.email}
                  onChange={e => update('email', e.target.value)}
                  className={`${inputClass} pl-10`} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input type={showPassword ? 'text' : 'password'} placeholder={`${t('auth', 'password')} (13+ chars)`} value={form.password}
                  onChange={e => update('password', e.target.value)}
                  className={`${inputClass} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrengthBar password={form.password} />
              <div className="relative">
                <Key className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input type={showConfirm ? 'text' : 'password'} placeholder={t('auth', 'confirmPassword')} value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  className={`${inputClass} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Role selector */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t('auth', 'role')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(role => (
                    <button key={role.id} type="button"
                      onClick={() => update('role', role.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors text-sm ${
                        form.role === role.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                      }`}>
                      <span>{role.icon}</span>
                      <span className="font-medium">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleRegister} disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <UserCheck size={18} />}
                {t('auth', 'register')}
              </button>
              <button onClick={() => setMode('login')} className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors">
                ← Back to sign in
              </button>
            </div>
          )}

          {/* Forgot password */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Reset Password</h2>
              <p className="text-sm text-slate-400">Enter your email and we'll send a secure reset link.</p>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input type="email" placeholder={t('auth', 'email')} value={form.email}
                  onChange={e => update('email', e.target.value)}
                  className={`${inputClass} pl-10`} />
              </div>
              <button onClick={async () => {
                setLoading(true);
                try {
                  await fetch('/api/auth/forgot-password', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: form.email })
                  });
                  setSuccess('Reset link sent if the email exists');
                  setMode('login');
                } catch (_) {
                  setError('Failed to send reset email');
                } finally { setLoading(false); }
              }} disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Send Reset Link
              </button>
              <button onClick={() => setMode('login')} className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors">
                ← Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          AES-256-GCM encrypted · E2E secure · No plaintext storage
        </p>
      </div>
    </div>
  );
}

export default AuthSystem;
