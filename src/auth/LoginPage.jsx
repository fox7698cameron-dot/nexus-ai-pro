// 2026-07-20
import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth.jsx';
import BiometricAuth from './BiometricAuth.jsx';

function SocialButton({ icon, labelKey }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      disabled
      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-gray-700 bg-gray-800 text-gray-400 text-sm font-medium cursor-not-allowed opacity-60 hover:opacity-70 transition-opacity"
    >
      <span className="text-lg">{icon}</span>
      {t(labelKey)}
    </button>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password, mfaRequired ? mfaCode : null);

      if (data.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      const role = data.user?.role || 'user';
      const roleRoutes = {
        admin: '/dashboard/admin',
        dev: '/dashboard/dev',
        moderator: '/dashboard/moderator',
        user: '/dashboard',
      };
      navigate(roleRoutes[role] || '/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('mfa') || msg.toLowerCase().includes('token')) {
        setError(t('auth.errorMFA'));
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
        setError(t('auth.errorInvalidCredentials'));
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        setError(t('auth.errorNetwork'));
      } else {
        setError(t('auth.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, mfaCode, mfaRequired, login, navigate, t]);

  const handleBiometricSuccess = useCallback((data) => {
    if (data.user) {
      const role = data.user.role || 'user';
      const roleRoutes = {
        admin: '/dashboard/admin',
        dev: '/dashboard/dev',
        moderator: '/dashboard/moderator',
        user: '/dashboard',
      };
      navigate(roleRoutes[role] || '/dashboard', { replace: true });
    }
  }, [navigate]);

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
          className="rounded-2xl p-8 space-y-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
        >
          <h2 className="text-xl font-semibold text-white">{t('auth.login')}</h2>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-900/30 border border-red-800/50 px-4 py-3">
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={mfaRequired}
                placeholder="you@example.com"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={mfaRequired}
                  className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors disabled:opacity-50"
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
            </div>

            {mfaRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('auth.mfaCode')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  placeholder="000000"
                  className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">{t('auth.mfaPrompt')}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 accent-purple-600"
                />
                <span className="text-sm text-gray-400">{t('auth.rememberMe')}</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                boxShadow: loading ? 'none' : '0 0 20px rgba(124,58,237,0.3)',
              }}
            >
              {loading ? t('auth.signingIn') : t('auth.login')}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-transparent px-3 text-xs text-gray-500">{t('auth.orContinueWith')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <SocialButton icon="G" labelKey="auth.socialGoogle" />
            <div className="grid grid-cols-2 gap-2">
              <SocialButton icon="⌥" labelKey="auth.socialGitHub" />
              <SocialButton icon="◈" labelKey="auth.socialDiscord" />
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowBiometric((s) => !s)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {t('auth.biometric')}
            </button>
            {showBiometric && (
              <BiometricAuth
                mode="authenticate"
                onSuccess={handleBiometricSuccess}
                onError={() => setError(t('auth.errorGeneric'))}
              />
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            {t('auth.registerNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
