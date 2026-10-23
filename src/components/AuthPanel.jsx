// src/components/AuthPanel.jsx
// 2026-10-23 - Authentication UI: Sign In, Register, MFA Setup
// All API calls go to /api/auth/* - no hardcoded credentials

import React, { useState, useCallback } from 'react';
import { Shield, Eye, EyeOff, Fingerprint, ScanFace, Smartphone, Check, X, User } from 'lucide-react';
import { t, detectLang, LANGUAGES } from '../i18n/translations.js';

// ─── Password strength calculator ────────────────────────────────────────────
function calcStrength(pw) {
  let score = 0;
  if (pw.length >= 13) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];

function PasswordStrengthMeter({ password, lang }) {
  const score = calcStrength(password);
  const reqs = [
    { met: password.length >= 13, text: '13+ characters' },
    { met: /[A-Z]/.test(password), text: 'Uppercase' },
    { met: /[a-z]/.test(password), text: 'Lowercase' },
    { met: /[0-9]/.test(password), text: 'Number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'Special char' },
  ];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? STRENGTH_COLORS[score - 1] : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      {password.length > 0 && (
        <p className="text-xs text-gray-500">{t('auth.passwordStrength', lang)}: {STRENGTH_LABELS[score - 1] || 'Very Weak'}</p>
      )}
      <ul className="grid grid-cols-2 gap-1">
        {reqs.map(r => (
          <li key={r.text} className={`flex items-center gap-1 text-xs ${r.met ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            {r.met ? <Check size={10} /> : <X size={10} />} {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── TOTP QR placeholder ──────────────────────────────────────────────────────
function QrPlaceholder({ otpauthUrl }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white border rounded-lg">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="QR Code placeholder">
        <rect width="120" height="120" fill="white"/>
        {[...Array(9)].map((_, r) => [...Array(9)].map((_, c) => (
          <rect key={`${r}-${c}`} x={10 + c*11} y={10 + r*11} width={9} height={9}
            fill={((r + c + (r * c)) % 3 === 0) ? '#000' : '#fff'} />
        )))}
        <rect x="10" y="10" width="29" height="29" fill="none" stroke="#000" strokeWidth="3"/>
        <rect x="81" y="10" width="29" height="29" fill="none" stroke="#000" strokeWidth="3"/>
        <rect x="10" y="81" width="29" height="29" fill="none" stroke="#000" strokeWidth="3"/>
      </svg>
      <p className="text-xs text-gray-500 text-center break-all max-w-[200px]">{otpauthUrl}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * @param {{ onAuthSuccess: (data: object) => void, initialTab?: string }} props
 */
export default function AuthPanel({ onAuthSuccess, initialTab = 'signin' }) {
  const [tab, setTab] = useState(initialTab);
  const [lang, setLang] = useState(detectLang());
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPw, setSignInPw] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);

  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPw, setRegPw] = useState('');
  const [regPwConfirm, setRegPwConfirm] = useState('');

  // MFA state
  const [totpSecret, setTotpSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [enrolledDevices, setEnrolledDevices] = useState([]);
  const [newDeviceName, setNewDeviceName] = useState('');

  // Auth token for MFA calls
  const [authToken, setAuthToken] = useState('');

  const apiCall = useCallback(async (path, body, method = 'POST', token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/auth${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { email: signInEmail, password: signInPw };
      if (needs2FA) body.totpToken = totpCode;
      const data = await apiCall('/login', body);
      if (data.requires2FA) {
        setNeeds2FA(true);
        setLoading(false);
        return;
      }
      setAuthToken(data.accessToken);
      onAuthSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regPw !== regPwConfirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await apiCall('/register', { username: regUsername, email: regEmail, password: regPw, locale: lang });
      setMessage('Account created! Please sign in.');
      setTab('signin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupTotp = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiCall('/totp/setup', {}, 'POST', authToken);
      setTotpSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    setError('');
    setLoading(true);
    try {
      await apiCall('/totp/verify', { token: verifyToken }, 'POST', authToken);
      setMessage('2FA enabled successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollBiometric = async (type) => {
    setLoading(true);
    try {
      await apiCall('/biometric/enroll', { type }, 'POST', authToken);
      setMessage(`${type} enrolled`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) return;
    setLoading(true);
    try {
      const data = await apiCall('/mfa/device', { deviceName: newDeviceName }, 'POST', authToken);
      setEnrolledDevices(prev => [...prev, data.device]);
      setNewDeviceName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';
  const btnCls = 'w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 flex items-center gap-3">
          <Shield size={28} className="text-white" />
          <div>
            <h1 className="text-white font-bold text-lg">Nexus AI Pro</h1>
            <p className="text-blue-200 text-xs">Secure Access</p>
          </div>
          <div className="ml-auto">
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="text-xs bg-white/20 text-white border-none rounded-md px-2 py-1 cursor-pointer">
              {Object.entries(LANGUAGES).map(([code, l]) => (
                <option key={code} value={code}>{l.flag} {l.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {['signin', 'register', 'mfa'].map(tabId => (
            <button key={tabId} onClick={() => { setTab(tabId); setError(''); setMessage(''); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === tabId ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              {tabId === 'signin' ? t('auth.signIn', lang) : tabId === 'register' ? t('auth.register', lang) : t('auth.mfaSetup', lang)}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
          {message && <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{message}</div>}

          {/* ── Sign In ── */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.email', lang)}</label>
                <input type="email" value={signInEmail} onChange={e => setSignInEmail(e.target.value)}
                  className={inputCls} placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.password', lang)}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={signInPw} onChange={e => setSignInPw(e.target.value)}
                    className={`${inputCls} pr-10`} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {needs2FA && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.totpCode', lang)}</label>
                  <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)}
                    className={inputCls} placeholder="000000" maxLength={6} pattern="\d{6}" />
                </div>
              )}
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? t('common.loading', lang) : t('auth.signIn', lang)}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleEnrollBiometric('fingerprint')}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1 transition-colors">
                  <Fingerprint size={14} /> {t('auth.biometric', lang)}
                </button>
                <button type="button" onClick={() => handleEnrollBiometric('faceId')}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1 transition-colors">
                  <ScanFace size={14} /> Face ID
                </button>
              </div>
            </form>
          )}

          {/* ── Register ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.username', lang)} <span className="text-gray-400">({regUsername.length}/30)</span>
                </label>
                <input type="text" value={regUsername} onChange={e => setRegUsername(e.target.value)}
                  className={inputCls} placeholder="YourName 🚀" maxLength={30} required />
                <p className="text-xs text-gray-400 mt-1">Supports letters, numbers, emoji, ._- (3–30 chars)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.email', lang)}</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  className={inputCls} required autoComplete="email" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.password', lang)}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={regPw} onChange={e => setRegPw(e.target.value)}
                    className={`${inputCls} pr-10`} required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={regPw} lang={lang} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.confirmPassword', lang)}</label>
                <input type={showPw ? 'text' : 'password'} value={regPwConfirm} onChange={e => setRegPwConfirm(e.target.value)}
                  className={`${inputCls} ${regPwConfirm && regPwConfirm !== regPw ? 'border-red-400' : ''}`} required />
                {regPwConfirm && regPwConfirm !== regPw && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <User size={14} /> Role: {t('auth.role.user', lang)} (elevated by admin)
              </div>
              <button type="submit" disabled={loading || calcStrength(regPw) < 5} className={btnCls}>
                {loading ? t('common.loading', lang) : t('auth.register', lang)}
              </button>
            </form>
          )}

          {/* ── MFA Setup ── */}
          {tab === 'mfa' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">TOTP / Authenticator App</h3>
                <button onClick={handleSetupTotp} disabled={loading || !authToken}
                  className="w-full py-2 border border-blue-500 text-blue-600 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50">
                  {t('auth.scanQr', lang)}
                </button>
                {!authToken && <p className="text-xs text-gray-400">Sign in first to set up 2FA</p>}
                {otpauthUrl && (
                  <div className="space-y-3">
                    <QrPlaceholder otpauthUrl={otpauthUrl} />
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.manualEntry', lang)}</label>
                      <code className="block text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">{totpSecret}</code>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={verifyToken} onChange={e => setVerifyToken(e.target.value)}
                        placeholder="6-digit code" maxLength={6} className={`${inputCls} flex-1`} />
                      <button onClick={handleVerifyTotp} disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                        {t('common.save', lang)}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Biometrics</h3>
                <div className="flex gap-2">
                  {[
                    { type: 'fingerprint', icon: <Fingerprint size={14} />, label: 'Fingerprint' },
                    { type: 'faceId',      icon: <ScanFace size={14} />,    label: 'Face ID' },
                    { type: 'retinal',     icon: <Shield size={14} />,      label: 'Retinal' },
                  ].map(b => (
                    <button key={b.type} onClick={() => handleEnrollBiometric(b.type)} disabled={loading || !authToken}
                      className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1 transition-colors disabled:opacity-50">
                      {b.icon} {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">MFA Devices</h3>
                {enrolledDevices.length === 0 ? (
                  <p className="text-xs text-gray-400">No devices enrolled</p>
                ) : (
                  <ul className="space-y-1">
                    {enrolledDevices.map(d => (
                      <li key={d.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <Smartphone size={12} /> {d.name}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)}
                    placeholder="Device name" className={`${inputCls} flex-1`} />
                  <button onClick={handleAddDevice} disabled={loading || !authToken || !newDeviceName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {t('auth.enrollDevice', lang)}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
