// ================================================
// NEXUS AI PRO – AuthFlow Component
// Login · Register · 2FA · Biometric · Password Reset
// ================================================
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Fingerprint,
  Scan,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Lock,
  User,
  Globe,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

// ================================================
// CONSTANTS
// ================================================
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'pt', label: 'Portuguese' },
];

const PASSWORD_CHECKS = [
  { key: 'length',    label: '13+ characters',    test: (p) => p.length >= 13 },
  { key: 'upper',     label: 'Uppercase letter',   test: (p) => /[A-Z]/.test(p) },
  { key: 'lower',     label: 'Lowercase letter',   test: (p) => /[a-z]/.test(p) },
  { key: 'digit',     label: 'Number',             test: (p) => /\d/.test(p) },
  { key: 'special',   label: 'Special character',  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// ================================================
// PASSWORD STRENGTH METER
// ================================================
function PasswordStrengthMeter({ password }) {
  const checks = PASSWORD_CHECKS.map((c) => ({ ...c, passed: c.test(password) }));
  const passedCount = checks.filter((c) => c.passed).length;

  const barColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-400',
    'bg-lime-400',
    'bg-green-500',
  ];

  return (
    <div className="mt-2 space-y-2">
      {/* Colored bars */}
      <div className="flex gap-1">
        {PASSWORD_CHECKS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < passedCount ? barColors[passedCount - 1] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Requirement checklist */}
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.key} className="flex items-center gap-1.5 text-xs">
            {c.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
            )}
            <span className={c.passed ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================================================
// SHARED INPUT WRAPPER
// ================================================
function FormField({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

function TextInput({ icon: Icon, type = 'text', ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      )}
      <input
        type={type}
        className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 py-2.5 pr-3 ${Icon ? 'pl-10' : 'pl-3'} text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition`}
        {...props}
      />
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder || 'Password'}
        autoComplete="current-password"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SubmitButton({ loading, children, disabled }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

// ================================================
// WEBAUTHN HELPERS
// ================================================
function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function triggerBiometricLogin() {
  if (!navigator.credentials || !window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser');
  }
  // In production, the challenge comes from the server (/api/auth/webauthn/challenge)
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge,
      timeout: 60000,
      userVerification: 'preferred',
      rpId: window.location.hostname,
    },
  });
  return credential;
}

async function registerBiometric(userId, userEmail) {
  if (!navigator.credentials || !window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser');
  }
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Nexus AI Pro', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(String(userId)),
        name: userEmail,
        displayName: userEmail,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  });
  return credential;
}

// ================================================
// MAIN COMPONENT
// ================================================
export default function AuthFlow({ onAuthSuccess, initialView = 'login' }) {
  const [view, setView] = useState(initialView);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState({});

  // Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLang, setRegLang] = useState('en');
  const [regTerms, setRegTerms] = useState(false);
  const [regErrors, setRegErrors] = useState({});

  // 2FA
  const [twoFaCode, setTwoFaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [twoFaPending, setTwoFaPending] = useState(null); // { token, user } from first auth step
  const twoFaInputRef = useRef(null);

  // Forgot / Reset
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');

  // Biometric
  const [biometricError, setBiometricError] = useState('');

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------
  const clearState = () => {
    setGlobalError('');
    setSuccessMsg('');
    setLoginErrors({});
    setRegErrors({});
  };

  const goTo = (v) => { clearState(); setView(v); };

  const apiPost = useCallback(async (path, body) => {
    const res = await fetch(`/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }, []);

  // Auto-focus 2FA input when entering that view
  useEffect(() => {
    if (view === '2fa') {
      setTimeout(() => twoFaInputRef.current?.focus(), 100);
    }
  }, [view]);

  // -----------------------------------------------
  // LOGIN
  // -----------------------------------------------
  const passwordStrengthOk = (pwd) =>
    PASSWORD_CHECKS.every((c) => c.test(pwd));

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginEmail) errs.email = 'Email is required';
    if (!loginPassword) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const data = await apiPost('/login', { email: loginEmail, password: loginPassword });
      if (data.requires2fa) {
        setTwoFaPending(data);
        goTo('2fa');
      } else {
        onAuthSuccess?.(data.token, data.user);
      }
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricError('');
    setLoading(true);
    try {
      const credential = await triggerBiometricLogin();
      const data = await apiPost('/webauthn/authenticate', {
        id: credential.id,
        rawId: base64url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: base64url(credential.response.authenticatorData),
          clientDataJSON: base64url(credential.response.clientDataJSON),
          signature: base64url(credential.response.signature),
          userHandle: credential.response.userHandle
            ? base64url(credential.response.userHandle)
            : null,
        },
      });
      onAuthSuccess?.(data.token, data.user);
    } catch (err) {
      setBiometricError(err.message);
      setView('biometric');
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // REGISTER
  // -----------------------------------------------
  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!regName.trim()) errs.name = 'Display name is required';
    if (!regEmail) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(regEmail)) errs.email = 'Enter a valid email address';
    if (!regPassword) errs.password = 'Password is required';
    else if (!passwordStrengthOk(regPassword)) errs.password = 'Password does not meet all requirements';
    if (regPassword !== regConfirm) errs.confirm = 'Passwords do not match';
    if (!regTerms) errs.terms = 'You must accept the terms of service';
    if (Object.keys(errs).length) { setRegErrors(errs); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const data = await apiPost('/register', {
        name: regName,
        email: regEmail,
        password: regPassword,
        language: regLang,
      });
      if (data.requires2fa) {
        setTwoFaPending(data);
        goTo('2fa');
      } else {
        onAuthSuccess?.(data.token, data.user);
      }
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // 2FA
  // -----------------------------------------------
  const handle2faInput = (val) => {
    setTwoFaCode(val);
    if (val.length === 6 && !useBackupCode) {
      submit2fa(val);
    }
  };

  const submit2fa = async (code) => {
    setLoading(true);
    setGlobalError('');
    try {
      const data = await apiPost('/2fa/verify', {
        code: useBackupCode ? undefined : code,
        backupCode: useBackupCode ? backupCode : undefined,
        tempToken: twoFaPending?.tempToken,
      });
      onAuthSuccess?.(data.token, data.user);
    } catch (err) {
      setGlobalError(err.message);
      setTwoFaCode('');
      twoFaInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = (e) => {
    e.preventDefault();
    submit2fa(twoFaCode);
  };

  const resend2fa = async () => {
    setLoading(true);
    setGlobalError('');
    try {
      await apiPost('/2fa/resend', { tempToken: twoFaPending?.tempToken });
      setSuccessMsg('A new code has been sent.');
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // FORGOT PASSWORD
  // -----------------------------------------------
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { setGlobalError('Enter your email address'); return; }
    setLoading(true);
    setGlobalError('');
    try {
      await apiPost('/forgot-password', { email: forgotEmail });
      setSuccessMsg('If that email exists, a reset link has been sent.');
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // RESET PASSWORD
  // -----------------------------------------------
  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetPassword) { setGlobalError('Enter a new password'); return; }
    if (!passwordStrengthOk(resetPassword)) {
      setGlobalError('Password does not meet all requirements');
      return;
    }
    if (resetPassword !== resetConfirm) { setGlobalError('Passwords do not match'); return; }
    setLoading(true);
    setGlobalError('');
    try {
      await apiPost('/reset-password', { token: resetToken, password: resetPassword });
      setSuccessMsg('Password reset successfully. You can now log in.');
      setTimeout(() => goTo('login'), 2000);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // SHARED ALERT
  // -----------------------------------------------
  const Alert = ({ type, message }) => (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
        type === 'error'
          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
      }`}
    >
      {type === 'error'
        ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        : <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  );

  // -----------------------------------------------
  // CARD WRAPPER
  // -----------------------------------------------
  const Card = ({ title, subtitle, children }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-8 py-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-indigo-200" />
            <span className="text-white font-bold text-lg tracking-tight">Nexus AI Pro</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-indigo-200 text-sm mt-0.5">{subtitle}</p>}
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4">
          {globalError && <Alert type="error" message={globalError} />}
          {successMsg && <Alert type="success" message={successMsg} />}
          {children}
        </div>
      </div>
    </div>
  );

  // ================================================
  // VIEW: LOGIN
  // ================================================
  if (view === 'login') {
    return (
      <Card title="Welcome back" subtitle="Sign in to your account">
        <form onSubmit={handleLogin} className="space-y-4">
          <FormField label="Email address" error={loginErrors.email}>
            <TextInput
              icon={Mail}
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </FormField>

          <FormField label="Password" error={loginErrors.password}>
            <PasswordInput
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </FormField>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => goTo('forgot')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <SubmitButton loading={loading}>Sign in</SubmitButton>
        </form>

        {/* Biometric shortcut */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Fingerprint className="w-4 h-4" />
            Use Biometric (Fingerprint / Face ID)
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => goTo('register')}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Sign up
          </button>
        </p>
      </Card>
    );
  }

  // ================================================
  // VIEW: REGISTER
  // ================================================
  if (view === 'register') {
    const allChecksPassed = PASSWORD_CHECKS.every((c) => c.test(regPassword));
    return (
      <Card title="Create account" subtitle="Join Nexus AI Pro">
        <form onSubmit={handleRegister} className="space-y-4">
          <FormField label="Display name" error={regErrors.name}>
            <TextInput
              icon={User}
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Your name (emoji welcome 🚀)"
              autoComplete="name"
            />
            <p className="text-xs text-gray-400 mt-0.5">Unicode and emoji are supported</p>
          </FormField>

          <FormField label="Email address" error={regErrors.email}>
            <TextInput
              icon={Mail}
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </FormField>

          <FormField label="Password" error={regErrors.password}>
            <PasswordInput
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="Create a strong password"
              id="reg-password"
            />
            {regPassword && <PasswordStrengthMeter password={regPassword} />}
          </FormField>

          <FormField label="Confirm password" error={regErrors.confirm}>
            <PasswordInput
              value={regConfirm}
              onChange={(e) => setRegConfirm(e.target.value)}
              placeholder="Repeat your password"
              id="reg-confirm"
            />
            {regPassword && regConfirm && regPassword === regConfirm && (
              <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Passwords match
              </p>
            )}
          </FormField>

          <FormField label="Language / Region">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={regLang}
                onChange={(e) => setRegLang(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition appearance-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </FormField>

          <FormField error={regErrors.terms}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={regTerms}
                onChange={(e) => setRegTerms(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Privacy Policy
                </a>
              </span>
            </label>
          </FormField>

          <SubmitButton loading={loading} disabled={!allChecksPassed || !regTerms}>
            Create account
          </SubmitButton>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => goTo('login')}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Sign in
          </button>
        </p>
      </Card>
    );
  }

  // ================================================
  // VIEW: 2FA
  // ================================================
  if (view === '2fa') {
    return (
      <Card title="Two-factor authentication" subtitle="Enter the code from your authenticator app">
        <form onSubmit={handle2faSubmit} className="space-y-4">
          {!useBackupCode ? (
            <FormField label="6-digit code">
              <input
                ref={twoFaInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={twoFaCode}
                onChange={(e) => handle2faInput(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-3 px-4 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition"
              />
            </FormField>
          ) : (
            <FormField label="Backup code">
              <TextInput
                icon={ShieldCheck}
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
              />
            </FormField>
          )}

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setUseBackupCode((b) => !b); setTwoFaCode(''); setBackupCode(''); }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
            </button>
            <button
              type="button"
              onClick={resend2fa}
              disabled={loading}
              className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Resend code
            </button>
          </div>

          {useBackupCode && (
            <SubmitButton loading={loading}>Verify backup code</SubmitButton>
          )}
        </form>

        <button
          type="button"
          onClick={() => goTo('login')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      </Card>
    );
  }

  // ================================================
  // VIEW: BIOMETRIC
  // ================================================
  if (view === 'biometric') {
    return (
      <Card title="Biometric authentication" subtitle="Use fingerprint, Touch ID, or Face ID">
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Fingerprint className="w-14 h-14 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Scan className="w-4 h-4 text-indigo-500" />
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Use your device's biometric sensor to sign in securely without a password.
            Supports fingerprint, Touch ID, and Face ID.
          </p>

          {biometricError && <Alert type="error" message={biometricError} />}

          <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Fingerprint className="w-4 h-4" />}
            Authenticate with Biometric
          </button>

          <button
            type="button"
            onClick={() => goTo('login')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            Use password instead
          </button>
        </div>
      </Card>
    );
  }

  // ================================================
  // VIEW: FORGOT PASSWORD
  // ================================================
  if (view === 'forgot') {
    return (
      <Card title="Reset your password" subtitle="We'll send you a reset link">
        <form onSubmit={handleForgot} className="space-y-4">
          <FormField label="Email address">
            <TextInput
              icon={Mail}
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </FormField>

          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>

        <button
          type="button"
          onClick={() => goTo('login')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      </Card>
    );
  }

  // ================================================
  // VIEW: RESET PASSWORD
  // ================================================
  if (view === 'reset') {
    const allChecksPassed = PASSWORD_CHECKS.every((c) => c.test(resetPassword));
    return (
      <Card title="Set new password" subtitle="Choose a strong password">
        <form onSubmit={handleReset} className="space-y-4">
          <FormField label="New password">
            <PasswordInput
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New password"
              id="reset-password"
            />
            {resetPassword && <PasswordStrengthMeter password={resetPassword} />}
          </FormField>

          <FormField label="Confirm new password">
            <PasswordInput
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="Repeat new password"
              id="reset-confirm"
            />
          </FormField>

          {/* Hidden token field (usually populated from URL query param) */}
          <input type="hidden" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />

          <SubmitButton loading={loading} disabled={!allChecksPassed}>
            Set new password
          </SubmitButton>
        </form>

        <button
          type="button"
          onClick={() => goTo('login')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      </Card>
    );
  }

  return null;
}
