// ================================================
// NEXUS AI PRO - User Dashboard
// File: src/components/UserDashboard.jsx
// Updated: 2026-07-01
// Features: profile, subscription, connected
//           accounts, security, language prefs
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Crown, Shield, Globe, Link, Link2Off,
  Settings, LogOut, Bell, Key, QrCode, Smartphone,
  Check, X, ChevronRight, Loader2, AlertTriangle,
  CreditCard, RefreshCw, Edit3, Save,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'sv', label: 'Svenska' },
  { code: 'pl', label: 'Polski' },
];

const PLAN_LABELS = {
  free:               { label: 'Free',               color: 'text-gray-500' },
  pro_monthly:        { label: 'Pro (monthly)',       color: 'text-blue-600' },
  pro_yearly:         { label: 'Pro (yearly)',        color: 'text-blue-700' },
  enterprise_monthly: { label: 'Enterprise (monthly)',color: 'text-purple-600' },
  enterprise_yearly:  { label: 'Enterprise (yearly)', color: 'text-purple-700' },
};

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <Icon size={16} className="text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function UserDashboard({ onLogout }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ username: '', language: 'en', region: '' });
  const [qrCode, setQrCode] = useState(null);
  const [totpToken, setTotpToken] = useState('');
  const [totpSecret, setTotpSecret] = useState(null);
  const [biometricSupported, setBiometricSupported] = useState(false);

  const token = () => localStorage.getItem('nexus_access_token');
  const hdr   = () => ({ Authorization: `Bearer ${token()}` });

  const flash = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(''); }, 4000);
  };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/auth/me', { headers: hdr() }),
        fetch('/api/subscriptions/current', { headers: hdr() }).catch(() => ({ ok: false })),
      ]);
      if (pRes.ok) { const d = await pRes.json(); setProfile(d.user); setForm({ username: d.user.username || '', language: d.user.language || 'en', region: d.user.region || '' }); }
      if (sRes.ok) { const d = await sRes.json(); setSubscription(d.subscription); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    setBiometricSupported(!!(window.PublicKeyCredential));
  }, [fetchProfile]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetchProfile();
      setEditMode(false);
      flash('Profile updated.');
    } catch (err) {
      flash(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const setup2FA = async () => {
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST', headers: hdr() });
    if (res.ok) { const d = await res.json(); setQrCode(d.qrCode); setTotpSecret(d.secret); }
  };

  const verify2FA = async () => {
    if (totpToken.length !== 6) return;
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdr() },
      body: JSON.stringify({ token: totpToken, secret: totpSecret }),
    });
    if (res.ok) { flash('Two-factor authentication enabled.'); setQrCode(null); setTotpToken(''); await fetchProfile(); }
    else flash('Invalid code — try again.', true);
  };

  const startBiometric = async () => {
    try {
      const cRes = await fetch('/api/auth/biometrics/challenge', { method: 'POST', headers: hdr() });
      const { challenge } = await cRes.json();
      const encoded = Uint8Array.from(atob(challenge), c => c.charCodeAt(0));
      const credential = await navigator.credentials.get({
        publicKey: { challenge: encoded, rpId: window.location.hostname, userVerification: 'required', timeout: 60000 },
      });
      const vRes = await fetch('/api/auth/biometrics/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ credentialId: credential.id, challenge }),
      });
      if (vRes.ok) flash('Biometric authentication verified.');
      else flash('Biometric verification failed.', true);
    } catch (err) {
      flash(err.message, true);
    }
  };

  const openPortal = async () => {
    const res = await fetch('/api/subscriptions/portal', { method: 'POST', headers: hdr() });
    if (res.ok) { const d = await res.json(); window.open(d.url, '_blank'); }
  };

  const TABS = [
    { id: 'profile',      label: 'Profile',      icon: User },
    { id: 'subscription', label: 'Subscription', icon: Crown },
    { id: 'security',     label: 'Security',     icon: Shield },
    { id: 'preferences',  label: 'Preferences',  icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{profile?.username || profile?.email || 'Loading…'}</p>
            <p className="text-xs text-gray-400">{profile?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchProfile} disabled={loading} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {onLogout && (
            <button onClick={onLogout} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {(error || success) && (
        <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${error ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'}`}>
          {error ? <AlertTriangle size={14} /> : <Check size={14} />} {error || success}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div className="space-y-5">
            <SectionCard title="Profile Information" icon={User}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Username</label>
                  {editMode ? (
                    <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-white">{profile?.username || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">{profile?.role || 'user'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Member since</label>
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  {editMode ? (
                    <>
                      <button onClick={saveProfile} disabled={saving}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                      </button>
                      <button onClick={() => setEditMode(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setEditMode(true)} className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Edit3 size={13} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* SUBSCRIPTION TAB */}
        {tab === 'subscription' && (
          <div className="space-y-5">
            <SectionCard title="Current Plan" icon={Crown}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-lg font-bold ${PLAN_LABELS[subscription?.plan_id]?.color || 'text-gray-500'}`}>
                    {PLAN_LABELS[subscription?.plan_id]?.label || 'Free'}
                  </p>
                  {subscription?.current_period_end && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                  {subscription?.cancel_at_period_end && (
                    <p className="text-xs text-yellow-500 mt-0.5">Cancels at period end</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {subscription?.stripe_subscription_id && (
                    <button onClick={openPortal}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                      <CreditCard size={13} /> Manage
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* SECURITY TAB */}
        {tab === 'security' && (
          <div className="space-y-5">
            <SectionCard title="Two-Factor Authentication" icon={Key}>
              {profile?.mfa_enabled ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Check size={16} /> 2FA is enabled ({profile.mfa_method})
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Protect your account with an authenticator app.</p>
                  {!qrCode ? (
                    <button onClick={setup2FA} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                      <QrCode size={14} /> Enable 2FA
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <img src={qrCode} alt="TOTP QR Code" className="w-40 h-40 border rounded-lg" />
                      <div className="flex gap-2">
                        <input value={totpToken} onChange={e => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="000000" maxLength={6} inputMode="numeric" />
                        <button onClick={verify2FA} disabled={totpToken.length !== 6}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            {biometricSupported && (
              <SectionCard title="Biometric Authentication" icon={Smartphone}>
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Use Touch ID, Face ID, Windows Hello, or fingerprint to authenticate.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Touch ID', 'Face ID', 'Windows Hello', 'Fingerprint'].map(method => (
                      <span key={method} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-200 dark:border-blue-800">
                        {method}
                      </span>
                    ))}
                  </div>
                  <button onClick={startBiometric}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                    <Shield size={14} /> Authenticate with Biometrics
                  </button>
                </div>
              </SectionCard>
            )}

            <SectionCard title="Sessions" icon={Shield}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Sign out of all other sessions if you suspect unauthorized access.</p>
              <button onClick={async () => {
                await fetch('/api/auth/logout-all', { method: 'POST', headers: hdr() });
                flash('All other sessions revoked.');
              }} className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Revoke All Other Sessions
              </button>
            </SectionCard>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {tab === 'preferences' && (
          <div className="space-y-5">
            <SectionCard title="Language & Region" icon={Globe}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Display Language</label>
                  <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Region / Locale</label>
                  <input value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. US, GB, JP" maxLength={10} />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Preferences
                </button>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
