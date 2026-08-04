// AuthModal.jsx
// Date: 2026-08-04
// Comprehensive authentication modal for Nexus AI Pro

import { useState, useCallback, useEffect } from 'react';
import {
  Fingerprint,
  ScanFace,
  Eye,
  EyeOff,
  Lock,
  User,
  Mail,
  Globe,
  Shield,
  CheckCircle,
  X,
  ChevronDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODES = {
  login:          'login',
  register:       'register',
  forgotPassword: 'forgotPassword',
  mfaSetup:       'mfaSetup',
  mfaVerify:      'mfaVerify',
  biometricSetup: 'biometricSetup',
};

const LANGUAGES = [
  { code: 'en',    label: 'English'    },
  { code: 'es',    label: 'Español'    },
  { code: 'fr',    label: 'Français'   },
  { code: 'de',    label: 'Deutsch'    },
  { code: 'ja',    label: '日本語'      },
  { code: 'ko',    label: '한국어'      },
  { code: 'zh',    label: '中文'        },
  { code: 'ar',    label: 'العربية'    },
  { code: 'pt',    label: 'Português'  },
  { code: 'hi',    label: 'हिन्दी'     },
];

const EMOJI_SUGGESTIONS = ['😀','🎮','🚀','🌟','🔥','💡','🎵','🦊','🐉','⚡','🌈','🎯'];

const BACKUP_CODES = [
  'NEXUS-A1B2-C3D4',
  'NEXUS-E5F6-G7H8',
  'NEXUS-I9J0-K1L2',
  'NEXUS-M3N4-O5P6',
  'NEXUS-Q7R8-S9T0',
  'NEXUS-U1V2-W3X4',
];

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

function getStrength(pwd) {
  let score = 0;
  const checks = {
    length:    pwd.length >= 13,
    upper:     /[A-Z]/.test(pwd),
    lower:     /[a-z]/.test(pwd),
    number:    /[0-9]/.test(pwd),
    special:   /[^A-Za-z0-9]/.test(pwd),
  };
  score = Object.values(checks).filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Fortress'];
  const colors  = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-400'];
  const textCol = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-emerald-400'];
  return { score, checks, label: labels[score], color: colors[score], textColor: textCol[score] };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function InputField({ icon: Icon, label, type = 'text', value, onChange, placeholder, error, right }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs text-gray-400 font-medium">{label}</label>}
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-gray-800 border ${
            error ? 'border-red-500' : 'border-gray-600'
          } rounded-lg py-2.5 ${Icon ? 'pl-9' : 'pl-3'} ${right ? 'pr-10' : 'pr-3'} text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors`}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

function SocialBtn({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-sm text-gray-300 font-medium transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Password Strength Meter
// ---------------------------------------------------------------------------

function PasswordStrengthMeter({ password }) {
  const { score, checks, label, color, textColor } = getStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= score ? color : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
      </div>
      {/* Requirements */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {[
          { key: 'length',  label: '13+ characters' },
          { key: 'upper',   label: 'Uppercase letter' },
          { key: 'lower',   label: 'Lowercase letter' },
          { key: 'number',  label: 'Number' },
          { key: 'special', label: 'Special character' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1">
            <CheckCircle
              size={11}
              className={checks[key] ? 'text-green-400' : 'text-gray-600'}
            />
            <span className={`text-xs ${checks[key] ? 'text-green-400' : 'text-gray-500'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Emoji Picker (lightweight)
// ---------------------------------------------------------------------------

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="absolute z-10 top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-xl p-3 shadow-xl">
      <div className="grid grid-cols-6 gap-1">
        {EMOJI_SUGGESTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => { onSelect(e); onClose(); }}
            className="text-xl hover:bg-gray-700 rounded-lg p-1 transition-colors"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login form
// ---------------------------------------------------------------------------

function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [remember, setRemember] = useState(false);
  const [mfaCode, setMfaCode]   = useState('');
  const [showMfa, setShowMfa]   = useState(false);
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const e = {};
    if (!email.includes('@')) e.email = 'Enter a valid email';
    if (password.length < 6)  e.password = 'Password too short';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    if (!showMfa) { setShowMfa(true); return; }
    onLogin?.({ email, password, remember, mfaCode });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField icon={Mail}  label="Email"    type="email"    value={email}    onChange={setEmail}    placeholder="you@example.com" error={errors.email}    />
      <InputField
        icon={Lock}
        label="Password"
        type={showPwd ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        placeholder="••••••••••••••"
        error={errors.password}
        right={
          <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-gray-500 hover:text-gray-300">
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />

      {showMfa && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium">MFA Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2.5 px-3 text-white text-sm tracking-widest text-center focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded" />
          Remember me
        </label>
        <button type="button" onClick={() => onSwitch(MODES.forgotPassword)} className="text-blue-400 hover:text-blue-300 text-xs">
          Forgot password?
        </button>
      </div>

      <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition-colors">
        {showMfa ? 'Verify & Sign In' : 'Sign In'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-gray-600 text-xs">or continue with</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      {/* Social login */}
      <div className="flex gap-2">
        <SocialBtn icon="G"  label="Google" onClick={() => {}} />
        <SocialBtn icon="🍎" label="Apple"  onClick={() => {}} />
        <SocialBtn icon="🐙" label="GitHub" onClick={() => {}} />
      </div>

      {/* Biometric */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 text-sm transition-colors"
        onClick={() => onSwitch(MODES.biometricSetup)}
      >
        <Fingerprint size={16} /> Use Biometric Login
      </button>

      <p className="text-center text-gray-500 text-xs">
        No account?{' '}
        <button type="button" onClick={() => onSwitch(MODES.register)} className="text-blue-400 hover:text-blue-300">
          Create one
        </button>
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Register form
// ---------------------------------------------------------------------------

function RegisterForm({ onRegister, onSwitch }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [language, setLanguage]       = useState('en');
  const [terms, setTerms]             = useState(false);
  const [showPwd, setShowPwd]         = useState(false);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [errors, setErrors]           = useState({});

  const validate = () => {
    const e = {};
    if (!displayName.trim())        e.displayName = 'Display name required';
    if (!email.includes('@'))       e.email       = 'Enter a valid email';
    if (password.length < 13)       e.password    = 'Password must be at least 13 characters';
    if (password !== confirm)       e.confirm     = 'Passwords do not match';
    if (!terms)                     e.terms       = 'You must accept the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onRegister?.({ displayName, email, password, language });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Display name with emoji picker */}
      <div className="space-y-1">
        <label className="block text-xs text-gray-400 font-medium">Display Name</label>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or alias"
              className={`w-full bg-gray-800 border ${errors.displayName ? 'border-red-500' : 'border-gray-600'} rounded-lg py-2.5 pl-9 pr-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500`}
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              className="h-full px-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-lg transition-colors"
              title="Add emoji"
            >
              😀
            </button>
            {showEmoji && (
              <EmojiPicker onSelect={(e) => setDisplayName((n) => n + e)} onClose={() => setShowEmoji(false)} />
            )}
          </div>
        </div>
        {errors.displayName && <p className="text-red-400 text-xs">{errors.displayName}</p>}
      </div>

      <InputField icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" error={errors.email} />

      <InputField
        icon={Lock}
        label="Password"
        type={showPwd ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        placeholder="13+ characters"
        error={errors.password}
        right={
          <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-gray-500 hover:text-gray-300">
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />

      <PasswordStrengthMeter password={password} />

      <InputField
        icon={Lock}
        label="Confirm Password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        placeholder="Repeat password"
        error={errors.confirm}
      />

      {/* Language selector */}
      <div className="space-y-1">
        <label className="block text-xs text-gray-400 font-medium">Language / Region</label>
        <div className="relative">
          <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full appearance-none bg-gray-800 border border-gray-600 rounded-lg py-2.5 pl-9 pr-8 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Terms */}
      <div>
        <label className="flex items-start gap-2 text-gray-400 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <span>
            I accept the{' '}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Terms of Service</span>
            {' '}and{' '}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Privacy Policy</span>
          </span>
        </label>
        {errors.terms && <p className="text-red-400 text-xs mt-1">{errors.terms}</p>}
      </div>

      <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition-colors">
        Create Account
      </button>

      <p className="text-center text-gray-500 text-xs">
        Already have an account?{' '}
        <button type="button" onClick={() => onSwitch(MODES.login)} className="text-blue-400 hover:text-blue-300">
          Sign in
        </button>
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

function ForgotPasswordForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSent(true); }}
      className="space-y-4"
    >
      {sent ? (
        <div className="text-center space-y-3">
          <CheckCircle className="mx-auto text-green-400" size={40} />
          <p className="text-white font-medium">Reset link sent!</p>
          <p className="text-gray-400 text-sm">Check your inbox at <strong>{email}</strong>.</p>
        </div>
      ) : (
        <>
          <p className="text-gray-400 text-sm">Enter your email and we'll send a password reset link.</p>
          <InputField icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition-colors">
            Send Reset Link
          </button>
        </>
      )}
      <button type="button" onClick={() => onSwitch(MODES.login)} className="w-full text-gray-500 hover:text-gray-300 text-xs">
        ← Back to sign in
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// MFA Setup
// ---------------------------------------------------------------------------

function MFASetupForm({ onMFAVerify, onSwitch }) {
  const [code, setCode]     = useState('');
  const [verified, setVerified] = useState(false);
  const totpUri = 'otpauth://totp/NexusAI%20Pro:user@nexus.ai?secret=JBSWY3DPEHPK3PXP&issuer=NexusAIPro';

  const handleVerify = (e) => {
    e.preventDefault();
    if (code.length === 6) { setVerified(true); onMFAVerify?.(code); }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Scan the QR code with your authenticator app, then enter the 6-digit code to verify.</p>

      {/* QR code placeholder */}
      <div className="bg-white rounded-xl p-4 flex items-center justify-center w-40 h-40 mx-auto">
        <div className="text-center">
          <div className="text-4xl mb-2">📱</div>
          <div className="text-gray-800 text-xs font-mono break-all leading-tight">QR Code</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p className="text-gray-500 text-xs mb-1">Manual entry URI:</p>
        <p className="text-green-400 text-xs font-mono break-all">{totpUri}</p>
      </div>

      {verified ? (
        <div className="text-center">
          <CheckCircle className="mx-auto text-green-400 mb-2" size={36} />
          <p className="text-green-400 font-medium">MFA enabled!</p>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter 6-digit code"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2.5 px-3 text-white text-lg tracking-widest text-center focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={code.length !== 6}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            Verify Code
          </button>
        </form>
      )}

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <p className="text-gray-400 text-xs mb-2 font-medium">Backup Codes (save these somewhere safe):</p>
        <div className="grid grid-cols-2 gap-1">
          {BACKUP_CODES.map((c) => (
            <span key={c} className="font-mono text-xs text-green-400 bg-gray-900 rounded px-2 py-1">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MFA Verify
// ---------------------------------------------------------------------------

function MFAVerifyForm({ onMFAVerify, onSwitch }) {
  const [code, setCode] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onMFAVerify?.(code); }} className="space-y-4">
      <p className="text-gray-400 text-sm">Open your authenticator app and enter the 6-digit code.</p>
      <div className="flex justify-center">
        <Shield className="text-blue-400" size={48} />
      </div>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="000000"
        className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-3 text-white text-2xl tracking-widest text-center focus:outline-none focus:border-blue-500"
      />
      <button
        type="submit"
        disabled={code.length !== 6}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
      >
        Verify
      </button>
      <button type="button" onClick={() => onSwitch(MODES.login)} className="w-full text-gray-500 text-xs hover:text-gray-300">
        ← Back to sign in
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Biometric setup
// ---------------------------------------------------------------------------

function BiometricSetupForm({ onSwitch }) {
  const [selected, setSelected] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [done, setDone]         = useState(false);

  const methods = [
    { id: 'fingerprint', icon: <Fingerprint size={32} />, label: 'Fingerprint'  },
    { id: 'face',        icon: <ScanFace size={32} />,    label: 'Face ID'      },
    { id: 'retina',      icon: <Eye size={32} />,          label: 'Retina Scan'  },
  ];

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setDone(true); }, 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Choose a biometric authentication method to enable faster, secure logins.</p>

      <div className="grid grid-cols-3 gap-3">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              selected === m.id
                ? 'border-blue-500 bg-blue-900/30 text-blue-400'
                : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}
          >
            {m.icon}
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        ))}
      </div>

      {done ? (
        <div className="text-center space-y-2">
          <CheckCircle className="mx-auto text-green-400" size={40} />
          <p className="text-green-400 font-medium">Biometric registered!</p>
          <button type="button" onClick={() => onSwitch(MODES.login)} className="text-blue-400 text-sm hover:text-blue-300">
            Continue to sign in →
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleScan}
          disabled={!selected || scanning}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {scanning ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Scanning…</>
          ) : (
            'Register Biometric'
          )}
        </button>
      )}

      <button type="button" onClick={() => onSwitch(MODES.login)} className="w-full text-gray-500 text-xs hover:text-gray-300">
        ← Back to sign in
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

const TITLES = {
  [MODES.login]:          'Sign In',
  [MODES.register]:       'Create Account',
  [MODES.forgotPassword]: 'Reset Password',
  [MODES.mfaSetup]:       'Set Up Two-Factor Auth',
  [MODES.mfaVerify]:      'Enter MFA Code',
  [MODES.biometricSetup]: 'Biometric Setup',
};

export default function AuthModal({
  mode: initialMode = MODES.login,
  onLogin,
  onRegister,
  onMFAVerify,
  onClose,
}) {
  const [mode, setMode] = useState(initialMode);

  // Sync if parent changes mode
  useEffect(() => { setMode(initialMode); }, [initialMode]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === e.currentTarget) onClose?.(); },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-400" size={20} />
            <h2 className="text-white font-bold text-lg">{TITLES[mode]}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {mode === MODES.login          && <LoginForm         onLogin={onLogin}           onSwitch={setMode} />}
          {mode === MODES.register       && <RegisterForm      onRegister={onRegister}     onSwitch={setMode} />}
          {mode === MODES.forgotPassword && <ForgotPasswordForm                             onSwitch={setMode} />}
          {mode === MODES.mfaSetup       && <MFASetupForm      onMFAVerify={onMFAVerify}   onSwitch={setMode} />}
          {mode === MODES.mfaVerify      && <MFAVerifyForm     onMFAVerify={onMFAVerify}   onSwitch={setMode} />}
          {mode === MODES.biometricSetup && <BiometricSetupForm                            onSwitch={setMode} />}
        </div>
      </div>
    </div>
  );
}
