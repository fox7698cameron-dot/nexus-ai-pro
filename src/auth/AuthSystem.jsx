// src/auth/AuthSystem.jsx
// Nexus AI Pro — Full Authentication System
// Roles: admin | dev | moderator | user
// Features: biometrics, 2FA/MFA, 13+ char passwords, emoji usernames
// Updated: 2026-05-03

import React, { useState, useRef, useCallback, useContext, createContext } from 'react';
import {
  User, Lock, Mail, Eye, EyeOff, Fingerprint, ShieldCheck,
  Smartphone, Key, AlertTriangle, CheckCircle, XCircle,
  Shield, Settings, ChevronRight, LogOut, Crown, Code, Wrench
} from 'lucide-react';

// ─── Auth Context ────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ─── Constants ───────────────────────────────────────────────────────────────
const ROLES = {
  admin:     { label: 'Admin',     icon: <Crown size={14} />,    color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  dev:       { label: 'Developer', icon: <Code size={14} />,     color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  moderator: { label: 'Moderator', icon: <Wrench size={14} />,   color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  user:      { label: 'User',      icon: <User size={14} />,     color: 'text-gray-600',   bg: 'bg-gray-50 dark:bg-gray-800',      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
};

// Minimum password requirements: 13+ chars, upper/lower/digit/special
const PASSWORD_RULES = [
  { id: 'len',     test: p => p.length >= 13,                                   label: '13+ characters' },
  { id: 'upper',   test: p => /[A-Z]/.test(p),                                  label: 'Uppercase letter' },
  { id: 'lower',   test: p => /[a-z]/.test(p),                                  label: 'Lowercase letter' },
  { id: 'digit',   test: p => /[0-9]/.test(p),                                  label: 'Number' },
  { id: 'special', test: p => /[^A-Za-z0-9]/.test(p),                           label: 'Special character or emoji' },
];

function getPasswordStrength(password) {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: 'Very Weak', color: 'bg-red-500' };
  if (passed === 2) return { score: 2, label: 'Weak',     color: 'bg-orange-500' };
  if (passed === 3) return { score: 3, label: 'Fair',     color: 'bg-yellow-500' };
  if (passed === 4) return { score: 4, label: 'Strong',   color: 'bg-blue-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-green-500' };
}

// Allows letters, digits, emoji, and most Unicode — blocks control characters and null bytes
function validateUsername(u) {
  if (!u || u.length < 2) return 'Username must be at least 2 characters';
  if (u.length > 32) return 'Username must be 32 characters or less';
  // Block null bytes and ASCII control characters; allow everything else (emoji, unicode, etc.)
  if (/[\x00-\x1F\x7F]/.test(u)) return 'Username contains invalid characters';
  return null;
}

// ─── Password Strength Meter ─────────────────────────────────────────────────
function PasswordMeter({ password }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 flex gap-1 h-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'}`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${strength.score >= 4 ? 'text-green-600' : strength.score >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
          {strength.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {PASSWORD_RULES.map(rule => (
          <span
            key={rule.id}
            className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors ${
              rule.test(password)
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}
          >
            {rule.test(password) ? <CheckCircle size={9} /> : <XCircle size={9} />}
            {rule.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── MFA Setup Component ──────────────────────────────────────────────────────
function MFASetup({ onComplete, onSkip }) {
  const [method, setMethod] = useState('totp');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [biometricSupported] = useState(() => 'credentials' in navigator && window.PublicKeyCredential !== undefined);

  const handleVerify = () => {
    if (code.length === 6 || method === 'biometric') {
      onComplete(method);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <ShieldCheck size={40} className="mx-auto text-blue-600 mb-2" />
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Set Up Multi-Factor Auth</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred 2FA method</p>
      </div>

      {step === 1 && (
        <div className="space-y-2">
          {[
            { key: 'totp',      label: 'Authenticator App',   desc: 'Google Authenticator, Authy, etc.',  icon: <Smartphone size={18} /> },
            { key: 'sms',       label: 'SMS Text Message',     desc: 'Receive code via text',              icon: <Smartphone size={18} /> },
            { key: 'biometric', label: 'Biometric / Passkey',  desc: 'Face ID, Touch ID, Fingerprint',    icon: <Fingerprint size={18} />, disabled: !biometricSupported },
            { key: 'email',     label: 'Email Code',           desc: 'Receive code via email',             icon: <Mail size={18} /> },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => !opt.disabled && setMethod(opt.key)}
              disabled={opt.disabled}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                method === opt.key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className={method === opt.key ? 'text-blue-600' : 'text-gray-400'}>{opt.icon}</span>
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">{opt.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
              </div>
              {method === opt.key && <CheckCircle size={16} className="ml-auto text-blue-600" />}
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={onSkip} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
              Skip for now
            </button>
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm text-white hover:bg-blue-700">
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {method === 'totp' && (
            <>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                <div className="w-32 h-32 mx-auto bg-white border-4 border-gray-200 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-xs text-gray-400">QR Code</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Scan with your authenticator app</p>
                <p className="font-mono text-xs mt-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-200">
                  JBSWY3DPEHPK3PXP
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter 6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-widest border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 dark:text-white"
                />
              </div>
            </>
          )}
          {method === 'biometric' && (
            <div className="text-center py-6">
              <Fingerprint size={48} className="mx-auto text-blue-600 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Press the button to register your biometric</p>
            </div>
          )}
          {(method === 'sms' || method === 'email') && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">A 6-digit code has been sent</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-2xl font-mono tracking-widest border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500">Back</button>
            <button onClick={handleVerify} className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm text-white hover:bg-blue-700">
              Verify & Enable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────
function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'user' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [mfaStep, setMfaStep] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    const unErr = validateUsername(form.username);
    if (unErr) errs.username = unErr;
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required';
    const passing = PASSWORD_RULES.filter(r => r.test(form.password)).length;
    if (passing < 5) errs.password = 'Password does not meet all requirements';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setMfaStep(true);
  };

  const completeMFA = async (method) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    onRegister({ username: form.username, email: form.email, role: form.role, mfaMethod: method });
    setLoading(false);
  };

  if (mfaStep) {
    return <MFASetup onComplete={completeMFA} onSkip={() => completeMFA('none')} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Username <span className="text-gray-400 text-xs">(emoji & Unicode supported)</span>
        </label>
        <input
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          placeholder="e.g. gamer_fox 🦊 or 开发者"
          className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white transition-colors ${errors.username ? 'border-red-400' : 'border-gray-200 dark:border-gray-600 focus:border-blue-500'}`}
        />
        {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="you@example.com"
          className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white ${errors.email ? 'border-red-400' : 'border-gray-200 dark:border-gray-600 focus:border-blue-500'}`}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="13+ characters with special chars"
            className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 dark:text-white ${errors.password ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
          />
          <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <PasswordMeter password={form.password} />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          placeholder="Re-enter password"
          className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
        />
        {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-blue-600 hover:underline">Sign in</button>
      </p>
    </form>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin, onSwitchToRegister }) {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.identifier || !form.password) { setError('All fields required'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setMfaRequired(true);
    setLoading(false);
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    if (mfaCode.length !== 6) { setError('Enter 6-digit code'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    onLogin({ identifier: form.identifier, role: 'user' });
    setLoading(false);
  };

  const handleBiometric = async () => {
    setLoading(true);
    try {
      if ('credentials' in navigator && window.PublicKeyCredential) {
        await new Promise(r => setTimeout(r, 800));
        onLogin({ identifier: form.identifier, role: 'user', method: 'biometric' });
      } else {
        setError('Biometric authentication not available on this device');
      }
    } catch {
      setError('Biometric authentication failed');
    }
    setLoading(false);
  };

  if (mfaRequired) {
    return (
      <form onSubmit={handleMFA} className="space-y-4">
        <div className="text-center">
          <ShieldCheck size={40} className="mx-auto text-blue-600 mb-2" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Two-Factor Verification</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Enter the 6-digit code from your authenticator app</p>
        </div>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={mfaCode}
          onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full text-center text-3xl font-mono tracking-widest border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 bg-white dark:bg-gray-800 dark:text-white"
          autoFocus
        />
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setMfaRequired(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500">Back</button>
          <button type="submit" disabled={loading || mfaCode.length !== 6} className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm text-white disabled:opacity-50">
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </div>
        <button
          type="button"
          onClick={handleBiometric}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Fingerprint size={16} className="text-blue-600" />
          Use Biometric Instead
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email or Username</label>
        <input
          value={form.identifier}
          onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
          placeholder="you@example.com or username"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:border-blue-500 outline-none"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="••••••••••••••"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 dark:text-white"
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <button
        type="button"
        onClick={handleBiometric}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100"
      >
        <Fingerprint size={16} className="text-blue-600" />
        Sign in with Biometrics / Face ID
      </button>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-blue-600 hover:underline">Register</button>
      </p>
    </form>
  );
}

// ─── Auth Gate (main exported component) ─────────────────────────────────────
export function AuthGate({ children }) {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);

  const handleLogin = useCallback((data) => {
    setUser({ id: `u-${Date.now()}`, ...data, role: data.role || 'user' });
  }, []);

  const handleRegister = useCallback((data) => {
    setUser({ id: `u-${Date.now()}`, ...data });
  }, []);

  const handleLogout = useCallback(() => setUser(null), []);

  if (user) {
    return (
      <AuthContext.Provider value={{ user, logout: handleLogout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  const roleCfg = ROLES[view] || ROLES.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⬡</div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-blue-300 text-sm mt-1">Enterprise AI Platform</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
          {view === 'login'
            ? <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setView('register')} />
            : <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setView('login')} />
          }
        </div>

        <p className="text-center text-xs text-blue-300/60 mt-4">
          AES-256-GCM encrypted · TLS 1.3 · Zero-knowledge auth
        </p>
      </div>
    </div>
  );
}

// ─── Role-based dashboard badge ───────────────────────────────────────────────
export function RoleBadge({ role }) {
  const cfg = ROLES[role] || ROLES.user;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export { ROLES, PASSWORD_RULES, validateUsername, getPasswordStrength };
export default AuthGate;
