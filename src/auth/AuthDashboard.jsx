// src/auth/AuthDashboard.jsx
// 2026-08-02 — Authentication UI
// Login, Register, MFA setup, Biometric registration
// Role-based routing: admin | dev | moderator | user

import React, { useState, useCallback, useRef } from 'react';
import {
  Shield, Lock, User, Mail, Eye, EyeOff, Fingerprint,
  Smartphone, Camera, AlertTriangle, CheckCircle, X,
  ChevronRight, Zap, Key, Globe, Languages, Scan
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/translations.js';

// Password strength calculator
function calcPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '#555' };
  let score = 0;
  if (password.length >= 13) score += 2;
  else if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(password)) score += 2;
  if (password.length >= 16) score += 1;
  if (score >= 7) return { score, label: 'Strong', color: '#00ff88' };
  if (score >= 5) return { score, label: 'Good', color: '#ffaa00' };
  if (score >= 3) return { score, label: 'Fair', color: '#ff8800' };
  return { score, label: 'Weak', color: '#ff4444' };
}

function InputField({ label, type = 'text', value, onChange, placeholder, autoComplete, error, hint, maxLength, pattern, required }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 5, letterSpacing: '0.05em' }}>
          {label.toUpperCase()}{required && <span style={{ color: '#ff4444' }}> *</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          pattern={pattern}
          required={required}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${error ? '#ff444466' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, padding: isPassword ? '10px 40px 10px 12px' : '10px 12px',
            color: '#fff', fontSize: 14, outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#00aaff55'; }}
          onBlur={e => { e.target.style.borderColor = error ? '#ff444466' : 'rgba(255,255,255,0.1)'; }}
        />
        {isPassword && (
          <button
            type="button" onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, lineHeight: 0 }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11, color: '#ff6666' }}>
          <AlertTriangle size={10} /> {error}
        </div>
      )}
      {hint && !error && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{hint}</div>
      )}
    </div>
  );
}

function PasswordStrengthBar({ password }) {
  const strength = calcPasswordStrength(password);
  const barWidth = `${(strength.score / 8) * 100}%`;
  const rules = [
    { met: password.length >= 13, label: '13+ characters' },
    { met: /[A-Z]/.test(password), label: 'Uppercase letter' },
    { met: /[a-z]/.test(password), label: 'Lowercase letter' },
    { met: /[0-9]/.test(password), label: 'Number' },
    { met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(password), label: 'Special character (!@#...)' },
  ];
  if (!password) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Password strength</span>
        <span style={{ fontSize: 10, color: strength.color, fontWeight: 700 }}>{strength.label}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: barWidth, background: strength.color, transition: 'width 0.3s ease, background 0.3s ease' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
        {rules.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: r.met ? '#00ff88' : 'rgba(255,255,255,0.3)' }}>
            <CheckCircle size={9} color={r.met ? '#00ff88' : 'rgba(255,255,255,0.2)'} />
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MFASetup({ totpUri, onVerify, onSkip }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  return (
    <div style={{ textAlign: 'center' }}>
      <Shield size={40} color="#00aaff" style={{ margin: '0 auto 12px', display: 'block' }} />
      <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Set Up 2FA</h3>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 20px', lineHeight: 1.6 }}>
        Scan the QR code with your authenticator app<br />(Google Authenticator, Authy, 1Password, etc.)
      </p>

      {totpUri && (
        <div style={{
          padding: 16, background: '#fff', borderRadius: 12, display: 'inline-block', marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, color: '#333', wordBreak: 'break-all', maxWidth: 200, textAlign: 'left' }}>
            {totpUri}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          type="text" inputMode="numeric" placeholder="Enter 6-digit code"
          value={token}
          onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px', color: '#fff', fontSize: 20,
            textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.3em',
          }}
        />
        {error && <div style={{ fontSize: 11, color: '#ff6666', marginTop: 4 }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSkip} style={{
          flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)',
        }}>Skip for now</button>
        <button
          onClick={() => {
            if (token.length !== 6) return setError('Enter a 6-digit code.');
            onVerify(token).catch(err => setError(err.message || 'Invalid code.'));
          }}
          style={{
            flex: 2, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #00aaff, #0066cc)', border: 'none', color: '#fff',
          }}
        >Enable 2FA</button>
      </div>
    </div>
  );
}

const BIOMETRIC_TYPES = [
  { id: 'fingerprint', label: 'Fingerprint', icon: <Fingerprint size={24} />, desc: 'Touch ID / Fingerprint scanner' },
  { id: 'faceId',      label: 'Face ID',     icon: <Scan size={24} />,        desc: 'Face recognition unlock' },
  { id: 'retinal',     label: 'Retinal',     icon: <Eye size={24} />,         desc: 'Retinal scan (enterprise)' },
];

function BiometricSetup({ onRegister, onSkip }) {
  const [selected, setSelected] = useState('fingerprint');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    const mockToken = Array.from({ length: 20 }, () => Math.random().toString(36)[2]).join('') + Date.now();
    await onRegister({ biometricToken: mockToken, biometricType: selected });
    setLoading(false);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Fingerprint size={40} color="#aa44ff" style={{ margin: '0 auto 12px', display: 'block' }} />
      <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Enable Biometrics</h3>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 20px', lineHeight: 1.6 }}>
        Sign in faster with your device's biometric sensor
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {BIOMETRIC_TYPES.map(b => (
          <button
            key={b.id}
            onClick={() => setSelected(b.id)}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
              background: selected === b.id ? 'rgba(170,68,255,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selected === b.id ? '#aa44ff55' : 'rgba(255,255,255,0.08)'}`,
              color: selected === b.id ? '#aa44ff' : 'rgba(255,255,255,0.4)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}
          >
            {b.icon}
            <div style={{ fontSize: 11, fontWeight: 600 }}>{b.label}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{b.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSkip} style={{
          flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)',
        }}>Skip</button>
        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            flex: 2, padding: '10px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700,
            background: loading ? 'rgba(170,68,255,0.3)' : 'linear-gradient(135deg, #aa44ff, #6622cc)',
            border: 'none', color: '#fff', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Authenticating...' : `Enable ${BIOMETRIC_TYPES.find(b => b.id === selected)?.label}`}
        </button>
      </div>
    </div>
  );
}

export default function AuthDashboard({ onLogin, onRegister, defaultTab = 'login', language = 'en' }) {
  const [tab, setTab] = useState(defaultTab);
  const [step, setStep] = useState('form');
  const [lang, setLang] = useState(language);
  const [totpUri, setTotpUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaUserId, setMfaUserId] = useState(null);
  const [mfaToken, setMfaToken] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '', mfaToken: '' });
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'user', language: lang, region: 'US' });

  const [errors, setErrors] = useState({});

  const updateLogin = (key) => (e) => setLoginForm(f => ({ ...f, [key]: e.target.value }));
  const updateReg = (key) => (e) => setRegForm(f => ({ ...f, [key]: e.target.value }));

  const validateReg = useCallback(() => {
    const errs = {};
    if (!regForm.username.trim()) errs.username = 'Username required.';
    if (!regForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) errs.email = 'Valid email required.';
    if (regForm.password.length < 13) errs.password = 'Minimum 13 characters required.';
    if (!/[A-Z]/.test(regForm.password)) errs.password = 'Password needs an uppercase letter.';
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(regForm.password)) errs.password = 'Password needs a special character.';
    if (regForm.password !== regForm.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [regForm]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await onLogin({ email: loginForm.email, password: loginForm.password });
      if (result?.mfaRequired) {
        setMfaUserId(result.userId);
        setStep('mfa');
        setLoading(false);
        return;
      }
      // Success handled by parent
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    }
    setLoading(false);
  }, [loginForm, onLogin]);

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    if (!validateReg()) return;
    setError('');
    setLoading(true);
    try {
      const result = await onRegister({ ...regForm });
      if (result?.totpSetupUri) {
        setTotpUri(result.totpSetupUri);
        setStep('mfa-setup');
      } else {
        setStep('biometric-setup');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    }
    setLoading(false);
  }, [regForm, validateReg, onRegister]);

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #040608 0%, #0a0d15 50%, #06080f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, padding: 32,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #00aaff, #aa44ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Zap size={28} color="#fff" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Nexus AI Pro</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            Military-grade encrypted platform
          </div>
        </div>

        {/* Language selector */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Globe size={12} color="rgba(255,255,255,0.3)" />
          <select
            value={lang}
            onChange={e => { setLang(e.target.value); setRegForm(f => ({ ...f, language: e.target.value })); }}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, padding: '4px 8px', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer',
            }}
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
            ))}
          </select>
        </div>

        {step === 'form' && (
          <>
            {/* Tab switcher */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
              {[{ id: 'login', label: 'Sign In' }, { id: 'register', label: 'Create Account' }].map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setError(''); setErrors({}); }}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: tab === t.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: 'none', color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.2s',
                  }}
                >{t.label}</button>
              ))}
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, marginBottom: 16 }}>
                <AlertTriangle size={13} color="#ff6666" />
                <span style={{ fontSize: 12, color: '#ff9999' }}>{error}</span>
              </div>
            )}

            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <InputField label="Email" type="email" value={loginForm.email} onChange={updateLogin('email')} placeholder="you@example.com" autoComplete="email" required />
                <InputField label="Password" type="password" value={loginForm.password} onChange={updateLogin('password')} placeholder="Your password" autoComplete="current-password" required />

                {/* Quick biometric */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                  {[{ icon: <Fingerprint size={14} />, label: 'Fingerprint' }, { icon: <Scan size={14} />, label: 'Face ID' }].map(b => (
                    <button
                      key={b.label}
                      type="button"
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      {b.icon} {b.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 700,
                    background: loading ? 'rgba(0,170,255,0.3)' : 'linear-gradient(135deg, #00aaff, #0066cc)',
                    border: 'none', color: '#fff', opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {tab === 'register' && (
              <form onSubmit={handleRegister} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
                <InputField
                  label="Username"
                  value={regForm.username}
                  onChange={updateReg('username')}
                  placeholder="Your display name (emoji ✨ ok!)"
                  autoComplete="username"
                  error={errors.username}
                  hint="Letters, numbers, emoji, and special characters supported"
                  maxLength={50}
                  required
                />
                <InputField label="Email" type="email" value={regForm.email} onChange={updateReg('email')} placeholder="you@example.com" autoComplete="email" error={errors.email} required />
                <InputField label="Password" type="password" value={regForm.password} onChange={updateReg('password')} placeholder="13+ characters required" autoComplete="new-password" error={errors.password} required />
                <PasswordStrengthBar password={regForm.password} />
                <InputField label="Confirm Password" type="password" value={regForm.confirmPassword} onChange={updateReg('confirmPassword')} placeholder="Repeat password" autoComplete="new-password" error={errors.confirmPassword} required />

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>ACCOUNT TYPE</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['user', 'moderator', 'dev'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRegForm(f => ({ ...f, role: r }))}
                        style={{
                          flex: 1, padding: '6px', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                          background: regForm.role === r ? 'rgba(0,170,255,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${regForm.role === r ? '#00aaff44' : 'rgba(255,255,255,0.08)'}`,
                          color: regForm.role === r ? '#00aaff' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>LANGUAGE</label>
                    <select value={regForm.language} onChange={updateReg('language')}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px', color: '#fff', fontSize: 12 }}>
                      {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>REGION</label>
                    <select value={regForm.region} onChange={updateReg('region')}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px', color: '#fff', fontSize: 12 }}>
                      {['US', 'EU', 'UK', 'CA', 'AU', 'JP', 'KR', 'BR', 'IN', 'SG'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 700,
                    background: loading ? 'rgba(0,255,136,0.3)' : 'linear-gradient(135deg, #00ff88, #00aaff)',
                    border: 'none', color: '#000', opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}

            <div style={{ marginTop: 20, padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={11} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                AES-256-GCM encrypted · Zero-knowledge architecture · PBKDF2-SHA512 password hashing
              </span>
            </div>
          </>
        )}

        {step === 'mfa' && (
          <div style={{ textAlign: 'center' }}>
            <Key size={36} color="#ffaa00" style={{ margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Two-Factor Auth</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 16px' }}>Enter the 6-digit code from your authenticator app.</p>
            <input
              type="text" inputMode="numeric" placeholder="000000"
              value={mfaToken} maxLength={6}
              onChange={e => setMfaToken(e.target.value.replace(/\D/g, ''))}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '12px', color: '#fff', fontSize: 24,
                textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.4em', marginBottom: 16,
              }}
            />
            {error && <div style={{ fontSize: 11, color: '#ff6666', marginBottom: 12 }}>{error}</div>}
            <button
              onClick={async () => {
                setLoading(true);
                try { await onLogin({ email: loginForm.email, password: loginForm.password, mfaToken }); }
                catch (err) { setError(err.message || 'Invalid code.'); }
                setLoading(false);
              }}
              disabled={loading || mfaToken.length !== 6}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                cursor: loading || mfaToken.length !== 6 ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg, #ffaa00, #ff6600)',
                border: 'none', color: '#000', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        )}

        {step === 'mfa-setup' && (
          <MFASetup
            totpUri={totpUri}
            onVerify={async (token) => {
              const resp = await fetch('/api/auth/mfa/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
                body: JSON.stringify({ totpToken: token }),
              });
              if (!resp.ok) { const d = await resp.json(); throw new Error(d.error); }
              setStep('biometric-setup');
            }}
            onSkip={() => setStep('biometric-setup')}
          />
        )}

        {step === 'biometric-setup' && (
          <BiometricSetup
            onRegister={async (payload) => {
              await fetch('/api/auth/biometric/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
                body: JSON.stringify(payload),
              });
              setStep('done');
            }}
            onSkip={() => setStep('done')}
          />
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} color="#00ff88" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>All Set!</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Your account is secured and ready to use.</p>
          </div>
        )}
      </div>
    </div>
  );
}
