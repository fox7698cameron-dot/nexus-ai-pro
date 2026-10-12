// Nexus AI Pro - AuthModal | 2026-10-12
import { useState, useCallback } from 'react';

const ROLES = ['user', 'moderator', 'developer', 'admin'];

const LABELS = {
  en: {
    login: 'Sign In', register: 'Register', email: 'Email', username: 'Username',
    password: 'Password', confirmPassword: 'Confirm Password', role: 'Role',
    biometric: 'Use Biometrics', totp: '2FA Code', sms: 'SMS Code',
    sendSms: 'Send SMS Code', phone: 'Phone Number', submit: 'Continue',
    orContinueWith: 'Or continue with', strength: 'Password strength',
    loading: 'Please wait...', scanQr: 'Scan with your authenticator app',
    retinal: 'Retinal scan (hardware required)',
  },
  es: {
    login: 'Iniciar sesión', register: 'Registrarse', email: 'Correo', username: 'Usuario',
    password: 'Contraseña', confirmPassword: 'Confirmar contraseña', role: 'Rol',
    biometric: 'Usar biometría', totp: 'Código 2FA', sms: 'Código SMS',
    sendSms: 'Enviar código SMS', phone: 'Teléfono', submit: 'Continuar',
    orContinueWith: 'O continuar con', strength: 'Fortaleza de contraseña',
    loading: 'Por favor espere...', scanQr: 'Escanea con tu app autenticadora',
    retinal: 'Escaneo retinal (requiere hardware)',
  },
};

function getLabel(key, locale) {
  return (LABELS[locale] ?? LABELS.en)[key] ?? (LABELS.en[key] ?? key);
}

function measurePasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 13) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function validatePassword(pw) {
  const errors = [];
  if (pw.length < 13) errors.push('At least 13 characters');
  if (!/[A-Z]/.test(pw)) errors.push('Uppercase letter');
  if (!/[a-z]/.test(pw)) errors.push('Lowercase letter');
  if (/^\s/.test(pw) || /\s$/.test(pw)) errors.push('No leading/trailing spaces');
  if (!/[0-9]/.test(pw)) errors.push('Number');
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('Special character or emoji');
  return errors;
}

function PasswordStrengthMeter({ password, locale }) {
  const score = measurePasswordStrength(password);
  const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-yellow-400', 'bg-green-500'];
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div>
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? colors[score - 1] : 'bg-gray-600'}`}
          />
        ))}
      </div>
      <div className="text-xs text-gray-400">{getLabel('strength', locale)}: <span>{labels[score - 1] ?? 'Very Weak'}</span></div>
    </div>
  );
}

async function requestBiometric(type) {
  if (type === 'retinal') {
    return { success: false, message: 'Retinal scan requires dedicated hardware' };
  }
  if (!window.PublicKeyCredential) {
    return { success: false, message: 'WebAuthn not supported in this browser' };
  }
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
      },
    });
    return { success: !!credential, credential };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export default function AuthModal({ onSuccess, onClose, locale = 'en' }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('user');
  const [step, setStep] = useState('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mfaMethod, setMfaMethod] = useState(null);
  const [totpQr, setTotpQr] = useState(null);

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    totpCode: '', smsCode: '', phone: '',
  });

  const setField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const pwErrors = mode === 'register' ? validatePassword(form.password) : [];
  const pwMatch = form.password === form.confirmPassword;

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (pwErrors.length > 0) {
        setError('Fix password requirements: ' + pwErrors.join(', '));
        return;
      }
      if (!pwMatch) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { username: form.username, password: form.password, role }
        : { username: form.username, email: form.email, password: form.password, role };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Authentication failed');
        return;
      }

      if (data.requiresMfa) {
        setMfaMethod(data.mfaMethod ?? 'totp');
        if (data.totpQr) setTotpQr(data.totpQr);
        setStep('mfa');
        return;
      }

      if (data.requiresBiometric) {
        setStep('biometric');
        return;
      }

      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          method: mfaMethod,
          code: mfaMethod === 'totp' ? form.totpCode : form.smsCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'MFA verification failed');
        return;
      }
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async (type) => {
    setLoading(true);
    setError(null);
    const result = await requestBiometric(type);
    if (!result.success) {
      setError(result.message ?? 'Biometric authentication failed');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, credentialId: result.credential?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Biometric verification failed');
        return;
      }
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendSmsCode = async () => {
    if (!form.phone) { setError('Enter your phone number first'); return; }
    try {
      await fetch('/api/auth/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: form.phone }),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? getLabel('login', locale) : getLabel('register', locale)}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex gap-1">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setStep('credentials'); setError(null); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                aria-pressed={mode === m}
              >
                {getLabel(m, locale)}
              </button>
            ))}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-white text-lg" aria-label="Close">✕</button>
          )}
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm" role="alert">
              {error}
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-3" noValidate>
              <div>
                <label className="text-sm text-gray-300 block mb-1" htmlFor="auth-role">
                  {getLabel('role', locale)}
                </label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-1" htmlFor="auth-username">
                  {getLabel('username', locale)}
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={e => setField('username', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="text-sm text-gray-300 block mb-1" htmlFor="auth-email">
                    {getLabel('email', locale)}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-gray-300 block mb-1" htmlFor="auth-password">
                  {getLabel('password', locale)}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                {mode === 'register' && <PasswordStrengthMeter password={form.password} locale={locale} />}
              </div>

              {mode === 'register' && (
                <div>
                  <label className="text-sm text-gray-300 block mb-1" htmlFor="auth-confirm">
                    {getLabel('confirmPassword', locale)}
                  </label>
                  <input
                    id="auth-confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={e => setField('confirmPassword', e.target.value)}
                    className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none ${!form.confirmPassword || pwMatch ? 'border-gray-600 focus:border-blue-500' : 'border-red-600'}`}
                  />
                  {form.confirmPassword && !pwMatch && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? getLabel('loading', locale) : getLabel('submit', locale)}
              </button>

              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-gray-500 text-xs">{getLabel('orContinueWith', locale)}</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['fingerprint', 'faceid', 'retinal'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleBiometric(type)}
                    disabled={loading}
                    className="py-2 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg text-xs text-gray-300 transition-colors disabled:opacity-50"
                    aria-label={`${type === 'fingerprint' ? 'Fingerprint' : type === 'faceid' ? 'Face ID / Touch ID' : 'Retinal scan'} authentication`}
                  >
                    {type === 'fingerprint' ? '🖐' : type === 'faceid' ? '👤' : '👁'}
                    <div className="mt-0.5">
                      {type === 'fingerprint' ? 'Fingerprint' : type === 'faceid' ? 'Face/Touch' : 'Retinal'}
                    </div>
                  </button>
                ))}
              </div>
            </form>
          )}

          {step === 'mfa' && (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="flex gap-2 mb-2">
                {['totp', 'sms'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMfaMethod(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${mfaMethod === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                    aria-pressed={mfaMethod === m}
                  >
                    {m === 'totp' ? 'Authenticator App' : 'SMS'}
                  </button>
                ))}
              </div>

              {mfaMethod === 'totp' && (
                <>
                  {totpQr && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-2">{getLabel('scanQr', locale)}</p>
                      <img src={totpQr} alt="TOTP QR code" className="w-40 h-40 mx-auto rounded-lg" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-300 block mb-1" htmlFor="auth-totp">
                      {getLabel('totp', locale)}
                    </label>
                    <input
                      id="auth-totp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={form.totpCode}
                      onChange={e => setField('totpCode', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none tracking-widest text-center text-lg"
                      placeholder="000000"
                    />
                  </div>
                </>
              )}

              {mfaMethod === 'sms' && (
                <>
                  <div>
                    <label className="text-sm text-gray-300 block mb-1" htmlFor="auth-phone">
                      {getLabel('phone', locale)}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="auth-phone"
                        type="tel"
                        value={form.phone}
                        onChange={e => setField('phone', e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        placeholder="+1 555 000 0000"
                      />
                      <button
                        type="button"
                        onClick={sendSmsCode}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs whitespace-nowrap transition-colors"
                      >
                        {getLabel('sendSms', locale)}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 block mb-1" htmlFor="auth-sms">
                      {getLabel('sms', locale)}
                    </label>
                    <input
                      id="auth-sms"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      required
                      value={form.smsCode}
                      onChange={e => setField('smsCode', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none tracking-widest text-center"
                      placeholder="00000000"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? getLabel('loading', locale) : 'Verify'}
              </button>
            </form>
          )}

          {step === 'biometric' && (
            <div className="space-y-3 text-center">
              <p className="text-gray-300 text-sm">Choose a biometric method to continue</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { type: 'fingerprint', label: 'Fingerprint', icon: '🖐', desc: 'Touch fingerprint sensor' },
                  { type: 'faceid', label: 'Face ID / Touch ID', icon: '👤', desc: 'Look at camera or touch sensor' },
                  { type: 'retinal', label: 'Retinal Scan', icon: '👁', desc: getLabel('retinal', locale) },
                ].map(({ type, label, icon, desc }) => (
                  <button
                    key={type}
                    onClick={() => handleBiometric(type)}
                    disabled={loading}
                    className="flex items-center gap-3 w-full p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors disabled:opacity-50"
                    aria-label={label}
                  >
                    <span className="text-2xl">{icon}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
