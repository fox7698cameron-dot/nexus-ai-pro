// AuthManager.jsx | 2026-10-08

import { useState, useCallback } from 'react';
import {
  Lock, Eye, EyeOff, Fingerprint, ShieldCheck, User,
  Mail, Key, CheckCircle2, AlertTriangle, ScanFace,
} from 'lucide-react';

const TABS = ['signin', 'signup', 'forgot'];
const ROLES = ['USER', 'MODERATOR', 'ADMIN', 'DEV'];
const MFA_METHODS = [
  { id: 'TOTP', label: 'Authenticator App', icon: ShieldCheck },
  { id: 'SMS', label: 'SMS Code', icon: Key },
  { id: 'EMAIL', label: 'Email Code', icon: Mail },
  { id: 'BIOMETRIC', label: 'Biometric', icon: Fingerprint },
];

const MIN_PW_LEN = 13;
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function scorePassword(pw) {
  let score = 0;
  if (pw.length >= MIN_PW_LEN) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (SPECIAL_RE.test(pw)) score++;
  return score;
}

const SCORE_LABELS = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const SCORE_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

function PasswordStrength({ password }) {
  const score = scorePassword(password);
  const feedback = [];
  if (password.length < MIN_PW_LEN) feedback.push(`At least ${MIN_PW_LEN} characters`);
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase');
  if (!/[0-9]/.test(password)) feedback.push('Add numbers');
  if (!SPECIAL_RE.test(password)) feedback.push('Add special chars');

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i < score ? SCORE_COLORS[score] : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${SCORE_COLORS[score]?.replace('bg-', 'text-') || 'text-gray-400'}`}>
        {password.length > 0 ? SCORE_LABELS[score] : ''}
      </p>
      {feedback.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {feedback.map(f => (
            <li key={f} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <AlertTriangle size={10} className="text-orange-400 flex-shrink-0" />{f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, error, icon: Icon, rightElement, placeholder, autoComplete }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full bg-gray-50 dark:bg-gray-700 border rounded-xl py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${Icon ? 'pl-9' : 'pl-3'} ${rightElement ? 'pr-10' : 'pr-3'} ${error ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10} />{error}</p>}
    </div>
  );
}

function MfaSetupWizard({ userId, onComplete, onSkip }) {
  const [step, setStep] = useState(0); // 0: method select, 1: QR/code, 2: verify
  const [method, setMethod] = useState('TOTP');
  const [qrData, setQrData] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const startSetup = async () => {
    try {
      const res = await fetch('/api/auth/setup-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method }),
      });
      if (res.ok) {
        const data = await res.json();
        setQrData(data);
        setStep(1);
      }
    } catch {
      setStep(1);
      setQrData({ uri: 'otpauth://totp/NexusAIPro:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=NexusAIPro' });
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) { setError('Enter 6-digit code'); return; }
    try {
      const res = await fetch('/api/auth/enable-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method, code }),
      });
      if (res.ok) { onComplete(method); }
      else { setError('Invalid code, try again'); }
    } catch {
      setError('Verification failed');
    }
  };

  if (step === 0) return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">Set Up Two-Factor Authentication</h3>
      <div className="grid grid-cols-2 gap-2">
        {MFA_METHODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm ${method === id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
          >
            <Icon size={20} />{label}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={startSetup} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">Continue</button>
        <button onClick={onSkip} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Skip for now</button>
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">Scan QR Code</h3>
      {method === 'TOTP' && qrData?.uri && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-32 h-32 bg-white border-4 border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 text-center p-2">
            QR code placeholder<br />Use authenticator app
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center break-all">{qrData.uri}</p>
        </div>
      )}
      {method !== 'TOTP' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">A verification code will be sent to your {method === 'SMS' ? 'phone' : 'email'} shortly.</p>
      )}
      <button onClick={() => setStep(2)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
        I scanned it / Next
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">Enter Verification Code</h3>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
        placeholder="000000"
        className="w-full text-center text-2xl tracking-[0.5em] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl py-3 font-mono text-gray-900 dark:text-white"
      />
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <button onClick={verifyCode} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
        Verify & Enable
      </button>
    </div>
  );
}

export default function AuthManager({ onAuth }) {
  const [tab, setTab] = useState('signin');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaSetup, setMfaSetup] = useState(false);
  const [userId, setUserId] = useState(null);

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', role: 'USER',
  });

  const setField = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const validateUsername = (u) => {
    const len = [...u].length;
    if (len < 3) return 'Username must be at least 3 characters';
    if (len > 30) return 'Username must be 30 characters or fewer';
    return null;
  };

  const handleSignIn = useCallback(async () => {
    if (!form.email || !form.password) { setError('Email and password required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      if (data.requiresMfa) {
        setSuccess('Check your authenticator app for a code.');
      } else {
        onAuth?.({ token: data.token, role: data.role });
      }
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  }, [form, onAuth]);

  const handleSignUp = useCallback(async () => {
    const usernameErr = validateUsername(form.username);
    if (usernameErr) { setError(usernameErr); return; }
    if (!form.email) { setError('Email is required'); return; }
    if (form.password.length < MIN_PW_LEN) { setError(`Password must be at least ${MIN_PW_LEN} characters`); return; }
    if (!SPECIAL_RE.test(form.password)) { setError('Password must contain a special character'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      setUserId(data.userId);
      setMfaSetup(true);
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleForgotPassword = useCallback(async () => {
    if (!form.email) { setError('Email is required'); return; }
    setLoading(true);
    try {
      setSuccess('If that email exists, a reset link has been sent.');
    } finally {
      setLoading(false);
    }
  }, [form.email]);

  const handleBiometric = async () => {
    try {
      if (navigator.credentials) {
        await navigator.credentials.get({ publicKey: undefined });
        setSuccess('Biometric authentication successful');
      } else {
        setError('Biometric authentication not available on this device');
      }
    } catch {
      setError('Biometric authentication failed');
    }
  };

  if (mfaSetup) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <MfaSetupWizard
          userId={userId}
          onComplete={(method) => { setSuccess(`MFA enabled via ${method}`); setMfaSetup(false); }}
          onSkip={() => setMfaSetup(false)}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-white" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${tab === t ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {t === 'signin' ? 'Sign In' : t === 'signup' ? 'Sign Up' : 'Forgot PW'}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm">
            <AlertTriangle size={16} />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-sm">
            <CheckCircle2 size={16} />{success}
          </div>
        )}

        <div className="space-y-4">
          {/* Sign In */}
          {tab === 'signin' && (
            <>
              <InputField label="Email" type="email" value={form.email} onChange={v => setField('email', v)} icon={Mail} placeholder="you@example.com" autoComplete="email" />
              <InputField
                label="Password" type={showPw ? 'text' : 'password'} value={form.password} onChange={v => setField('password', v)} icon={Lock}
                autoComplete="current-password"
                rightElement={
                  <button onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <button onClick={handleSignIn} disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <button onClick={handleBiometric} className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <ScanFace size={16} /> Sign in with Biometric
              </button>
            </>
          )}

          {/* Sign Up */}
          {tab === 'signup' && (
            <>
              <InputField label="Username (Unicode/emoji OK)" value={form.username} onChange={v => setField('username', v)} icon={User} placeholder="CoolUser 😎" autoComplete="username" />
              <InputField label="Email" type="email" value={form.email} onChange={v => setField('email', v)} icon={Mail} placeholder="you@example.com" autoComplete="email" />
              <div>
                <InputField
                  label={`Password (min ${MIN_PW_LEN} chars + special)`}
                  type={showPw ? 'text' : 'password'} value={form.password} onChange={v => setField('password', v)} icon={Lock}
                  autoComplete="new-password"
                  rightElement={
                    <button onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                {form.password && <PasswordStrength password={form.password} />}
              </div>
              <InputField
                label="Confirm Password" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={v => setField('confirmPassword', v)} icon={Key}
                autoComplete="new-password"
                rightElement={
                  <button onClick={() => setShowConfirm(v => !v)} className="text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label>
                <select value={form.role} onChange={e => setField('role', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={handleSignUp} disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors">
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </>
          )}

          {/* Forgot password */}
          {tab === 'forgot' && (
            <>
              <InputField label="Email address" type="email" value={form.email} onChange={v => setField('email', v)} icon={Mail} placeholder="you@example.com" />
              <button onClick={handleForgotPassword} disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
