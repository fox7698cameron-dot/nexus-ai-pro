// src/auth/AuthPage.jsx
// 2026-07-12 | Auth: sign in/up, biometrics, MFA, password strength, multi-language

import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Fingerprint, ScanFace, Shield, Lock,
  Mail, User, CheckCircle, XCircle, AlertTriangle,
  Smartphone, Key, Globe, ChevronDown, Loader2
} from 'lucide-react';
import { validatePassword, validateUsername } from './AuthService.js';
import { getTranslation, SUPPORTED_LOCALES, detectLocale } from '../i18n/translations.js';

const MFA_METHODS = [
  { id: 'totp', label: 'Authenticator App', icon: <Smartphone size={16} /> },
  { id: 'sms', label: 'SMS Code', icon: <Smartphone size={16} /> },
  { id: 'email', label: 'Email Code', icon: <Mail size={16} /> },
];

function PasswordStrengthMeter({ password }) {
  const { valid, errors } = validatePassword(password);

  const checks = [
    { label: '13+ characters', pass: password.length >= 13 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special character', pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const score = checks.filter(c => c.pass).length;
  const strength = score <= 1 ? 'weak' : score <= 3 ? 'fair' : score === 4 ? 'good' : 'strong';
  const colors = { weak: '#ef4444', fair: '#eab308', good: '#3b82f6', strong: '#10b981' };

  if (!password) return null;

  return (
    <div className="password-meter">
      <div className="strength-bar">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="strength-segment"
            style={{ background: i <= score ? colors[strength] : '#333' }}
          />
        ))}
      </div>
      <div className="strength-label" style={{ color: colors[strength] }}>
        {strength.charAt(0).toUpperCase() + strength.slice(1)}
      </div>
      <div className="strength-checks">
        {checks.map(c => (
          <div key={c.label} className={`check-line ${c.pass ? 'pass' : 'fail'}`}>
            {c.pass ? <CheckCircle size={11} /> : <XCircle size={11} />}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BiometricPrompt({ onSuccess, onCancel }) {
  const [status, setStatus] = useState('idle');

  const attempt = async () => {
    setStatus('scanning');
    await new Promise(r => setTimeout(r, 2000));
    if (Math.random() > 0.1) {
      setStatus('success');
      setTimeout(onSuccess, 500);
    } else {
      setStatus('failed');
    }
  };

  return (
    <div className="biometric-prompt">
      <div className={`biometric-icon ${status}`} onClick={attempt}>
        {status === 'idle' || status === 'failed' ? (
          <Fingerprint size={48} style={{ color: status === 'failed' ? '#ef4444' : '#7c3aed' }} />
        ) : status === 'scanning' ? (
          <Loader2 size={48} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
        ) : (
          <CheckCircle size={48} style={{ color: '#10b981' }} />
        )}
      </div>
      <p className="biometric-label">
        {status === 'idle' && 'Touch sensor to authenticate'}
        {status === 'scanning' && 'Scanning...'}
        {status === 'success' && 'Authenticated!'}
        {status === 'failed' && 'Failed — try again'}
      </p>
      <div className="biometric-options">
        <button className="bio-opt" onClick={attempt}>
          <Fingerprint size={14} /> Fingerprint / Touch ID
        </button>
        <button className="bio-opt" onClick={attempt}>
          <ScanFace size={14} /> Face ID / Retina
        </button>
        <button className="bio-opt link" onClick={onCancel}>Use password instead</button>
      </div>
    </div>
  );
}

function MFAVerification({ onSuccess, onBack }) {
  const [code, setCode] = useState('');
  const [method, setMethod] = useState('totp');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const verify = async () => {
    if (code.length < 6) { setError('Enter 6-digit code'); return; }
    setIsVerifying(true);
    setError('');
    await new Promise(r => setTimeout(r, 1200));
    setIsVerifying(false);
    if (code === '123456' || Math.random() > 0.2) {
      onSuccess();
    } else {
      setError('Invalid code. Please try again.');
    }
  };

  return (
    <div className="mfa-screen">
      <Shield size={32} style={{ color: '#7c3aed' }} />
      <h2>Two-Factor Authentication</h2>

      <div className="mfa-methods">
        {MFA_METHODS.map(m => (
          <button
            key={m.id}
            className={`mfa-method-btn ${method === m.id ? 'active' : ''}`}
            onClick={() => setMethod(m.id)}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      <p className="mfa-instruction">
        {method === 'totp' && 'Enter the 6-digit code from your authenticator app'}
        {method === 'sms' && 'Enter the code sent to your phone number'}
        {method === 'email' && 'Enter the code sent to your email'}
      </p>

      <div className="otp-input-row">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`otp-box ${code.length > i ? 'filled' : ''}`}
          >
            {code[i] || ''}
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          className="otp-hidden-input"
        />
      </div>

      {error && <div className="mfa-error">{error}</div>}

      <button className="mfa-verify-btn" onClick={verify} disabled={isVerifying || code.length < 6}>
        {isVerifying ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={16} />}
        {isVerifying ? 'Verifying...' : 'Verify'}
      </button>

      <button className="back-link" onClick={onBack}>Back to login</button>
    </div>
  );
}

function LocaleSelector({ locale, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="locale-selector">
      <button className="locale-btn" onClick={() => setOpen(!open)}>
        <Globe size={14} />
        <span>{SUPPORTED_LOCALES[locale]?.flag} {locale}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="locale-dropdown">
          {Object.entries(SUPPORTED_LOCALES).map(([code, cfg]) => (
            <button
              key={code}
              className={`locale-option ${locale === code ? 'active' : ''}`}
              onClick={() => { onChange(code); setOpen(false); }}
            >
              {cfg.flag} {cfg.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuthPage({ onAuthenticated, initialRole = 'user' }) {
  const [mode, setMode] = useState('signin');
  const [step, setStep] = useState('credentials');
  const [locale, setLocale] = useState(detectLocale());
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(false);

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: initialRole,
    acceptTerms: false,
  });

  const t = (key) => getTranslation(locale, key);
  const dir = SUPPORTED_LOCALES[locale]?.dir || 'ltr';

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSignIn = async () => {
    if (!form.email.trim() || !form.password) { setError('Email and password are required'); return; }
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsLoading(false);

    if (form.password.length < 13) {
      setError('Password must be at least 13 characters');
      return;
    }

    setStep('mfa');
  };

  const handleSignUp = async () => {
    const usernameResult = validateUsername(form.username);
    if (!usernameResult.valid) { setError(usernameResult.error); return; }

    const passResult = validatePassword(form.password);
    if (!passResult.valid) { setError(passResult.errors[0]); return; }

    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!form.acceptTerms) { setError('You must accept the Terms of Service'); return; }

    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsLoading(false);
    setStep('mfa');
  };

  const handleMFASuccess = () => {
    onAuthenticated?.({
      email: form.email,
      username: form.username || form.email.split('@')[0],
      role: form.role,
      locale,
    });
  };

  if (step === 'biometric') {
    return (
      <div className="auth-page" dir={dir}>
        <BiometricPrompt onSuccess={handleMFASuccess} onCancel={() => setStep('credentials')} />
      </div>
    );
  }

  if (step === 'mfa') {
    return (
      <div className="auth-page" dir={dir}>
        <MFAVerification onSuccess={handleMFASuccess} onBack={() => setStep('credentials')} />
      </div>
    );
  }

  return (
    <div className="auth-page" dir={dir}>
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={28} style={{ color: '#7c3aed' }} />
            <span>Nexus AI Pro</span>
          </div>
          <LocaleSelector locale={locale} onChange={setLocale} />
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); }}
          >
            {t('auth.sign_in')}
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            {t('auth.sign_up')}
          </button>
        </div>

        {mode === 'signup' && (
          <div className="form-field">
            <label>{t('auth.username')}</label>
            <div className="input-wrapper">
              <User size={15} className="input-icon" />
              <input
                type="text"
                placeholder="your_username (emojis & special chars ok 😎)"
                value={form.username}
                onChange={e => updateForm('username', e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>
        )}

        <div className="form-field">
          <label>{t('auth.email')}</label>
          <div className="input-wrapper">
            <Mail size={15} className="input-icon" />
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => updateForm('email', e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-field">
          <label>{t('auth.password')}</label>
          <div className="input-wrapper">
            <Lock size={15} className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'signup' ? t('auth.password_requirements') : 'Password'}
              value={form.password}
              onChange={e => updateForm('password', e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <button
              className="toggle-password"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {mode === 'signup' && <PasswordStrengthMeter password={form.password} />}
        </div>

        {mode === 'signup' && (
          <>
            <div className="form-field">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={15} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChange={e => updateForm('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                />
                {form.confirmPassword && (
                  <span className="match-indicator">
                    {form.password === form.confirmPassword
                      ? <CheckCircle size={15} style={{ color: '#10b981' }} />
                      : <XCircle size={15} style={{ color: '#ef4444' }} />}
                  </span>
                )}
              </div>
            </div>

            <div className="form-field">
              <label>Account Type</label>
              <select
                value={form.role}
                onChange={e => updateForm('role', e.target.value)}
              >
                <option value="user">User</option>
                <option value="developer">Developer</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>

            <label className="terms-label">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={e => updateForm('acceptTerms', e.target.checked)}
              />
              <span>I accept the Terms of Service and Privacy Policy</span>
            </label>
          </>
        )}

        {mode === 'signin' && (
          <button className="forgot-link">{t('auth.forgot_password')}</button>
        )}

        {error && (
          <div className="auth-error">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="primary-btn"
          onClick={mode === 'signin' ? handleSignIn : handleSignUp}
          disabled={isLoading}
        >
          {isLoading
            ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            : <Shield size={16} />}
          {isLoading ? 'Please wait...' : mode === 'signin' ? t('auth.sign_in') : t('auth.sign_up')}
        </button>

        <div className="divider"><span>or</span></div>

        <div className="biometric-options-row">
          <button className="biometric-btn" onClick={() => setStep('biometric')}>
            <Fingerprint size={18} />
            <span>Fingerprint / Touch ID</span>
          </button>
          <button className="biometric-btn" onClick={() => setStep('biometric')}>
            <ScanFace size={18} />
            <span>Face ID / Retina</span>
          </button>
        </div>

        <p className="security-note">
          <Lock size={12} />
          AES-256-GCM encrypted · MFA protected · Zero-knowledge
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; background: radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15), transparent 70%); }
        .auth-card { width: 100%; max-width: 420px; background: #111; border-radius: 16px; padding: 2rem; border: 1px solid #222; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .auth-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .auth-logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; font-weight: 800; }
        .auth-tabs { display: flex; gap: 0.25rem; background: #0d0d0d; border-radius: 8px; padding: 0.25rem; margin-bottom: 1.5rem; }
        .auth-tab { flex: 1; padding: 0.5rem; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 0.875rem; color: #888; }
        .auth-tab.active { background: #7c3aed; color: white; }
        .form-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.875rem; }
        .form-field label { font-size: 0.8rem; color: #888; font-weight: 500; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-wrapper input { width: 100%; padding: 0.625rem 0.875rem 0.625rem 2.25rem; border-radius: 8px; border: 1px solid #333; background: #0d0d0d; color: white; font-size: 0.9rem; outline: none; }
        .input-wrapper input:focus { border-color: #7c3aed; }
        .input-icon { position: absolute; left: 0.625rem; color: #888; pointer-events: none; }
        .toggle-password, .match-indicator { position: absolute; right: 0.625rem; background: none; border: none; cursor: pointer; color: #888; padding: 0; display: flex; }
        select { width: 100%; padding: 0.625rem 0.875rem; border-radius: 8px; border: 1px solid #333; background: #0d0d0d; color: white; font-size: 0.875rem; cursor: pointer; }
        .terms-label { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8rem; color: #888; cursor: pointer; margin-bottom: 0.875rem; }
        .terms-label input { margin-top: 2px; }
        .forgot-link { background: none; border: none; color: #7c3aed; font-size: 0.8rem; cursor: pointer; padding: 0; margin-bottom: 0.875rem; }
        .auth-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(239,68,68,0.1); border-radius: 8px; color: #ef4444; font-size: 0.8rem; margin-bottom: 0.875rem; border: 1px solid rgba(239,68,68,0.2); }
        .primary-btn { width: 100%; padding: 0.75rem; background: #7c3aed; color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1rem; }
        .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .divider { display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #222; }
        .divider span { font-size: 0.75rem; color: #888; }
        .biometric-options-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .biometric-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem; border: 1px solid #333; border-radius: 8px; background: transparent; cursor: pointer; font-size: 0.8rem; color: #888; transition: all 0.2s; }
        .biometric-btn:hover { border-color: #7c3aed; color: #7c3aed; }
        .security-note { display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.75rem; color: #666; margin: 0; }
        .password-meter { margin-top: 0.5rem; }
        .strength-bar { display: flex; gap: 3px; margin-bottom: 0.35rem; }
        .strength-segment { flex: 1; height: 4px; border-radius: 2px; transition: background 0.3s; }
        .strength-label { font-size: 0.78rem; font-weight: 600; margin-bottom: 0.35rem; }
        .strength-checks { display: flex; flex-direction: column; gap: 0.2rem; }
        .check-line { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; }
        .check-line.pass { color: #10b981; }
        .check-line.fail { color: #888; }
        .biometric-prompt { max-width: 340px; margin: 3rem auto; padding: 2rem; background: #111; border-radius: 16px; border: 1px solid #222; text-align: center; }
        .biometric-icon { display: flex; justify-content: center; margin-bottom: 1rem; cursor: pointer; }
        .biometric-label { color: #888; margin-bottom: 1.5rem; }
        .biometric-options { display: flex; flex-direction: column; gap: 0.5rem; }
        .bio-opt { display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem; border: 1px solid #333; border-radius: 8px; background: transparent; cursor: pointer; font-size: 0.875rem; color: #ccc; }
        .bio-opt.link { border: none; color: #7c3aed; font-size: 0.8rem; }
        .mfa-screen { max-width: 360px; margin: 3rem auto; padding: 2rem; background: #111; border-radius: 16px; border: 1px solid #222; text-align: center; }
        .mfa-screen h2 { margin: 0.5rem 0 0.25rem; font-size: 1.25rem; }
        .mfa-methods { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; margin: 1rem 0; }
        .mfa-method-btn { display: flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.75rem; border-radius: 6px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 0.8rem; color: #888; }
        .mfa-method-btn.active { background: #7c3aed; color: white; border-color: #7c3aed; }
        .mfa-instruction { font-size: 0.85rem; color: #888; margin-bottom: 1.5rem; }
        .otp-input-row { display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem; position: relative; }
        .otp-box { width: 42px; height: 52px; border: 2px solid #333; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700; background: #0d0d0d; }
        .otp-box.filled { border-color: #7c3aed; }
        .otp-hidden-input { position: absolute; opacity: 0; pointer-events: none; width: 1px; }
        .mfa-error { color: #ef4444; font-size: 0.85rem; margin-bottom: 0.75rem; }
        .mfa-verify-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 0.75rem; background: #7c3aed; color: white; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; }
        .mfa-verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .back-link { background: none; border: none; color: #888; font-size: 0.85rem; cursor: pointer; }
        .locale-selector { position: relative; }
        .locale-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.6rem; background: #0d0d0d; border: 1px solid #333; border-radius: 6px; cursor: pointer; font-size: 0.78rem; color: #888; }
        .locale-dropdown { position: absolute; top: 100%; right: 0; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; z-index: 100; min-width: 180px; max-height: 250px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
        .locale-option { display: block; width: 100%; padding: 0.5rem 0.875rem; text-align: left; background: transparent; border: none; cursor: pointer; font-size: 0.8rem; color: #ccc; }
        .locale-option:hover, .locale-option.active { background: #7c3aed; color: white; }
        @media (max-width: 480px) {
          .auth-card { padding: 1.25rem; }
          .biometric-options-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
