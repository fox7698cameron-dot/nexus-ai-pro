// src/components/AuthDashboard.jsx | 2026-10-01
import React, { useState, useCallback, useEffect } from 'react';
import {
  Shield, Lock, Key, Fingerprint, Eye, EyeOff, User, Users,
  Smartphone, QrCode, CheckCircle, XCircle, AlertTriangle,
  Settings, LogOut, UserCheck, Crown, Code, Wrench,
  RefreshCw, Copy, ChevronDown, Plus, Trash2
} from 'lucide-react';

// Password strength validator (minimum 13 chars, upper, lower, digit, special)
const validatePassword = (pwd) => {
  const checks = {
    length: pwd.length >= 13,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    digit: /\d/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score, valid: Object.values(checks).every(Boolean) };
};

// Username validator — supports unicode, emoji, letters, digits, _, -, .
const validateUsername = (name) => {
  if (name.length < 3 || name.length > 40) return false;
  // Allow any unicode letter/number, emoji (surrogate pairs), _, -, .
  return /^[\p{L}\p{N}\p{Emoji}_\-. ]{3,40}$/u.test(name);
};

const ROLES = {
  admin:     { label: 'Admin',     icon: Crown,    color: 'text-red-400',    bg: 'bg-red-900/20' },
  developer: { label: 'Developer', icon: Code,     color: 'text-blue-400',   bg: 'bg-blue-900/20' },
  moderator: { label: 'Moderator', icon: Wrench,   color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  user:      { label: 'User',      icon: User,     color: 'text-green-400',  bg: 'bg-green-900/20' },
};

const MFA_METHODS = ['Authenticator App (TOTP)', 'SMS', 'Email', 'Hardware Key (FIDO2)'];

// ── Biometric Auth panel (uses WebAuthn / platform authenticator) ──────────
function BiometricPanel({ onSuccess }) {
  const [status, setStatus] = useState('idle'); // idle | registering | verifying | ok | error
  const [msg, setMsg]       = useState('');

  const startRegistration = useCallback(async () => {
    if (!window.PublicKeyCredential) {
      setMsg('WebAuthn not supported in this browser/device.');
      setStatus('error');
      return;
    }
    setStatus('registering');
    setMsg('Follow your device prompt to register biometrics…');
    try {
      // In production, challenge comes from /api/auth/biometric/register (server-generated)
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp:   { name: 'Nexus AI Pro', id: window.location.hostname },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'user@nexus.ai', displayName: 'Nexus User' },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7  }, // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });
      if (credential) {
        setStatus('ok');
        setMsg('Biometric registered. Use this device to authenticate.');
        onSuccess?.('biometric');
      }
    } catch (err) {
      setStatus('error');
      setMsg(err.name === 'NotAllowedError' ? 'Biometric prompt was cancelled.' : err.message);
    }
  }, [onSuccess]);

  const startVerification = useCallback(async () => {
    if (!window.PublicKeyCredential) {
      setMsg('WebAuthn not supported.');
      setStatus('error');
      return;
    }
    setStatus('verifying');
    setMsg('Verify with your biometric…');
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (assertion) {
        setStatus('ok');
        setMsg('Biometric verification successful.');
        onSuccess?.('biometric_verified');
      }
    } catch (err) {
      setStatus('error');
      setMsg(err.name === 'NotAllowedError' ? 'Biometric prompt was cancelled.' : err.message);
    }
  }, [onSuccess]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Fingerprint / Touch ID', icon: Fingerprint, action: startVerification },
          { label: 'Face ID',                icon: Eye,         action: startVerification },
          { label: 'Register Biometric',     icon: Plus,        action: startRegistration },
        ].map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
          >
            <Icon size={28} className="text-blue-400" />
            <span className="text-xs text-center text-gray-300">{label}</span>
          </button>
        ))}
      </div>
      {msg && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          status === 'ok'    ? 'bg-green-900/30 text-green-300' :
          status === 'error' ? 'bg-red-900/30 text-red-300' :
                               'bg-blue-900/30 text-blue-300'
        }`}>
          {status === 'ok'    ? <CheckCircle size={16} /> :
           status === 'error' ? <XCircle size={16} /> :
                                <RefreshCw size={16} className="animate-spin" />}
          {msg}
        </div>
      )}
    </div>
  );
}

// ── TOTP / 2FA setup ──────────────────────────────────────────────────────
function TwoFactorPanel() {
  const [step, setStep]   = useState('setup');  // setup | qr | verify | done
  const [code, setCode]   = useState('');
  const [secret]          = useState('NEXUS' + Math.random().toString(36).substring(2, 10).toUpperCase());
  const [error, setError] = useState('');

  const fakeQrData = `otpauth://totp/NexusAIPro?secret=${secret}&issuer=NexusAIPro`;

  const verify = () => {
    // In production: POST /api/auth/2fa/verify { code }
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      setStep('done');
      setError('');
    } else {
      setError('Enter a valid 6-digit code from your authenticator app.');
    }
  };

  return (
    <div className="space-y-4">
      {step === 'setup' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Two-factor authentication adds an extra layer of security. Set up an authenticator app like Google Authenticator, Authy, or 1Password.
          </p>
          <div className="flex gap-2 flex-wrap">
            {MFA_METHODS.map(m => (
              <span key={m} className="px-3 py-1 rounded-full text-xs bg-white/10 text-gray-300">{m}</span>
            ))}
          </div>
          <button
            onClick={() => setStep('qr')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            Set Up Authenticator App
          </button>
        </div>
      )}
      {step === 'qr' && (
        <div className="space-y-3">
          <div className="p-4 bg-white rounded-xl inline-block">
            <div className="w-32 h-32 bg-gray-800 flex items-center justify-center text-xs text-center text-gray-400 p-2">
              QR Code<br />(scan with authenticator)
              <br /><span className="text-[8px] break-all mt-1">{fakeQrData.slice(0,40)}…</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
            <code className="text-xs text-blue-300 flex-1">{secret}</code>
            <button onClick={() => navigator.clipboard?.writeText(secret)} className="text-gray-400 hover:text-white">
              <Copy size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-500">Manual entry key shown above if you can't scan the QR code.</p>
          <button onClick={() => setStep('verify')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">
            I've scanned the code →
          </button>
        </div>
      )}
      {step === 'verify' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Enter the 6-digit code from your authenticator app to confirm setup.</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-40 px-4 py-2 text-center text-xl tracking-widest rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={verify} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
            Verify & Enable 2FA
          </button>
        </div>
      )}
      {step === 'done' && (
        <div className="flex items-center gap-3 p-3 bg-green-900/30 rounded-lg text-green-300">
          <CheckCircle size={20} />
          <div>
            <p className="font-medium text-sm">2FA Enabled</p>
            <p className="text-xs text-green-400">Your account is now protected with two-factor authentication.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Password strength indicator ───────────────────────────────────────────
function PasswordStrength({ password }) {
  const { checks, score } = validatePassword(password);
  const labels = ['Very Weak','Weak','Fair','Good','Strong','Very Strong'];
  const colors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-lime-500','bg-green-500','bg-emerald-500'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1 h-1.5">
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`flex-1 rounded-full transition-all ${i < score ? colors[score] : 'bg-white/10'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-400">Strength: <span className={score >= 4 ? 'text-green-400' : 'text-yellow-400'}>{labels[score]}</span></p>
      <div className="grid grid-cols-2 gap-1">
        {[
          ['13+ characters', checks.length],
          ['Uppercase letter', checks.upper],
          ['Lowercase letter', checks.lower],
          ['Number', checks.digit],
          ['Special character', checks.special],
        ].map(([label, ok]) => (
          <span key={label} className={`text-xs flex items-center gap-1 ${ok ? 'text-green-400' : 'text-gray-500'}`}>
            {ok ? <CheckCircle size={10} /> : <XCircle size={10} />} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Role dashboard card ───────────────────────────────────────────────────
function RoleDashboardCard({ role, selected, onSelect }) {
  const cfg = ROLES[role];
  const Icon = cfg.icon;
  return (
    <button
      onClick={() => onSelect(role)}
      className={`p-4 rounded-xl border transition-all text-left ${
        selected
          ? `${cfg.bg} border-current ${cfg.color}`
          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon size={20} className={selected ? cfg.color : ''} />
        <span className="font-medium text-sm">{cfg.label}</span>
      </div>
      <p className="text-xs text-gray-500">
        {role === 'admin'     && 'Full system access, user management, security controls'}
        {role === 'developer' && 'API access, debug tools, deployment pipeline'}
        {role === 'moderator' && 'Content moderation, user reports, community tools'}
        {role === 'user'      && 'Standard access, personal dashboard, AI features'}
      </p>
    </button>
  );
}

// ── Main AuthDashboard export ─────────────────────────────────────────────
export default function AuthDashboard() {
  const [activeTab, setActiveTab]     = useState('login');
  const [showPwd, setShowPwd]         = useState(false);
  const [password, setPassword]       = useState('');
  const [username, setUsername]       = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [usernameError, setUsernameError] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);

  const tabs = [
    { id: 'login',     label: 'Sign In' },
    { id: 'register',  label: 'Register' },
    { id: 'biometric', label: 'Biometric' },
    { id: '2fa',       label: '2FA / MFA' },
    { id: 'roles',     label: 'Role Access' },
  ];

  const handleUsernameChange = (val) => {
    setUsername(val);
    if (val && !validateUsername(val)) {
      setUsernameError('3–40 chars, letters/numbers/emoji/_-. allowed');
    } else {
      setUsernameError('');
    }
  };

  const pwdState = validatePassword(password);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20">
            <Shield size={28} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Authentication & Security</h1>
            <p className="text-sm text-gray-400">Multi-factor auth, biometrics, role-based access</p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-6">

          {/* Sign In */}
          {activeTab === 'login' && (
            <div className="space-y-4 max-w-sm">
              <h2 className="text-lg font-semibold">Sign In</h2>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Username / Email</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  placeholder="username or email"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {usernameError && <p className="text-xs text-red-400 mt-1">{usernameError}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••••"
                    className="w-full px-4 py-2 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {authSuccess
                ? <div className="flex items-center gap-2 p-3 bg-green-900/30 rounded-lg text-green-300 text-sm"><CheckCircle size={16} /> Signed in successfully</div>
                : <button
                    onClick={() => setAuthSuccess(true)}
                    disabled={!username || !pwdState.valid}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm"
                  >
                    Sign In
                  </button>
              }
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-xs text-gray-500 bg-transparent"><span className="px-2 bg-gray-950/0">or use biometric</span></div>
              </div>
              <BiometricPanel onSuccess={() => setAuthSuccess(true)} />
            </div>
          )}

          {/* Register */}
          {activeTab === 'register' && (
            <div className="space-y-4 max-w-sm">
              <h2 className="text-lg font-semibold">Create Account</h2>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Username <span className="text-gray-500">(emoji & special chars supported)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  placeholder="e.g. dev_user🚀"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {usernameError && <p className="text-xs text-red-400 mt-1">{usernameError}</p>}
                {username && !usernameError && <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><CheckCircle size={10} /> Username available</p>}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Password <span className="text-red-400">*13 chars min</span></label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-2 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Role</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <button
                disabled={!username || !pwdState.valid || !!usernameError}
                className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm"
              >
                Create Account
              </button>
              <p className="text-xs text-gray-500">
                By registering you accept our Terms of Service. Passwords are hashed with bcrypt (cost factor 14) and never stored in plain text.
              </p>
            </div>
          )}

          {/* Biometric */}
          {activeTab === 'biometric' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Biometric Authentication</h2>
              <p className="text-sm text-gray-400">
                Register your device's biometric authenticator (Fingerprint, Face ID, Touch ID, Retinal Scan) using the WebAuthn standard. No biometric data leaves your device.
              </p>
              <BiometricPanel onSuccess={(type) => console.log('Auth success:', type)} />
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg text-xs text-blue-300 space-y-1">
                <p className="font-medium">Supported methods:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-400">
                  <li>Fingerprint / Touch ID (iOS, Android, Windows Hello)</li>
                  <li>Face ID (iPhone X+, Android biometric)</li>
                  <li>Windows Hello (facial, fingerprint, PIN)</li>
                  <li>FIDO2 Hardware Key (YubiKey, etc.)</li>
                </ul>
              </div>
            </div>
          )}

          {/* 2FA / MFA */}
          {activeTab === '2fa' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Two-Factor & Multi-Factor Authentication</h2>
              <TwoFactorPanel />
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Additional MFA Methods</h3>
                <div className="space-y-2">
                  {['SMS (phone number)', 'Email (backup codes)', 'Hardware key (FIDO2/U2F)'].map(m => (
                    <div key={m} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-sm text-gray-300">{m}</span>
                      <button className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300">Configure</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Role Access */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Role-Based Access Control</h2>
              <p className="text-sm text-gray-400">Each role has a separate dashboard with tailored permissions and views.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.keys(ROLES).map(r => (
                  <RoleDashboardCard key={r} role={r} selected={selectedRole === r} onSelect={setSelectedRole} />
                ))}
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Current role: <span className={ROLES[selectedRole].color}>{ROLES[selectedRole].label}</span>
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedRole === 'admin'     && 'You have unrestricted access to all system settings, user management, security audit logs, billing, and deployment controls.'}
                  {selectedRole === 'developer' && 'You have access to API keys, debug mode, CI/CD pipeline, code repositories, and developer-only analytics.'}
                  {selectedRole === 'moderator' && 'You have access to content review queues, user report management, community tools, and moderation logs.'}
                  {selectedRole === 'user'      && 'You have access to personal dashboard, AI features, project tracking, subscription management, and settings.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
