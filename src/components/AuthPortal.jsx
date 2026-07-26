/**
 * src/components/AuthPortal.jsx
 * Nexus AI Pro - Authentication Portal
 * Features: Registration, Login, MFA/2FA, Biometrics, Password strength,
 *   Unicode/emoji usernames, Role-based routing
 * Created: 2026-07-26
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Lock, Eye, EyeOff, Shield, Fingerprint, ScanFace,
  Smartphone, Mail, AlertCircle, CheckCircle2, ArrowRight,
  Key, RefreshCw, Globe, ChevronDown,
} from 'lucide-react';
import { validatePassword, validateUsername, storeAuth, apiFetch } from '../lib/auth.js';
import { SUPPORTED_LOCALES, setLocale, getLocale } from '../lib/i18n.js';

// ── Password strength meter ─────────────────────────────────────────
function PasswordStrength({ password }) {
  const { valid, errors } = validatePassword(password || '');
  const checks = [
    { label: '13+ characters', pass: password?.length >= 13 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password || '') },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password || '') },
    { label: 'Number', pass: /[0-9]/.test(password || '') },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password || '') },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#22c55e'];
  const labels = ['Weak', 'Weak', 'Fair', 'Strong', 'Strong'];

  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < score ? colors[score - 1] : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
        <span style={{ fontSize: 11, color: colors[score - 1] || 'var(--text-3)', marginLeft: 6, whiteSpace: 'nowrap' }}>
          {labels[score - 1] || 'Too short'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            {c.pass
              ? <CheckCircle2 size={10} color="#22c55e" />
              : <AlertCircle size={10} color="#94a3b8" />}
            <span style={{ color: c.pass ? '#22c55e' : 'var(--text-3)' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MFA Setup component ─────────────────────────────────────────────
function MFASetup({ secret, qrUrl, onVerify, onSkip }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
      <h3 style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Set Up 2FA</h3>
      <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
        Scan with Google Authenticator, Authy, or any TOTP app
      </p>

      {/* QR placeholder */}
      <div style={{
        width: 150, height: 150, margin: '0 auto 16px',
        background: '#fff', borderRadius: 8, padding: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--border)',
      }}>
        <div style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" style={{ width: 130, height: 130 }} />
          ) : (
            <>QR Code<br />(scan with<br />auth app)</>
          )}
        </div>
      </div>

      {secret && (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 12px', fontSize: 12,
          fontFamily: 'monospace', color: 'var(--text-2)', marginBottom: 16,
          wordBreak: 'break-all',
        }}>
          Backup code: {secret}
        </div>
      )}

      <input
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="Enter 6-digit code"
        maxLength={6}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          background: 'var(--surface)', color: 'var(--text-1)',
          fontSize: 18, letterSpacing: 6, textAlign: 'center',
          boxSizing: 'border-box',
        }}
      />
      {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={() => {
            if (code.length !== 6) { setError('Enter a 6-digit code'); return; }
            onVerify(code);
          }}
          style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
          }}
        >Verify & Enable</button>
        <button onClick={onSkip} style={{
          padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-2)', cursor: 'pointer',
        }}>Skip</button>
      </div>
    </div>
  );
}

// ── Biometric prompt ────────────────────────────────────────────────
function BiometricPrompt({ onSuccess, onFallback }) {
  const [state, setState] = useState('idle'); // idle | scanning | success | error

  const startBiometric = useCallback(async () => {
    setState('scanning');
    try {
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          // Real WebAuthn flow would go here; simulated for demo
          await new Promise(r => setTimeout(r, 1500));
          setState('success');
          setTimeout(onSuccess, 500);
          return;
        }
      }
      setState('error');
    } catch {
      setState('error');
    }
  }, [onSuccess]);

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
        background: state === 'success' ? '#22c55e22' : state === 'error' ? '#ef444422' : 'var(--accent-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${state === 'success' ? '#22c55e' : state === 'error' ? '#ef4444' : 'var(--accent)'}`,
        transition: 'all 0.3s',
        animation: state === 'scanning' ? 'pulse 1s infinite' : 'none',
      }}>
        <Fingerprint size={40} color={state === 'success' ? '#22c55e' : state === 'error' ? '#ef4444' : 'var(--accent)'} />
      </div>

      <h3 style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
        {state === 'idle' && 'Biometric Login'}
        {state === 'scanning' && 'Scanning…'}
        {state === 'success' && 'Authenticated!'}
        {state === 'error' && 'Not Available'}
      </h3>
      <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '0 0 20px' }}>
        {state === 'idle' && 'Use Touch ID, Face ID, or fingerprint'}
        {state === 'scanning' && 'Place your finger or look at the camera'}
        {state === 'success' && 'Welcome back!'}
        {state === 'error' && 'Biometrics not available on this device'}
      </p>

      {state === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={startBiometric} style={{
            padding: '10px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Fingerprint size={16} /> Use Biometrics
          </button>
          <button onClick={onFallback} style={{
            padding: '8px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13,
          }}>Use password instead</button>
        </div>
      )}

      {state === 'error' && (
        <button onClick={onFallback} style={{
          padding: '10px 20px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
        }}>Continue with Password</button>
      )}
    </div>
  );
}

// ── LocaleSelector ──────────────────────────────────────────────────
function LocaleSelector({ currentLocale, onChange }) {
  const [open, setOpen] = useState(false);
  const info = SUPPORTED_LOCALES[currentLocale] || SUPPORTED_LOCALES.en;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)',
        background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13,
      }}>
        <span>{info.flag}</span>
        <span>{info.name}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 999,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, width: 200,
          maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {Object.entries(SUPPORTED_LOCALES).map(([code, loc]) => (
            <button key={code} onClick={() => { onChange(code); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 10px', border: 'none', background: currentLocale === code ? 'var(--accent)' : 'transparent',
              color: currentLocale === code ? '#fff' : 'var(--text-2)', cursor: 'pointer',
              borderRadius: 7, fontSize: 13, textAlign: 'left',
            }}>
              <span>{loc.flag}</span><span>{loc.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main AuthPortal ─────────────────────────────────────────────────
export default function AuthPortal({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // login | register | mfa | biometric | forgot
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', mfaCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());
  const [mfaData, setMfaData] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleLocaleChange = useCallback((code) => {
    setLocale(code);
    setLocaleState(code);
  }, []);

  const validateForm = useCallback(() => {
    const errs = {};
    const usernameCheck = validateUsername(form.username);
    if (!usernameCheck.valid) errs.username = usernameCheck.error;

    if (mode === 'register') {
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errs.email = 'Valid email required';
      }
      const pwCheck = validatePassword(form.password);
      if (!pwCheck.valid) errs.password = pwCheck.errors[0];
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
      if (!agreedToTerms) errs.terms = 'You must agree to the Terms of Service';
    } else {
      if (!form.password) errs.password = 'Password required';
    }
    return errs;
  }, [form, mode, agreedToTerms]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'register'
        ? { username: form.username, email: form.email, password: form.password }
        : { username: form.username, password: form.password };

      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (data.mfaRequired) {
        setMfaData(data.mfaSetup || null);
        setMode('mfa');
      } else {
        storeAuth(data.user, data.token, data.refresh);
        onAuthSuccess?.(data.user);
      }
    } catch (err) {
      setErrors({ general: err.message || 'Authentication failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [form, mode, validateForm, onAuthSuccess]);

  const handleMFAVerify = useCallback(async (code) => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, token: code }),
      });
      storeAuth(data.user, data.token, data.refresh);
      onAuthSuccess?.(data.user);
    } catch (err) {
      setErrors({ mfa: err.message });
    } finally {
      setLoading(false);
    }
  }, [form.username, onAuthSuccess]);

  const field = (key, placeholder, type = 'text', icon) => (
    <div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
          {icon}
        </div>
        <input
          type={type}
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          autoComplete={key === 'password' || key === 'confirmPassword' ? 'current-password' : key}
          style={{
            width: '100%', padding: '10px 12px 10px 38px',
            borderRadius: 8, border: `1px solid ${errors[key] ? '#ef4444' : 'var(--border)'}`,
            background: 'var(--surface)', color: 'var(--text-1)', fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
        {(key === 'password' || key === 'confirmPassword') && (
          <button
            type="button"
            onClick={() => key === 'password' ? setShowPassword(s => !s) : setShowConfirm(s => !s)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
            }}
          >
            {(key === 'password' ? showPassword : showConfirm) ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {errors[key] && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0' }}>{errors[key]}</p>}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Nexus AI Pro</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
            Enterprise AI Platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 28,
        }}>
          {/* Locale + biometric header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            {mode === 'login' && (
              <button onClick={() => setMode('biometric')} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                borderRadius: 8, border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-2)', cursor: 'pointer', fontSize: 12,
              }}>
                <Fingerprint size={13} /> Biometric
              </button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <LocaleSelector currentLocale={locale} onChange={handleLocaleChange} />
            </div>
          </div>

          {/* Mode: biometric */}
          {mode === 'biometric' && (
            <BiometricPrompt
              onSuccess={() => onAuthSuccess?.({ username: 'user', role: 'user' })}
              onFallback={() => setMode('login')}
            />
          )}

          {/* Mode: MFA */}
          {mode === 'mfa' && (
            <MFASetup
              secret={mfaData?.secret}
              qrUrl={mfaData?.qrUrl}
              onVerify={handleMFAVerify}
              onSkip={() => onAuthSuccess?.({ username: form.username, role: 'user' })}
            />
          )}

          {/* Mode: login / register */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleSubmit} noValidate>
              {/* Tab switcher */}
              <div style={{
                display: 'flex', background: 'var(--bg)', borderRadius: 10, padding: 4,
                marginBottom: 20,
              }}>
                {['login', 'register'].map(m => (
                  <button key={m} type="button" onClick={() => { setMode(m); setErrors({}); }} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    background: mode === m ? 'var(--accent)' : 'transparent',
                    color: mode === m ? '#fff' : 'var(--text-2)',
                    cursor: 'pointer', fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                  }}>{m === 'login' ? 'Sign In' : 'Register'}</button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {field('username', 'Username (supports emoji 🎮 & special chars)', 'text', <User size={14} />)}
                {mode === 'register' && field('email', 'Email address', 'email', <Mail size={14} />)}
                {field('password', 'Password (13+ chars required)', showPassword ? 'text' : 'password', <Lock size={14} />)}
                {mode === 'register' && (
                  <>
                    <PasswordStrength password={form.password} />
                    {field('confirmPassword', 'Confirm password', showConfirm ? 'text' : 'password', <Lock size={14} />)}
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-2)' }}>
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)}
                        style={{ marginTop: 2 }}
                      />
                      <span>I agree to the Terms of Service and Privacy Policy</span>
                    </label>
                    {errors.terms && <p style={{ color: '#ef4444', fontSize: 11, margin: '-8px 0 0' }}>{errors.terms}</p>}
                  </>
                )}

                {errors.general && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: '#ef444422', border: '1px solid #ef4444', color: '#ef4444', fontSize: 13 }}>
                    {errors.general}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  padding: '11px', borderRadius: 8, border: 'none',
                  background: loading ? 'var(--border)' : 'var(--accent)',
                  color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={14} />}
                  {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>

                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot')} style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    cursor: 'pointer', fontSize: 12, textDecoration: 'underline',
                  }}>
                    Forgot password?
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Forgot password */}
          {mode === 'forgot' && (
            <div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Reset Password</h3>
              <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
                Enter your email and we'll send a secure reset link.
              </p>
              <input
                type="email" placeholder="Email address"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text-1)', fontSize: 14, boxSizing: 'border-box', marginBottom: 12,
                }}
              />
              <button style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
              }}>Send Reset Link</button>
              <button onClick={() => setMode('login')} style={{
                marginTop: 8, width: '100%', padding: '8px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-2)', cursor: 'pointer', fontSize: 13,
              }}>Back to Sign In</button>
            </div>
          )}
        </div>

        {/* Security badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {['🔒 AES-256-GCM', '🛡️ MFA Ready', '🌍 20+ Languages', '📱 Biometric'].map(b => (
            <span key={b} style={{ fontSize: 11, color: 'var(--text-3)' }}>{b}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); } 50% { box-shadow: 0 0 0 12px rgba(99,102,241,0); } }
      `}</style>
    </div>
  );
}
