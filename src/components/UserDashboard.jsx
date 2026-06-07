// src/components/UserDashboard.jsx | Nexus AI Pro | Date: 2026-06-07

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Spinner({ color = 'border-indigo-500' }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className={`w-7 h-7 border-4 ${color} border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <svg className="w-9 h-9 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Password Strength Meter ───────────────────────────────────────────────────

function PasswordStrengthMeter({ password }) {
  const MIN_LEN = 13;
  const checks = [
    { label: `At least ${MIN_LEN} characters`, met: password.length >= MIN_LEN },
    { label: 'Uppercase letter',               met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',               met: /[a-z]/.test(password) },
    { label: 'Number',                         met: /[0-9]/.test(password) },
    { label: 'Special character',              met: /[^A-Za-z0-9]/.test(password) },
  ];
  const metCount = checks.filter(c => c.met).length;
  const strength = metCount <= 1 ? 'Weak' : metCount <= 3 ? 'Fair' : metCount === 4 ? 'Good' : 'Strong';
  const strengthColor = {
    Weak:   'bg-red-500',
    Fair:   'bg-yellow-500',
    Good:   'bg-blue-500',
    Strong: 'bg-green-500',
  }[strength];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 flex gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors duration-300 ${i <= metCount ? strengthColor : 'bg-transparent'}`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold ${strengthColor.replace('bg-', 'text-')}`}>{strength}</span>
      </div>
      {/* Checklist */}
      <ul className="space-y-1">
        {checks.map(c => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {c.met
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              }
            </svg>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

const TIER_STYLES = {
  free:       'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pro:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  enterprise: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
};

function ProfileSection({ userId, authToken, user: propUser }) {
  const [profile, setProfile]     = useState(propUser ?? null);
  const [loading, setLoading]     = useState(!propUser);
  const [error, setError]         = useState(null);
  const [editName, setEditName]   = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProfile(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, authToken]);

  useEffect(() => {
    if (!propUser) fetchProfile();
    else setProfile(propUser);
  }, [propUser, fetchProfile]);

  useEffect(() => {
    if (profile) setNameValue(profile.displayName ?? '');
  }, [profile]);

  async function saveName() {
    if (!nameValue.trim() || nameValue === profile?.displayName) { setEditName(false); return; }
    setSavingName(true);
    try {
      const res = await fetch(`/api/users/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ displayName: nameValue.trim() }),
      });
      if (!res.ok) throw new Error();
      setProfile(p => ({ ...p, displayName: nameValue.trim() }));
      setEditName(false);
    } catch {
      setNameValue(profile?.displayName ?? '');
    } finally {
      setSavingName(false);
    }
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch(`/api/users/${userId}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: form,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(p => ({ ...p, avatarUrl: data.avatarUrl ?? data.url }));
    } catch {
      // silent
    } finally {
      setAvatarUploading(false);
    }
  }

  const initials = (profile?.displayName ?? profile?.email ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const tier = profile?.subscriptionTier ?? profile?.tier ?? 'free';

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} onRetry={fetchProfile} />;
  if (!profile) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow transition-colors disabled:opacity-50"
            title="Upload avatar"
          >
            {avatarUploading
              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            }
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {editName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditName(false); setNameValue(profile.displayName ?? ''); } }}
                  autoFocus
                  className="text-xl font-bold px-2 py-0.5 border border-indigo-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={saveName} disabled={savingName} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">{savingName ? '…' : 'Save'}</button>
                <button onClick={() => { setEditName(false); setNameValue(profile.displayName ?? ''); }} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setEditName(true)} className="group flex items-center gap-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {profile.displayName || 'Set your name'}
                </h2>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TIER_STYLES[tier] ?? TIER_STYLES.free}`}>
              {tier}
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.email}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Member since {fmtDate(profile.createdAt ?? profile.memberSince)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Account Settings (Password Change) ──────────────────────────────────────

function AccountSettings({ userId, authToken }) {
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showNew, setShowNew]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState(null);

  const MIN_LEN = 13;
  const checks = [
    newPw.length >= MIN_LEN,
    /[A-Z]/.test(newPw),
    /[a-z]/.test(newPw),
    /[0-9]/.test(newPw),
    /[^A-Za-z0-9]/.test(newPw),
  ];
  const allMet = checks.every(Boolean) && newPw === confirmPw;

  async function changePassword(e) {
    e.preventDefault();
    if (!allMet) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Change failed.');
      setResult({ ok: true, message: 'Password changed successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) {
      setResult({ ok: false, message: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <h2 className="font-semibold text-gray-900 dark:text-white">Change Password</h2>

      <form onSubmit={changePassword} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
          <input
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showNew ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          <PasswordStrengthMeter password={newPw} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            required
            autoComplete="new-password"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              confirmPw && confirmPw !== newPw
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
            }`}
          />
          {confirmPw && confirmPw !== newPw && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
          )}
        </div>

        {result && (
          <div className={`px-3 py-2 rounded-lg text-sm ${result.ok ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={!allMet || saving}
          className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Changing…' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

// ─── Security Settings (2FA + Sessions) ──────────────────────────────────────

function SecuritySettings({ userId, authToken }) {
  const [security, setSecurity]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [qrCode, setQrCode]       = useState(null);
  const [totpCode, setTotpCode]   = useState('');
  const [verifying, setVerifying] = useState(false);
  const [togglingBio, setTogglingBio] = useState(false);
  const [sessions, setSessions]   = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSession, setRevokingSession] = useState(null);

  const fetchSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/security`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSecurity(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, authToken]);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/sessions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data.sessions ?? data);
    } catch {
      // silent
    } finally {
      setSessionsLoading(false);
    }
  }, [userId, authToken]);

  useEffect(() => {
    fetchSecurity();
    fetchSessions();
  }, [fetchSecurity, fetchSessions]);

  async function enable2FA() {
    try {
      const res = await fetch(`/api/users/${userId}/2fa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQrCode(data.qrCode ?? data.qrDataURL ?? data.image);
    } catch {
      // silent
    }
  }

  async function verify2FA() {
    if (totpCode.length < 6) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/users/${userId}/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ code: totpCode }),
      });
      if (!res.ok) throw new Error();
      setSecurity(s => ({ ...s, twoFactorEnabled: true }));
      setQrCode(null);
      setTotpCode('');
    } catch {
      // silent
    } finally {
      setVerifying(false);
    }
  }

  async function disable2FA() {
    try {
      const res = await fetch(`/api/users/${userId}/2fa`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
      setSecurity(s => ({ ...s, twoFactorEnabled: false }));
    } catch {
      // silent
    }
  }

  async function toggleBiometric() {
    setTogglingBio(true);
    const next = !security?.biometricEnabled;
    try {
      const res = await fetch(`/api/users/${userId}/biometric`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      setSecurity(s => ({ ...s, biometricEnabled: next }));
    } catch {
      // silent
    } finally {
      setTogglingBio(false);
    }
  }

  async function revokeSession(sessionId) {
    setRevokingSession(sessionId);
    try {
      const res = await fetch(`/api/users/${userId}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
      setSessions(s => s.filter(se => se.id !== sessionId));
    } catch {
      // silent
    } finally {
      setRevokingSession(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* 2FA */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h2>

        {loading ? <Spinner /> : error ? (
          <ErrorState message={error} onRetry={fetchSecurity} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Authenticator App (TOTP)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {security?.twoFactorEnabled ? 'Two-factor authentication is enabled.' : 'Add an extra layer of security.'}
                </p>
              </div>
              {security?.twoFactorEnabled ? (
                <button onClick={disable2FA} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Disable
                </button>
              ) : (
                <button onClick={enable2FA} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                  Enable
                </button>
              )}
            </div>

            {/* QR Setup Flow */}
            {qrCode && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">Scan this QR code with your authenticator app:</p>
                <img src={qrCode} alt="QR Code for 2FA" className="w-40 h-40 bg-white p-2 rounded-lg mx-auto" />
                <div className="flex gap-2">
                  <input
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest"
                  />
                  <button
                    onClick={verify2FA}
                    disabled={totpCode.length < 6 || verifying}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {verifying ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

            {/* Biometric */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Biometric Authentication</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Use Face ID / fingerprint to sign in.</p>
              </div>
              <button
                onClick={toggleBiometric}
                disabled={togglingBio}
                className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${security?.biometricEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'} ${togglingBio ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${security?.biometricEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Active Sessions</h2>
        {sessionsLoading ? <Spinner /> : sessions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div key={s.id ?? i} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.device ?? s.userAgent?.slice(0, 40) ?? 'Unknown device'}</p>
                    {s.current && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">Current</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {s.ip ?? '—'} · Last active {fmtDateTime(s.lastActive ?? s.updatedAt)}
                  </p>
                </div>
                {!s.current && (
                  <button
                    onClick={() => revokeSession(s.id)}
                    disabled={revokingSession === s.id}
                    className="text-xs px-2 py-1 rounded font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {revokingSession === s.id ? 'Revoking…' : 'Revoke'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subscription Card ────────────────────────────────────────────────────────

function SubscriptionCard({ userId, authToken }) {
  const [sub, setSub]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchSub = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/subscription`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSub(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, authToken]);

  useEffect(() => { fetchSub(); }, [fetchSub]);

  // Mock billing history for display (real data from API if available)
  const billingHistory = sub?.billingHistory ?? [
    { id: 'inv-1', date: '2026-05-01', amount: 0, description: 'Free Plan' },
  ];

  const tier = sub?.tier ?? sub?.plan ?? 'free';
  const tierLabel = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }[tier] ?? tier;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <h2 className="font-semibold text-gray-900 dark:text-white">Subscription</h2>

      {loading ? <Spinner /> : error ? (
        <ErrorState message={error} onRetry={fetchSub} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Plan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{tierLabel}</p>
              {sub?.renewsAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Renews {fmtDate(sub.renewsAt)}</p>
              )}
            </div>
            {tier !== 'enterprise' && (
              <a
                href="/upgrade"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
              >
                Upgrade
              </a>
            )}
          </div>

          {/* Billing History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Billing History</h3>
            {billingHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No billing history yet.</p>
            ) : (
              <div className="space-y-2">
                {billingHistory.map((inv, i) => (
                  <div key={inv.id ?? i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{inv.description ?? 'Invoice'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(inv.date)}</p>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {inv.amount === 0 ? 'Free' : `$${(inv.amount / 100).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Connected Accounts ───────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    icon: '🎵' },
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'facebook',  label: 'Facebook',  icon: '👤' },
  { id: 'twitter',   label: 'X (Twitter)', icon: '🐦' },
  { id: 'github',    label: 'GitHub',    icon: '🐙' },
  { id: 'discord',   label: 'Discord',   icon: '🎮' },
  { id: 'steam',     label: 'Steam',     icon: '🎲' },
  { id: 'twitch',    label: 'Twitch',    icon: '📺' },
];

function ConnectedAccounts({ userId, authToken }) {
  const [connections, setConnections] = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [toggling, setToggling]       = useState(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/connections`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConnections(data.connections ?? data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, authToken]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  async function toggleConnection(platformId, connected) {
    setToggling(platformId);
    try {
      if (connected) {
        const res = await fetch(`/api/users/${userId}/connections/${platformId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error();
        setConnections(c => ({ ...c, [platformId]: null }));
      } else {
        // In a real app this would redirect to OAuth; we call the connect endpoint
        const res = await fetch(`/api/users/${userId}/connections/${platformId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          setConnections(c => ({ ...c, [platformId]: data }));
        }
      }
    } catch {
      // silent
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <h2 className="font-semibold text-gray-900 dark:text-white">Connected Accounts</h2>

      {loading ? <Spinner /> : error ? (
        <ErrorState message={error} onRetry={fetchConnections} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL_PLATFORMS.map(p => {
            const conn = connections[p.id];
            const connected = !!conn;
            const isToggling = toggling === p.id;
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{p.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.label}</p>
                    {connected && conn?.username && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{conn.username}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleConnection(p.id, connected)}
                  disabled={isToggling}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex-shrink-0 ${
                    connected
                      ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isToggling ? '…' : connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Notification Preferences ─────────────────────────────────────────────────

const NOTIFICATION_EVENTS = [
  { key: 'newMessage',       label: 'New messages' },
  { key: 'mentions',         label: 'Mentions & replies' },
  { key: 'security',         label: 'Security alerts' },
  { key: 'billing',          label: 'Billing updates' },
  { key: 'productUpdates',   label: 'Product updates' },
  { key: 'weeklyDigest',     label: 'Weekly digest' },
];

function NotificationPreferences({ userId, authToken }) {
  const [prefs, setPrefs]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(null);

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPrefs(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, authToken]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  async function toggle(eventKey, channel) {
    const key = `${eventKey}_${channel}`;
    const current = prefs?.[eventKey]?.[channel] ?? false;
    setSaving(key);
    const optimistic = {
      ...prefs,
      [eventKey]: { ...(prefs?.[eventKey] ?? {}), [channel]: !current },
    };
    setPrefs(optimistic);
    try {
      const res = await fetch(`/api/users/${userId}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ event: eventKey, channel, enabled: !current }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPrefs(prefs); // rollback
    } finally {
      setSaving(null);
    }
  }

  const channels = ['email', 'push', 'inApp'];
  const channelLabels = { email: 'Email', push: 'Push', inApp: 'In-App' };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
      </div>

      {loading ? <Spinner /> : error ? (
        <div className="p-6"><ErrorState message={error} onRetry={fetchPrefs} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                {channels.map(ch => (
                  <th key={ch} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {channelLabels[ch]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {NOTIFICATION_EVENTS.map(ev => (
                <tr key={ev.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-800 dark:text-gray-200">{ev.label}</td>
                  {channels.map(ch => {
                    const enabled   = prefs?.[ev.key]?.[ch] ?? false;
                    const isSaving  = saving === `${ev.key}_${ch}`;
                    return (
                      <td key={ch} className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggle(ev.key, ch)}
                          disabled={isSaving}
                          className={`mx-auto relative w-9 h-5 rounded-full transition-colors duration-200 ${enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'} ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Privacy Settings ─────────────────────────────────────────────────────────

function PrivacySettings({ userId, authToken }) {
  const [exporting, setExporting]   = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [deleteInput, setDeleteInput]   = useState('');

  async function requestExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/users/${userId}/data-export`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
      // If the response is a direct download
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
        }
      } else {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `nexus-ai-pro-data-export-${userId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setExportDone(true);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
      window.location.href = '/';
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Data Export */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Data Export (GDPR)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Download a copy of all your personal data stored by Nexus AI Pro. Your data will be packaged as a JSON file.
        </p>
        {exportDone && (
          <p className="text-sm text-green-600 dark:text-green-400">Export started. Check your email or downloads for your data package.</p>
        )}
        <button
          onClick={requestExport}
          disabled={exporting}
          className="px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50"
        >
          {exporting ? 'Preparing export…' : 'Export My Data'}
        </button>
      </div>

      {/* Delete Account */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-6 space-y-3">
        <h2 className="font-semibold text-red-600 dark:text-red-400">Delete Account</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Type <span className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">DELETE</span> to confirm:
            </p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
            />
            <div className="flex gap-3">
              <button
                onClick={deleteAccount}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
              <button
                onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserDashboard({ userId, theme, authToken, user }) {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile',       label: 'Profile' },
    { id: 'security',      label: 'Security' },
    { id: 'subscription',  label: 'Subscription' },
    { id: 'connections',   label: 'Connected Accounts' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'privacy',       label: 'Privacy' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your Nexus AI Pro account</p>
        </div>

        {/* Profile (always visible at top) */}
        <ProfileSection userId={userId} authToken={authToken} user={user} />

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-0.5 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'profile' && (
            <AccountSettings userId={userId} authToken={authToken} />
          )}
          {activeTab === 'security' && (
            <SecuritySettings userId={userId} authToken={authToken} />
          )}
          {activeTab === 'subscription' && (
            <SubscriptionCard userId={userId} authToken={authToken} />
          )}
          {activeTab === 'connections' && (
            <ConnectedAccounts userId={userId} authToken={authToken} />
          )}
          {activeTab === 'notifications' && (
            <NotificationPreferences userId={userId} authToken={authToken} />
          )}
          {activeTab === 'privacy' && (
            <PrivacySettings userId={userId} authToken={authToken} />
          )}
        </div>

      </div>
    </div>
  );
}
