// /home/user/nexus-ai-pro/src/components/AuthForms.jsx | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import { useState, useCallback, useMemo } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Fingerprint,
  Scan,
  ShieldCheck,
  ShieldAlert,
  Globe,
  KeyRound,
  RefreshCw,
  LogIn,
  UserPlus,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = Object.freeze({
  ADMIN:     'admin',
  DEV:       'dev',
  MODERATOR: 'moderator',
  USER:      'user'
});

const ROLE_TABS = [
  { key: ROLES.USER,      label: 'User' },
  { key: ROLES.DEV,       label: 'Dev' },
  { key: ROLES.MODERATOR, label: 'Moderator' },
  { key: ROLES.ADMIN,     label: 'Admin' }
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'ko', label: '한국어' },
  { code: 'ru', label: 'Русский' }
];

// Views within the auth flow
const VIEW = Object.freeze({
  LOGIN:         'login',
  REGISTER:      'register',
  MFA:           'mfa',
  FORGOT:        'forgot'
});

// ─── Password strength helpers ────────────────────────────────────────────────

const STRENGTH_RULES = [
  { id: 'length',    label: 'At least 13 characters',    test: (p) => p.length >= 13 },
  { id: 'uppercase', label: 'Uppercase letter (A–Z)',    test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'Lowercase letter (a–z)',    test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'Number (0–9)',               test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'Special character (!@#…)',  test: (p) => /[^A-Za-z0-9]/.test(p) }
];

function getStrength(password) {
  const passed = STRENGTH_RULES.filter((r) => r.test(password));
  return { score: passed.length, rules: STRENGTH_RULES.map((r) => ({ ...r, passed: r.test(password) })) };
}

function strengthLabel(score) {
  if (score === 0) return '';
  if (score <= 2)  return 'Weak';
  if (score <= 3)  return 'Fair';
  if (score <= 4)  return 'Good';
  return 'Strong';
}

function strengthColor(score, isDark) {
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-lime-400', 'bg-emerald-500'];
  return colors[score] ?? '';
}

// ─── Primitive UI helpers ─────────────────────────────────────────────────────

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function InputField({ id, label, type = 'text', value, onChange, placeholder, icon: Icon, rightSlot, error, dark, autoComplete }) {
  const base = cx(
    'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all',
    Icon ? 'pl-10' : '',
    rightSlot ? 'pr-10' : '',
    error
      ? 'border-red-500 focus:ring-2 focus:ring-red-500/40'
      : dark
        ? 'border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
  );

  return (
    <div className="relative w-full">
      {label && (
        <label htmlFor={id} className={cx('mb-1 block text-xs font-medium', dark ? 'text-zinc-400' : 'text-gray-600')}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className={cx('absolute left-3 top-1/2 -translate-y-1/2', dark ? 'text-zinc-500' : 'text-gray-400')}
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={base}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Button({ children, onClick, type = 'button', variant = 'primary', disabled, dark, fullWidth, icon: Icon }) {
  const base = cx(
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
    fullWidth ? 'w-full' : '',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
  );

  const variants = {
    primary:  'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500/50',
    secondary: dark
      ? 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 focus:ring-zinc-500/50'
      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400/50',
    danger:   'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50',
    ghost:    dark
      ? 'text-zinc-400 hover:text-zinc-200 focus:ring-zinc-500/50'
      : 'text-gray-500 hover:text-gray-800 focus:ring-gray-400/50'
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx(base, variants[variant] ?? variants.primary)}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

// ─── Role selector tabs ───────────────────────────────────────────────────────

function RoleTabs({ selectedRole, onSelect, dark }) {
  return (
    <div
      role="tablist"
      aria-label="Select role"
      className={cx('flex rounded-lg p-1 gap-1', dark ? 'bg-zinc-800' : 'bg-gray-100')}
    >
      {ROLE_TABS.map((tab) => {
        const active = selectedRole === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={cx(
              'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : dark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-gray-500 hover:text-gray-800'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Language selector ────────────────────────────────────────────────────────

function LanguageSelector({ selectedLang, onSelect, dark }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === selectedLang) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
          dark
            ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        )}
      >
        <Globe size={13} />
        {current.label}
        <ChevronDown size={12} className={cx('transition-transform', open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className={cx(
            'absolute right-0 top-full z-50 mt-1 max-h-48 w-36 overflow-y-auto rounded-lg border shadow-lg',
            dark ? 'border-zinc-700 bg-zinc-900' : 'border-gray-200 bg-white'
          )}
        >
          {LANGUAGES.map((lang) => (
            <li
              key={lang.code}
              role="option"
              aria-selected={lang.code === selectedLang}
              onClick={() => { onSelect(lang.code); setOpen(false); }}
              className={cx(
                'cursor-pointer px-3 py-2 text-xs transition-colors',
                lang.code === selectedLang
                  ? 'bg-indigo-600 text-white'
                  : dark
                    ? 'text-zinc-300 hover:bg-zinc-800'
                    : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {lang.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Password strength meter ──────────────────────────────────────────────────

function PasswordStrengthMeter({ password, dark }) {
  const { score, rules } = useMemo(() => getStrength(password), [password]);
  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Progress bar */}
      <div className={cx('flex gap-1', 'h-1.5')}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cx(
              'flex-1 rounded-full transition-all',
              i < score ? strengthColor(score, dark) : dark ? 'bg-zinc-700' : 'bg-gray-200'
            )}
          />
        ))}
      </div>

      {/* Label */}
      {score > 0 && (
        <p className={cx('text-xs font-medium', score <= 2 ? 'text-red-500' : score <= 3 ? 'text-yellow-500' : 'text-emerald-500')}>
          {strengthLabel(score)}
        </p>
      )}

      {/* Rule checklist */}
      <ul className="space-y-0.5">
        {rules.map((rule) => (
          <li key={rule.id} className={cx('flex items-center gap-1.5 text-xs', rule.passed ? 'text-emerald-500' : dark ? 'text-zinc-500' : 'text-gray-400')}>
            {rule.passed
              ? <CheckCircle2 size={11} />
              : <XCircle size={11} />}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Biometric button ─────────────────────────────────────────────────────────

function BiometricButton({ onBiometric, dark, loading }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onBiometric('fingerprint')}
        disabled={loading}
        aria-label="Sign in with fingerprint"
        className={cx(
          'flex flex-1 flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
          dark
            ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:border-indigo-500'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-indigo-400',
          loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
      >
        <Fingerprint size={22} className="text-indigo-500" />
        Fingerprint
      </button>
      <button
        type="button"
        onClick={() => onBiometric('face')}
        disabled={loading}
        aria-label="Sign in with face ID"
        className={cx(
          'flex flex-1 flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
          dark
            ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:border-indigo-500'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-indigo-400',
          loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
      >
        <Scan size={22} className="text-indigo-500" />
        Face ID
      </button>
    </div>
  );
}

// ─── Error / success banners ──────────────────────────────────────────────────

function Banner({ type, message, dark }) {
  if (!message) return null;
  const styles = {
    error:   cx('border-red-500/40 bg-red-500/10 text-red-400'),
    success: cx('border-emerald-500/40 bg-emerald-500/10 text-emerald-400'),
    info:    cx('border-indigo-500/40 bg-indigo-500/10 text-indigo-400')
  };
  const Icon = type === 'error' ? ShieldAlert : type === 'success' ? ShieldCheck : AlertCircle;
  return (
    <div className={cx('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs', styles[type] ?? styles.info)}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ─── Forgot password stub ─────────────────────────────────────────────────────

function ForgotPasswordView({ dark, onBack }) {
  const [email, setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // Stub: in production, trigger a server-side password-reset email flow
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <KeyRound size={32} className="mx-auto mb-2 text-indigo-500" />
        <h2 className={cx('text-lg font-bold', dark ? 'text-white' : 'text-gray-900')}>Forgot Password</h2>
        <p className={cx('mt-1 text-xs', dark ? 'text-zinc-400' : 'text-gray-500')}>
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      {submitted ? (
        <Banner type="success" message="If that email is registered, a reset link is on its way." dark={dark} />
      ) : (
        <>
          <InputField
            id="forgot-email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={Mail}
            dark={dark}
            autoComplete="email"
          />
          <Button type="submit" variant="primary" fullWidth disabled={!email}>
            Send Reset Link
          </Button>
        </>
      )}

      <button
        type="button"
        onClick={onBack}
        className={cx('flex w-full items-center justify-center gap-1 text-xs', dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-700')}
      >
        ← Back to sign in
      </button>
    </form>
  );
}

// ─── MFA step ─────────────────────────────────────────────────────────────────

function MfaView({ dark, onVerify, onResend, loading, error }) {
  const [code, setCode]         = useState('');
  const [method, setMethod]     = useState('totp'); // 'totp' | 'email'

  function handleSubmit(e) {
    e.preventDefault();
    onVerify({ code, method });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <ShieldCheck size={32} className="mx-auto mb-2 text-indigo-500" />
        <h2 className={cx('text-lg font-bold', dark ? 'text-white' : 'text-gray-900')}>Two-Factor Authentication</h2>
        <p className={cx('mt-1 text-xs', dark ? 'text-zinc-400' : 'text-gray-500')}>
          Enter the 6-digit code from your authenticator app or email.
        </p>
      </div>

      {/* Method toggle */}
      <div className={cx('flex gap-2 rounded-lg p-1', dark ? 'bg-zinc-800' : 'bg-gray-100')}>
        {[{ id: 'totp', label: 'Authenticator' }, { id: 'email', label: 'Email code' }].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={cx(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all focus:outline-none',
              method === m.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : dark ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <Banner type="error" message={error} dark={dark} />

      <InputField
        id="mfa-code"
        label="Verification code"
        type="text"
        inputMode="numeric"
        value={code}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
          setCode(val);
        }}
        placeholder="000000"
        icon={KeyRound}
        dark={dark}
        autoComplete="one-time-code"
      />

      <Button type="submit" variant="primary" fullWidth disabled={code.length !== 6 || loading}>
        {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
        Verify Code
      </Button>

      {method === 'email' && (
        <button
          type="button"
          onClick={onResend}
          className={cx('flex w-full items-center justify-center gap-1 text-xs', dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-700')}
        >
          <RefreshCw size={11} /> Resend code
        </button>
      )}
    </form>
  );
}

// ─── Login view ───────────────────────────────────────────────────────────────

function LoginView({ dark, onLogin, onBiometric, onForgot, onSwitchToRegister, loading, error }) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [role, setRole]           = useState(ROLES.USER);

  function handleSubmit(e) {
    e.preventDefault();
    onLogin({ email, password, role });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <RoleTabs selectedRole={role} onSelect={setRole} dark={dark} />

      <Banner type="error" message={error} dark={dark} />

      <InputField
        id="login-email"
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        icon={Mail}
        dark={dark}
        autoComplete="email"
      />

      <InputField
        id="login-password"
        label="Password"
        type={showPw ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••••••••"
        icon={Lock}
        dark={dark}
        autoComplete="current-password"
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            className={cx('focus:outline-none', dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600')}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgot}
          className={cx('text-xs', dark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700')}
        >
          Forgot password?
        </button>
      </div>

      <Button type="submit" variant="primary" fullWidth disabled={!email || !password || loading} icon={LogIn}>
        {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
        Sign In
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className={cx('flex-1 border-t', dark ? 'border-zinc-700' : 'border-gray-200')} />
        <span className={cx('text-xs', dark ? 'text-zinc-600' : 'text-gray-400')}>or</span>
        <div className={cx('flex-1 border-t', dark ? 'border-zinc-700' : 'border-gray-200')} />
      </div>

      <BiometricButton onBiometric={onBiometric} dark={dark} loading={loading} />

      <p className={cx('text-center text-xs', dark ? 'text-zinc-500' : 'text-gray-500')}>
        No account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className={cx('font-medium', dark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700')}
        >
          Create one
        </button>
      </p>
    </form>
  );
}

// ─── Register view ────────────────────────────────────────────────────────────

function RegisterView({ dark, onRegister, onSwitchToLogin, loading, error }) {
  const [email, setEmail]         = useState('');
  // Username allows unicode and emoji — no character restriction here
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);

  const { score } = useMemo(() => getStrength(password), [password]);
  const passwordReady = score === 5;

  function handleSubmit(e) {
    e.preventDefault();
    if (!passwordReady) return;
    onRegister({ email, username, password });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Banner type="error" message={error} dark={dark} />

      <InputField
        id="reg-email"
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        icon={Mail}
        dark={dark}
        autoComplete="email"
      />

      <InputField
        id="reg-username"
        label="Username (unicode & emoji ok)"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="e.g. alex_dev 🚀 or 田中"
        icon={User}
        dark={dark}
        autoComplete="username"
      />

      <div>
        <InputField
          id="reg-password"
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a strong password"
          icon={Lock}
          dark={dark}
          autoComplete="new-password"
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className={cx('focus:outline-none', dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600')}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />
        <PasswordStrengthMeter password={password} dark={dark} />
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!email || !username || !passwordReady || loading}
        icon={UserPlus}
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
        Create Account
      </Button>

      <p className={cx('text-center text-xs', dark ? 'text-zinc-500' : 'text-gray-500')}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className={cx('font-medium', dark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700')}
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

// ─── Main AuthForms component ─────────────────────────────────────────────────

/**
 * AuthForms — full authentication UI.
 *
 * @param {{
 *   theme?: 'dark' | 'light',
 *   onLogin?: (data: { email: string, password: string, role: string }) => void,
 *   onRegister?: (data: { email: string, username: string, password: string }) => void,
 *   onMfaVerify?: (data: { code: string, method: string }) => void,
 *   onMfaResend?: () => void,
 *   onBiometric?: (type: 'fingerprint' | 'face') => void,
 *   initialView?: 'login' | 'register',
 *   loading?: boolean,
 *   error?: string | null,
 * }} props
 */
export default function AuthForms({
  theme = 'dark',
  onLogin,
  onRegister,
  onMfaVerify,
  onMfaResend,
  onBiometric,
  initialView = VIEW.LOGIN,
  loading = false,
  error = null
}) {
  const dark = theme === 'dark';

  const [view, setView]         = useState(initialView);
  const [lang, setLang]         = useState('en');
  const [localError, setLocalError] = useState(null);

  const displayError = error ?? localError;

  const handleLogin = useCallback((data) => {
    setLocalError(null);
    if (!data.email || !data.password) {
      setLocalError('Email and password are required.');
      return;
    }
    onLogin?.(data);
  }, [onLogin]);

  const handleRegister = useCallback((data) => {
    setLocalError(null);
    onRegister?.(data);
  }, [onRegister]);

  const handleBiometric = useCallback((type) => {
    // Invoke WebAuthn API if available, else delegate to parent
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      onBiometric?.(type);
    } else {
      setLocalError('Biometric authentication is not supported on this device.');
    }
  }, [onBiometric]);

  return (
    <div
      className={cx(
        'flex min-h-screen items-center justify-center p-4',
        dark ? 'bg-zinc-950' : 'bg-gray-50'
      )}
    >
      <div
        className={cx(
          'w-full max-w-sm rounded-2xl border p-6 shadow-xl',
          dark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'
        )}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className={cx('text-xl font-bold tracking-tight', dark ? 'text-white' : 'text-gray-900')}>
              {view === VIEW.LOGIN    && 'Welcome back'}
              {view === VIEW.REGISTER && 'Create account'}
              {view === VIEW.MFA      && 'Verify identity'}
              {view === VIEW.FORGOT   && 'Reset password'}
            </h1>
            <p className={cx('mt-0.5 text-xs', dark ? 'text-zinc-500' : 'text-gray-400')}>Nexus AI Pro</p>
          </div>
          <LanguageSelector selectedLang={lang} onSelect={setLang} dark={dark} />
        </div>

        {/* View content */}
        {view === VIEW.LOGIN && (
          <LoginView
            dark={dark}
            loading={loading}
            error={displayError}
            onLogin={handleLogin}
            onBiometric={handleBiometric}
            onForgot={() => { setLocalError(null); setView(VIEW.FORGOT); }}
            onSwitchToRegister={() => { setLocalError(null); setView(VIEW.REGISTER); }}
          />
        )}

        {view === VIEW.REGISTER && (
          <RegisterView
            dark={dark}
            loading={loading}
            error={displayError}
            onRegister={handleRegister}
            onSwitchToLogin={() => { setLocalError(null); setView(VIEW.LOGIN); }}
          />
        )}

        {view === VIEW.MFA && (
          <MfaView
            dark={dark}
            loading={loading}
            error={displayError}
            onVerify={onMfaVerify}
            onResend={onMfaResend}
          />
        )}

        {view === VIEW.FORGOT && (
          <ForgotPasswordView
            dark={dark}
            onBack={() => { setLocalError(null); setView(VIEW.LOGIN); }}
          />
        )}
      </div>
    </div>
  );
}

// Named re-exports for consumers who only need individual pieces
export { RoleTabs, LanguageSelector, PasswordStrengthMeter, BiometricButton, MfaView };
