/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Registration Page — email, username (emoji + special chars supported),
 * strong password (13+ chars), language selection, role assignment (user only on register)
 * Date: 2026-08-09
 */

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { Eye, EyeOff, UserPlus, AlertCircle, Loader2, Check, Globe } from 'lucide-react';
import PasswordStrengthMeter, { validatePassword } from './PasswordStrengthMeter.jsx';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a0c 0%, #0f0f1a 50%, #0a0a0c 100%)',
    padding: '16px',
    overflowY: 'auto',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '40px 36px',
    backdropFilter: 'blur(20px)',
    my: '20px',
  },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: '4px' },
  subtitle: { fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', marginBottom: '28px' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#9ca3af', marginBottom: '6px' },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputError: { borderColor: 'rgba(239,68,68,0.5)' },
  field: { marginBottom: '16px' },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '8px',
  },
  error: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '16px',
  },
  toggle: { marginTop: '20px', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' },
  link: { color: '#667eea', cursor: 'pointer', textDecoration: 'underline' },
  hint: { fontSize: '0.72rem', color: '#4b5563', marginTop: '4px' },
  select: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  row: { display: 'flex', gap: '12px' },
  flex1: { flex: 1 },
};

export default function RegisterPage({ onSwitchToLogin, onRegisterSuccess }) {
  const { register, authError, clearAuthError } = useAuth();
  const { t, setLanguage, language, supportedLanguages } = useLanguage();

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    language: language,
    locale: 'en-US',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setFieldErrors(fe => ({ ...fe, [key]: null }));
    clearAuthError();
  };

  const validate = () => {
    const errors = {};
    if (!form.username.trim() || form.username.length < 2) errors.username = 'Username must be at least 2 characters';
    if (!form.email) errors.email = 'Email is required';
    const pwErrors = validatePassword(form.password);
    if (pwErrors.length > 0) errors.password = pwErrors[0];
    if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setLoading(true);
    try {
      const result = await register({
        username: form.username,
        displayName: form.displayName || form.username,
        email: form.email,
        password: form.password,
        language: form.language,
        locale: supportedLanguages.find(l => l.code === form.language)?.locale ?? 'en-US',
      });

      if (result?.success) {
        setLanguage(form.language);
        onRegisterSuccess?.(result.dashboardRoute);
      }
    } finally {
      setLoading(false);
    }
  }, [form, register, setLanguage, supportedLanguages, onRegisterSuccess]);

  const inputStyle = (key) => ({
    ...styles.input,
    ...(fieldErrors[key] ? styles.inputError : {}),
  });

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f472b6 100%)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: '1.6rem',
          }}>✨</div>
          <div style={styles.title}>Create Account</div>
          <div style={styles.subtitle}>Join Nexus AI Pro</div>
        </div>

        {authError && (
          <div style={styles.error}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Username + Display Name */}
          <div style={styles.row}>
            <div style={{ ...styles.field, ...styles.flex1 }}>
              <label style={styles.label}>{t('auth.username')} *</label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                style={inputStyle('username')}
                placeholder="your_handle 🚀"
                autoComplete="username"
                maxLength={50}
                required
              />
              {/* Username supports emoji and special chars */}
              <div style={styles.hint}>Emoji & special chars OK 🎮✨</div>
              {fieldErrors.username && <div style={{ ...styles.hint, color: '#f87171' }}>{fieldErrors.username}</div>}
            </div>
            <div style={{ ...styles.field, ...styles.flex1 }}>
              <label style={styles.label}>{t('auth.displayName')}</label>
              <input
                type="text"
                value={form.displayName}
                onChange={set('displayName')}
                style={inputStyle('displayName')}
                placeholder="Display Name"
                maxLength={100}
              />
            </div>
          </div>

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label}>{t('auth.email')} *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              style={inputStyle('email')}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            {fieldErrors.email && <div style={{ ...styles.hint, color: '#f87171' }}>{fieldErrors.email}</div>}
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>{t('auth.password')} * (13+ chars)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                style={{ ...inputStyle('password'), paddingRight: '44px' }}
                placeholder="••••••••••••••"
                autoComplete="new-password"
                minLength={13}
                required
              />
              <button
                type="button"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                onClick={() => setShowPassword(s => !s)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthMeter password={form.password} />
            {fieldErrors.password && <div style={{ ...styles.hint, color: '#f87171', marginTop: '4px' }}>{fieldErrors.password}</div>}
          </div>

          {/* Confirm Password */}
          <div style={styles.field}>
            <label style={styles.label}>{t('auth.confirmPassword')} *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                style={{ ...inputStyle('confirmPassword'), paddingRight: '44px' }}
                placeholder="••••••••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                onClick={() => setShowConfirm(s => !s)}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.confirmPassword && (
              <div style={{ ...styles.hint, color: form.password === form.confirmPassword ? '#10b981' : '#f87171', marginTop: '4px' }}>
                {form.password === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}
            {fieldErrors.confirmPassword && <div style={{ ...styles.hint, color: '#f87171' }}>{fieldErrors.confirmPassword}</div>}
          </div>

          {/* Language */}
          <div style={styles.field}>
            <label style={styles.label}><Globe size={12} style={{ marginRight: '4px' }} /> Language & Region</label>
            <select
              value={form.language}
              onChange={e => {
                const lang = supportedLanguages.find(l => l.code === e.target.value);
                setForm(f => ({ ...f, language: e.target.value, locale: lang?.locale ?? 'en-US' }));
              }}
              style={styles.select}
            >
              {supportedLanguages.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.name} ({l.locale})</option>
              ))}
            </select>
          </div>

          <button type="submit" style={{ ...styles.btn, ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} disabled={loading}>
            {loading ? <Loader2 size={18} /> : <UserPlus size={18} />}
            {loading ? t('common.loading') : 'Create Account'}
          </button>
        </form>

        <div style={styles.toggle}>
          Already have an account?{' '}
          <span style={styles.link} onClick={onSwitchToLogin}>{t('auth.login')}</span>
        </div>
      </div>
    </div>
  );
}
