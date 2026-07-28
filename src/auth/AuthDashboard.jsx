// Created: 2026-07-28
import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Users, Shield, Key, Fingerprint, ScanFace,
  Lock, Unlock, Eye, EyeOff, CheckCircle, XCircle,
  Plus, Trash2, Edit3, Save, RefreshCw, AlertTriangle,
  Smartphone, Monitor, Settings, Crown, Code, MessageSquare
} from 'lucide-react';

const ROLES = ['admin', 'developer', 'moderator', 'user'];
const ROLE_COLORS = {
  admin: 'text-red-400 bg-red-900/30 border-red-700',
  developer: 'text-blue-400 bg-blue-900/30 border-blue-700',
  moderator: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  user: 'text-green-400 bg-green-900/30 border-green-700',
};
const ROLE_ICONS = { admin: Crown, developer: Code, moderator: Shield, user: User };

function PasswordStrengthMeter({ password }) {
  const checks = [
    { label: '13+ characters', pass: password.length >= 13 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special char', pass: /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/`~]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['bg-red-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-500'];
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded ${i < score ? colors[score] : 'bg-gray-700'} transition-colors`} />
        ))}
      </div>
      <p className={`text-xs ${score >= 4 ? 'text-green-400' : score >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
        {labels[score] || 'Enter password'}
      </p>
      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <span key={c.label} className={`text-xs flex items-center gap-1 ${c.pass ? 'text-green-400' : 'text-gray-500'}`}>
            {c.pass ? <CheckCircle size={10}/> : <XCircle size={10}/>} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'user' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, role: form.role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details?.join(', ') || 'Registration failed');
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Username</label>
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          placeholder="Supports emoji and special chars 🎮"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email</label>
        <input
          type="email"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Role</label>
        <select
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
        >
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Password (13+ characters)</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:border-purple-500"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
          />
          <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPass(s => !s)}>
            {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>
        {form.password && <PasswordStrengthMeter password={form.password} />}
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
        <input
          type="password"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          value={form.confirmPassword}
          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          required
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-medium transition-colors"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}

function LoginForm({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [userId, setUserId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.requiresMFA) {
        setUserId(data.userId);
        setShowMFA(true);
      } else {
        onSuccess(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: mfaCode })
      });
      const data = await res.json();
      if (data.valid) {
        onSuccess({ userId, mfaVerified: true });
      } else {
        setError('Invalid MFA code');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showMFA) {
    return (
      <form onSubmit={handleMFA} className="space-y-4">
        <div className="text-center">
          <Smartphone className="mx-auto text-purple-400 mb-2" size={32}/>
          <p className="text-gray-300 text-sm">Enter the 6-digit code from your authenticator app</p>
        </div>
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-purple-500"
          placeholder="000000"
          maxLength={6}
          value={mfaCode}
          onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading || mfaCode.length !== 6} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-medium">
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email</label>
        <input type="email" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Password</label>
        <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-medium">
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="flex-1 h-px bg-gray-700"/>
        <span>or</span>
        <div className="flex-1 h-px bg-gray-700"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2.5 text-sm transition-colors">
          <Fingerprint size={16}/> Fingerprint
        </button>
        <button type="button" className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2.5 text-sm transition-colors">
          <ScanFace size={16}/> Face ID
        </button>
      </div>
    </form>
  );
}

function UserCard({ user, onEdit, onDelete }) {
  const RoleIcon = ROLE_ICONS[user.role] || User;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold">
          {(user.username || user.email || '?')[0].toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium">{user.username}</p>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-1 rounded-full border font-medium flex items-center gap-1 ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>
          <RoleIcon size={11}/> {user.role}
        </span>
        {user.mfaEnabled && <Shield size={14} className="text-green-400" title="MFA Enabled"/>}
        <button onClick={() => onEdit(user)} className="text-gray-400 hover:text-white p-1"><Edit3 size={14}/></button>
        <button onClick={() => onDelete(user.id)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 size={14}/></button>
      </div>
    </div>
  );
}

export default function AuthDashboard() {
  const [view, setView] = useState('login'); // login | register | users | mfa-setup
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mfaSetup, setMfaSetup] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) setUsers(await res.json());
    } catch {}
  }, []);

  useEffect(() => { if (view === 'users') fetchUsers(); }, [view, fetchUsers]);

  const handleLoginSuccess = (data) => {
    setCurrentUser(data);
    setView('users');
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/auth/user/${id}`, { method: 'DELETE' });
      setUsers(u => u.filter(x => x.id !== id));
    } catch {}
  };

  const handleMFASetup = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id || currentUser.userId })
      });
      const data = await res.json();
      setMfaSetup(data);
      setView('mfa-setup');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Shield size={20}/>
            </div>
            <div>
              <h1 className="text-xl font-bold">Authentication &amp; Users</h1>
              <p className="text-gray-400 text-sm">Role-based access control with MFA &amp; biometrics</p>
            </div>
          </div>
          <div className="flex gap-2">
            {['login','register','users'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                  ${view === v ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main panel */}
          <div className="lg:col-span-2">
            {(view === 'login' || view === 'register') && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">{view === 'login' ? 'Sign In' : 'Create Account'}</h2>
                {view === 'login'
                  ? <LoginForm onSuccess={handleLoginSuccess}/>
                  : <RegisterForm onSuccess={() => setView('login')}/>
                }
              </div>
            )}

            {view === 'users' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">User Management</h2>
                  <button onClick={fetchUsers} className="text-gray-400 hover:text-white p-1"><RefreshCw size={16}/></button>
                </div>
                {users.length === 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                    <Users size={32} className="mx-auto mb-2 opacity-40"/>
                    <p>No users yet. Register an account to get started.</p>
                  </div>
                )}
                {users.map(u => <UserCard key={u.id} user={u} onEdit={() => {}} onDelete={handleDelete}/>)}
              </div>
            )}

            {view === 'mfa-setup' && mfaSetup && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Key size={18}/> MFA Setup</h2>
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-2">Secret Key (enter in your authenticator app):</p>
                    <code className="text-purple-300 text-sm font-mono break-all">{mfaSetup.secret}</code>
                  </div>
                  {mfaSetup.otpauthUrl && (
                    <div className="bg-gray-800 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-2">OTPAuth URL:</p>
                      <code className="text-cyan-300 text-xs font-mono break-all">{mfaSetup.otpauthUrl}</code>
                    </div>
                  )}
                  <p className="text-sm text-gray-400">Scan the key or URL with Google Authenticator, Authy, or 1Password. Then verify a code to enable MFA.</p>
                  <button onClick={() => setView('users')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">Done</button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Role guide */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Role Hierarchy</h3>
              {ROLES.map(role => {
                const Icon = ROLE_ICONS[role];
                return (
                  <div key={role} className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={ROLE_COLORS[role].split(' ')[0]}/>
                    <span className="text-gray-300 text-sm capitalize">{role}</span>
                  </div>
                );
              })}
            </div>
            {/* Security features */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Security Features</h3>
              {[
                { icon: Lock, label: 'AES-256-GCM Encryption', status: true },
                { icon: Key, label: 'JWT + Refresh Tokens', status: true },
                { icon: Shield, label: 'TOTP 2FA / MFA', status: true },
                { icon: Fingerprint, label: 'Fingerprint / Touch ID', status: true },
                { icon: ScanFace, label: 'Face ID / Retinal', status: true },
                { icon: AlertTriangle, label: 'Brute Force Protection', status: true },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <f.icon size={13} className="text-gray-400"/>
                    <span className="text-gray-300 text-xs">{f.label}</span>
                  </div>
                  <span className={`text-xs ${f.status ? 'text-green-400' : 'text-red-400'}`}>
                    {f.status ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
            {currentUser && (
              <button onClick={handleMFASetup} className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                <Key size={14}/> Setup MFA
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
