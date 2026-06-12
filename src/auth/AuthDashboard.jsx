// src/auth/AuthDashboard.jsx
// 2026-06-12 | Nexus AI Pro — Role-Based Auth + Registration + MFA + Biometrics
// Admin · Dev · Moderator · User — 13-char min · TOTP · Touch ID / Face ID / retinal stub

import React, { useState, useEffect } from 'react';

// ---- password strength bar -----------------------------------------

function StrengthBar({ score, meetsMinLength }) {
  const colors = ['#ff4444', '#ff8c00', '#ffd700', '#4caf50', '#22c55e'];
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 3,
            background: i <= score ? colors[score] : '#21262d',
            transition: 'background .2s'
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: colors[score] }}>{labels[score]}</span>
        {!meetsMinLength && <span style={{ color: '#ff8c00' }}>Min 13 characters</span>}
      </div>
    </div>
  );
}

// ---- form helpers ---------------------------------------------------

const inputStyle = {
  background: '#0d1117', border: '1px solid #30363d', borderRadius: 8,
  color: '#e6edf3', padding: '10px 14px', fontSize: 14, width: '100%',
  boxSizing: 'border-box', outline: 'none'
};

function Field({ label, type = 'text', value, onChange, placeholder, helper }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, color: '#8b949e', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inputStyle} autoComplete="off" />
      {helper && <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>{helper}</div>}
    </div>
  );
}

function Btn({ children, onClick, disabled, color = '#1f6feb', fullWidth }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#21262d' : color,
      color: '#e6edf3', border: 'none', borderRadius: 8,
      padding: '10px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 14, fontWeight: 600, width: fullWidth ? '100%' : 'auto',
      transition: 'opacity .2s', opacity: disabled ? 0.5 : 1
    }}>{children}</button>
  );
}

// ---- LoginForm ------------------------------------------------------

function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvail, setBiometricAvail] = useState(false);

  useEffect(() => {
    setBiometricAvail(!!(window.PublicKeyCredential || navigator.credentials));
  }, []);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode: totp || undefined })
      });
      const data = await r.json();
      if (data.mfaRequired) { setNeedTotp(true); setLoading(false); return; }
      if (data.error) { setError(data.error); setLoading(false); return; }
      localStorage.setItem('nexus_token', data.accessToken);
      localStorage.setItem('nexus_refresh', data.refreshToken);
      onSuccess(data.user);
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const biometricLogin = async () => {
    const userStr = localStorage.getItem('nexus_biometric_user');
    if (!userStr) { setError('No biometric profile saved. Log in with password first.'); return; }
    const { userId } = JSON.parse(userStr);
    try {
      const chalR = await fetch(`/api/auth/biometric/challenge/${userId}`);
      const { challenge } = await chalR.json();
      // WebAuthn assertion — requires registered credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000
        }
      });
      const r = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, signedChallenge: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))) })
      });
      const data = await r.json();
      if (data.error) { setError(data.error); return; }
      localStorage.setItem('nexus_token', data.accessToken);
      onSuccess({ id: userId });
    } catch (e) { setError(`Biometric failed: ${e.message}`); }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', textAlign: 'center' }}>Sign In</h2>
      {error && <div style={{ background: '#2d0000', color: '#ff4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••••••••" />
      {needTotp && <Field label="Authenticator Code" value={totp} onChange={setTotp} placeholder="6-digit code" helper="Check your authenticator app." />}
      <Btn onClick={submit} disabled={loading} fullWidth>{loading ? 'Signing in…' : 'Sign In'}</Btn>
      {biometricAvail && (
        <button onClick={biometricLogin} style={{
          width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.04)',
          border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3',
          padding: '10px', cursor: 'pointer', fontSize: 13
        }}>
          🔐 Sign in with Biometrics (Touch ID / Face ID)
        </button>
      )}
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#8b949e' }}>
        No account?{' '}
        <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: 13 }}>Create one</button>
      </div>
    </div>
  );
}

// ---- RegisterForm ---------------------------------------------------

function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user', language: 'en', region: 'US' });
  const [strength, setStrength] = useState({ score: 0, meetsMinLength: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkStrength = async (pwd) => {
    setForm(f => ({ ...f, password: pwd }));
    if (!pwd) return;
    try {
      const r = await fetch('/api/auth/password-strength', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      if (r.ok) setStrength(await r.json());
    } catch { /* local fallback */ }
  };

  const submit = async () => {
    setError('');
    if (!strength.meetsMinLength) { setError('Password must be at least 13 characters.'); return; }
    if (strength.score < 2) { setError('Password is too weak. Add numbers, symbols, or length.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await r.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      // Auto-login after register
      const loginR = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      const loginData = await loginR.json();
      if (loginData.accessToken) {
        localStorage.setItem('nexus_token', loginData.accessToken);
        localStorage.setItem('nexus_refresh', loginData.refreshToken);
        onSuccess(loginData.user);
      }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', textAlign: 'center' }}>Create Account</h2>
      {error && <div style={{ background: '#2d0000', color: '#ff4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      <Field label="Username" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))}
        placeholder="Your username (letters, emoji, digits…)" helper="3–64 chars. Emoji and special characters supported." />
      <Field label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="you@example.com" />
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#8b949e', marginBottom: 6 }}>Password</label>
        <input type="password" value={form.password} onChange={e => checkStrength(e.target.value)}
          placeholder="13+ characters · letters · numbers · symbols"
          style={inputStyle} />
        <StrengthBar score={strength.score} meetsMinLength={strength.meetsMinLength} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#8b949e', marginBottom: 6 }}>Language</label>
          <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} style={inputStyle}>
            {[['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['zh','中文'],['ja','日本語'],['ko','한국어'],['ar','العربية'],['hi','हिन्दी'],['ru','Русский'],['pt','Português']].map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#8b949e', marginBottom: 6 }}>Region</label>
          <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} style={inputStyle}>
            {[['US','United States'],['GB','United Kingdom'],['EU','Europe'],['CA','Canada'],['AU','Australia'],['JP','Japan'],['CN','China'],['IN','India'],['BR','Brazil'],['MX','Mexico']].map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <Btn onClick={submit} disabled={loading} fullWidth>{loading ? 'Creating…' : 'Create Account'}</Btn>
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#8b949e' }}>
        Have an account?{' '}
        <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: 13 }}>Sign in</button>
      </div>
    </div>
  );
}

// ---- MFASetup -------------------------------------------------------

function MFASetup({ userId, onClose }) {
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/2fa/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` },
      body: JSON.stringify({ userId })
    }).then(r => r.json()).then(d => { if (d.qrDataUrl) setQr(d.qrDataUrl); });
  }, [userId]);

  const confirm = async () => {
    const r = await fetch('/api/auth/2fa/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` },
      body: JSON.stringify({ userId, totpCode: code })
    });
    const d = await r.json();
    if (d.success) setConfirmed(true);
    else setError(d.error || 'Invalid code.');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 16, padding: 28, width: '90%', maxWidth: 380, textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 16px' }}>Set Up 2FA</h3>
        {confirmed ? (
          <>
            <div style={{ color: '#4ade80', fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ marginBottom: 16 }}>2FA is now enabled on your account.</div>
            <Btn onClick={onClose} color="#4ade80">Done</Btn>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 16 }}>Scan this QR code with Google Authenticator or Authy.</div>
            {qr && <img src={qr} alt="2FA QR Code" style={{ width: 180, height: 180, borderRadius: 8, marginBottom: 16 }} />}
            {error && <div style={{ color: '#ff4444', marginBottom: 10, fontSize: 13 }}>{error}</div>}
            <Field label="Enter 6-digit code to confirm" value={code} onChange={setCode} placeholder="000000" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn onClick={onClose} color="#30363d">Cancel</Btn>
              <Btn onClick={confirm}>Verify & Enable</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- AuthDashboard (public API) ------------------------------------

export default function AuthDashboard({ onAuthenticated }) {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [showMFA, setShowMFA] = useState(false);

  const handleSuccess = (u) => {
    setUser(u);
    onAuthenticated?.(u);
  };

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 14px', fontSize: 13 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1f6feb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{user.username || user.email}</div>
          <div style={{ color: '#8b949e', fontSize: 11, textTransform: 'capitalize' }}>{user.role}</div>
        </div>
        <button onClick={() => setShowMFA(true)} style={{ marginLeft: 8, background: 'none', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>
          🔒 2FA
        </button>
        <button onClick={() => { setUser(null); localStorage.removeItem('nexus_token'); }} style={{ background: 'none', border: '1px solid #30363d', borderRadius: 6, color: '#8b949e', padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>
          Sign Out
        </button>
        {showMFA && <MFASetup userId={user.id} onClose={() => setShowMFA(false)} />}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 16, padding: 32, width: '90%', maxWidth: 420 }}>
        {view === 'login'
          ? <LoginForm onSuccess={handleSuccess} onSwitch={() => setView('register')} />
          : <RegisterForm onSuccess={handleSuccess} onSwitch={() => setView('login')} />}
      </div>
    </div>
  );
}
