/**
 * src/components/auth/RegisterPage.jsx
 * User Registration Component
 * Updated: 2026-08-24
 *
 * - 13+ char password minimum with strength meter
 * - Emoji + special character username support
 * - Real-time validation feedback
 * - Multi-language support
 * - Role-specific registration flows
 */
import React, { useState } from 'react';
import { AuthService, validatePassword, validateUsername, passwordStrength } from '../../auth/AuthService.js';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n/index.js';

const STRENGTH_LABELS = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

export default function RegisterPage({ onSuccess, onNavigate }) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    language: i18n.language || 'en',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const strength = passwordStrength(form.password);
  const usernameCheck = form.username ? validateUsername(form.username) : { valid: true, errors: [] };
  const passwordCheck = form.password ? validatePassword(form.password) : { valid: true, errors: [] };

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (!usernameCheck.valid) errors.username = usernameCheck.errors.join('; ');
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Valid email is required';
    if (!passwordCheck.valid) errors.password = passwordCheck.errors.join('; ');
    if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!form.agreeTerms) errors.agreeTerms = 'You must accept the terms';
    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setLoading(true);
    setError('');
    try {
      await AuthService.register({
        username: form.username,
        email: form.email,
        password: form.password,
        language: form.language,
      });
      onSuccess?.({ message: 'Registration successful! Please sign in.' });
      onNavigate?.('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #334155', background: '#0f172a',
    color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  };
  const errStyle = { color: '#f87171', fontSize: 12, marginTop: 4, display: 'block' };
  const labelStyle = { color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 5 };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      padding: '20px',
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.9)', backdropFilter: 'blur(20px)',
        borderRadius: 20, padding: 36, width: '100%', maxWidth: 460,
        border: '1px solid rgba(99,102,241,0.3)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🔷</div>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Create Account</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>{t('auth.createAccount')}</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13,
          }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleRegister} noValidate>
          {/* Username - supports emojis & special chars */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              {t('auth.username')}
              <span style={{ color: '#475569', marginLeft: 6, fontSize: 11 }}>
                (emojis & special characters supported 🎮✨)
              </span>
            </label>
            <input
              type="text"
              value={form.username}
              onChange={update('username')}
              placeholder="cooluser_42 🎮"
              style={{ ...inputStyle, borderColor: fieldErrors.username ? '#ef4444' : '#334155' }}
              autoComplete="username"
            />
            {fieldErrors.username && <span style={errStyle}>{fieldErrors.username}</span>}
            {form.username && !fieldErrors.username && usernameCheck.valid && (
              <span style={{ color: '#22c55e', fontSize: 12, marginTop: 4, display: 'block' }}>✓ Username looks good</span>
            )}
          </div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('auth.email')}</label>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              style={{ ...inputStyle, borderColor: fieldErrors.email ? '#ef4444' : '#334155' }}
              autoComplete="email"
            />
            {fieldErrors.email && <span style={errStyle}>{fieldErrors.email}</span>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8, position: 'relative' }}>
            <label style={labelStyle}>
              {t('auth.password')}
              <span style={{ color: '#475569', marginLeft: 6, fontSize: 11 }}>13+ characters required</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={update('password')}
              placeholder="••••••••••••••"
              style={{ ...inputStyle, paddingRight: 44, borderColor: fieldErrors.password ? '#ef4444' : '#334155' }}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: 14, top: 34, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 15 }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
            {fieldErrors.password && <span style={errStyle}>{fieldErrors.password}</span>}
          </div>

          {/* Password strength meter */}
          {form.password && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i <= strength ? STRENGTH_COLORS[strength] : '#1e293b',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: STRENGTH_COLORS[strength] }}>
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
          )}

          {/* Confirm Password */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('auth.confirmPassword')}</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="••••••••••••••"
              style={{ ...inputStyle, borderColor: fieldErrors.confirmPassword ? '#ef4444' : form.confirmPassword && form.confirmPassword === form.password ? '#22c55e' : '#334155' }}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && <span style={errStyle}>{fieldErrors.confirmPassword}</span>}
            {form.confirmPassword && form.confirmPassword === form.password && (
              <span style={{ color: '#22c55e', fontSize: 12, marginTop: 4, display: 'block' }}>✓ Passwords match</span>
            )}
          </div>

          {/* Language */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>🌐 Preferred Language</label>
            <select
              value={form.language}
              onChange={update('language')}
              style={{ ...inputStyle }}
            >
              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <option key={code} value={code}>
                  {lang.flag} {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* Terms */}
          <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              id="terms"
              checked={form.agreeTerms}
              onChange={update('agreeTerms')}
              style={{ marginTop: 2 }}
            />
            <label htmlFor="terms" style={{ color: '#94a3b8', fontSize: 13, cursor: 'pointer', lineHeight: 1.4 }}>
              I agree to the{' '}
              <span style={{ color: '#6366f1' }}>Terms of Service</span> and{' '}
              <span style={{ color: '#6366f1' }}>Privacy Policy</span>
            </label>
          </div>
          {fieldErrors.agreeTerms && <span style={{ ...errStyle, marginTop: -14, display: 'block', marginBottom: 12 }}>{fieldErrors.agreeTerms}</span>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 13, borderRadius: 10, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳ Creating account...' : '🚀 Create Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => onNavigate?.('login')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 13 }}
            >
              Already have an account? {t('auth.signIn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
