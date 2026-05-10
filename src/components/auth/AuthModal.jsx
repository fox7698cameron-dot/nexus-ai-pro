// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, ChevronDown } from 'lucide-react';
import PasswordStrength from './PasswordStrength.jsx';
import TwoFactor from './TwoFactor.jsx';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
];

const REGIONS = [
  'North America', 'South America', 'Europe', 'Asia Pacific',
  'Middle East', 'Africa', 'Australia / NZ',
];

const TABS = ['login', 'register', 'forgot'];

function InputField({ label, id, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-sm text-gray-300">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function SocialButtons() {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center gap-2 my-1">
        <hr className="flex-1 border-gray-600" />
        <span className="text-xs text-gray-500">or continue with</span>
        <hr className="flex-1 border-gray-600" />
      </div>
      <div className="flex gap-2">
        {[
          { label: 'Google', icon: '🇬' },
          { label: 'GitHub', icon: '🐙' },
          { label: 'Apple', icon: '🍎' },
        ].map(({ label, icon }) => (
          <button
            key={label}
            type="button"
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors"
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactor, setTwoFactor] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      if (data.twoFactorEnabled) {
        setTwoFactor({ email });
        return;
      }
      onSuccess(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (twoFactor) {
    return (
      <TwoFactor
        email={twoFactor.email}
        onSuccess={onSuccess}
        onBack={() => setTwoFactor(null)}
        setupMode={false}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}
      <InputField label="Email" id="login-email">
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="you@example.com"
        />
      </InputField>
      <InputField label="Password" id="login-password">
        <div className="relative">
          <input
            id="login-password"
            type={showPass ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </InputField>
      <div className="flex items-center gap-2">
        <input
          id="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="accent-purple-500"
        />
        <label htmlFor="remember-me" className="text-sm text-gray-400">Remember me</label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <SocialButtons />
    </form>
  );
}

function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({
    email: '', username: '', password: '', confirm: '',
    language: 'en', region: '', terms: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((er) => ({ ...er, [key]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    const username = form.username.trim();
    if (!username) errs.username = 'Username is required';
    if ([...username].length > 50) errs.username = 'Max 50 characters';
    if (!form.password) errs.password = 'Password is required';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    if (!form.region) errs.region = 'Please select a region';
    if (!form.terms) errs.terms = 'You must accept the terms';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          username: form.username.trim(),
          password: form.password,
          language: form.language,
          region: form.region,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrors({ _api: data.error || 'Registration failed' });
        return;
      }
      onSuccess(data);
    } catch {
      setErrors({ _api: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {errors._api && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
          {errors._api}
        </div>
      )}
      <InputField label="Email" id="reg-email" error={errors.email}>
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="you@example.com"
        />
      </InputField>
      <InputField label="Username" id="reg-username" error={errors.username}>
        <input
          id="reg-username"
          type="text"
          required
          autoComplete="username"
          value={form.username}
          onChange={set('username')}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="cooluser42 or 🚀ninja"
        />
        <p className="text-xs text-gray-500">{[...form.username.trim()].length}/50 chars — emoji & special chars allowed</p>
      </InputField>
      <InputField label="Password" id="reg-password" error={errors.password}>
        <div className="relative">
          <input
            id="reg-password"
            type={showPass ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="••••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <PasswordStrength password={form.password} />
      </InputField>
      <InputField label="Confirm Password" id="reg-confirm" error={errors.confirm}>
        <div className="relative">
          <input
            id="reg-confirm"
            type={showConfirm ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="••••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            aria-label={showConfirm ? 'Hide' : 'Show'}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </InputField>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Language" id="reg-lang">
          <div className="relative">
            <select
              id="reg-lang"
              value={form.language}
              onChange={set('language')}
              className="w-full appearance-none bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </InputField>
        <InputField label="Region" id="reg-region" error={errors.region}>
          <div className="relative">
            <select
              id="reg-region"
              value={form.region}
              onChange={set('region')}
              className="w-full appearance-none bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Select…</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </InputField>
      </div>
      <div className="flex items-start gap-2">
        <input
          id="reg-terms"
          type="checkbox"
          checked={form.terms}
          onChange={set('terms')}
          className="mt-0.5 accent-purple-500"
        />
        <label htmlFor="reg-terms" className="text-sm text-gray-400">
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Privacy Policy</a>
        </label>
      </div>
      {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
      <SocialButtons />
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Request failed'); return; }
      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">📧</div>
        <h3 className="text-white font-semibold mb-1">Check your email</h3>
        <p className="text-gray-400 text-sm">We sent a password reset link to <strong className="text-white">{email}</strong></p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}
      <p className="text-gray-400 text-sm">Enter your email and we'll send you a reset link.</p>
      <InputField label="Email" id="forgot-email">
        <input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="you@example.com"
        />
      </InputField>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        {loading ? 'Sending…' : 'Send Reset Link'}
      </button>
    </form>
  );
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab);
  const backdropRef = useRef(null);

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  const tabLabels = { login: 'Sign In', register: 'Register', forgot: 'Forgot Password' };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-2xl">✦</span>
            <span className="text-lg font-bold text-white">Nexus AI Pro</span>
          </div>
          <p className="text-gray-400 text-sm">Military-grade encrypted AI platform</p>
        </div>

        <div className="flex border-b border-gray-700 px-6">
          {TABS.filter((t) => t !== 'forgot').map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 px-1 mr-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
          {tab === 'login' && (
            <>
              <LoginForm onSuccess={onSuccess} />
              <p className="mt-4 text-center text-sm text-gray-500">
                <button onClick={() => setTab('forgot')} className="text-purple-400 hover:underline">
                  Forgot your password?
                </button>
              </p>
            </>
          )}
          {tab === 'register' && <RegisterForm onSuccess={onSuccess} />}
          {tab === 'forgot' && (
            <>
              <ForgotForm />
              <p className="mt-4 text-center text-sm text-gray-500">
                <button onClick={() => setTab('login')} className="text-purple-400 hover:underline">
                  Back to sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
