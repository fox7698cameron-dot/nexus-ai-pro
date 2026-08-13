/**
 * Nexus AI Pro - Authentication System
 * Date: 2026-08-13
 * Copyright © 2026 Cameron Fox. All rights reserved.
 *
 * Full-featured authentication component supporting:
 *   • Role-based login  (Admin / Developer / Moderator / User)
 *   • Biometric auth    (Fingerprint / Touch ID, Face ID, Retinal Scan)
 *   • Two-Factor Auth   (TOTP authenticator app, SMS, Email)
 *   • Multi-Factor Auth (multiple methods combined in a single challenge)
 *   • Password strength meter (13+ character minimum, Unicode & emoji support)
 *   • Username supports emoji and full Unicode (no normalization applied)
 *   • Registration flow with role selection
 *   • Role-specific dashboard redirect after login
 *   • Remember Me with per-storage secure token caching
 *   • Automatic session restoration on mount
 *   • Dark / light mode (system-default + manual toggle)
 *   • Mobile-responsive layout
 *
 * Usage:
 *   import AuthSystem from './src/auth/AuthSystem';
 *   <AuthSystem onAuthSuccess={({ user, role }) => navigate(`/dashboard/${role}`)} />
 *
 * Props:
 *   onAuthSuccess  (fn)     — called with { user, role, tokens } on successful auth
 *   apiBaseUrl     (string) — defaults to import.meta.env.VITE_API_URL + '/auth' or '/api/auth'
 *   initialView    (string) — 'role-select' | 'login' | 'register' (default: 'role-select')
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  Shield, User, Code2, Users, Lock, Eye, EyeOff,
  Fingerprint, Smartphone, Mail, Key, Sun, Moon,
  ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, RefreshCw, Scan, ScanFace, QrCode,
  Copy, Check, Star, LogOut, Info,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  admin: {
    key:         'admin',
    label:       'Admin',
    Icon:        Shield,
    description: 'System administration & full platform management',
    primary:     '#ef4444',
    hover:       '#dc2626',
    soft:        '#fee2e2',
    softDark:    'rgba(239,68,68,0.12)',
    border:      'rgba(239,68,68,0.4)',
    gradient:    'linear-gradient(135deg, #ef4444, #dc2626)',
  },
  developer: {
    key:         'developer',
    label:       'Developer',
    Icon:        Code2,
    description: 'API access, integrations & development tools',
    primary:     '#6366f1',
    hover:       '#4f46e5',
    soft:        '#e0e7ff',
    softDark:    'rgba(99,102,241,0.12)',
    border:      'rgba(99,102,241,0.4)',
    gradient:    'linear-gradient(135deg, #6366f1, #4f46e5)',
  },
  moderator: {
    key:         'moderator',
    label:       'Moderator',
    Icon:        Users,
    description: 'Content moderation & community management',
    primary:     '#10b981',
    hover:       '#059669',
    soft:        '#d1fae5',
    softDark:    'rgba(16,185,129,0.12)',
    border:      'rgba(16,185,129,0.4)',
    gradient:    'linear-gradient(135deg, #10b981, #059669)',
  },
  user: {
    key:         'user',
    label:       'User',
    Icon:        User,
    description: 'Standard access to all AI features',
    primary:     '#8b5cf6',
    hover:       '#7c3aed',
    soft:        '#ede9fe',
    softDark:    'rgba(139,92,246,0.12)',
    border:      'rgba(139,92,246,0.4)',
    gradient:    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  },
};

const BIOMETRIC_METHODS = [
  { key: 'fingerprint', label: 'Fingerprint / Touch ID', Icon: Fingerprint,  webAuthnType: 'platform' },
  { key: 'face',        label: 'Face ID',                Icon: ScanFace,     webAuthnType: 'platform' },
  { key: 'retinal',     label: 'Retinal Scan',           Icon: Scan,         webAuthnType: 'cross-platform' },
];

const TWO_FA_METHODS = [
  { key: 'totp',  label: 'Authenticator App', Icon: Key,        description: 'Google Authenticator, Authy, 1Password…' },
  { key: 'sms',   label: 'SMS',               Icon: Smartphone, description: 'One-time code to your phone' },
  { key: 'email', label: 'Email',             Icon: Mail,       description: 'One-time code to your email' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Token storage  (localStorage = remember-me, sessionStorage = session-only)
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY         = 'nexus_access';
const REFRESH_KEY       = 'nexus_refresh';
const REMEMBER_KEY      = 'nexus_remember';
const THEME_KEY         = 'nexus_theme';

const tokenStorage = {
  save(tokens, rememberMe = false) {
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY,  tokens.accessToken);
    store.setItem(REFRESH_KEY, tokens.refreshToken);
    if (rememberMe) localStorage.setItem(REMEMBER_KEY, '1');
  },
  load() {
    // Check both stores; localStorage (remember-me) takes precedence
    const isRemembered = !!localStorage.getItem(REMEMBER_KEY);
    const store        = isRemembered ? localStorage : sessionStorage;
    const accessToken  = store.getItem(TOKEN_KEY);
    const refreshToken = store.getItem(REFRESH_KEY);
    return accessToken && refreshToken ? { accessToken, refreshToken, isRemembered } : null;
  },
  clear() {
    [localStorage, sessionStorage].forEach(store => {
      store.removeItem(TOKEN_KEY);
      store.removeItem(REFRESH_KEY);
    });
    localStorage.removeItem(REMEMBER_KEY);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Password strength analysis
// ─────────────────────────────────────────────────────────────────────────────

const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u;

function getPasswordStrength(password) {
  const requirements = [
    { key: 'length',   label: 'At least 13 characters', met: password.length >= 13 },
    { key: 'upper',    label: 'Uppercase letter (A–Z)',  met: /[A-Z]/.test(password) },
    { key: 'lower',    label: 'Lowercase letter (a–z)',  met: /[a-z]/.test(password) },
    { key: 'digit',    label: 'Number (0–9)',             met: /[0-9]/.test(password) },
    { key: 'special',  label: 'Special character (!@#…)', met: /[^A-Za-z0-9]/.test(password) },
    { key: 'emoji',    label: 'Emoji / Unicode (bonus ⭐)', met: EMOJI_RE.test(password) },
  ];

  const core  = requirements.slice(0, 5);
  const metCore = core.filter(r => r.met).length;
  const hasEmoji = requirements[5].met;

  let score;
  if (!requirements[0].met) {
    score = 0;  // doesn't reach 13 chars — always insufficient
  } else {
    score = metCore;  // 1..5
    if (hasEmoji) score = Math.min(6, score + 1);
  }

  const levels = [
    { label: 'Insufficient', color: '#9ca3af', bg: '#374151' },
    { label: 'Very Weak',    color: '#ef4444', bg: '#fee2e2' },
    { label: 'Weak',         color: '#f97316', bg: '#ffedd5' },
    { label: 'Fair',         color: '#eab308', bg: '#fef9c3' },
    { label: 'Good',         color: '#22c55e', bg: '#dcfce7' },
    { label: 'Strong',       color: '#10b981', bg: '#d1fae5' },
    { label: 'Very Strong',  color: '#6366f1', bg: '#e0e7ff' },
  ];

  return { score, requirements, ...levels[score] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small utility helpers
// ─────────────────────────────────────────────────────────────────────────────

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...(data || {}) };
  return data;
}

function formatSecret(secret) {
  // Format as groups of 4 for readability: ABCD EFGH IJKL …
  return secret.replace(/=/g, '').match(/.{1,4}/g)?.join(' ') ?? secret;
}

// ─────────────────────────────────────────────────────────────────────────────
// PasswordStrengthMeter
// ─────────────────────────────────────────────────────────────────────────────

function PasswordStrengthMeter({ password, isDark }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;

  const segmentCount = 6;
  const filledCount  = strength.score;

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1" role="meter" aria-label="Password strength" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={6}>
        {Array.from({ length: segmentCount }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < filledCount ? strength.color : (isDark ? '#374151' : '#e5e7eb') }}
          />
        ))}
      </div>

      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: strength.color }}>
          {strength.label}
        </span>
        <span className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          {strength.score}/6
        </span>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {strength.requirements.map(req => (
          <li key={req.key} className="flex items-center gap-2 text-xs">
            <span style={{ color: req.met ? '#10b981' : (isDark ? '#6b7280' : '#9ca3af') }}>
              {req.met ? '✓' : '○'}
            </span>
            <span style={{ color: req.met ? (isDark ? '#d1d5db' : '#374151') : (isDark ? '#6b7280' : '#9ca3af') }}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OTPInput  — 6-digit code with auto-advance, paste, backspace
// ─────────────────────────────────────────────────────────────────────────────

function OTPInput({ value = '', onChange, length = 6, isDark, disabled }) {
  const digits   = Array.from({ length }, (_, i) => value[i] ?? '');
  const inputRefs = useRef([]);

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = '';
        onChange(next.join(''));
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    }
  };

  const handleChange = (e, idx) => {
    const raw  = e.target.value.replace(/\D/g, '');
    const char = raw.slice(-1);
    if (!char) return;
    const next = [...digits];
    next[idx]  = char;
    onChange(next.join(''));
    if (idx < length - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted.padEnd(length, '').slice(0, length));
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  const box = {
    width: 44, height: 52, borderRadius: 10, border: '2px solid',
    borderColor: isDark ? '#374151' : '#d1d5db',
    background:  isDark ? '#111827' : '#f9fafb',
    color:        isDark ? '#f9fafb' : '#111827',
    fontSize: 22, fontWeight: 700, textAlign: 'center',
    outline: 'none', transition: 'border-color 0.15s',
    caretColor: 'transparent',
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          style={{
            ...box,
            borderColor: d ? '#6366f1' : box.borderColor,
          }}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
          onBlur={e  => { e.target.style.borderColor = d ? '#6366f1' : (isDark ? '#374151' : '#d1d5db'); }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorAlert
// ─────────────────────────────────────────────────────────────────────────────

function ErrorAlert({ message, isDark }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl p-3 text-sm"
      style={{
        background: isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2',
        border:      '1px solid rgba(239,68,68,0.3)',
        color:       isDark ? '#fca5a5' : '#991b1b',
      }}
    >
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SuccessAlert
// ─────────────────────────────────────────────────────────────────────────────

function SuccessAlert({ message, isDark }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl p-3 text-sm"
      style={{
        background: isDark ? 'rgba(16,185,129,0.12)' : '#d1fae5',
        border:      '1px solid rgba(16,185,129,0.3)',
        color:       isDark ? '#6ee7b7' : '#065f46',
      }}
    >
      <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CopyButton
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text, isDark }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all"
      style={{
        background: copied ? (isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5') : (isDark ? '#1f2937' : '#f3f4f6'),
        color:       copied ? '#10b981' : (isDark ? '#9ca3af' : '#6b7280'),
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthCard — shared card wrapper
// ─────────────────────────────────────────────────────────────────────────────

function AuthCard({ children, isDark, maxWidth = 440 }) {
  return (
    <div
      className="w-full rounded-2xl shadow-2xl"
      style={{
        maxWidth,
        background: isDark ? 'rgba(17,24,39,0.85)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PrimaryButton
// ─────────────────────────────────────────────────────────────────────────────

function PrimaryButton({ children, onClick, disabled, loading, gradient, fullWidth = true, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all',
        fullWidth && 'w-full',
        (disabled || loading) ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 active:scale-95',
      )}
      style={{ background: gradient || 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InputField
// ─────────────────────────────────────────────────────────────────────────────

function InputField({
  label, id, type = 'text', value, onChange, placeholder,
  isDark, required, autoComplete, hint, error,
  suffix, prefix,
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 flex items-center" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
            {prefix}
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all"
          style={{
            paddingLeft:  prefix ? 40  : undefined,
            paddingRight: suffix ? 48  : undefined,
            background:   isDark ? '#111827' : '#f9fafb',
            border: `1px solid ${error ? '#ef4444' : (isDark ? '#374151' : '#d1d5db')}`,
            color:   isDark ? '#f9fafb' : '#111827',
          }}
          onFocus={e  => { e.target.style.borderColor = error ? '#ef4444' : '#6366f1'; }}
          onBlur={e   => { e.target.style.borderColor = error ? '#ef4444' : (isDark ? '#374151' : '#d1d5db'); }}
        />
        {suffix && (
          <div className="absolute right-3 flex items-center">
            {suffix}
          </div>
        )}
      </div>
      {hint && !error && (
        <p className="text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>{hint}</p>
      )}
      {error && (
        <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View: RoleSelectView
// ─────────────────────────────────────────────────────────────────────────────

function RoleSelectView({ onSelectRole, onRegister, isDark }) {
  return (
    <AuthCard isDark={isDark} maxWidth={560}>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Shield size={32} color="white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
            Nexus AI Pro
          </h1>
          <p className="mt-1 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            Select your account type to continue
          </p>
        </div>

        {/* Role grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          {Object.values(ROLE_CONFIG).map(cfg => {
            const { Icon } = cfg;
            return (
              <button
                key={cfg.key}
                onClick={() => onSelectRole(cfg.key)}
                className="group flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all"
                style={{
                  background: isDark ? cfg.softDark : cfg.soft,
                  border:      `1px solid ${cfg.border}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.primary; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = cfg.border;  e.currentTarget.style.transform = 'none'; }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: cfg.gradient }}
                >
                  <Icon size={20} color="white" />
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
                    {cfg.label}
                  </div>
                  <div className="mt-0.5 text-xs leading-snug" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    {cfg.description}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: cfg.primary, marginLeft: 'auto', marginTop: -4 }} />
              </button>
            );
          })}
        </div>

        {/* Register link */}
        <div className="mt-6 text-center text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          Don't have an account?{' '}
          <button
            onClick={onRegister}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: '#6366f1' }}
          >
            Create one
          </button>
        </div>
      </div>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View: LoginView
// ─────────────────────────────────────────────────────────────────────────────

function LoginView({ role, apiBase, onSuccess, on2FA, onMFA, onBiometric, onBack, onRegister, isDark }) {
  const cfg = ROLE_CONFIG[role];
  const { Icon } = cfg;

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const data = await apiFetch(`${apiBase}/login`, {
        method: 'POST',
        body:   { email, password, role, rememberMe },
      });

      if (data.requires2FA || data.requiresMFA) {
        const payload = {
          partialToken: data.partialToken,
          challengeId:  data.challengeId,
          methods:      data.methods,
          rememberMe,
        };
        if (data.requiresMFA) onMFA(payload);
        else on2FA(payload);
      } else {
        tokenStorage.save(data, rememberMe);
        onSuccess(data);
      }
    } catch (err) {
      if (err.details) {
        const fe = {};
        err.details.forEach(d => { fe[d.field] = d.message; });
        setFieldErrors(fe);
      }
      setError(err.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard isDark={isDark}>
      <div className="p-8">
        {/* Back + header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to role selection"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#d1d5db' : '#374151' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: cfg.gradient }}
          >
            <Icon size={18} color="white" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
              Sign in as {cfg.label}
            </h2>
            <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              {cfg.description}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <InputField
            label="Email address"
            id="login-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            isDark={isDark}
            error={fieldErrors.email}
          />

          <InputField
            label="Password"
            id="login-password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            required
            autoComplete="current-password"
            isDark={isDark}
            error={fieldErrors.password}
            suffix={
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          {/* Remember me */}
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-500"
            />
            <span style={{ color: isDark ? '#d1d5db' : '#374151' }}>Remember me for 30 days</span>
          </label>

          <ErrorAlert message={error} isDark={isDark} />

          <PrimaryButton type="submit" loading={loading} gradient={cfg.gradient}>
            {loading ? 'Signing in…' : `Sign in as ${cfg.label}`}
          </PrimaryButton>
        </form>

        {/* Biometric sign-in */}
        <div className="mt-4">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }} />
            <span className="text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>or continue with</span>
            <div className="flex-1 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }} />
          </div>
          <button
            onClick={() => onBiometric(role)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all hover:opacity-80 active:scale-95"
            style={{
              borderColor: isDark ? '#374151' : '#d1d5db',
              color:        isDark ? '#d1d5db' : '#374151',
              background:   isDark ? '#111827' : '#f9fafb',
            }}
          >
            <Fingerprint size={18} style={{ color: cfg.primary }} />
            Biometric Sign In
          </button>
        </div>

        {/* Register link */}
        <div className="mt-5 text-center text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          No account?{' '}
          <button onClick={onRegister} className="font-semibold hover:underline" style={{ color: cfg.primary }}>
            Register here
          </button>
        </div>
      </div>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View: RegisterView
// ─────────────────────────────────────────────────────────────────────────────

function RegisterView({ apiBase, onSuccess, on2FASetup, onBack, isDark }) {
  const [username,   setUsername]   = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [role,       setRole]       = useState('user');
  const [agreed,     setAgreed]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (password !== confirmPw) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch(`${apiBase}/register`, {
        method: 'POST',
        body:   { username, displayName, email, password, confirmPassword: confirmPw, role, agreeToTerms: agreed },
      });
      // Offer 2FA setup immediately after registration
      on2FASetup(data);
    } catch (err) {
      if (err.details) {
        const fe = {};
        err.details.forEach(d => { fe[d.field] = d.message; });
        setFieldErrors(fe);
      }
      setError(err.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard isDark={isDark} maxWidth={480}>
      <div className="p-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#d1d5db' : '#374151' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
              Create an account
            </h2>
            <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              All fields marked <span style={{ color: '#ef4444' }}>*</span> are required
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Username — Unicode / emoji supported */}
          <InputField
            label="Username"
            id="reg-username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. alex_dev 🚀 or 狐狸"
            required
            autoComplete="username"
            isDark={isDark}
            error={fieldErrors.username}
            hint="Supports emoji and all Unicode characters"
          />

          {/* Display name (optional) */}
          <InputField
            label="Display name (optional)"
            id="reg-displayname"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your public name"
            autoComplete="name"
            isDark={isDark}
            error={fieldErrors.displayName}
          />

          <InputField
            label="Email address"
            id="reg-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            isDark={isDark}
            error={fieldErrors.email}
          />

          {/* Password with strength meter */}
          <div>
            <InputField
              label="Password"
              id="reg-password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="13+ characters with mixed types"
              required
              autoComplete="new-password"
              isDark={isDark}
              error={fieldErrors.password}
              hint="Minimum 13 characters. Emoji and Unicode are welcome!"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <PasswordStrengthMeter password={password} isDark={isDark} />
          </div>

          <InputField
            label="Confirm password"
            id="reg-confirm"
            type={showConf ? 'text' : 'password'}
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            placeholder="Repeat your password"
            required
            autoComplete="new-password"
            isDark={isDark}
            error={fieldErrors.confirmPassword}
            suffix={
              <button
                type="button"
                onClick={() => setShowConf(v => !v)}
                aria-label={showConf ? 'Hide password' : 'Show password'}
                style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
              >
                {showConf ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          {/* Role selector */}
          <div className="space-y-1">
            <label className="block text-sm font-medium" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
              Account role <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(ROLE_CONFIG).map(cfg => {
                const { Icon } = cfg;
                const selected = role === cfg.key;
                return (
                  <button
                    key={cfg.key}
                    type="button"
                    onClick={() => setRole(cfg.key)}
                    className="flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all"
                    style={{
                      borderColor: selected ? cfg.primary : (isDark ? '#374151' : '#d1d5db'),
                      background:  selected ? (isDark ? cfg.softDark : cfg.soft) : (isDark ? '#111827' : '#f9fafb'),
                      color:        selected ? cfg.primary : (isDark ? '#9ca3af' : '#6b7280'),
                      fontWeight:  selected ? 600 : 400,
                    }}
                  >
                    <Icon size={14} />
                    {cfg.label}
                    {selected && <Check size={12} style={{ marginLeft: 'auto', color: cfg.primary }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Terms */}
          <label className="flex cursor-pointer items-start gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 rounded accent-indigo-500"
            />
            <span style={{ color: isDark ? '#d1d5db' : '#374151' }}>
              I agree to the{' '}
              <span style={{ color: '#6366f1', textDecoration: 'underline', cursor: 'pointer' }}>Terms of Service</span>
              {' '}and{' '}
              <span style={{ color: '#6366f1', textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>
            </span>
          </label>

          <ErrorAlert message={error} isDark={isDark} />

          <PrimaryButton
            type="submit"
            loading={loading}
            disabled={!agreed || strength.score < 5}
            gradient={ROLE_CONFIG[role].gradient}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </PrimaryButton>

          {strength.score < 5 && password.length > 0 && (
            <p className="text-center text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
              Strengthen your password to enable registration
            </p>
          )}
        </form>
      </div>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View: BiometricAuthView
// ─────────────────────────────────────────────────────────────────────────────

function BiometricAuthView({ role, apiBase, userId, onSuccess, onFallback, onBack, isDark }) {
  const cfg = ROLE_CONFIG[role ?? 'user'];
  const [status,       setStatus]       = useState('idle');  // idle | requesting | success | error
  const [activeMethod, setActiveMethod] = useState(null);
  const [error,        setError]        = useState('');

  const supported = typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined';

  const requestBiometric = useCallback(async (method) => {
    setActiveMethod(method.key);
    setStatus('requesting');
    setError('');

    try {
      // 1. Fetch a challenge from the server
      const { challenge, allowCredentials, rpId, timeout } = await apiFetch(
        `${apiBase}/biometric/challenge?userId=${encodeURIComponent(userId ?? '')}`,
      );

      // 2. WebAuthn assertion request (covers Fingerprint, Face ID, and platform biometrics)
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge:        Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          timeout:          timeout ?? 60000,
          rpId:             rpId ?? window.location.hostname,
          allowCredentials: (allowCredentials ?? []).map(c => ({
            type: 'public-key',
            id:   Uint8Array.from(atob(c.id ?? ''), ch => ch.charCodeAt(0)),
          })),
          userVerification: 'required',
        },
      });

      // 3. Send the assertion to the server
      const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
      const data  = await apiFetch(`${apiBase}/login/biometric`, {
        method: 'POST',
        body:   {
          userId,
          credentialId:     toB64(credential.rawId),
          clientDataJSON:   toB64(credential.response.clientDataJSON),
          signature:        toB64(credential.response.signature),
          authenticatorData: toB64(credential.response.authenticatorData),
          challenge,
        },
      });

      tokenStorage.save(data);
      setStatus('success');
      setTimeout(() => onSuccess(data), 800);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled or timed out.');
      } else if (err.name === 'SecurityError') {
        setError('Security error — ensure you are on a secure (HTTPS) connection.');
      } else {
        setError(err.error || err.message || 'Biometric authentication failed.');
      }
      setStatus('error');
    }
  }, [apiBase, userId, onSuccess]);

  return (
    <AuthCard isDark={isDark}>
      <div className="p-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#d1d5db' : '#374151' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
              Biometric Sign In
            </h2>
            <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              Authenticate with your device sensor
            </p>
          </div>
        </div>

        {!supported && (
          <div
            className="mb-4 rounded-xl p-4 text-sm"
            style={{
              background: isDark ? 'rgba(234,179,8,0.12)' : '#fef9c3',
              border:      '1px solid rgba(234,179,8,0.3)',
              color:       isDark ? '#fde68a' : '#854d0e',
            }}
          >
            <Info size={16} className="inline mr-2" />
            Your browser or device doesn't support WebAuthn biometric authentication.
            Use password login instead.
          </div>
        )}

        <div className="space-y-3">
          {BIOMETRIC_METHODS.map(method => {
            const { Icon } = method;
            const isActive = activeMethod === method.key;
            return (
              <button
                key={method.key}
                onClick={() => requestBiometric(method)}
                disabled={!supported || status === 'requesting' || status === 'success'}
                className="flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background:  isDark ? (isActive ? cfg.softDark : '#111827') : (isActive ? cfg.soft : '#f9fafb'),
                  borderColor: isActive ? cfg.primary : (isDark ? '#374151' : '#d1d5db'),
                }}
              >
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: isActive ? cfg.gradient : (isDark ? '#1f2937' : '#f3f4f6') }}
                >
                  {isActive && status === 'requesting'
                    ? <Loader2 size={22} color={isActive ? 'white' : cfg.primary} className="animate-spin" />
                    : <Icon size={22} color={isActive ? 'white' : cfg.primary} />
                  }
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
                    {method.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                    {isActive && status === 'requesting'
                      ? 'Waiting for sensor confirmation…'
                      : 'Tap to authenticate'}
                  </div>
                </div>
                {isActive && status === 'success' && (
                  <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                )}
              </button>
            );
          })}
        </div>

        <ErrorAlert message={error} isDark={isDark} />

        <button
          onClick={onFallback}
          className="mt-5 w-full text-center text-sm underline-offset-2 hover:underline"
          style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
        >
          Use password instead
        </button>
      </div>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View: TwoFAVerifyView
// ─────────────────────────────────────────────────────────────────────────────

function TwoFAVerifyView({ partialToken, challengeId, methods, rememberMe, apiBase, onSuccess, onBack, isDark }) {
  const [activeMethod, setActiveMethod] = useState(methods?.[0] ?? 'totp');
  const [code,         setCode]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [otpSent,      setOtpSent]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [sendLoading,  setSendLoading]  = useState(false);
  const [error,        setError]        = useState('');
  const [info,         setInfo]         = useState('');

  const available = TWO_FA_METHODS.filter(m => (methods ?? ['totp']).includes(m.key));

  const sendOTP = async () => {
    setSendLoading(true);
    setError('');
    try {
      const target = activeMethod === 'email' ? undefined : phone;  // server uses user's email for email OTP
      await apiFetch(`${apiBase}/otp/send`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${partialToken}` },
        body:    { type: activeMethod, target: target ?? '' },
      });
      setOtpSent(true);
      setInfo(`Verification code sent! Check your ${activeMethod === 'email' ? 'inbox' : 'phone'}.`);
    } catch (err) {
      setError(err.error || 'Failed to send code. Try again.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`${apiBase}/2fa/verify`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${partialToken}` },
        body:    { token: code },
      });
      tokenStorage.save(data, rememberMe);
      onSuccess(data);
    } catch (err) {
      setError(err.error || 'Verification failed. Check the code and try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard isDark={isDark}>
      <div className="p-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#d1d5db' : '#374151' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
              Two-Factor Authentication
            </h2>
            <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              Confirm your identity with a second factor
            </p>
          </div>
        </div>

        {/* Method tabs */}
        {available.length > 1 && (
          <div className="mb-5 flex gap-2" role="tablist">
            {available.map(m => {
              const { Icon } = m;
              const isActive = activeMethod === m.key;
              return (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => { setActiveMethod(m.key); setCode(''); setOtpSent(false); setError(''); setInfo(''); }}
                  className="flex flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all"
                  style={{
                    borderColor: isActive ? '#6366f1' : (isDark ? '#374151' : '#e5e7eb'),
                    background:  isActive ? (isDark ? 'rgba(99,102,241,0.12)' : '#e0e7ff') : (isDark ? '#111827' : '#f9fafb'),
                    color:        isActive ? '#6366f1' : (isDark ? '#9ca3af' : '#6b7280'),
                  }}
                >
                  <Icon size={16} />
                  {m.label}
                </button>
              );
            })}
          </div>
        )}

        {/* TOTP */}
        {activeMethod === 'totp' && (
          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              Enter the 6-digit code from your authenticator app
            </p>
            <OTPInput value={code} onChange={setCode} isDark={isDark} disabled={loading} />
          </div>
        )}

        {/* SMS */}
        {activeMethod === 'sms' && (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <InputField
                  label="Phone number"
                  id="2fa-phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  autoComplete="tel"
                  isDark={isDark}
                />
                <PrimaryButton
                  onClick={sendOTP}
                  loading={sendLoading}
                  gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
                >
                  Send Code via SMS
                </PrimaryButton>
              </>
            ) : (
              <>
                <p className="text-sm text-center" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Enter the 6-digit code sent to your phone
                </p>
                <OTPInput value={code} onChange={setCode} isDark={isDark} disabled={loading} />
                <button
                  onClick={() => { setOtpSent(false); setCode(''); setInfo(''); }}
                  className="w-full text-center text-xs underline-offset-2 hover:underline"
                  style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                >
                  Change number / Resend
                </button>
              </>
            )}
          </div>
        )}

        {/* Email */}
        {activeMethod === 'email' && (
          <div className="space-y-4">
            {!otpSent ? (
              <PrimaryButton
                onClick={sendOTP}
                loading={sendLoading}
                gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
              >
                Send Code to My Email
              </PrimaryButton>
            ) : (
              <>
                <p className="text-sm text-center" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Enter the 6-digit code sent to your email address
                </p>
                <OTPInput value={code} onChange={setCode} isDark={isDark} disabled={loading} />
                <button
                  onClick={() => { setOtpSent(false); setCode(''); setInfo(''); }}
                  className="w-full text-center text-xs underline-offset-2 hover:underline"
                  style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                >
                  Resend code
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {info  && <SuccessAlert message={info} isDark={isDark} />}
          <ErrorAlert message={error} isDark={isDark} />

          {(activeMethod === 'totp' || otpSent) && (
            <PrimaryButton
              onClick={handleVerify}
              loading={loading}
              disabled={code.length < 6}
              gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
            >
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View: MFAVerifyView  — verify two or more factors simultaneously
// ─────────────────────────────────────────────────────────────────────────────

function MFAVerifyView({ partialToken, challengeId, methods, rememberMe, apiBase, onSuccess, onBack, isDark }) {
  const available = useMemo(
    () => TWO_FA_METHODS.filter(m => (methods ?? ['totp', 'email']).includes(m.key)),
    [methods],
  );

  const [codes,    setCodes]    = useState(() => Object.fromEntries(available.map(m => [m.key, ''])));
  const [phone,    setPhone]    = useState('');
  const [sent,     setSent]     = useState(() => Object.fromEntries(available.map(m => [m.key, m.key === 'totp'])));
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [info,     setInfo]     = useState('');

  const sendOTP = async (type) => {
    try {
      await apiFetch(`${apiBase}/otp/send`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${partialToken}` },
        body:    { type, target: type === 'sms' ? phone : '' },
      });
      setSent(prev => ({ ...prev, [type]: true }));
      setInfo(`Code sent to your ${type === 'sms' ? 'phone' : 'email'}.`);
    } catch (err) {
      setError(err.error || 'Failed to send OTP');
    }
  };

  const allReady = available.every(m => !sent[m.key] === false && codes[m.key].length === 6);

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const factors = available.map(m => ({ type: m.key, token: codes[m.key] }));
      const data = await apiFetch(`${apiBase}/mfa/verify`, {
        method: 'POST',
        body:   { challengeId, factors },
      });
      tokenStorage.save(data, rememberMe);
      onSuccess(data);
    } catch (err) {
      setError(err.error || 'MFA verification failed. Check all codes and try again.');
      setCodes(prev => Object.fromEntries(Object.keys(prev).map(k => [k, ''])));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard isDark={isDark} maxWidth={480}>
      <div className="p-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#d1d5db' : '#374151' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
              Multi-Factor Authentication
            </h2>
            <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              Complete all {available.length} factors to continue
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {available.map((m, idx) => {
            const { Icon } = m;
            return (
              <div
                key={m.key}
                className="rounded-xl border p-4"
                style={{ borderColor: isDark ? '#374151' : '#e5e7eb', background: isDark ? '#111827' : '#f9fafb' }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                  >
                    {idx + 1}
                  </div>
                  <Icon size={16} style={{ color: '#6366f1' }} />
                  <span className="font-medium text-sm" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
                    {m.label}
                  </span>
                  {codes[m.key].length === 6 && (
                    <CheckCircle2 size={15} style={{ color: '#10b981', marginLeft: 'auto' }} />
                  )}
                </div>

                {m.key === 'totp' && (
                  <OTPInput value={codes.totp} onChange={v => setCodes(p => ({ ...p, totp: v }))} isDark={isDark} disabled={loading} />
                )}

                {m.key === 'sms' && (
                  sent.sms ? (
                    <OTPInput value={codes.sms} onChange={v => setCodes(p => ({ ...p, sms: v }))} isDark={isDark} disabled={loading} />
                  ) : (
                    <div className="space-y-2">
                      <InputField
                        id="mfa-phone"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+1 555 000 0000"
                        autoComplete="tel"
                        isDark={isDark}
                      />
                      <button
                        onClick={() => sendOTP('sms')}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                      >
                        Send SMS Code
                      </button>
                    </div>
                  )
                )}

                {m.key === 'email' && (
                  sent.email ? (
                    <OTPInput value={codes.email} onChange={v => setCodes(p => ({ ...p, email: v }))} isDark={isDark} disabled={loading} />
                  ) : (
                    <button
                      onClick={() => sendOTP('email')}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                    >
                      Send Email Code
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          {info  && <SuccessAlert message={info}  isDark={isDark} />}
          <ErrorAlert   message={error} isDark={isDark} />
          <PrimaryButton
            onClick={handleVerify}
            loading={loading}
            disabled={!allReady}
            gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
          >
            {loading ? 'Verifying all factors…' : `Verify ${available.length} Factors & Sign In`}
          </PrimaryButton>
        </div>
      </div>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View: Setup2FAView  — shown right after registration to encourage 2FA setup
// ─────────────────────────────────────────────────────────────────────────────

function Setup2FAView({ accessToken, onComplete, onSkip, apiBase, isDark }) {
  const [step,       setStep]       = useState('intro');   // intro | secret | verify | done
  const [secret,     setSecret]     = useState('');
  const [otpauthURI, setOtpauthURI] = useState('');
  const [code,       setCode]       = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [copied,     setCopied]     = useState(false);

  const generateSecret = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`${apiBase}/2fa/setup`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSecret(data.secret);
      setOtpauthURI(data.otpauthURI);
      setStep('secret');
    } catch (err) {
      setError(err.error || 'Failed to generate 2FA secret.');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (code.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`${apiBase}/2fa/verify`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body:    { token: code, secret },
      });
      setBackupCodes(data.backupCodes ?? []);
      setStep('done');
    } catch (err) {
      setError(err.error || 'Incorrect code. Try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AuthCard isDark={isDark} maxWidth={460}>
      <div className="p-8">
        {step === 'intro' && (
          <>
            <div className="mb-6 text-center">
              <div
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                <Key size={28} color="white" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
                Secure Your Account
              </h2>
              <p className="mt-1 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Enable Two-Factor Authentication for an extra layer of protection
              </p>
            </div>
            <div className="mb-6 space-y-3">
              {[
                { icon: Shield,     text: 'Protects your account even if your password is compromised' },
                { icon: Key,        text: 'Works with Google Authenticator, Authy, 1Password, and more' },
                { icon: Smartphone, text: 'Takes under 2 minutes to set up' },
              ].map(({ icon: I, text }, i) => (
                <div key={i} className="flex items-start gap-3 text-sm" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
                  <I size={16} style={{ color: '#6366f1', flexShrink: 0, marginTop: 1 }} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <ErrorAlert message={error} isDark={isDark} />
            <PrimaryButton onClick={generateSecret} loading={loading} gradient="linear-gradient(135deg, #6366f1, #4f46e5)">
              Set Up 2FA Now
            </PrimaryButton>
            <button
              onClick={onSkip}
              className="mt-3 w-full text-center text-sm underline-offset-2 hover:underline"
              style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
            >
              Skip for now (not recommended)
            </button>
          </>
        )}

        {step === 'secret' && (
          <>
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-lg font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
                Scan or Enter Secret
              </h2>
            </div>
            <div className="space-y-4">
              <ol className="space-y-2 text-sm" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#6366f1' }}>1.</span> Open your authenticator app</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#6366f1' }}>2.</span> Tap <strong>+</strong> or <strong>Add account</strong></li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#6366f1' }}>3.</span> Choose <strong>Enter key manually</strong> and paste the secret below</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#6366f1' }}>4.</span> Enter the 6-digit code generated by the app</li>
              </ol>

              {/* Secret display */}
              <div
                className="rounded-xl p-4"
                style={{ background: isDark ? '#111827' : '#f3f4f6', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    TOTP Secret (Base32)
                  </span>
                  <CopyButton text={secret} isDark={isDark} />
                </div>
                <code
                  className="block break-all text-sm font-mono tracking-widest"
                  style={{ color: isDark ? '#a5b4fc' : '#4f46e5' }}
                >
                  {formatSecret(secret)}
                </code>
              </div>

              {/* otpauth URI for advanced users */}
              <details>
                <summary className="cursor-pointer text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                  Show otpauth:// URI (for QR code apps)
                </summary>
                <div className="mt-2 flex items-start gap-2">
                  <code
                    className="flex-1 break-all rounded-lg p-2 text-xs font-mono"
                    style={{
                      background: isDark ? '#111827' : '#f9fafb',
                      border:     `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                      color:       isDark ? '#9ca3af' : '#6b7280',
                    }}
                  >
                    {otpauthURI}
                  </code>
                  <CopyButton text={otpauthURI} isDark={isDark} />
                </div>
              </details>

              <p className="text-sm font-medium" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
                Enter the 6-digit code from your app to confirm:
              </p>
              <OTPInput value={code} onChange={setCode} isDark={isDark} disabled={loading} />

              <ErrorAlert message={error} isDark={isDark} />

              <PrimaryButton
                onClick={verifySetup}
                loading={loading}
                disabled={code.length < 6}
                gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
              >
                {loading ? 'Verifying…' : 'Confirm & Enable 2FA'}
              </PrimaryButton>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="mb-6 text-center">
              <div
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)' }}
              >
                <CheckCircle2 size={32} style={{ color: '#10b981' }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
                2FA Enabled!
              </h2>
              <p className="mt-1 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Your account is now protected with two-factor authentication.
              </p>
            </div>

            {backupCodes.length > 0 && (
              <div
                className="mb-5 rounded-xl p-4"
                style={{
                  background: isDark ? 'rgba(234,179,8,0.1)' : '#fefce8',
                  border:      '1px solid rgba(234,179,8,0.3)',
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: isDark ? '#fde68a' : '#854d0e' }}>
                    Backup Codes — Save These Now!
                  </span>
                  <CopyButton text={backupCodes.join('\n')} isDark={isDark} />
                </div>
                <p className="mb-3 text-xs" style={{ color: isDark ? '#fde68a' : '#92400e' }}>
                  Each code can be used once if you lose access to your authenticator app. They will NOT be shown again.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {backupCodes.map((code, i) => (
                    <code
                      key={i}
                      className="rounded-lg px-2 py-1 text-center text-xs font-mono"
                      style={{
                        background: isDark ? '#111827' : '#fff',
                        border:     `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                        color:       isDark ? '#a5b4fc' : '#4f46e5',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <PrimaryButton
              onClick={onComplete}
              gradient="linear-gradient(135deg, #10b981, #059669)"
            >
              Continue to Dashboard
            </PrimaryButton>
          </>
        )}
      </div>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View: SuccessView  — brief redirect screen
// ─────────────────────────────────────────────────────────────────────────────

function SuccessView({ user, isDark }) {
  const cfg = ROLE_CONFIG[user?.role ?? 'user'];
  const { Icon } = cfg;

  return (
    <AuthCard isDark={isDark} maxWidth={380}>
      <div className="flex flex-col items-center p-10 text-center">
        <div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'rgba(16,185,129,0.15)' }}
        >
          <CheckCircle2 size={42} style={{ color: '#10b981' }} />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
          Welcome back!
        </h2>
        <p className="mt-1 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          Signed in as <strong>{user?.displayName ?? user?.username ?? user?.email}</strong>
        </p>
        <div
          className="mt-3 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: cfg.gradient, color: 'white' }}
        >
          <Icon size={12} />
          {cfg.label}
        </div>
        <div className="mt-6 flex items-center gap-2" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm">Redirecting to dashboard…</span>
        </div>
      </div>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthSystem  (default export)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main authentication component.
 *
 * @param {object}   props
 * @param {function} [props.onAuthSuccess]  - Called with { user, tokens, redirectTo } on success
 * @param {string}   [props.apiBaseUrl]     - Base URL for auth API (default: /api/auth)
 * @param {string}   [props.initialView]   - Starting view: 'role-select' | 'login' | 'register'
 */
export default function AuthSystem({
  onAuthSuccess,
  apiBaseUrl,
  initialView = 'role-select',
}) {
  const API = apiBaseUrl ?? (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
      ? `${import.meta.env.VITE_API_URL}/auth`
      : '/api/auth'
  );

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const isDark = theme === 'dark';

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  // ── View state machine ─────────────────────────────────────────────────────
  const [view,        setView]        = useState(initialView);
  const [selectedRole, setSelectedRole] = useState(null);

  // Shared auth context passed between views
  const [authCtx, setAuthCtx] = useState({
    partialToken: null,
    challengeId:  null,
    methods:      null,
    rememberMe:   false,
    accessToken:  null,
    user:         null,
  });

  // ── Session restoration on mount ───────────────────────────────────────────
  useEffect(() => {
    const stored = tokenStorage.load();
    if (!stored) return;

    apiFetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${stored.accessToken}` },
    })
      .then(data => {
        setAuthCtx(prev => ({ ...prev, accessToken: stored.accessToken, user: data.user }));
        handleAuthSuccess({ user: data.user, ...stored, redirectTo: `/dashboard/${data.user.role}` });
      })
      .catch(async () => {
        // Access token expired — try refresh
        try {
          const refreshed = await apiFetch(`${API}/refresh-token`, {
            method: 'POST',
            body:   { refreshToken: stored.refreshToken },
          });
          tokenStorage.save(refreshed, stored.isRemembered);
          const me = await apiFetch(`${API}/me`, {
            headers: { Authorization: `Bearer ${refreshed.accessToken}` },
          });
          handleAuthSuccess({ user: me.user, ...refreshed, redirectTo: `/dashboard/${me.user.role}` });
        } catch {
          tokenStorage.clear();
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth success handler ───────────────────────────────────────────────────
  const handleAuthSuccess = useCallback((data) => {
    setAuthCtx(prev => ({ ...prev, user: data.user, accessToken: data.accessToken }));
    setView('success');

    if (onAuthSuccess) {
      onAuthSuccess(data);
    } else {
      // Default: navigate to role dashboard after a short delay
      setTimeout(() => {
        const dest = data.redirectTo ?? `/dashboard/${data.user?.role ?? 'user'}`;
        if (typeof window !== 'undefined') window.location.href = dest;
      }, 1200);
    }
  }, [onAuthSuccess]);

  // ── View transitions ───────────────────────────────────────────────────────

  const handleRoleSelect = useCallback((role) => {
    setSelectedRole(role);
    setView('login');
  }, []);

  const handleLoginSuccess = useCallback((data) => {
    tokenStorage.save(data, data.rememberMe);
    handleAuthSuccess(data);
  }, [handleAuthSuccess]);

  const handleRegisterSuccess = useCallback((data) => {
    // After registration, offer 2FA setup
    setAuthCtx(prev => ({ ...prev, user: data.user, accessToken: null }));
    setView('setup-2fa');
  }, []);

  const handle2FARequired = useCallback((payload) => {
    setAuthCtx(prev => ({ ...prev, ...payload }));
    setView('2fa-verify');
  }, []);

  const handleMFARequired = useCallback((payload) => {
    setAuthCtx(prev => ({ ...prev, ...payload }));
    setView('mfa-verify');
  }, []);

  const handle2FASuccess = useCallback((data) => {
    tokenStorage.save(data, authCtx.rememberMe);
    handleAuthSuccess(data);
  }, [authCtx.rememberMe, handleAuthSuccess]);

  const handleBiometric = useCallback((role) => {
    setSelectedRole(role);
    setView('biometric');
  }, []);

  const handle2FASetupComplete = useCallback(() => {
    // After setting up 2FA, re-login or navigate
    setView('role-select');
  }, []);

  // ── Shared layout wrappers ─────────────────────────────────────────────────

  const bg = isDark
    ? 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 70%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 70%), #030712'
    : 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.05) 0%, transparent 70%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.04) 0%, transparent 70%), #f8fafc';

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ background: bg }}
    >
      {/* Theme toggle */}
      <div className="absolute right-4 top-4 z-10">
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:opacity-80 active:scale-95"
          style={{
            background: isDark ? '#1f2937' : '#f3f4f6',
            color:       isDark ? '#9ca3af' : '#6b7280',
            border:      `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Centered content */}
      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full" style={{ maxWidth: 560 }}>

          {view === 'role-select' && (
            <RoleSelectView
              isDark={isDark}
              onSelectRole={handleRoleSelect}
              onRegister={() => setView('register')}
            />
          )}

          {view === 'login' && selectedRole && (
            <LoginView
              role={selectedRole}
              apiBase={API}
              isDark={isDark}
              onSuccess={handleLoginSuccess}
              on2FA={handle2FARequired}
              onMFA={handleMFARequired}
              onBiometric={handleBiometric}
              onBack={() => setView('role-select')}
              onRegister={() => setView('register')}
            />
          )}

          {view === 'biometric' && (
            <BiometricAuthView
              role={selectedRole ?? 'user'}
              apiBase={API}
              isDark={isDark}
              userId={authCtx.user?.id}
              onSuccess={handleLoginSuccess}
              onFallback={() => setView('login')}
              onBack={() => setView('login')}
            />
          )}

          {view === 'register' && (
            <RegisterView
              apiBase={API}
              isDark={isDark}
              onSuccess={handleRegisterSuccess}
              on2FASetup={handleRegisterSuccess}
              onBack={() => setView('role-select')}
            />
          )}

          {view === '2fa-verify' && (
            <TwoFAVerifyView
              partialToken={authCtx.partialToken}
              challengeId={authCtx.challengeId}
              methods={authCtx.methods}
              rememberMe={authCtx.rememberMe}
              apiBase={API}
              isDark={isDark}
              onSuccess={handle2FASuccess}
              onBack={() => setView('login')}
            />
          )}

          {view === 'mfa-verify' && (
            <MFAVerifyView
              partialToken={authCtx.partialToken}
              challengeId={authCtx.challengeId}
              methods={authCtx.methods}
              rememberMe={authCtx.rememberMe}
              apiBase={API}
              isDark={isDark}
              onSuccess={handle2FASuccess}
              onBack={() => setView('login')}
            />
          )}

          {view === 'setup-2fa' && (
            <Setup2FAView
              accessToken={authCtx.accessToken}
              apiBase={API}
              isDark={isDark}
              onComplete={handle2FASetupComplete}
              onSkip={handle2FASetupComplete}
            />
          )}

          {view === 'success' && (
            <SuccessView
              user={authCtx.user}
              isDark={isDark}
            />
          )}

        </div>
      </div>

      {/* Subtle branding footer */}
      <div
        className="absolute bottom-4 left-0 right-0 text-center text-xs"
        style={{ color: isDark ? '#374151' : '#d1d5db' }}
      >
        © 2026 Cameron Fox · Nexus AI Pro · All rights reserved
      </div>
    </div>
  );
}
