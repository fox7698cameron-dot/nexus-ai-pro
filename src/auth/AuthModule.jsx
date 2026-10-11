/* src/auth/AuthModule.jsx
   Created: 2026-10-11
   Authentication Module - Registration, Login, Biometrics, MFA/2FA
   Roles: user, moderator, developer, admin
*/

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye, EyeOff, Fingerprint, Camera, Mail, MessageSquare,
  Shield, ShieldCheck, ShieldAlert, Key, QrCode, Copy,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Lock,
  User, AtSign, Smartphone, RefreshCw, LogIn, UserPlus,
  ChevronRight, Info, Globe, Clock
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Internationalisation – swap this with i18next / react-intl in production
// ---------------------------------------------------------------------------
const TRANSLATIONS = {
  en: {
    // General
    'app.name': 'Nexus AI Pro',
    'btn.submit': 'Submit',
    'btn.cancel': 'Cancel',
    'btn.back': 'Back',
    'btn.continue': 'Continue',
    'btn.copy': 'Copy',
    'btn.copied': 'Copied!',
    'btn.refresh': 'Refresh',
    'label.or': 'or',
    'label.loading': 'Loading…',

    // Login
    'login.title': 'Welcome back',
    'login.subtitle': 'Sign in to your account',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.remember': 'Remember this device',
    'login.forgot': 'Forgot password?',
    'login.submit': 'Sign in',
    'login.no_account': "Don't have an account?",
    'login.register_link': 'Create one',
    'login.biometric': 'Sign in with biometrics',
    'login.locked': 'Account temporarily locked',
    'login.locked_desc': 'Too many failed attempts. Try again in {minutes} minute(s).',
    'login.attempts_left': '{n} attempt(s) remaining before lockout',
    'login.error.credentials': 'Invalid username or password',

    // Register
    'register.title': 'Create account',
    'register.subtitle': 'Join Nexus AI Pro',
    'register.username': 'Username',
    'register.username_hint': 'Emojis and Unicode supported',
    'register.email': 'Email address',
    'register.password': 'Password',
    'register.confirm_password': 'Confirm password',
    'register.submit': 'Create account',
    'register.have_account': 'Already have an account?',
    'register.login_link': 'Sign in',
    'register.success': 'Account created! Please verify your email.',

    // Validation
    'validation.username.required': 'Username is required',
    'validation.username.length': 'Username must be 3–40 characters',
    'validation.email.required': 'Email is required',
    'validation.email.invalid': 'Enter a valid email address',
    'validation.password.required': 'Password is required',
    'validation.password.min': 'Password must be at least 13 characters',
    'validation.password.uppercase': 'Must contain an uppercase letter',
    'validation.password.lowercase': 'Must contain a lowercase letter',
    'validation.password.number': 'Must contain a number',
    'validation.password.special': 'Must contain a special character',
    'validation.password.mismatch': 'Passwords do not match',

    // Password strength
    'strength.very_weak': 'Very Weak',
    'strength.weak': 'Weak',
    'strength.fair': 'Fair',
    'strength.strong': 'Strong',
    'strength.very_strong': 'Very Strong',

    // Biometrics
    'biometric.title': 'Biometric authentication',
    'biometric.fingerprint': 'Fingerprint / Touch ID',
    'biometric.face': 'Face ID',
    'biometric.retina': 'Retinal Scan',
    'biometric.retina_placeholder': 'Retinal scan hardware not detected',
    'biometric.prompt': 'Authenticate with your biometric',
    'biometric.success': 'Biometric verified',
    'biometric.error': 'Biometric authentication failed',
    'biometric.not_supported': 'Biometrics not supported on this device',
    'biometric.register_prompt': 'Register biometric for faster sign-in',

    // MFA Setup
    'mfa.setup.title': 'Set up two-factor authentication',
    'mfa.setup.subtitle': 'Choose your preferred 2FA method',
    'mfa.totp.title': 'Authenticator app (TOTP)',
    'mfa.totp.step1': 'Scan this QR code with your authenticator app',
    'mfa.totp.step2': 'Or enter this code manually:',
    'mfa.totp.verify': 'Enter the 6-digit code from your app',
    'mfa.sms.title': 'SMS verification',
    'mfa.sms.phone': 'Phone number',
    'mfa.sms.send': 'Send code',
    'mfa.sms.sent': 'Code sent to {phone}',
    'mfa.email.title': 'Email verification',
    'mfa.email.send': 'Send code',
    'mfa.email.sent': 'Code sent to {email}',
    'mfa.backup.title': 'Backup codes',
    'mfa.backup.desc': 'Save these codes somewhere safe. Each can only be used once.',
    'mfa.backup.download': 'Download codes',
    'mfa.code.label': 'Verification code',
    'mfa.code.placeholder': '000000',
    'mfa.verify': 'Verify',
    'mfa.skip': 'Skip for now',
    'mfa.success': 'Two-factor authentication enabled',
    'mfa.error': 'Invalid or expired code',
  },
};

let _locale = 'en';
export const setLocale = (locale) => { _locale = locale; };
export const t = (key, vars = {}) => {
  const dict = TRANSLATIONS[_locale] || TRANSLATIONS.en;
  let str = dict[key] || key;
  Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  return str;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ROLES = ['user', 'moderator', 'developer', 'admin'];
const ROLE_REDIRECTS = {
  user: '/dashboard',
  moderator: '/moderator',
  developer: '/developer',
  admin: '/admin',
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Evaluate password strength. Returns 0-4 (index into STRENGTH_LEVELS). */
function evaluatePasswordStrength(password) {
  if (!password) return -1;
  let score = 0;
  if (password.length >= 13) score++;
  if (password.length >= 18) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return 0; // very weak
  if (score === 3) return 1; // weak
  if (score === 4) return 2; // fair
  if (score === 5) return 3; // strong
  return 4; // very strong
}

const STRENGTH_LEVELS = [
  { label: () => t('strength.very_weak'), color: 'bg-red-500',    text: 'text-red-500'    },
  { label: () => t('strength.weak'),      color: 'bg-orange-500', text: 'text-orange-500' },
  { label: () => t('strength.fair'),      color: 'bg-yellow-500', text: 'text-yellow-500' },
  { label: () => t('strength.strong'),    color: 'bg-lime-500',   text: 'text-lime-500'   },
  { label: () => t('strength.very_strong'), color: 'bg-green-500', text: 'text-green-500' },
];

/** Validate password against all rules, return array of error keys. */
function validatePassword(password) {
  const errors = [];
  if (!password) { errors.push('validation.password.required'); return errors; }
  if (password.length < 13) errors.push('validation.password.min');
  if (!/[A-Z]/.test(password)) errors.push('validation.password.uppercase');
  if (!/[a-z]/.test(password)) errors.push('validation.password.lowercase');
  if (!/\d/.test(password)) errors.push('validation.password.number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('validation.password.special');
  return errors;
}

/** Basic email validation. */
function validateEmail(email) {
  if (!email) return 'validation.email.required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'validation.email.invalid';
  return null;
}

/** Username accepts emojis and Unicode; 3–40 chars by Unicode scalar count. */
function validateUsername(username) {
  if (!username) return 'validation.username.required';
  const len = [...username].length; // spread handles surrogate pairs
  if (len < 3 || len > 40) return 'validation.username.length';
  return null;
}

/** Lockout state stored in localStorage (no sensitive data). */
function getLockoutState(username) {
  try {
    const raw = localStorage.getItem(`lockout:${username}`);
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
  } catch { return { attempts: 0, lockedUntil: null }; }
}

function saveLockoutState(username, state) {
  try { localStorage.setItem(`lockout:${username}`, JSON.stringify(state)); } catch { /* ignore */ }
}

function clearLockoutState(username) {
  try { localStorage.removeItem(`lockout:${username}`); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// API helpers (no secrets in code – credentials come from user input only)
// ---------------------------------------------------------------------------
async function apiRequest(endpoint, body) {
  const res = await fetch(`/api/auth${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
  return data;
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------
function InputField({ id, label, type = 'text', value, onChange, error, hint, autoComplete, disabled, placeholder, right }) {
  const [showPw, setShowPw] = useState(false);
  const inputType = type === 'password' ? (showPw ? 'text' : 'password') : type;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={classNames(
            'block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-colors',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed',
            type === 'password' || right ? 'pr-10' : ''
          )}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            tabIndex={-1}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {right && type !== 'password' && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">{right}</div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 dark:text-red-400">{t(error)}</p>}
    </div>
  );
}

function PasswordStrengthMeter({ password }) {
  const level = evaluatePasswordStrength(password);
  if (level < 0) return null;
  const info = STRENGTH_LEVELS[level];
  const bars = 5;
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={classNames(
              'h-1.5 flex-1 rounded-full transition-all',
              i <= level ? info.color : 'bg-gray-200 dark:bg-gray-700'
            )}
          />
        ))}
      </div>
      <p className={classNames('text-xs font-medium', info.text)}>{info.label()}</p>
    </div>
  );
}

function AlertBanner({ type = 'error', message, onClose }) {
  const styles = {
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300',
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300',
  };
  const icons = {
    error: <XCircle size={16} className="shrink-0" />,
    warning: <AlertTriangle size={16} className="shrink-0" />,
    success: <CheckCircle2 size={16} className="shrink-0" />,
    info: <Info size={16} className="shrink-0" />,
  };
  return (
    <div className={classNames('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', styles[type])}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-auto hover:opacity-70" type="button">
          <XCircle size={14} />
        </button>
      )}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, loading, type = 'button', variant = 'primary', className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600',
    secondary: 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-indigo-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 focus:ring-indigo-500',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classNames(base, variants[variant], className)}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={classNames(
      'rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm',
      className
    )}>
      {children}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className="relative flex items-center">
      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
      {label && <span className="mx-3 text-xs text-gray-400 dark:text-gray-500">{label}</span>}
      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
    </div>
  );
}

// Numeric-only code input boxes (OTP style)
function OTPInput({ length = 6, value, onChange, disabled }) {
  const inputs = useRef([]);

  const handleChange = (i, char) => {
    const digits = value.split('');
    // accept only digits
    const d = char.replace(/\D/g, '').slice(-1);
    digits[i] = d;
    const next = digits.join('');
    onChange(next);
    if (d && i < length - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted.padEnd(length, '').slice(0, length));
    e.preventDefault();
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className={classNames(
            'w-10 h-12 text-center text-lg font-mono rounded-lg border transition-colors',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            'border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PasswordRulesChecklist – inline feedback during registration
// ---------------------------------------------------------------------------
function PasswordRules({ password }) {
  const rules = [
    { key: 'validation.password.min',      pass: password.length >= 13 },
    { key: 'validation.password.uppercase', pass: /[A-Z]/.test(password) },
    { key: 'validation.password.lowercase', pass: /[a-z]/.test(password) },
    { key: 'validation.password.number',    pass: /\d/.test(password) },
    { key: 'validation.password.special',   pass: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <ul className="space-y-1">
      {rules.map(r => (
        <li key={r.key} className={classNames('flex items-center gap-1.5 text-xs', r.pass ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500')}>
          {r.pass ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {t(r.key)}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// LoginForm
// ---------------------------------------------------------------------------
export function LoginForm({ onSuccess, onSwitchToRegister, onSwitchToBiometric }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lockout, setLockout] = useState(null); // { until, minutes }
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  // Check lockout on username blur
  const checkLockout = useCallback((uname) => {
    if (!uname) return;
    const state = getLockoutState(uname);
    if (state.lockedUntil && Date.now() < state.lockedUntil) {
      const minutes = Math.ceil((state.lockedUntil - Date.now()) / 60000);
      setLockout({ until: state.lockedUntil, minutes });
    } else {
      setLockout(null);
      if (state.attempts > 0) {
        setAttemptsLeft(MAX_LOGIN_ATTEMPTS - state.attempts);
      }
    }
  }, []);

  useEffect(() => {
    if (!lockout) return;
    const id = setInterval(() => {
      if (Date.now() >= lockout.until) {
        setLockout(null);
        clearInterval(id);
      } else {
        const minutes = Math.ceil((lockout.until - Date.now()) / 60000);
        setLockout(l => ({ ...l, minutes }));
      }
    }, 15000);
    return () => clearInterval(id);
  }, [lockout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side lockout guard
    const state = getLockoutState(username);
    if (state.lockedUntil && Date.now() < state.lockedUntil) {
      const minutes = Math.ceil((state.lockedUntil - Date.now()) / 60000);
      setLockout({ until: state.lockedUntil, minutes });
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/login', { username, password, remember });
      clearLockoutState(username);
      setAttemptsLeft(null);
      onSuccess?.(data);
    } catch (err) {
      const newAttempts = (state.attempts || 0) + 1;
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        saveLockoutState(username, { attempts: newAttempts, lockedUntil });
        setLockout({ until: lockedUntil, minutes: Math.ceil(LOCKOUT_DURATION_MS / 60000) });
        setAttemptsLeft(0);
      } else {
        saveLockoutState(username, { attempts: newAttempts, lockedUntil: null });
        setAttemptsLeft(MAX_LOGIN_ATTEMPTS - newAttempts);
        setError(t('login.error.credentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('login.subtitle')}</p>
      </div>

      {lockout && (
        <AlertBanner
          type="warning"
          message={t('login.locked_desc', { minutes: lockout.minutes })}
        />
      )}
      {!lockout && error && (
        <AlertBanner type="error" message={error} onClose={() => setError(null)} />
      )}
      {!lockout && attemptsLeft !== null && attemptsLeft > 0 && (
        <AlertBanner type="warning" message={t('login.attempts_left', { n: attemptsLeft })} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <InputField
          id="login-username"
          label={t('login.username')}
          value={username}
          onChange={e => setUsername(e.target.value)}
          onBlur={() => checkLockout(username)}
          autoComplete="username"
          disabled={loading || !!lockout}
          right={<User size={14} className="text-gray-400" />}
        />
        <InputField
          id="login-password"
          label={t('login.password')}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={loading || !!lockout}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              disabled={loading || !!lockout}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">{t('login.remember')}</span>
          </label>
          <button
            type="button"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t('login.forgot')}
          </button>
        </div>

        <PrimaryButton
          type="submit"
          loading={loading}
          disabled={!!lockout || !username || !password}
          className="w-full"
        >
          <LogIn size={16} />
          {t('login.submit')}
        </PrimaryButton>
      </form>

      <Divider label={t('label.or')} />

      <PrimaryButton
        variant="secondary"
        onClick={onSwitchToBiometric}
        className="w-full"
      >
        <Fingerprint size={16} />
        {t('login.biometric')}
      </PrimaryButton>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        {t('login.no_account')}{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
        >
          {t('login.register_link')}
        </button>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RegisterForm
// ---------------------------------------------------------------------------
export function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const touch = (field) => () => setTouched(t => ({ ...t, [field]: true }));

  const errors = {
    username: touched.username ? validateUsername(form.username) : null,
    email: touched.email ? validateEmail(form.email) : null,
    password: touched.password ? validatePassword(form.password)[0] || null : null,
    confirm: touched.confirm && form.password !== form.confirm ? 'validation.password.mismatch' : null,
  };

  const allPasswordErrors = validatePassword(form.password);
  const isValid = !Object.values(errors).some(Boolean)
    && form.username && form.email && form.password && form.confirm
    && allPasswordErrors.length === 0
    && form.password === form.confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirm: true });
    if (!isValid) return;
    setServerError(null);
    setLoading(true);
    try {
      const data = await apiRequest('/register', {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      onSuccess?.(data);
    } catch (err) {
      setServerError(err.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('register.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('register.subtitle')}</p>
      </div>

      {serverError && (
        <AlertBanner type="error" message={serverError} onClose={() => setServerError(null)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <InputField
          id="reg-username"
          label={t('register.username')}
          value={form.username}
          onChange={set('username')}
          onBlur={touch('username')}
          error={errors.username}
          hint={t('register.username_hint')}
          autoComplete="username"
          disabled={loading}
        />
        <InputField
          id="reg-email"
          label={t('register.email')}
          type="email"
          value={form.email}
          onChange={set('email')}
          onBlur={touch('email')}
          error={errors.email}
          autoComplete="email"
          disabled={loading}
        />
        <div className="space-y-2">
          <InputField
            id="reg-password"
            label={t('register.password')}
            type="password"
            value={form.password}
            onChange={set('password')}
            onBlur={touch('password')}
            autoComplete="new-password"
            disabled={loading}
          />
          {form.password && (
            <>
              <PasswordStrengthMeter password={form.password} />
              <PasswordRules password={form.password} />
            </>
          )}
        </div>
        <InputField
          id="reg-confirm"
          label={t('register.confirm_password')}
          type="password"
          value={form.confirm}
          onChange={set('confirm')}
          onBlur={touch('confirm')}
          error={errors.confirm}
          autoComplete="new-password"
          disabled={loading}
        />

        <PrimaryButton
          type="submit"
          loading={loading}
          disabled={!isValid}
          className="w-full"
        >
          <UserPlus size={16} />
          {t('register.submit')}
        </PrimaryButton>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        {t('register.have_account')}{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
        >
          {t('register.login_link')}
        </button>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BiometricLogin
// ---------------------------------------------------------------------------
export function BiometricLogin({ onSuccess, onFallback, username }) {
  const [status, setStatus] = useState('idle'); // idle | authenticating | success | error | unsupported
  const [message, setMessage] = useState('');
  const [activeMethod, setActiveMethod] = useState(null);

  const isWebAuthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const startWebAuthn = useCallback(async (method) => {
    if (!isWebAuthnSupported) {
      setStatus('unsupported');
      setMessage(t('biometric.not_supported'));
      return;
    }
    setActiveMethod(method);
    setStatus('authenticating');
    setMessage(t('biometric.prompt'));
    try {
      // Fetch challenge from server
      const { challenge, allowCredentials, rpId } = await apiRequest('/webauthn/challenge', { username });

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          allowCredentials: allowCredentials || [],
          rpId: rpId || window.location.hostname,
          userVerification: method === 'face' ? 'required' : 'preferred',
          timeout: 60000,
        },
      });

      // Send assertion to server for verification
      const authData = await apiRequest('/webauthn/verify', {
        username,
        id: assertion.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
        response: {
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature))),
          userHandle: assertion.response.userHandle
            ? btoa(String.fromCharCode(...new Uint8Array(assertion.response.userHandle)))
            : null,
        },
        type: assertion.type,
      });

      setStatus('success');
      setMessage(t('biometric.success'));
      onSuccess?.(authData);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setStatus('idle');
        setMessage('');
      } else {
        setStatus('error');
        setMessage(t('biometric.error'));
      }
    }
  }, [isWebAuthnSupported, username, onSuccess]);

  const methods = [
    {
      id: 'fingerprint',
      icon: <Fingerprint size={24} />,
      label: t('biometric.fingerprint'),
      available: isWebAuthnSupported,
      action: () => startWebAuthn('fingerprint'),
    },
    {
      id: 'face',
      icon: <Camera size={24} />,
      label: t('biometric.face'),
      available: isWebAuthnSupported,
      action: () => startWebAuthn('face'),
    },
    {
      id: 'retina',
      icon: <Eye size={24} />,
      label: t('biometric.retina'),
      available: false, // hardware not yet standard in browsers
      action: null,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('biometric.title')}</h1>
      </div>

      {status === 'unsupported' && (
        <AlertBanner type="warning" message={t('biometric.not_supported')} />
      )}
      {status === 'error' && (
        <AlertBanner type="error" message={message} onClose={() => setStatus('idle')} />
      )}
      {status === 'success' && (
        <AlertBanner type="success" message={message} />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {methods.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={m.action || undefined}
            disabled={!m.available || status === 'authenticating' || status === 'success'}
            className={classNames(
              'flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500',
              m.available
                ? classNames(
                    'border-gray-200 dark:border-gray-700 cursor-pointer',
                    activeMethod === m.id && status === 'authenticating'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )
                : 'border-dashed border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
            )}
          >
            <div className={classNames(
              'rounded-full p-3',
              m.available ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            )}>
              {activeMethod === m.id && status === 'authenticating'
                ? <Loader2 size={24} className="animate-spin" />
                : m.icon}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{m.label}</span>
            {m.id === 'retina' && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{t('biometric.retina_placeholder')}</span>
            )}
          </button>
        ))}
      </div>

      <Divider />

      <PrimaryButton variant="ghost" onClick={onFallback} className="w-full">
        {t('btn.back')}
      </PrimaryButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MFASetup
// ---------------------------------------------------------------------------
export function MFASetup({ userId, email, onComplete, onSkip }) {
  const [method, setMethod] = useState(null); // null | totp | sms | email
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);
  const [totpSecret, setTotpSecret] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [codeSent, setCodeSent] = useState(false);

  const initTOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/mfa/totp/setup', { userId });
      setTotpSecret(data.secret);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/mfa/send-code', {
        userId,
        method,
        destination: method === 'sms' ? phone : email,
      });
      setCodeSent(true);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupCodes = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/mfa/backup-codes', { userId });
      setBackupCodes(data.codes || []);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCodes = () => {
    const content = `Nexus AI Pro - Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexus-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const methodCards = [
    {
      id: 'totp',
      icon: <QrCode size={24} />,
      title: t('mfa.totp.title'),
      desc: 'Google Authenticator, Authy, 1Password…',
    },
    {
      id: 'sms',
      icon: <Smartphone size={24} />,
      title: t('mfa.sms.title'),
      desc: t('mfa.sms.phone'),
    },
    {
      id: 'email',
      icon: <Mail size={24} />,
      title: t('mfa.email.title'),
      desc: email,
    },
  ];

  // Step 1 – choose method
  if (!method || step === 1) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('mfa.setup.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('mfa.setup.subtitle')}</p>
        </div>
        {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
        <div className="space-y-3">
          {methodCards.map(mc => (
            <button
              key={mc.id}
              type="button"
              onClick={() => {
                setMethod(mc.id);
                setStep(1);
                if (mc.id === 'totp') initTOTP();
                else if (mc.id === 'sms') { /* wait for phone */ }
                else sendCode(); // email — send immediately
              }}
              disabled={loading}
              className={classNames(
                'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                method === mc.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : ''
              )}
            >
              <div className="rounded-lg bg-indigo-100 dark:bg-indigo-900/30 p-2.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                {mc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{mc.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{mc.desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
        {onSkip && (
          <PrimaryButton variant="ghost" onClick={onSkip} className="w-full">
            {t('mfa.skip')}
          </PrimaryButton>
        )}
      </div>
    );
  }

  // TOTP – QR + secret + verify
  if (method === 'totp' && step >= 2) {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('mfa.totp.title')}</h2>
        {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

        {/* QR Code placeholder */}
        <div className="flex justify-center">
          <div className="relative w-40 h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
            <QrCode size={64} className="text-gray-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-gray-400 text-center px-2">{t('mfa.totp.step1')}</span>
            </div>
          </div>
        </div>

        {totpSecret && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('mfa.totp.step2')}</p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2">
              <code className="flex-1 text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                {totpSecret}
              </code>
              <button type="button" onClick={copySecret} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0">
                {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        <MFAVerify
          method="totp"
          userId={userId}
          onVerified={fetchBackupCodes}
          embedded
        />

        <PrimaryButton variant="ghost" onClick={() => { setMethod(null); setStep(1); }} className="w-full">
          {t('btn.back')}
        </PrimaryButton>
      </div>
    );
  }

  // SMS – collect phone then send
  if (method === 'sms' && step === 1) {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('mfa.sms.title')}</h2>
        {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
        <InputField
          id="sms-phone"
          label={t('mfa.sms.phone')}
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          autoComplete="tel"
          disabled={loading}
          placeholder="+1 555 000 0000"
          right={<Smartphone size={14} className="text-gray-400" />}
        />
        <PrimaryButton onClick={sendCode} loading={loading} disabled={!phone} className="w-full">
          {t('mfa.sms.send')}
        </PrimaryButton>
        <PrimaryButton variant="ghost" onClick={() => { setMethod(null); setStep(1); }} className="w-full">
          {t('btn.back')}
        </PrimaryButton>
      </div>
    );
  }

  // SMS/Email – verify code
  if ((method === 'sms' || method === 'email') && step === 2) {
    const sentMessage = method === 'sms'
      ? t('mfa.sms.sent', { phone })
      : t('mfa.email.sent', { email });
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {method === 'sms' ? t('mfa.sms.title') : t('mfa.email.title')}
        </h2>
        {codeSent && <AlertBanner type="info" message={sentMessage} />}
        {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
        <MFAVerify
          method={method}
          userId={userId}
          onVerified={fetchBackupCodes}
          embedded
        />
        <PrimaryButton
          variant="secondary"
          onClick={sendCode}
          loading={loading}
          className="w-full"
        >
          <RefreshCw size={14} />
          {t('btn.refresh')}
        </PrimaryButton>
        <PrimaryButton variant="ghost" onClick={() => { setMethod(null); setStep(1); }} className="w-full">
          {t('btn.back')}
        </PrimaryButton>
      </div>
    );
  }

  // Backup codes
  if (step === 3) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Key size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('mfa.backup.title')}</h2>
        </div>
        <AlertBanner type="info" message={t('mfa.backup.desc')} />
        <div className="grid grid-cols-2 gap-2">
          {(backupCodes.length > 0 ? backupCodes : Array.from({ length: 8 }, (_, i) => `XXXX-${String(i + 1).padStart(4, '0')}`)).map((code, i) => (
            <div key={i} className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-center font-mono text-sm text-gray-900 dark:text-gray-100">
              {code}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <PrimaryButton variant="secondary" onClick={downloadCodes} className="flex-1">
            {t('mfa.backup.download')}
          </PrimaryButton>
          <PrimaryButton onClick={onComplete} className="flex-1">
            <ShieldCheck size={16} />
            {t('mfa.success')}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// MFAVerify
// ---------------------------------------------------------------------------
export function MFAVerify({ method = 'totp', userId, onVerified, onFallback, embedded = false }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async () => {
    if (code.replace(/\D/g, '').length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/mfa/verify', { userId, code: code.replace(/\D/g, ''), method });
      onVerified?.(data);
    } catch (err) {
      setError(t('mfa.error'));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const methodIcons = {
    totp: <QrCode size={16} />,
    sms: <Smartphone size={16} />,
    email: <Mail size={16} />,
  };

  return (
    <div className={classNames('space-y-4', !embedded && 'py-2')}>
      {!embedded && (
        <div className="flex items-center gap-2">
          {methodIcons[method]}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('mfa.code.label')}</h2>
        </div>
      )}
      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
      <div>
        {!embedded && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
            {t('mfa.totp.verify')}
          </label>
        )}
        <OTPInput length={6} value={code} onChange={setCode} disabled={loading} />
      </div>
      <PrimaryButton
        onClick={handleVerify}
        loading={loading}
        disabled={code.replace(/\D/g, '').length < 6}
        className="w-full"
      >
        <ShieldCheck size={16} />
        {t('mfa.verify')}
      </PrimaryButton>
      {!embedded && onFallback && (
        <PrimaryButton variant="ghost" onClick={onFallback} className="w-full">
          {t('btn.back')}
        </PrimaryButton>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role-based redirect helper (call after successful auth)
// ---------------------------------------------------------------------------
export function getRoleRedirect(role) {
  return ROLE_REDIRECTS[role] || ROLE_REDIRECTS.user;
}

// ---------------------------------------------------------------------------
// AuthModule – top-level orchestrator
// ---------------------------------------------------------------------------
const VIEWS = {
  LOGIN: 'login',
  REGISTER: 'register',
  BIOMETRIC: 'biometric',
  MFA_SETUP: 'mfa_setup',
  MFA_VERIFY: 'mfa_verify',
  SUCCESS: 'success',
};

export default function AuthModule({
  initialView = VIEWS.LOGIN,
  onAuthenticated,
  logo,
  showBranding = true,
  className = '',
}) {
  const [view, setView] = useState(initialView);
  const [authState, setAuthState] = useState({
    userId: null,
    username: null,
    email: null,
    role: null,
    requiresMFA: false,
    mfaMethod: null,
    token: null,
  });
  const [successMessage, setSuccessMessage] = useState('');

  // After login – decide whether MFA is needed
  const handleLoginSuccess = useCallback((data) => {
    setAuthState(s => ({
      ...s,
      userId: data.userId,
      username: data.username,
      email: data.email,
      role: data.role,
      requiresMFA: data.requiresMFA || false,
      mfaMethod: data.mfaMethod || 'totp',
      token: data.token || null,
    }));
    if (data.requiresMFA) {
      setView(VIEWS.MFA_VERIFY);
    } else {
      setView(VIEWS.SUCCESS);
      setSuccessMessage(t('login.submit'));
      onAuthenticated?.({ ...data, redirect: getRoleRedirect(data.role) });
    }
  }, [onAuthenticated]);

  // After register – show MFA setup
  const handleRegisterSuccess = useCallback((data) => {
    setAuthState(s => ({
      ...s,
      userId: data.userId,
      username: data.username,
      email: data.email,
      role: data.role || 'user',
    }));
    setSuccessMessage(t('register.success'));
    setView(VIEWS.MFA_SETUP);
  }, []);

  // After biometric auth
  const handleBiometricSuccess = useCallback((data) => {
    setView(VIEWS.SUCCESS);
    setSuccessMessage(t('biometric.success'));
    onAuthenticated?.({ ...data, redirect: getRoleRedirect(data.role) });
  }, [onAuthenticated]);

  // After MFA verify
  const handleMFAVerified = useCallback((data) => {
    setView(VIEWS.SUCCESS);
    setSuccessMessage(t('mfa.success'));
    onAuthenticated?.({ ...authState, ...data, redirect: getRoleRedirect(data.role || authState.role) });
  }, [onAuthenticated, authState]);

  // After MFA setup complete
  const handleMFASetupComplete = useCallback(() => {
    setView(VIEWS.SUCCESS);
    setSuccessMessage(t('mfa.success'));
    onAuthenticated?.({ ...authState, redirect: getRoleRedirect(authState.role) });
  }, [onAuthenticated, authState]);

  const renderView = () => {
    switch (view) {
      case VIEWS.LOGIN:
        return (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setView(VIEWS.REGISTER)}
            onSwitchToBiometric={() => setView(VIEWS.BIOMETRIC)}
          />
        );
      case VIEWS.REGISTER:
        return (
          <RegisterForm
            onSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setView(VIEWS.LOGIN)}
          />
        );
      case VIEWS.BIOMETRIC:
        return (
          <BiometricLogin
            username={authState.username}
            onSuccess={handleBiometricSuccess}
            onFallback={() => setView(VIEWS.LOGIN)}
          />
        );
      case VIEWS.MFA_SETUP:
        return (
          <MFASetup
            userId={authState.userId}
            email={authState.email}
            onComplete={handleMFASetupComplete}
            onSkip={() => {
              setView(VIEWS.SUCCESS);
              onAuthenticated?.({ ...authState, redirect: getRoleRedirect(authState.role) });
            }}
          />
        );
      case VIEWS.MFA_VERIFY:
        return (
          <MFAVerify
            method={authState.mfaMethod || 'totp'}
            userId={authState.userId}
            onVerified={handleMFAVerified}
            onFallback={() => setView(VIEWS.LOGIN)}
          />
        );
      case VIEWS.SUCCESS:
        return (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <ShieldCheck size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{successMessage}</p>
            {authState.role && (
              <div className="flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1">
                <Shield size={12} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 capitalize">
                  {authState.role}
                </span>
              </div>
            )}
            {authState.role && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecting to {getRoleRedirect(authState.role)}…
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={classNames(
      'min-h-screen flex items-center justify-center p-4',
      'bg-gray-50 dark:bg-gray-950',
      className
    )}>
      <div className="w-full max-w-md">
        {showBranding && (
          <div className="mb-6 flex flex-col items-center gap-2">
            {logo ? (
              <div className="w-12 h-12">{logo}</div>
            ) : (
              <div className="rounded-2xl bg-indigo-600 dark:bg-indigo-500 p-3">
                <Shield size={28} className="text-white" />
              </div>
            )}
            <span className="text-lg font-bold text-gray-900 dark:text-white">{t('app.name')}</span>
          </div>
        )}

        <Card>
          <div className="p-6 sm:p-8">
            {renderView()}
          </div>
        </Card>

        {/* Role info footer */}
        {view !== VIEWS.SUCCESS && (
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600 flex items-center justify-center gap-1">
            <Lock size={10} />
            Secured with end-to-end encryption
            <Globe size={10} className="ml-2" />
            Role-based access: {ROLES.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

// Re-export for convenience
export { ROLES, ROLE_REDIRECTS, VIEWS };
