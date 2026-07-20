// 2026-07-20
import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth.jsx';
import PasswordStrength, { checkRequirements, computeScore } from './PasswordStrength.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import i18n from '../i18n/index.js';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    language: i18n.language?.split('-')[0] || 'en',
    role: 'user',
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  }, []);

  const handleLanguageChange = useCallback((e) => {
    const lang = e.target.value;
    update('language', lang);
    i18n.changeLanguage(lang);
  }, [update]);

  const validate = useCallback(() => {
    const reqs = checkRequirements(form.password);
    const score = computeScore(reqs);

    if (!form.displayName.trim()) return t('auth.displayName') + ' is required';
    if (!form.email.trim()) return t('auth.email') + ' is required';
    if (score < 5) return t('auth.passwordRequirements');
    if (form.password !== form.confirmPassword) return t('auth.confirmPassword') + ' does not match';
    if (!form.acceptTerms) return t('auth.termsAccept') + ' ' + t('auth.termsLink');
    return null;
  }, [form, t]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        role: form.role,
        language: form.language,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('exist')) {
        setError('An account with this email already exists');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        setError(t('auth.errorNetwork'));
      } else {
        setError(err.message || t('auth.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  }, [form, validate, register, navigate, t]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1028 50%, #0d1117 100%)' }}
    >
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            <span className="text-3xl">⬡</span>
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Nexus AI Pro
          </h1>
          <p className="mt-1 text-gray-400 text-sm">{t('auth.nexusTagline')}</p>
        </div>

        <div
          className="rounded-2xl p-8 space-y-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
        >
          <h2 className="text-xl font-semibold text-white">{t('auth.register')}</h2>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-900/30 border border-red-800/50 px-4 py-3">
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.displayName')}
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                required
                autoComplete="name"
                placeholder="Alex 🚀 or 李华"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500">Emoji and special characters welcome</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                  className={[
                    'w-full bg-gray-800/80 border rounded-xl px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors',
                    form.confirmPassword && form.confirmPassword !== form.password
                      ? 'border-red-600 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-purple-500 focus:ring-purple-500',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('auth.selectLanguage')}
                </label>
                <select
                  value={form.language}
                  onChange={handleLanguageChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('auth.selectRole')}
                </label>
                <select
                  value={form.role}
                  disabled
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-400 text-sm cursor-not-allowed"
                >
                  <option value="user">{t('auth.roleUser')}</option>
                </select>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => update('acceptTerms', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800 accent-purple-600 focus:ring-purple-500 focus:ring-offset-0"
              />
              <span className="text-sm text-gray-400">
                {t('auth.termsAccept')}{' '}
                <Link to="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
                  {t('auth.termsLink')}
                </Link>{' '}
                {t('auth.and')}{' '}
                <Link to="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">
                  {t('auth.privacyLink')}
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !form.acceptTerms}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading || !form.acceptTerms ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                boxShadow: loading || !form.acceptTerms ? 'none' : '0 0 20px rgba(124,58,237,0.3)',
              }}
            >
              {loading ? t('auth.creating') : t('auth.register')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            {t('auth.signInNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
