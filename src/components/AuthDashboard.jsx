// src/components/AuthDashboard.jsx
// User Registration, Login, Biometrics, 2FA/MFA — Multi-Role
// Updated: 2026-10-13

import React, { useState, useCallback } from 'react';
import {
  User, Lock, Eye, EyeOff, Shield, Fingerprint, ScanFace,
  Smartphone, Key, Check, X, Globe, ChevronDown, AlertTriangle
} from 'lucide-react';
import { PasswordValidator, UsernameValidator, BiometricAuth, TwoFactorAuth, LanguageService } from '../services/AuthService.js';

const ROLES = [
  { id: 'user', label: 'User', description: 'Standard access', icon: '👤' },
  { id: 'moderator', label: 'Moderator', description: 'Content moderation', icon: '🛡️' },
  { id: 'developer', label: 'Developer', description: 'API & dev access', icon: '💻' },
  { id: 'admin', label: 'Admin', description: 'Full system access', icon: '⚡' }
];

function PasswordStrengthBar({ password }) {
  const strength = PasswordValidator.getStrength(password);
  const widths = ['20%', '40%', '60%', '80%', '100%'];
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <div style={{
          width: password ? widths[strength.score] : '0%',
          height: '100%', background: strength.color,
          borderRadius: 2, transition: 'all 0.3s'
        }} />
      </div>
      {password && (
        <div style={{ fontSize: 11, color: strength.color, marginTop: 3 }}>{strength.label}</div>
      )}
    </div>
  );
}

function ValidationList({ issues }) {
  if (!issues.length) return null;
  return (
    <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
      {issues.map((issue, i) => (
        <li key={i} style={{ fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
          <X size={10} /> {issue}
        </li>
      ))}
    </ul>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, icon: Icon, error, hint }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: '#ccc', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />}
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={isPassword ? 'new-password' : 'off'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 8, padding: `8px 12px 8px ${Icon ? '32px' : '12px'}`,
            color: '#fff', fontSize: 13, outline: 'none'
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0 }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{hint}</div>}
      {error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function BiometricOptions({ onSetup }) {
  const avail = BiometricAuth.isAvailable();
  return (
    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
      <h5 style={{ margin: '0 0 10px', fontSize: 12, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Fingerprint size={14} /> Biometric Authentication
      </h5>
      {avail.available ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { id: 'fingerprint', label: 'Fingerprint / Touch ID', icon: Fingerprint },
            { id: 'face_id', label: 'Face ID / Windows Hello', icon: ScanFace },
            { id: 'hardware', label: 'Hardware Security Key', icon: Key }
          ].map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onSetup(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '8px 12px', cursor: 'pointer', color: '#fff', fontSize: 12,
                  textAlign: 'left'
                }}
              >
                <Icon size={14} style={{ color: '#818cf8' }} />
                {m.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
          Biometric authentication requires a compatible device with WebAuthn support.
        </p>
      )}
    </div>
  );
}

function MFASetup() {
  const [selected, setSelected] = useState(null);
  const methods = TwoFactorAuth.getMethods();
  return (
    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
      <h5 style={{ margin: '0 0 10px', fontSize: 12, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Shield size={14} /> Multi-Factor Authentication
      </h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {methods.map(m => (
          <button
            key={m.id}
            onClick={() => setSelected(selected === m.id ? null : m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: selected === m.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${selected === m.id ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 6, padding: '8px 12px', cursor: 'pointer', color: '#fff', fontSize: 12, textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 16 }}>{m.icon}</span>
            <div>
              <div style={{ fontWeight: selected === m.id ? 600 : 400 }}>{m.name}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{m.description}</div>
            </div>
            {selected === m.id && <Check size={12} style={{ marginLeft: 'auto', color: '#34d399' }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function LanguageSelector({ value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: '#ccc', display: 'block', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Globe size={12} /> Language & Region
      </label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', appearance: 'none',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, padding: '8px 32px 8px 12px', color: '#fff', fontSize: 13
          }}
        >
          {LanguageService.SUPPORTED_LOCALES.map(l => (
            <option key={l.code} value={l.code} style={{ background: '#1a1a2e' }}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>
        <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#666', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

export default function AuthDashboard() {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [role, setRole] = useState('user');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', language: LanguageService.detect() });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // multi-step registration
  const [submitted, setSubmitted] = useState(false);

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validateRegister = useCallback(() => {
    const errs = {};
    const unValidation = UsernameValidator.validate(form.username);
    if (!unValidation.valid) errs.username = unValidation.issues.join('. ');

    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Valid email required';
    }

    const pwValidation = PasswordValidator.validate(form.password);
    if (!pwValidation.valid) errs.password = pwValidation.issues.join('. ');

    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'register') {
      if (step === 1) {
        if (validateRegister()) setStep(2);
        return;
      }
      if (step === 2) { setStep(3); return; }
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h3>{mode === 'register' ? 'Account Created!' : 'Welcome Back!'}</h3>
        <p style={{ color: '#888' }}>
          {mode === 'register'
            ? 'Your account has been set up with enhanced security.'
            : 'You have signed in successfully.'}
        </p>
        <button onClick={() => { setSubmitted(false); setStep(1); }} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1', borderRadius: 8, padding: '8px 20px', color: '#818cf8', cursor: 'pointer' }}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 14, padding: 20, maxWidth: 480, margin: '0 auto' }}>
      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
        {['login', 'register'].map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setStep(1); setErrors({}); }}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8,
              background: mode === m ? 'rgba(99,102,241,0.25)' : 'transparent',
              border: `1px solid ${mode === m ? '#6366f1' : 'transparent'}`,
              color: mode === m ? '#818cf8' : '#888',
              cursor: 'pointer', fontSize: 13, fontWeight: mode === m ? 600 : 400
            }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Register steps indicator */}
      {mode === 'register' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          {['Credentials', 'Security', 'Preferences'].map((s, i) => (
            <React.Fragment key={s}>
              <div style={{
                flex: 1, height: 4, borderRadius: 2,
                background: step > i ? '#6366f1' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s'
              }} />
            </React.Fragment>
          ))}
          <span style={{ fontSize: 11, color: '#888', marginLeft: 8, whiteSpace: 'nowrap' }}>
            Step {step}/3
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Role selector (register only) */}
        {mode === 'register' && step === 1 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#ccc', display: 'block', marginBottom: 6 }}>Account Role</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {ROLES.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  style={{
                    background: role === r.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${role === r.id ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#fff',
                    textAlign: 'left', fontSize: 12
                  }}
                >
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{r.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Credentials */}
        {(mode === 'login' || (mode === 'register' && step === 1)) && (
          <>
            {mode === 'register' && (
              <InputField
                label="Username"
                value={form.username}
                onChange={v => updateForm('username', v)}
                placeholder="your_username (emoji & special chars OK)"
                icon={User}
                error={errors.username}
                hint="Supports emoji, unicode, and special characters"
              />
            )}
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={v => updateForm('email', v)}
              placeholder="you@example.com"
              icon={User}
              error={errors.email}
            />
            <InputField
              label="Password"
              type="password"
              value={form.password}
              onChange={v => updateForm('password', v)}
              placeholder="13+ characters required"
              icon={Lock}
              error={errors.password}
              hint="Minimum 13 characters with uppercase, lowercase, numbers, and symbols"
            />
            {mode === 'register' && (
              <>
                <PasswordStrengthBar password={form.password} />
                {errors.password && <ValidationList issues={PasswordValidator.validate(form.password).issues} />}
                <InputField
                  label="Confirm Password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={v => updateForm('confirmPassword', v)}
                  placeholder="Repeat your password"
                  icon={Lock}
                  error={errors.confirmPassword}
                />
              </>
            )}
          </>
        )}

        {/* Step 2: Security (register) */}
        {mode === 'register' && step === 2 && (
          <>
            <BiometricOptions onSetup={(method) => console.log('Setup biometric:', method)} />
            <MFASetup />
          </>
        )}

        {/* Step 3: Preferences (register) */}
        {mode === 'register' && step === 3 && (
          <>
            <LanguageSelector value={form.language} onChange={v => updateForm('language', v)} />
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <h5 style={{ margin: '0 0 6px', fontSize: 12, color: '#34d399' }}>Security Summary</h5>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11, color: '#888' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Check size={10} style={{ color: '#34d399' }} /> AES-256-GCM encryption
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Check size={10} style={{ color: '#34d399' }} /> bcrypt password hashing (14 rounds)
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Check size={10} style={{ color: '#34d399' }} /> JWT + refresh token rotation
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={10} style={{ color: '#34d399' }} /> Zero plaintext secret storage
                </li>
              </ul>
            </div>
          </>
        )}

        {/* Login biometric option */}
        {mode === 'login' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => BiometricAuth.isAvailable().available && BiometricAuth.verify('stored_id')}
              style={{
                flex: 1, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#818cf8', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <Fingerprint size={14} /> Touch ID
            </button>
            <button
              type="button"
              style={{
                flex: 1, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#818cf8', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <ScanFace size={14} /> Face ID
            </button>
          </div>
        )}

        <button
          type="submit"
          style={{
            width: '100%', background: 'rgba(99,102,241,0.8)', border: '1px solid #6366f1',
            borderRadius: 8, padding: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14
          }}
        >
          {mode === 'login' ? 'Sign In' : step < 3 ? 'Continue →' : 'Create Account'}
        </button>

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => setMode('forgot')}
            style={{ width: '100%', background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', marginTop: 10, padding: 4 }}
          >
            Forgot password?
          </button>
        )}
      </form>
    </div>
  );
}
