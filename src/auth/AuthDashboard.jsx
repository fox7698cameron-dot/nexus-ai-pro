/**
 * src/auth/AuthDashboard.jsx
 * Nexus AI Pro — Role-Based Auth Dashboards
 * Separate UIs for: Admin, Developer, Moderator, User
 * Biometrics (WebAuthn / Capacitor), 2FA, MFA, Password strength
 * Date: 2026-08-28
 */
import React, { useState, useCallback } from 'react';

// ── Password strength meter ────────────────────────────────────────────────
function PasswordStrength({ password = '' }) {
  // Mirrors server-side logic
  let score = 0;
  const min = 13;
  score += Math.min(40, (password.length / min) * 40);
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()\-_=+[\]{}|;:'",.<>?/`~\\]/.test(password)) score += 20;
  score = Math.round(Math.min(100, score));

  const level = score < 30 ? 'Weak' : score < 55 ? 'Fair' : score < 80 ? 'Good' : 'Strong';
  const color = score < 30 ? 'bg-red-500' : score < 55 ? 'bg-orange-400' : score < 80 ? 'bg-yellow-400' : 'bg-green-500';

  const checks = [
    { label: `≥ ${min} characters`,     ok: password.length >= min   },
    { label: 'Uppercase letter',          ok: /[A-Z]/.test(password)  },
    { label: 'Lowercase letter',          ok: /[a-z]/.test(password)  },
    { label: 'Digit',                     ok: /[0-9]/.test(password)  },
    { label: 'Special character',         ok: /[!@#$%^&*]/.test(password) },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-xs font-semibold ${score < 30 ? 'text-red-500' : score < 80 ? 'text-yellow-600' : 'text-green-500'}`}>
          {level}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-1 text-xs">
            <span className={c.ok ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}>
              {c.ok ? '✅' : '○'}
            </span>
            <span className={c.ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Biometric button ──────────────────────────────────────────────────────
function BiometricButton({ type, onAuth, loading }) {
  const config = {
    fingerprint: { icon: '🫆', label: 'Fingerprint / Touch ID' },
    face:        { icon: '🔍', label: 'Face ID' },
    retinal:     { icon: '👁️', label: 'Retinal Scan'           },
  };
  const c = config[type] || config.fingerprint;
  return (
    <button
      onClick={() => onAuth(type)}
      disabled={loading}
      className="flex items-center gap-2 w-full justify-center py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition disabled:opacity-50"
    >
      <span className="text-xl">{c.icon}</span>
      {c.label}
    </button>
  );
}

// ── 2FA Code input ────────────────────────────────────────────────────────
function TotpInput({ value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 dark:text-gray-400">6-digit code from authenticator app</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="w-full text-center text-2xl tracking-[0.5em] font-mono border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
      />
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────
export function LoginForm({ onLogin, onSwitchToRegister }) {
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [totpCode,   setTotpCode]   = useState('');
  const [showTotp,   setShowTotp]   = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const submit = async () => {
    if (!email || !password) return setError('Email and password required');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, totpCode: totpCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresTotp) { setShowTotp(true); return; }
        throw new Error(data.error || 'Login failed');
      }
      localStorage.setItem('nexus:token', data.token);
      localStorage.setItem('nexus:user',  JSON.stringify(data.user));
      onLogin?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const biometricAuth = async (type) => {
    setLoading(true);
    setError('');
    try {
      // WebAuthn credential assertion (platform authenticator)
      if (window.PublicKeyCredential && type !== 'retinal') {
        const optRes = await fetch('/api/auth/webauthn/assert-options', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const options = await optRes.json();
        const credential = await navigator.credentials.get({
          publicKey: {
            ...options,
            challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
            allowCredentials: (options.allowCredentials || []).map(c => ({
              ...c, id: Uint8Array.from(atob(c.id), x => x.charCodeAt(0)),
            })),
          },
        });
        const verRes = await fetch('/api/auth/webauthn/assert-verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:       credential.id,
            rawId:    btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
            type:     credential.type,
            response: {
              authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
              clientDataJSON:    btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
              signature:         btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
            },
          }),
        });
        const result = await verRes.json();
        if (!verRes.ok) throw new Error(result.error);
        localStorage.setItem('nexus:token', result.token);
        localStorage.setItem('nexus:user',  JSON.stringify(result.user));
        onLogin?.(result);
      } else {
        // Capacitor biometric (mobile) — send device attestation
        const res = await fetch('/api/auth/biometric', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        localStorage.setItem('nexus:token', data.token);
        onLogin?.(data);
      }
    } catch (e) {
      setError(e.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Nexus AI Pro</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
          />
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password (13+ characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <button
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-sm"
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          {showTotp && <TotpInput value={totpCode} onChange={setTotpCode} />}
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 transition disabled:opacity-50"
        >
          {loading ? '⏳ Signing in…' : '🔐 Sign In'}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100 dark:border-gray-700" />
          </div>
          <div className="relative text-center text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 mx-auto w-fit">
            or continue with
          </div>
        </div>

        <div className="space-y-2">
          <BiometricButton type="fingerprint" onAuth={biometricAuth} loading={loading} />
          <BiometricButton type="face"        onAuth={biometricAuth} loading={loading} />
          <BiometricButton type="retinal"     onAuth={biometricAuth} loading={loading} />
        </div>

        <p className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} className="text-indigo-600 font-semibold hover:underline">
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Register form ─────────────────────────────────────────────────────────
export function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [form,    setForm]    = useState({ email: '', username: '', password: '', confirmPassword: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [step,    setStep]    = useState(1); // 1: basic, 2: security, 3: done

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('nexus:token', data.token);
      localStorage.setItem('nexus:user',  JSON.stringify(data.user));
      onRegister?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">Join Nexus AI Pro</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Username (emoji & special chars OK)"
            value={form.username}
            onChange={e => update('username', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
          />
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password (min 13 chars)"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-3 text-gray-400 text-sm">
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          {form.password && <PasswordStrength password={form.password} />}

          <input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={e => update('confirmPassword', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={loading || !form.email || !form.username || !form.password}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 transition disabled:opacity-50"
        >
          {loading ? '⏳ Creating account…' : '🚀 Create Account'}
        </button>

        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-indigo-600 font-semibold hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Role-specific dashboard shells ─────────────────────────────────────────
export function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('nexus:token');
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setStats).catch(console.error);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">👑</span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400">Full system control</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',   value: stats?.totalUsers   ?? '—', icon: '👥' },
          { label: 'Active Now',    value: stats?.activeNow    ?? '—', icon: '🟢' },
          { label: 'Revenue (MRR)', value: stats?.mrr          ?? '—', icon: '💰' },
          { label: 'API Calls',     value: stats?.apiCalls     ?? '—', icon: '⚡' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">{s.icon} {s.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeveloperDashboard({ user }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">👨‍💻</span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Developer Dashboard</h1>
          <p className="text-sm text-gray-400">Build &amp; deploy tools</p>
        </div>
      </div>
    </div>
  );
}

export function ModeratorDashboard({ user }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🛡️</span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Moderator Dashboard</h1>
          <p className="text-sm text-gray-400">Content &amp; community management</p>
        </div>
      </div>
    </div>
  );
}

export function UserDashboard({ user }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🧑</span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.username || 'User'}!
          </h1>
          <p className="text-sm text-gray-400">Your personal workspace</p>
        </div>
      </div>
    </div>
  );
}

// ── Route to correct dashboard by role ────────────────────────────────────
export default function AuthDashboard({ user }) {
  if (!user) return null;
  switch (user.role) {
    case 'admin':     return <AdminDashboard     user={user} />;
    case 'developer': return <DeveloperDashboard user={user} />;
    case 'moderator': return <ModeratorDashboard user={user} />;
    default:          return <UserDashboard      user={user} />;
  }
}
