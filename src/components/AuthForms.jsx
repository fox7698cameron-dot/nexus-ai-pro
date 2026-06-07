// src/components/AuthForms.jsx | Nexus AI Pro | Date: 2026-06-07

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Mail,
  Lock,
  User,
  Globe,
  Shield,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_PASSWORD_LENGTH = 13;
const MAX_USERNAME_LENGTH = 50;
const MIN_USERNAME_LENGTH = 2;

const PASSWORD_SPECIALS = /[!@#$%^&*_\-]/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate an email address. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Return password strength metadata. */
function analysePassword(pw) {
  const hasUpper   = /[A-Z]/.test(pw);
  const hasLower   = /[a-z]/.test(pw);
  const hasNumber  = /[0-9]/.test(pw);
  const hasSpecial = PASSWORD_SPECIALS.test(pw);
  const longEnough = pw.length >= MIN_PASSWORD_LENGTH;

  const score =
    (hasUpper ? 1 : 0) +
    (hasLower ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSpecial ? 1 : 0) +
    (longEnough ? 1 : 0);

  const label =
    score <= 1 ? 'Weak'
    : score === 2 ? 'Fair'
    : score === 3 ? 'Fair'
    : score === 4 ? 'Good'
    : 'Strong';

  const color =
    score <= 1 ? 'red'
    : score <= 3 ? 'yellow'
    : 'green';

  return { hasUpper, hasLower, hasNumber, hasSpecial, longEnough, score, label, color };
}

/** Detect whether WebAuthn / biometric is available in this browser. */
function isBiometricAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator?.credentials?.get === 'function'
  );
}

/** Detect the likely biometric type from the platform User-Agent. */
function detectBiometricType() {
  if (typeof navigator === 'undefined') return 'biometric';
  const ua = navigator.userAgent.toLowerCase();
  if (/(iphone|ipad|mac)/.test(ua)) return 'Face ID / Touch ID';
  if (/android/.test(ua))            return 'Fingerprint';
  if (/windows/.test(ua))            return 'Windows Hello';
  return 'Biometric';
}

/** Base64url-encode a Uint8Array (WebAuthn helpers). */
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Decode a base64url string to Uint8Array. */
function base64urlToBuffer(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + ((4 - (str.length % 4)) % 4), '=',
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

/** Red alert box for form-level errors. */
function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss error"
          onClick={onDismiss}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Green success notice. */
function SuccessAlert({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/** Form field wrapper with label, input, and inline error. */
function Field({ id, label, error, children, required }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-400" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared text/email/password input styling. */
const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm ' +
  'text-slate-100 placeholder-slate-500 outline-none transition ' +
  'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'dark:bg-slate-900 dark:text-slate-100';

/** Spinner element. */
function Spinner({ size = 'h-4 w-4' }) {
  return (
    <Loader2
      className={`${size} animate-spin`}
      aria-hidden="true"
    />
  );
}

/** Primary action button. */
function PrimaryButton({ children, loading, disabled, className = '', ...props }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={
        'relative flex w-full items-center justify-center gap-2 rounded-lg ' +
        'bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white ' +
        'transition hover:bg-violet-500 active:scale-[0.98] ' +
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ' +
        'disabled:cursor-not-allowed disabled:opacity-60 ' +
        className
      }
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/** Secondary / ghost button. */
function SecondaryButton({ children, loading, className = '', ...props }) {
  return (
    <button
      type="button"
      disabled={loading}
      className={
        'flex w-full items-center justify-center gap-2 rounded-lg border ' +
        'border-slate-600 bg-transparent px-4 py-2.5 text-sm font-medium ' +
        'text-slate-300 transition hover:border-slate-400 hover:text-slate-100 ' +
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 ' +
        'disabled:cursor-not-allowed disabled:opacity-60 ' +
        className
      }
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/** Divider with label. */
function Divider({ label = 'or' }) {
  return (
    <div className="relative flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-700" />
      <span className="text-xs text-slate-500 select-none">{label}</span>
      <div className="h-px flex-1 bg-slate-700" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password field with show/hide toggle
// ---------------------------------------------------------------------------

function PasswordInput({ id, value, onChange, placeholder = 'Password', disabled, describedBy }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={id === 'confirmPassword' ? 'new-password' : 'current-password'}
        aria-describedby={describedBy}
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
      >
        {visible
          ? <EyeOff className="h-4 w-4" aria-hidden="true" />
          : <Eye    className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password strength indicator
// ---------------------------------------------------------------------------

function PasswordStrengthMeter({ password }) {
  const analysis = useMemo(() => analysePassword(password), [password]);

  if (!password) return null;

  const barPct = Math.min(100, Math.round((password.length / 20) * 100));

  const barColor =
    analysis.color === 'red'    ? 'bg-red-500'
    : analysis.color === 'yellow' ? 'bg-yellow-500'
    : 'bg-green-500';

  const labelColor =
    analysis.color === 'red'    ? 'text-red-400'
    : analysis.color === 'yellow' ? 'text-yellow-400'
    : 'text-green-400';

  const criteriaList = [
    { met: analysis.longEnough, label: `${MIN_PASSWORD_LENGTH}+ characters` },
    { met: analysis.hasUpper,   label: 'Uppercase letter'    },
    { met: analysis.hasLower,   label: 'Lowercase letter'    },
    { met: analysis.hasNumber,  label: 'Number'              },
    { met: analysis.hasSpecial, label: 'Special character (!@#$%^&*_-)' },
  ];

  return (
    <div className="space-y-2.5 pt-1" aria-label="Password strength details">
      {/* Character count bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Strength</span>
          <span className={`font-semibold ${labelColor}`}>{analysis.label}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${barPct}%` }}
            role="meter"
            aria-valuenow={barPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Password length: ${password.length} characters`}
          />
        </div>
      </div>

      {/* Criteria checklist */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1" aria-label="Password requirements">
        {criteriaList.map(({ met, label }) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              met ? 'text-green-400' : 'text-slate-500'
            }`}
          >
            <span
              className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                met
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : 'border-slate-600'
              }`}
              aria-hidden="true"
            >
              {met && <Check className="h-2 w-2 stroke-[3]" />}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social login buttons
// ---------------------------------------------------------------------------

function SocialButtons({ disabled }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={disabled}
        aria-label="Continue with Google"
        className={
          'flex items-center justify-center gap-2 rounded-lg border border-slate-700 ' +
          'bg-slate-800 px-3 py-2.5 text-sm text-slate-300 transition ' +
          'hover:border-slate-500 hover:bg-slate-700 ' +
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 ' +
          'disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        {/* Google G logo — inline SVG to avoid external asset dependency */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </button>

      <button
        type="button"
        disabled={disabled}
        aria-label="Continue with GitHub"
        className={
          'flex items-center justify-center gap-2 rounded-lg border border-slate-700 ' +
          'bg-slate-800 px-3 py-2.5 text-sm text-slate-300 transition ' +
          'hover:border-slate-500 hover:bg-slate-700 ' +
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 ' +
          'disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        {/* GitHub mark */}
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        GitHub
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ForgotPasswordForm
// ---------------------------------------------------------------------------

export function ForgotPasswordForm({ onCancel }) {
  const [email,   setEmail  ] = useState('');
  const [error,   setError  ] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed.');
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/40">
          <Mail className="h-7 w-7 text-green-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Check your email</h2>
          <p className="mt-1 text-sm text-slate-400">
            If <span className="text-slate-200 font-medium">{email}</span> is registered,
            you will receive a password reset link within a few minutes.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Back to login
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Forgot your password?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Enter your email and we will send you a reset link.
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <Field id="forgot-email" label="Email" required>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            aria-required="true"
            className={`${inputCls} pl-10`}
          />
        </div>
      </Field>

      <PrimaryButton loading={loading}>Send reset link</PrimaryButton>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="block w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// TwoFactorForm
// ---------------------------------------------------------------------------

export function TwoFactorForm({ onSuccess, onCancel, userId, sessionToken }) {
  const [code,         setCode        ] = useState('');
  const [backup,       setBackup      ] = useState('');
  const [useBackup,    setUseBackup   ] = useState(false);
  const [error,        setError       ] = useState('');
  const [loading,      setLoading     ] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    codeRef.current?.focus();
  }, [useBackup]);

  // Auto-submit when 6 digits entered in TOTP mode
  useEffect(() => {
    if (!useBackup && code.length === 6) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, useBackup]);

  async function handleVerify(e) {
    e?.preventDefault();
    setError('');

    const payload = useBackup
      ? { backupCode: backup.trim(), userId, sessionToken }
      : { code: code.trim(), userId, sessionToken };

    if (!useBackup && code.trim().length !== 6) {
      setError('Enter a 6-digit code.');
      return;
    }
    if (useBackup && !backup.trim()) {
      setError('Enter your backup code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed.');
      onSuccess?.(data.user, data.tokens);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleVerify} noValidate className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/40">
          <Shield className="h-7 w-7 text-violet-400" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Two-Factor Authentication</h2>
        <p className="mt-1 text-sm text-slate-400">
          {useBackup
            ? 'Enter one of your saved backup codes.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {!useBackup ? (
        <Field id="totp-code" label="Authentication code" required>
          <input
            ref={codeRef}
            id="totp-code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoComplete="one-time-code"
            disabled={loading}
            aria-required="true"
            aria-describedby="totp-hint"
            className={`${inputCls} text-center tracking-[0.5em] text-lg font-mono`}
          />
          <p id="totp-hint" className="text-xs text-slate-500">
            Auto-submits when 6 digits are entered.
          </p>
        </Field>
      ) : (
        <Field id="backup-code" label="Backup code" required>
          <input
            ref={codeRef}
            id="backup-code"
            type="text"
            value={backup}
            onChange={(e) => setBackup(e.target.value)}
            placeholder="xxxx-xxxx"
            disabled={loading}
            autoComplete="off"
            aria-required="true"
            className={`${inputCls} font-mono tracking-wider`}
          />
        </Field>
      )}

      <PrimaryButton loading={loading}>
        {loading ? 'Verifying…' : 'Verify'}
      </PrimaryButton>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => { setUseBackup((v) => !v); setError(''); setCode(''); setBackup(''); }}
          className="text-violet-400 hover:text-violet-300 transition-colors"
        >
          {useBackup ? 'Use authenticator app' : 'Use backup code'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// BiometricPrompt
// ---------------------------------------------------------------------------

export function BiometricPrompt({ onSuccess, onFallback, onCancel, challenge }) {
  const [error,   setError  ] = useState('');
  const [loading, setLoading] = useState(false);
  const [pin,     setPin    ] = useState('');
  const [pinMode, setPinMode] = useState(false);

  const biometricType = useMemo(() => detectBiometricType(), []);

  async function handleBiometric() {
    setError('');
    setLoading(true);
    try {
      // challenge comes base64url-encoded from the server
      const credentialRequestOptions = {
        publicKey: {
          challenge:        base64urlToBuffer(challenge || btoa(crypto.getRandomValues(new Uint8Array(32)).toString())),
          timeout:          60000,
          userVerification: 'required',
          rpId:             window.location.hostname,
        },
      };

      const credential = await navigator.credentials.get(credentialRequestOptions);

      const payload = {
        id:         credential.id,
        rawId:      bufferToBase64url(credential.rawId),
        type:       credential.type,
        response: {
          authenticatorData: bufferToBase64url(credential.response.authenticatorData),
          clientDataJSON:    bufferToBase64url(credential.response.clientDataJSON),
          signature:         bufferToBase64url(credential.response.signature),
          userHandle: credential.response.userHandle
            ? bufferToBase64url(credential.response.userHandle)
            : null,
        },
      };

      const res = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Biometric verification failed.');
      onSuccess?.(data.user, data.tokens);
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled or timed out.');
      } else if (err?.name === 'NotSupportedError') {
        setError('Biometric authentication is not supported on this device.');
        setPinMode(true);
      } else {
        setError(err.message || 'Biometric authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePinSubmit(e) {
    e.preventDefault();
    if (!pin.trim()) { setError('PIN is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/biometric/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'PIN verification failed.');
      onSuccess?.(data.user, data.tokens);
    } catch (err) {
      setError(err.message || 'PIN verification failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/40">
          <Fingerprint className="h-7 w-7 text-violet-400" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">
          {pinMode ? 'Enter PIN' : 'Biometric Login'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {pinMode
            ? 'Enter your device PIN to continue.'
            : `Authenticate using ${biometricType}.`}
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {pinMode ? (
        <form onSubmit={handlePinSubmit} noValidate className="space-y-4">
          <Field id="pin-entry" label="Device PIN" required>
            <input
              id="pin-entry"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••"
              disabled={loading}
              autoComplete="current-password"
              aria-required="true"
              className={`${inputCls} text-center tracking-[0.5em] text-lg font-mono`}
            />
          </Field>
          <PrimaryButton loading={loading}>Verify PIN</PrimaryButton>
        </form>
      ) : (
        <button
          type="button"
          onClick={handleBiometric}
          disabled={loading}
          aria-label={`Authenticate with ${biometricType}`}
          className={
            'flex w-full items-center justify-center gap-3 rounded-lg ' +
            'border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-sm ' +
            'font-semibold text-violet-300 transition ' +
            'hover:bg-violet-500/20 hover:border-violet-400 ' +
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ' +
            'disabled:cursor-not-allowed disabled:opacity-60'
          }
        >
          {loading ? <Spinner /> : <Fingerprint className="h-5 w-5" aria-hidden="true" />}
          {loading ? 'Authenticating…' : `Authenticate with ${biometricType}`}
        </button>
      )}

      <div className="flex items-center justify-between text-sm">
        {!pinMode && (
          <button
            type="button"
            onClick={() => setPinMode(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            Use PIN instead
          </button>
        )}
        {pinMode && (
          <button
            type="button"
            onClick={() => setPinMode(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            Use {biometricType}
          </button>
        )}
        {onFallback && (
          <button
            type="button"
            onClick={onFallback}
            className="ml-auto text-violet-400 hover:text-violet-300 transition-colors"
          >
            Use password instead
          </button>
        )}
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="block w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SetupTwoFactor
// ---------------------------------------------------------------------------

export function SetupTwoFactor({ onSuccess, onCancel }) {
  const [step,        setStep       ] = useState('loading'); // loading | scan | verify | done
  const [qrDataUrl,   setQrDataUrl  ] = useState('');
  const [secret,      setSecret     ] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [code,        setCode       ] = useState('');
  const [error,       setError      ] = useState('');
  const [loading,     setLoading    ] = useState(false);
  const [copied,      setCopied     ] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to initialise 2FA setup.');
        setQrDataUrl(data.qrCode);  // base64 data URL
        setSecret(data.secret);
        setStep('scan');
      } catch (err) {
        setError(err.message);
        setStep('scan');
      }
    })();
  }, []);

  // Auto-submit on 6 digits
  useEffect(() => {
    if (code.length === 6 && step === 'verify') {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  async function handleVerify(e) {
    e?.preventDefault();
    if (code.trim().length !== 6) { setError('Enter a 6-digit code.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Code verification failed.');
      setBackupCodes(data.backupCodes ?? []);
      setStep('done');
    } catch (err) {
      setError(err.message || 'Verification failed.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { /* silent */ }
  }

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <Spinner size="h-8 w-8" />
        <p className="text-sm text-slate-400">Generating setup code…</p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/40">
            <CheckCircle2 className="h-7 w-7 text-green-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">2FA Enabled</h2>
          <p className="mt-1 text-sm text-slate-400">
            Save your backup codes in a safe place. Each code can only be used once.
          </p>
        </div>

        {backupCodes.length > 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Backup codes
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {backupCodes.map((c) => (
                <li key={c} className="font-mono text-sm text-slate-200 select-all">{c}</li>
              ))}
            </ul>
          </div>
        )}

        <PrimaryButton onClick={() => onSuccess?.(backupCodes)}>
          Done
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-100">
          {step === 'scan' ? 'Scan QR Code' : 'Verify Setup'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {step === 'scan'
            ? 'Scan with your authenticator app (Google Authenticator, Authy, etc.)'
            : 'Enter the 6-digit code from your authenticator app to confirm.'}
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {step === 'scan' && (
        <>
          {qrDataUrl ? (
            <div className="flex justify-center">
              <img
                src={qrDataUrl}
                alt="QR code for authenticator app setup"
                className="h-48 w-48 rounded-lg border border-slate-700 bg-white p-2"
              />
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-slate-700">
              <p className="text-sm text-slate-500">QR code unavailable</p>
            </div>
          )}

          {secret && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500">Or enter this key manually:</p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                <code className="flex-1 break-all font-mono text-xs text-slate-300 select-all">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  aria-label="Copy secret key"
                  className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {copied
                    ? <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
                    : <Copy className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}

          <PrimaryButton onClick={() => setStep('verify')}>
            Continue <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </PrimaryButton>
        </>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} noValidate className="space-y-4">
          <Field id="setup-code" label="6-digit code" required>
            <input
              id="setup-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              disabled={loading}
              aria-required="true"
              autoFocus
              className={`${inputCls} text-center tracking-[0.5em] text-lg font-mono`}
            />
          </Field>
          <PrimaryButton loading={loading}>
            {loading ? 'Verifying…' : 'Verify & Enable'}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => { setStep('scan'); setCode(''); setError(''); }}
            className="block w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Back
          </button>
        </form>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="block w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoginForm
// ---------------------------------------------------------------------------

export function LoginForm({ onSuccess, onCancel, onSwitchToRegister }) {
  const [email,      setEmail     ] = useState('');
  const [password,   setPassword  ] = useState('');
  const [remember,   setRemember  ] = useState(false);
  const [error,      setError     ] = useState('');
  const [loading,    setLoading   ] = useState(false);
  const [fieldErrs,  setFieldErrs ] = useState({});
  const [view,       setView      ] = useState('login'); // login | forgot | 2fa | biometric
  const [pending2FA, setPending2FA] = useState({ userId: null, sessionToken: null });

  const biometricAvailable = useMemo(() => isBiometricAvailable(), []);

  function validate() {
    const errs = {};
    if (!email.trim())           errs.email    = 'Email is required.';
    else if (!isValidEmail(email)) errs.email  = 'Please enter a valid email address.';
    if (!password)               errs.password = 'Password is required.';
    setFieldErrs(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:    email.trim().toLowerCase(),
          password,
          remember,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed.');

      if (data.requires2FA) {
        setPending2FA({ userId: data.userId, sessionToken: data.sessionToken });
        setView('2fa');
        return;
      }

      onSuccess?.(data.user, data.tokens);
    } catch (err) {
      setError(err.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (view === 'forgot') {
    return <ForgotPasswordForm onCancel={() => setView('login')} />;
  }

  if (view === '2fa') {
    return (
      <TwoFactorForm
        userId={pending2FA.userId}
        sessionToken={pending2FA.sessionToken}
        onSuccess={onSuccess}
        onCancel={() => setView('login')}
      />
    );
  }

  if (view === 'biometric') {
    return (
      <BiometricPrompt
        onSuccess={onSuccess}
        onFallback={() => setView('login')}
        onCancel={() => setView('login')}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Sign in form">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Sign In</h2>
        <p className="mt-1 text-sm text-slate-400">
          Welcome back to Nexus AI Pro
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {/* Social buttons */}
      <SocialButtons disabled={loading} />

      <Divider />

      {/* Email */}
      <Field id="login-email" label="Email" error={fieldErrs.email} required>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrs((p) => ({ ...p, email: '' })); }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            aria-required="true"
            aria-invalid={!!fieldErrs.email}
            aria-describedby={fieldErrs.email ? 'login-email-error' : undefined}
            className={`${inputCls} pl-10`}
          />
        </div>
      </Field>

      {/* Password */}
      <Field id="login-password" label="Password" error={fieldErrs.password} required>
        <PasswordInput
          id="login-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrs((p) => ({ ...p, password: '' })); }}
          disabled={loading}
          describedBy={fieldErrs.password ? 'login-password-error' : undefined}
        />
      </Field>

      {/* Remember + Forgot */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
          />
          Remember me
        </label>
        <button
          type="button"
          onClick={() => setView('forgot')}
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {/* Submit */}
      <PrimaryButton loading={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </PrimaryButton>

      {/* Biometric */}
      {biometricAvailable && (
        <SecondaryButton onClick={() => setView('biometric')} disabled={loading}>
          <Fingerprint className="h-4 w-4" aria-hidden="true" />
          Sign in with {detectBiometricType()}
        </SecondaryButton>
      )}

      {/* Switch to Register */}
      {onSwitchToRegister && (
        <p className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            Sign up
          </button>
        </p>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="block w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// RegisterForm
// ---------------------------------------------------------------------------

export function RegisterForm({ onSuccess, onCancel, onSwitchToLogin }) {
  const [username,    setUsername   ] = useState('');
  const [email,       setEmail      ] = useState('');
  const [password,    setPassword   ] = useState('');
  const [confirm,     setConfirm    ] = useState('');
  const [locale,      setLocale     ] = useState('en-US');
  const [locales,     setLocales    ] = useState([]);
  const [agreedTos,   setAgreedTos  ] = useState(false);
  const [error,       setError      ] = useState('');
  const [loading,     setLoading    ] = useState(false);
  const [fieldErrs,   setFieldErrs  ] = useState({});

  // Fetch locale list
  useEffect(() => {
    fetch('/api/i18n/locales')
      .then((r) => r.json())
      .then((d) => { if (d?.data) setLocales(d.data); })
      .catch(() => {
        // Fallback: basic set so the dropdown is never empty
        setLocales([
          { code: 'en-US', nativeName: 'English',   name: 'English (US)' },
          { code: 'es-ES', nativeName: 'Español',   name: 'Spanish (Spain)' },
          { code: 'fr-FR', nativeName: 'Français',  name: 'French (France)' },
          { code: 'de-DE', nativeName: 'Deutsch',   name: 'German (Germany)' },
          { code: 'ja-JP', nativeName: '日本語',     name: 'Japanese' },
          { code: 'zh-CN', nativeName: '简体中文',   name: 'Chinese (Simplified)' },
          { code: 'ar-SA', nativeName: 'العربية',   name: 'Arabic (Saudi Arabia)' },
        ]);
      });
  }, []);

  function validate() {
    const errs = {};
    const uTrimmed = username.trim();
    if (!uTrimmed)
      errs.username = 'Username is required.';
    else if (uTrimmed.length < MIN_USERNAME_LENGTH || uTrimmed.length > MAX_USERNAME_LENGTH)
      errs.username = `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters.`;

    if (!email.trim())
      errs.email = 'Email is required.';
    else if (!isValidEmail(email))
      errs.email = 'Please enter a valid email address.';

    if (!password)
      errs.password = 'Password is required.';
    else if (password.length < MIN_PASSWORD_LENGTH)
      errs.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    else {
      const a = analysePassword(password);
      if (a.score < 3)
        errs.password = 'Password is too weak. Add uppercase letters, numbers, and special characters.';
    }

    if (!confirm)
      errs.confirm = 'Please confirm your password.';
    else if (confirm !== password)
      errs.confirm = 'Passwords do not match.';

    if (!agreedTos)
      errs.tos = 'You must agree to the Terms of Service.';

    setFieldErrs(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          username: username.trim(),
          email:    email.trim().toLowerCase(),
          password,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed.');
      onSuccess?.(data.user, data.tokens);
    } catch (err) {
      setError(err.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const setField = useCallback((setter, fieldKey) => (e) => {
    setter(e.target.value);
    setFieldErrs((p) => ({ ...p, [fieldKey]: '' }));
  }, []);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Create account form">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Create Account</h2>
        <p className="mt-1 text-sm text-slate-400">
          Join Nexus AI Pro — it&apos;s free to start.
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {/* Username */}
      <Field id="reg-username" label="Username" error={fieldErrs.username} required>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="reg-username"
            type="text"
            value={username}
            onChange={setField(setUsername, 'username')}
            placeholder="your_username"
            autoComplete="username"
            disabled={loading}
            minLength={MIN_USERNAME_LENGTH}
            maxLength={MAX_USERNAME_LENGTH}
            aria-required="true"
            aria-invalid={!!fieldErrs.username}
            aria-describedby={fieldErrs.username ? 'reg-username-error' : 'reg-username-hint'}
            className={`${inputCls} pl-10`}
          />
        </div>
        {!fieldErrs.username && (
          <p id="reg-username-hint" className="text-xs text-slate-500">
            2–50 characters. Emoji and unicode supported.
          </p>
        )}
      </Field>

      {/* Email */}
      <Field id="reg-email" label="Email" error={fieldErrs.email} required>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={setField(setEmail, 'email')}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            aria-required="true"
            aria-invalid={!!fieldErrs.email}
            aria-describedby={fieldErrs.email ? 'reg-email-error' : undefined}
            className={`${inputCls} pl-10`}
          />
        </div>
      </Field>

      {/* Password */}
      <Field id="reg-password" label="Password" error={fieldErrs.password} required>
        <PasswordInput
          id="reg-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrs((p) => ({ ...p, password: '' })); }}
          placeholder="Create a strong password"
          disabled={loading}
          describedBy={fieldErrs.password ? 'reg-password-error' : 'reg-password-strength'}
        />
        <div id="reg-password-strength">
          <PasswordStrengthMeter password={password} />
        </div>
      </Field>

      {/* Confirm password */}
      <Field id="reg-confirm" label="Confirm password" error={fieldErrs.confirm} required>
        <PasswordInput
          id="reg-confirm"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setFieldErrs((p) => ({ ...p, confirm: '' })); }}
          placeholder="Repeat your password"
          disabled={loading}
          describedBy={fieldErrs.confirm ? 'reg-confirm-error' : undefined}
        />
        {!fieldErrs.confirm && confirm && confirm === password && (
          <p className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Passwords match
          </p>
        )}
      </Field>

      {/* Language selector */}
      <Field id="reg-locale" label="Language">
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
          <select
            id="reg-locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            disabled={loading}
            aria-label="Select language"
            className={`${inputCls} pl-10 cursor-pointer appearance-none`}
          >
            {locales.length === 0 && (
              <option value="en-US">English (US)</option>
            )}
            {locales.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName} — {l.name}
              </option>
            ))}
          </select>
        </div>
      </Field>

      {/* Terms of service */}
      <div className="space-y-1">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-400 select-none">
          <input
            type="checkbox"
            checked={agreedTos}
            onChange={(e) => { setAgreedTos(e.target.checked); setFieldErrs((p) => ({ ...p, tos: '' })); }}
            disabled={loading}
            aria-required="true"
            aria-describedby={fieldErrs.tos ? 'reg-tos-error' : undefined}
            className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
          />
          <span>
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {fieldErrs.tos && (
          <p id="reg-tos-error" role="alert" className="text-xs text-red-400 pl-7">
            {fieldErrs.tos}
          </p>
        )}
      </div>

      <PrimaryButton loading={loading}>
        {loading ? 'Creating account…' : 'Create Account'}
      </PrimaryButton>

      {/* Switch to Login */}
      {onSwitchToLogin && (
        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            Sign in
          </button>
        </p>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="block w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// AuthForms — root composite component
// ---------------------------------------------------------------------------

/**
 * Top-level auth entry point.
 *
 * Props:
 *   mode        'login' | 'register'   Which form to show initially.
 *   onSuccess   (user, tokens) => void Called after successful auth.
 *   onCancel    () => void             Called when the user dismisses.
 *   theme       'dark' | 'light'       Visual theme (dark is default).
 */
export default function AuthForms({
  mode     = 'login',
  onSuccess,
  onCancel,
  theme    = 'dark',
}) {
  const [activeMode, setActiveMode] = useState(mode);

  // Allow parent to control mode after mount
  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  const containerCls =
    'w-full max-w-md mx-auto rounded-2xl border border-slate-700/60 ' +
    'bg-slate-800/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8 ' +
    (theme === 'light' ? 'bg-white/90 border-slate-200' : '');

  return (
    <div
      className={containerCls}
      data-theme={theme}
      role="main"
      aria-label={activeMode === 'login' ? 'Login section' : 'Registration section'}
    >
      {activeMode === 'login' ? (
        <LoginForm
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSwitchToRegister={() => setActiveMode('register')}
        />
      ) : (
        <RegisterForm
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSwitchToLogin={() => setActiveMode('login')}
        />
      )}
    </div>
  );
}
