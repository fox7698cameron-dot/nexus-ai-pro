/**
 * AuthDashboard.jsx
 * Nexus AI Pro — Role-Gated Auth & Dashboard Routing
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under Apache License 2.0
 *
 * Features: Separate dashboards per role (user/moderator/developer/admin),
 *           TOTP 2FA, biometrics, 13+ char password validation,
 *           emoji/Unicode username support, MFA setup.
 *
 * Updated: 2026-08-07
 */

import React, { useState, useCallback } from 'react';
import {
  Shield, Lock, Key, Eye, EyeOff, User, Users,
  Settings, ShieldCheck, Fingerprint, ScanFace,
  Smartphone, CheckCircle, AlertTriangle, Zap,
  Star, Crown, Code, Wrench, LogIn, UserPlus,
  RefreshCw, QrCode, Info,
} from 'lucide-react';
import {
  authClient, validatePassword, validateUsername,
  getPasswordStrengthColor, ROLES,
} from '../services/AuthService.js';

/* ─── Strength Meter ─────────────────────────────────────────────────── */
function PasswordMeter({ password }) {
  const { score, strength, issues } = validatePassword(password);
  const color = getPasswordStrengthColor(score);
  if (!password) return null;
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${score}%`, background:color, borderRadius:99,
          transition:'width 0.3s, background 0.3s',
        }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontSize:11, color }}>Strength: {strength}</span>
        <span style={{ fontSize:11, color:'#6b7280' }}>{score}/100</span>
      </div>
      {issues.length > 0 && (
        <ul style={{ margin:'6px 0 0', paddingLeft:16, listStyle:'none' }}>
          {issues.map((issue, i) => (
            <li key={i} style={{ fontSize:11, color:'#f97316', display:'flex', alignItems:'center', gap:4 }}>
              <AlertTriangle size={10} /> {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Login Form ─────────────────────────────────────────────────────── */
function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mfaStep, setMfaStep]   = useState(false);
  const [mfaCode, setMfaCode]   = useState('');
  const [sessionTok, setSessionTok] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authClient.login({ email, password });
      if (data.error)         { setError(data.error); return; }
      if (data.requiresMfa)   { setSessionTok(data.sessionToken); setMfaStep(true); return; }
      if (data.token)         { onSuccess(data); }
    } catch { setError('Network error — please try again'); }
    finally  { setLoading(false); }
  };

  const handleMfa = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authClient.verifyMfa({ sessionToken: sessionTok, totpCode: mfaCode });
      if (data.error) { setError(data.error); return; }
      if (data.token) { onSuccess(data); }
    } catch { setError('Verification failed'); }
    finally  { setLoading(false); }
  };

  const biometricLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const begin = await authClient.beginWebAuthnAuth({ email });
      if (begin.error) { setError(begin.error); return; }
      const credential = await navigator.credentials.get({
        publicKey: begin.publicKeyOptions,
      });
      const data = await authClient.finishWebAuthnAuth(
        JSON.parse(JSON.stringify(credential))
      );
      if (data.token) onSuccess(data);
      else setError(data.error ?? 'Biometric authentication failed');
    } catch (err) {
      setError(err.message ?? 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (mfaStep) {
    return (
      <form onSubmit={handleMfa} style={formCard}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <Smartphone size={32} style={{ color:'#6366f1', display:'block', margin:'0 auto 8px' }} />
          <h2 style={formTitle}>Two-Factor Verification</h2>
          <p style={{ color:'#9ca3af', fontSize:13 }}>Enter the 6-digit code from your authenticator app</p>
        </div>
        {error && <ErrorBanner msg={error} />}
        <input
          type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
          value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000" required
          style={{ ...inputStyle, textAlign:'center', fontSize:24, letterSpacing:8 }}
        />
        <button type="submit" disabled={loading || mfaCode.length !== 6} style={primaryBtn}>
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button type="button" onClick={() => setMfaStep(false)} style={ghostBtn}>
          ← Back to login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} style={formCard}>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <Shield size={32} style={{ color:'#6366f1', display:'block', margin:'0 auto 8px' }} />
        <h2 style={formTitle}>Welcome back</h2>
        <p style={{ color:'#9ca3af', fontSize:13 }}>Sign in to Nexus AI Pro</p>
      </div>

      {error && <ErrorBanner msg={error} />}

      <label style={labelStyle}>Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com" required autoComplete="username"
        style={inputStyle} />

      <label style={{ ...labelStyle, marginTop:12 }}>Password</label>
      <div style={{ position:'relative' }}>
        <input
          type={showPass ? 'text' : 'password'}
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Your password" required autoComplete="current-password"
          style={{ ...inputStyle, paddingRight:44 }} />
        <button type="button" onClick={() => setShowPass(s => !s)}
          style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer', color:'#6b7280' }}>
          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <button type="submit" disabled={loading} style={{ ...primaryBtn, marginTop:20 }}>
        {loading ? 'Signing in…' : <><LogIn size={15} /> Sign In</>}
      </button>

      {/* Biometrics button */}
      {typeof window !== 'undefined' && window.PublicKeyCredential && (
        <button type="button" onClick={biometricLogin} disabled={loading} style={outlineBtn}>
          <Fingerprint size={15} /> Sign in with Biometrics
        </button>
      )}

      <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#6b7280' }}>
        No account?{' '}
        <button type="button" onClick={onSwitchToRegister}
          style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          Create one
        </button>
      </p>
    </form>
  );
}

/* ─── Register Form ──────────────────────────────────────────────────── */
function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [form, setForm]       = useState({ username:'', email:'', password:'', confirm:'' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const unameV = validateUsername(form.username);
    if (!unameV.valid) { setError(unameV.reason); return; }

    const passV = validatePassword(form.password);
    if (!passV.valid) { setError(passV.issues[0]); return; }

    if (form.password !== form.confirm) { setError("Passwords don't match"); return; }

    setLoading(true);
    try {
      const data = await authClient.register({
        username: unameV.normalized,
        email: form.email,
        password: form.password,
      });
      if (data.error) { setError(data.error); return; }
      if (data.token) { onSuccess(data); }
    } catch { setError('Registration failed — please try again'); }
    finally  { setLoading(false); }
  };

  return (
    <form onSubmit={handleRegister} style={formCard}>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <UserPlus size={32} style={{ color:'#6366f1', display:'block', margin:'0 auto 8px' }} />
        <h2 style={formTitle}>Create account</h2>
        <p style={{ color:'#9ca3af', fontSize:13 }}>Join Nexus AI Pro</p>
      </div>

      {error && <ErrorBanner msg={error} />}

      <label style={labelStyle}>Username</label>
      <input type="text" value={form.username} onChange={set('username')}
        placeholder="Username (emoji & Unicode OK ✨)" required
        style={inputStyle} />

      <label style={{ ...labelStyle, marginTop:12 }}>Email</label>
      <input type="email" value={form.email} onChange={set('email')}
        placeholder="you@example.com" required autoComplete="email"
        style={inputStyle} />

      <label style={{ ...labelStyle, marginTop:12 }}>Password (13+ characters)</label>
      <div style={{ position:'relative' }}>
        <input
          type={showPass ? 'text' : 'password'}
          value={form.password} onChange={set('password')}
          placeholder="Create a strong password" required
          autoComplete="new-password"
          style={{ ...inputStyle, paddingRight:44 }} />
        <button type="button" onClick={() => setShowPass(s => !s)}
          style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer', color:'#6b7280' }}>
          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <PasswordMeter password={form.password} />

      <label style={{ ...labelStyle, marginTop:12 }}>Confirm Password</label>
      <input type="password" value={form.confirm} onChange={set('confirm')}
        placeholder="Re-enter password" required autoComplete="new-password"
        style={inputStyle} />

      <button type="submit" disabled={loading} style={{ ...primaryBtn, marginTop:20 }}>
        {loading ? 'Creating account…' : 'Create Account'}
      </button>

      <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#6b7280' }}>
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin}
          style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          Sign in
        </button>
      </p>
    </form>
  );
}

/* ─── Role Dashboard Tiles ───────────────────────────────────────────── */
const ROLE_CONFIG = {
  [ROLES.USER]: {
    icon:<Star size={20} color="#fbbf24" />, label:'User Dashboard',
    color:'#fbbf24', description:'Access your chats, analytics, and settings.',
    tiles:['Analytics','Projects','Payments','Settings'],
  },
  [ROLES.MODERATOR]: {
    icon:<ShieldCheck size={20} color="#22c55e" />, label:'Moderator Dashboard',
    color:'#22c55e', description:'Manage users, content, and platform safety.',
    tiles:['User Management','Content Review','Reports','Settings'],
  },
  [ROLES.DEVELOPER]: {
    icon:<Code size={20} color="#6366f1" />, label:'Developer Dashboard',
    color:'#6366f1', description:'API access, integrations, and dev tools.',
    tiles:['API Keys','Webhooks','Connectors','Documentation'],
  },
  [ROLES.ADMIN]: {
    icon:<Crown size={20} color="#ef4444" />, label:'Admin Dashboard',
    color:'#ef4444', description:'Full system control, security, and billing.',
    tiles:['Users','Security','Analytics','Billing','Settings','Logs'],
  },
};

function RoleDashboard({ user, onLogout }) {
  const roleConf = ROLE_CONFIG[user.role] ?? ROLE_CONFIG[ROLES.USER];
  return (
    <div style={{ padding:24, maxWidth:640, margin:'0 auto' }}>
      <div style={{
        display:'flex', alignItems:'center', gap:14, padding:'16px 20px',
        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:14, marginBottom:24,
      }}>
        {roleConf.icon}
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:16, color:'#f9fafb' }}>{roleConf.label}</div>
          <div style={{ fontSize:13, color:'#9ca3af' }}>{user.username ?? user.email}</div>
        </div>
        <button onClick={onLogout} style={ghostBtn}>Sign out</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:12 }}>
        {roleConf.tiles.map(tile => (
          <div key={tile} style={{
            padding:'20px 14px', borderRadius:12, textAlign:'center',
            background:'rgba(255,255,255,0.03)',
            border:`1px solid ${roleConf.color}33`,
            cursor:'pointer', transition:'background 0.2s',
          }}>
            <div style={{ fontSize:20, marginBottom:6 }}>
              {tile === 'Security' ? '🛡' : tile === 'Analytics' ? '📊' : tile === 'Settings' ? '⚙️' : '📁'}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:'#d1d5db' }}>{tile}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main AuthDashboard ─────────────────────────────────────────────── */
export default function AuthDashboard({ onAuthChange }) {
  const [view, setView]   = useState('login');  // login | register | dashboard
  const [user, setUser]   = useState(null);

  const handleSuccess = useCallback((data) => {
    setUser(data.user ?? { email: 'user@nexus.ai', role: ROLES.USER });
    setView('dashboard');
    onAuthChange?.(data);
  }, [onAuthChange]);

  const handleLogout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
    setView('login');
    onAuthChange?.(null);
  }, [onAuthChange]);

  if (view === 'dashboard' && user) {
    return <RoleDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:16, background:'linear-gradient(135deg, #0a0a0c 0%, #111827 100%)',
    }}>
      {view === 'login'
        ? <LoginForm onSuccess={handleSuccess} onSwitchToRegister={() => setView('register')} />
        : <RegisterForm onSuccess={handleSuccess} onSwitchToLogin={() => setView('login')} />}
    </div>
  );
}

/* ─── Shared UI helpers ──────────────────────────────────────────────── */
function ErrorBanner({ msg }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
      borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
      marginBottom:16, fontSize:13, color:'#ef4444',
    }}>
      <AlertTriangle size={14} style={{ flexShrink:0 }} />
      {msg}
    </div>
  );
}

const formCard = {
  background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)',
  border:'1px solid rgba(255,255,255,0.08)', borderRadius:20,
  padding:32, width:'100%', maxWidth:420,
  display:'flex', flexDirection:'column',
};

const formTitle = {
  fontSize:22, fontWeight:800, color:'#f9fafb', margin:'0 0 4px',
};

const labelStyle = {
  display:'block', fontSize:13, fontWeight:500, color:'#9ca3af', marginBottom:6,
};

const inputStyle = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)',
  color:'#f9fafb', fontSize:14, outline:'none', boxSizing:'border-box',
};

const primaryBtn = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  width:'100%', padding:'11px 20px', borderRadius:10, border:'none',
  background:'linear-gradient(135deg, #6366f1, #8b5cf6)', color:'#fff',
  fontSize:14, fontWeight:600, cursor:'pointer',
};

const outlineBtn = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  width:'100%', padding:'10px 20px', borderRadius:10, marginTop:10,
  border:'1px solid rgba(255,255,255,0.12)', background:'transparent',
  color:'#d1d5db', fontSize:13, fontWeight:500, cursor:'pointer',
};

const ghostBtn = {
  padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:500,
  border:'1px solid rgba(255,255,255,0.1)', background:'transparent',
  color:'#9ca3af', cursor:'pointer',
};
