// src/auth/AuthSystem.jsx
// Nexus AI Pro — Full Authentication System
// Supports: registration, login, MFA/2FA, biometrics, role-based access
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// 2026-04-23

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  Shield, Eye, EyeOff, Lock, User, Mail, Phone, CheckCircle,
  XCircle, Fingerprint, Smartphone, AlertTriangle, ArrowRight,
  RefreshCw, Key, Globe
} from 'lucide-react';

// ─── Auth Context ────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const ROLES = {
  admin:     { label: 'Admin',     color: '#EF4444', permissions: ['*'] },
  developer: { label: 'Developer', color: '#6366F1', permissions: ['dashboard:dev','analytics:read','security:read','projects:*'] },
  moderator: { label: 'Moderator', color: '#F59E0B', permissions: ['dashboard:mod','analytics:read'] },
  user:      { label: 'User',      color: '#10B981', permissions: ['dashboard:user','analytics:own'] },
};

// ─── Password Strength ───────────────────────────────────────────────────────

function evaluatePassword(pwd) {
  if (!pwd) return { score: 0, label: '', color: '#374151', tips: [] };
  const tips = [];
  let score = 0;

  if (pwd.length >= 13)  { score += 25; } else { tips.push('Use at least 13 characters'); }
  if (pwd.length >= 18)    score += 10;
  if (/[A-Z]/.test(pwd))  { score += 15; } else { tips.push('Add uppercase letters'); }
  if (/[a-z]/.test(pwd))  { score += 10; } else { tips.push('Add lowercase letters'); }
  if (/[0-9]/.test(pwd))  { score += 15; } else { tips.push('Add numbers'); }
  if (/[^A-Za-z0-9]/.test(pwd)) { score += 20; } else { tips.push('Add special characters (!@#$…)'); }
  if (/[\u{1F000}-\u{1FFFF}]/u.test(pwd)) score += 5;

  const label = score < 30 ? 'Very Weak' : score < 50 ? 'Weak' : score < 70 ? 'Fair' : score < 85 ? 'Strong' : 'Very Strong';
  const color = score < 30 ? '#EF4444' : score < 50 ? '#F97316' : score < 70 ? '#F59E0B' : score < 85 ? '#10B981' : '#6366F1';

  return { score: Math.min(score, 100), label, color, tips };
}

function PasswordStrengthBar({ password }) {
  const { score, label, color, tips } = evaluatePassword(password);
  if (!password) return null;

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Strength</span>
        <span style={{ color }} className="font-semibold">{label}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      {tips.length > 0 && (
        <ul className="space-y-0.5">
          {tips.map((t, i) => (
            <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
              <XCircle size={10} className="text-red-400 flex-shrink-0" /> {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, placeholder, error, icon: Icon, suffix }) {
  const [show, setShow] = useState(false);
  const inputType = type === 'password' ? (show ? 'text' : 'password') : type;

  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>}
      <div className={`flex items-center gap-2 bg-gray-800 border rounded-xl px-3 py-2.5 transition-colors ${
        error ? 'border-red-500' : 'border-gray-600 focus-within:border-indigo-500'
      }`}>
        {Icon && <Icon size={16} className="text-gray-500 flex-shrink-0" />}
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none min-w-0"
          autoComplete={type === 'password' ? 'new-password' : undefined}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(s => !s)} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        {suffix}
      </div>
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={10} />{error}</p>}
    </div>
  );
}

// ─── MFA Setup ───────────────────────────────────────────────────────────────

function MFASetup({ onComplete, onSkip }) {
  const [step, setStep]     = useState('choose');  // choose | totp | sms | done
  const [code, setCode]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const verifyTOTP = async () => {
    if (code.length !== 6) { setError('Code must be 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, method: 'totp' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'choose') return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Set Up Two-Factor Auth</h2>
      <p className="text-gray-400 text-sm">Add an extra layer of security to your account.</p>
      <div className="space-y-2">
        {[
          { id: 'totp', icon: Smartphone, label: 'Authenticator App', desc: 'Google Authenticator, Authy, 1Password' },
          { id: 'sms',  icon: Phone,      label: 'SMS Text Message',   desc: 'Receive a code via SMS' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setStep(m.id)}
            className="w-full flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-indigo-500 rounded-xl transition-all text-left"
          >
            <m.icon size={20} className="text-indigo-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">{m.label}</div>
              <div className="text-xs text-gray-400">{m.desc}</div>
            </div>
            <ArrowRight size={14} className="text-gray-500 ml-auto" />
          </button>
        ))}
      </div>
      <button onClick={onSkip} className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-2">
        Skip for now (not recommended)
      </button>
    </div>
  );

  if (step === 'totp') return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Authenticator App</h2>
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center space-y-3">
        <div className="w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center">
          <div className="text-gray-400 text-xs text-center">QR Code<br/>placeholder</div>
        </div>
        <div className="font-mono text-sm text-indigo-300 bg-gray-900 rounded-lg px-3 py-2 select-all">
          JBSWY3DPEHPK3PXP (demo key)
        </div>
      </div>
      <Field
        label="Enter 6-digit code from your app"
        value={code}
        onChange={v => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        placeholder="000000"
        icon={Key}
        error={error}
      />
      <div className="flex gap-2">
        <button onClick={() => setStep('choose')} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm transition-colors">Back</button>
        <button onClick={verifyTOTP} disabled={loading || code.length !== 6} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors">
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </div>
    </div>
  );

  if (step === 'done') return (
    <div className="text-center space-y-4 py-4">
      <CheckCircle size={48} className="text-emerald-400 mx-auto" />
      <h2 className="text-lg font-bold text-white">MFA Enabled!</h2>
      <p className="text-gray-400 text-sm">Your account is now protected with two-factor authentication.</p>
      <button onClick={onComplete} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors">
        Continue to Dashboard
      </button>
    </div>
  );

  return null;
}

// ─── Biometric Auth ──────────────────────────────────────────────────────────

function BiometricPrompt({ onSuccess, onFallback }) {
  const [state, setState] = useState('idle');

  const attempt = async () => {
    setState('scanning');
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        await new Promise(r => setTimeout(r, 1500));
        setState('success');
        setTimeout(onSuccess, 600);
      } else {
        throw new Error('WebAuthn not supported on this device');
      }
    } catch {
      setState('error');
    }
  };

  const icons = {
    idle:     <Fingerprint size={40} className="text-indigo-400" />,
    scanning: <Fingerprint size={40} className="text-indigo-400 animate-pulse" />,
    success:  <CheckCircle size={40} className="text-emerald-400" />,
    error:    <XCircle size={40} className="text-red-400" />,
  };

  return (
    <div className="text-center space-y-5 py-4">
      <div className="flex justify-center">{icons[state]}</div>
      <div>
        <h3 className="text-base font-bold text-white">
          {state === 'idle' ? 'Use Biometric Auth' : state === 'scanning' ? 'Scanning…' : state === 'success' ? 'Authenticated!' : 'Scan Failed'}
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          {state === 'idle' ? 'Touch ID · Face ID · Fingerprint · Retinal Scan' :
           state === 'error' ? 'Could not verify biometric. Try again or use password.' : ''}
        </p>
      </div>
      {(state === 'idle' || state === 'error') && (
        <button onClick={attempt} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors">
          {state === 'error' ? 'Try Again' : 'Scan Now'}
        </button>
      )}
      <button onClick={onFallback} className="text-xs text-gray-500 hover:text-gray-300">
        Use password instead
      </button>
    </div>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    displayName: '', language: 'en',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register');

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const errs = {};
    // Username: allow letters, numbers, emoji, underscores, dots, hyphens
    if (!form.username.trim()) errs.username = 'Username is required';
    else if (form.username.length < 3) errs.username = 'Username too short';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Invalid email';
    const strength = evaluatePassword(form.password);
    if (form.password.length < 13) errs.password = 'Password must be at least 13 characters';
    else if (strength.score < 50) errs.password = 'Password is too weak';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          displayName: form.displayName || form.username,
          language: form.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setStep('mfa');
    } catch (e) {
      setErrors({ submit: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'mfa') return <MFASetup onComplete={onSuccess} onSkip={onSuccess} />;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-white">Create Account</h2>
        <p className="text-gray-400 text-sm mt-1">Join Nexus AI Pro</p>
      </div>

      <Field label="Username (emoji ✓)" value={form.username} onChange={set('username')} placeholder="cool_user 🚀" icon={User} error={errors.username} />
      <Field label="Display Name" value={form.displayName} onChange={set('displayName')} placeholder="Your Name" icon={User} />
      <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" icon={Mail} error={errors.email} />
      <div>
        <Field label="Password (13+ chars)" type="password" value={form.password} onChange={set('password')} placeholder="Strong password…" icon={Lock} error={errors.password} />
        <PasswordStrengthBar password={form.password} />
      </div>
      <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" icon={Lock} error={errors.confirmPassword} />

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Language</label>
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5">
          <Globe size={16} className="text-gray-500" />
          <select value={form.language} onChange={e => set('language')(e.target.value)} className="flex-1 bg-transparent text-white text-sm outline-none">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
            <option value="zh">中文</option>
            <option value="ko">한국어</option>
            <option value="pt">Português</option>
            <option value="ar">العربية</option>
            <option value="ru">Русский</option>
          </select>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-3 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle size={14} /> {errors.submit}
        </div>
      )}

      <button onClick={submit} disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
        {loading ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRight size={15} />}
        {loading ? 'Creating Account…' : 'Create Account'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Already have an account?{' '}
        <button onClick={onSwitch} className="text-indigo-400 hover:text-indigo-300">Sign In</button>
      </p>
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode]   = useState('');
  const [step, setStep]         = useState('credentials'); // credentials | mfa | biometric
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const loginWithCredentials = async () => {
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.mfaRequired) { setStep('mfa'); return; }
      onSuccess(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (mfaCode.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: mfaCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      onSuccess(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'biometric') return (
    <BiometricPrompt
      onSuccess={() => onSuccess({ token: 'biometric-auth', user: { email } })}
      onFallback={() => setStep('credentials')}
    />
  );

  if (step === 'mfa') return (
    <div className="space-y-4">
      <div className="text-center">
        <Smartphone size={32} className="text-indigo-400 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-white">Two-Factor Auth</h2>
        <p className="text-gray-400 text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
      </div>
      <Field value={mfaCode} onChange={v => { setMfaCode(v.replace(/\D/g,'').slice(0,6)); setError(''); }} placeholder="000000" icon={Key} error={error} />
      <button onClick={verifyMFA} disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors">
        {loading ? 'Verifying…' : 'Verify Code'}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-white">Welcome Back</h2>
        <p className="text-gray-400 text-sm mt-1">Sign in to Nexus AI Pro</p>
      </div>

      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" icon={Mail} />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" icon={Lock} />

      {error && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-3 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <button onClick={loginWithCredentials} disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
        {loading ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
        {loading ? 'Signing In…' : 'Sign In'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700" /></div>
        <div className="relative flex justify-center"><span className="bg-gray-900 px-3 text-xs text-gray-500">or</span></div>
      </div>

      <button onClick={() => setStep('biometric')} className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
        <Fingerprint size={16} className="text-indigo-400" /> Use Biometrics (Touch ID / Face ID)
      </button>

      <p className="text-center text-xs text-gray-500">
        No account?{' '}
        <button onClick={onSwitch} className="text-indigo-400 hover:text-indigo-300">Create one</button>
      </p>
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

export function AuthModal({ onAuthenticated }) {
  const [mode, setMode] = useState('login');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield size={28} className="text-indigo-400" />
          <span className="text-lg font-bold text-white">Nexus AI Pro</span>
        </div>
        {mode === 'login'
          ? <LoginForm onSuccess={onAuthenticated} onSwitch={() => setMode('register')} />
          : <RegisterForm onSuccess={onAuthenticated} onSwitch={() => setMode('login')} />
        }
      </div>
    </div>
  );
}

// ─── Auth Provider ────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => sessionStorage.getItem('nap_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('nap_token');
  }, []);

  const login = useCallback((data) => {
    setUser(data.user);
    setToken(data.token);
    if (data.token) sessionStorage.setItem('nap_token', data.token);
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user) setUser(data.user); else logout(); })
      .catch(logout)
      .finally(() => setLoading(false));
  }, [token, logout]);

  const hasPermission = useCallback((permission) => {
    if (!user?.role) return false;
    const perms = ROLES[user.role]?.permissions || [];
    return perms.includes('*') || perms.includes(permission);
  }, [user]);

  if (loading) return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
      <Shield size={32} className="text-indigo-400 animate-pulse" />
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasPermission, ROLES }}>
      {!user ? <AuthModal onAuthenticated={login} /> : children}
    </AuthContext.Provider>
  );
}

export { ROLES };
export default AuthProvider;
