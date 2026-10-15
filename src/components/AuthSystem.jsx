// AuthSystem.jsx | Nexus AI Pro | Created: 2026-10-15 | Authentication System

import React, { useReducer, useState, useCallback } from 'react';
import {
  Shield, Eye, EyeOff, Fingerprint, ScanFace,
  Smartphone, Lock, Mail, User, Check, X,
  AlertCircle, Key, RefreshCw, ChevronRight
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const ROLES = {
  USER: 'user',
  MOD: 'moderator',
  DEV: 'developer',
  ADMIN: 'admin'
};

const TABS = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot'
};

const BIOMETRIC_METHODS = [
  { id: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
  { id: 'touchid', label: 'Touch ID', icon: Fingerprint },
  { id: 'faceid', label: 'Face ID', icon: ScanFace },
  { id: 'retinal', label: 'Retinal Scan', icon: Eye }
];

// ============================================
// PASSWORD VALIDATION
// ============================================

function analyzePassword(pwd) {
  const checks = {
    length: pwd.length >= 13,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd)
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

function strengthLabel(score) {
  if (score <= 1) return { label: 'Very Weak', color: 'bg-red-500' };
  if (score === 2) return { label: 'Weak', color: 'bg-orange-500' };
  if (score === 3) return { label: 'Fair', color: 'bg-yellow-500' };
  if (score === 4) return { label: 'Strong', color: 'bg-blue-500' };
  return { label: 'Very Strong', color: 'bg-green-500' };
}

// Unicode-aware username validation (emoji + special chars allowed)
function validateUsername(name) {
  if (!name || name.length < 3) return 'Username must be at least 3 characters';
  if (name.length > 30) return 'Username must be 30 characters or fewer';
  // Allow letters (any Unicode), digits, emoji, underscores, hyphens
  if (/[\x00-\x1F\x7F]/.test(name)) return 'Username contains invalid control characters';
  return null;
}

// ============================================
// FORM REDUCER
// ============================================

const initialFormState = {
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  role: ROLES.USER,
  inviteCode: '',
  mfaCode: '',
  rememberMe: false,
  errors: {}
};

function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, errors: { ...state.errors, [action.field]: undefined } };
    case 'SET_ERRORS':
      return { ...state, errors: { ...state.errors, ...action.errors } };
    case 'CLEAR_ERRORS':
      return { ...state, errors: {} };
    case 'RESET':
      return { ...initialFormState };
    default:
      return state;
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * @param {{ score: number, checks: object }} props
 */
function PasswordStrengthMeter({ score, checks }) {
  const { label, color } = strengthLabel(score);
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? color : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <ul className="mt-1 grid grid-cols-2 gap-0.5 text-xs">
        {[
          { key: 'length', label: '13+ characters' },
          { key: 'upper', label: 'Uppercase letter' },
          { key: 'lower', label: 'Lowercase letter' },
          { key: 'number', label: 'Number' },
          { key: 'special', label: 'Special character' }
        ].map(c => (
          <li key={c.key} className={`flex items-center gap-1 ${checks[c.key] ? 'text-green-500' : 'text-gray-400'}`}>
            {checks[c.key] ? <Check size={10} /> : <X size={10} />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {{ error?: string }} props
 */
function FieldError({ error }) {
  if (!error) return null;
  return (
    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
      <AlertCircle size={10} /> {error}
    </p>
  );
}

/**
 * @param {{ onBiometric: (method: string) => void }} props
 */
function BiometricPanel({ onBiometric }) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Or sign in with biometrics</p>
      <div className="grid grid-cols-4 gap-2">
        {BIOMETRIC_METHODS.map(m => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onBiometric(m.id)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              title={m.label}
            >
              <Icon size={18} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @param {{ method: string, onDone: () => void }} props
 */
function MFASetupPanel({ method, onDone }) {
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const totpSecret = 'JBSWY3DPEHPK3PXP'; // placeholder

  function handleVerify() {
    if (code.length === 6) {
      setSubmitted(true);
      onDone();
    }
  }

  if (method === 'sms') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">A 6-digit code was sent to your phone.</p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-lg tracking-widest text-center"
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={code.length !== 6}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            Verify
          </button>
        </div>
        {submitted && <p className="text-xs text-green-500 flex items-center gap-1"><Check size={10} /> SMS 2FA configured</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Scan this secret into your authenticator app (TOTP):
      </p>
      <div className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg break-all tracking-widest text-center text-gray-800 dark:text-gray-200">
        {totpSecret}
      </div>
      <p className="text-xs text-gray-400">Then enter the 6-digit code to confirm:</p>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-lg tracking-widest text-center"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={code.length !== 6}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
        >
          Verify
        </button>
      </div>
      {submitted && <p className="text-xs text-green-500 flex items-center gap-1"><Check size={10} /> TOTP authenticator configured</p>}
    </div>
  );
}

// ============================================
// TAB FORMS
// ============================================

function LoginForm({ state, dispatch, onSubmit, loading }) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={state.email}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })}
            placeholder="you@example.com"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <FieldError error={state.errors.email} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={state.password}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'password', value: e.target.value })}
            placeholder="••••••••••••"
            className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <FieldError error={state.errors.password} />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="rememberMe"
          checked={state.rememberMe}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'rememberMe', value: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-400">Remember me</label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} />}
        Sign In
      </button>

      {/* Social login */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Or continue with</p>
        <div className="grid grid-cols-3 gap-2">
          {['Google', 'GitHub', 'Discord'].map(provider => (
            <button
              key={provider}
              type="button"
              className="py-2 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {provider}
            </button>
          ))}
        </div>
      </div>

      <BiometricPanel onBiometric={(m) => console.log('Biometric:', m)} />
    </form>
  );
}

function RegisterForm({ state, dispatch, onSubmit, loading }) {
  const [showPwd, setShowPwd] = useState(false);
  const [mfaMethod, setMfaMethod] = useState(null);
  const { checks, score } = analyzePassword(state.password);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Username <span className="text-xs text-gray-400">(emoji supported)</span>
        </label>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={state.username}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'username', value: e.target.value })}
            placeholder="cooluser 🚀"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <FieldError error={state.errors.username} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={state.email}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })}
            placeholder="you@example.com"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <FieldError error={state.errors.email} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={state.password}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'password', value: e.target.value })}
            placeholder="13+ characters required"
            className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {state.password && <PasswordStrengthMeter score={score} checks={checks} />}
        <FieldError error={state.errors.password} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
        <input
          type="password"
          value={state.confirmPassword}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'confirmPassword', value: e.target.value })}
          placeholder="Re-enter password"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
        <FieldError error={state.errors.confirmPassword} />
      </div>

      {/* Role selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(ROLES).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'role', value: val })}
              className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors capitalize ${
                state.role === val
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Admin invite code */}
      {state.role === ROLES.ADMIN && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Invite Code</label>
          <div className="relative">
            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={state.inviteCode}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'inviteCode', value: e.target.value })}
              placeholder="Enter invite code"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <FieldError error={state.errors.inviteCode} />
        </div>
      )}

      {/* 2FA/MFA setup */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-blue-500" /> Enable 2FA/MFA (recommended)
        </p>
        <div className="flex gap-2 mb-3">
          {['totp', 'sms'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMfaMethod(mfaMethod === m ? null : m)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                mfaMethod === m
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {m === 'totp' ? <Key size={10} /> : <Smartphone size={10} />}
              {m === 'totp' ? 'Authenticator App' : 'SMS Backup'}
            </button>
          ))}
        </div>
        {mfaMethod && (
          <MFASetupPanel method={mfaMethod} onDone={() => setMfaMethod(null)} />
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} />}
        Create Account
      </button>
    </form>
  );
}

function ForgotPasswordForm({ state, dispatch, onSubmit, loading }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Enter your email address and we'll send you a reset link.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={state.email}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })}
            placeholder="you@example.com"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <FieldError error={state.errors.email} />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
        Send Reset Link
      </button>
    </form>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * AuthSystem — login / register / forgot password with biometrics and 2FA
 * @param {{ onSuccess?: (user: object) => void, className?: string }} props
 */
export default function AuthSystem({ onSuccess, className = '' }) {
  const [tab, setTab] = useState(TABS.LOGIN);
  const [state, dispatch] = useReducer(formReducer, initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  function validateLogin() {
    const errors = {};
    if (!state.email) errors.email = 'Email is required';
    if (!state.password) errors.password = 'Password is required';
    return errors;
  }

  function validateRegister() {
    const errors = {};
    const usernameErr = validateUsername(state.username);
    if (usernameErr) errors.username = usernameErr;
    if (!state.email) errors.email = 'Email is required';
    const { score } = analyzePassword(state.password);
    if (score < 4) errors.password = 'Password is too weak (need 13+ chars, upper, number, special)';
    if (state.password !== state.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (state.role === ROLES.ADMIN && !state.inviteCode) errors.inviteCode = 'Admin invite code required';
    return errors;
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setMessage(null);

    const errors = tab === TABS.LOGIN ? validateLogin()
      : tab === TABS.REGISTER ? validateRegister()
      : (!state.email ? { email: 'Email is required' } : {});

    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return;
    }

    setLoading(true);
    try {
      const endpoint = tab === TABS.LOGIN ? '/api/auth/login'
        : tab === TABS.REGISTER ? '/api/auth/register'
        : '/api/auth/forgot-password';

      const body = tab === TABS.LOGIN
        ? { email: state.email, password: state.password, rememberMe: state.rememberMe }
        : tab === TABS.REGISTER
        ? { email: state.email, username: state.username, password: state.password, role: state.role, inviteCode: state.inviteCode }
        : { email: state.email };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Request failed' });
      } else {
        setMessage({ type: 'success', text: tab === TABS.FORGOT ? 'Reset link sent!' : 'Success!' });
        if (onSuccess) onSuccess(data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error — please try again' });
    } finally {
      setLoading(false);
    }
  }, [tab, state, onSuccess]);

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 ${className}`}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Logo header */}
        <div className="p-6 pb-0 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl mb-3">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nexus AI Pro</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mt-4">
          {[
            { id: TABS.LOGIN, label: 'Sign In' },
            { id: TABS.REGISTER, label: 'Register' },
            { id: TABS.FORGOT, label: 'Reset' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setMessage(null); dispatch({ type: 'CLEAR_ERRORS' }); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="p-6">
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
              message.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            }`}>
              {message.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
              {message.text}
            </div>
          )}

          {tab === TABS.LOGIN && <LoginForm state={state} dispatch={dispatch} onSubmit={handleSubmit} loading={loading} />}
          {tab === TABS.REGISTER && <RegisterForm state={state} dispatch={dispatch} onSubmit={handleSubmit} loading={loading} />}
          {tab === TABS.FORGOT && <ForgotPasswordForm state={state} dispatch={dispatch} onSubmit={handleSubmit} loading={loading} />}
        </div>
      </div>
    </div>
  );
}
