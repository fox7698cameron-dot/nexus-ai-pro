// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, Star, Shield, BarChart3, FolderOpen, Trophy,
  Camera, Edit3, Save, Globe, Bell, Lock, Key,
  Fingerprint, Smartphone, LogOut, CheckCircle, AlertTriangle,
  Eye, EyeOff, Upload, Zap, Activity, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useI18n } from '../contexts/I18nContext.jsx';

const API = async (path, opts = {}) => {
  const token = sessionStorage.getItem('nexus:token');
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const TIER_STYLES = {
  free: { badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30', gradient: 'from-gray-500 to-gray-600', features: ['5 projects', '100 AI queries/mo', '1 GB storage', 'Community support'] },
  pro: { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', gradient: 'from-purple-600 to-pink-600', features: ['Unlimited projects', '10,000 AI queries/mo', '100 GB storage', 'Priority support', 'Advanced analytics'] },
  enterprise: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', gradient: 'from-amber-500 to-orange-500', features: ['Unlimited everything', 'Custom AI models', 'Dedicated support', 'SLA guarantee', 'Custom integrations'] },
};

const PLATFORMS = [
  { id: 'github', name: 'GitHub', icon: '⬡' }, { id: 'twitter', name: 'Twitter/X', icon: '⬡' },
  { id: 'discord', name: 'Discord', icon: '⬡' }, { id: 'slack', name: 'Slack', icon: '⬡' },
  { id: 'unity', name: 'Unity', icon: '⬡' }, { id: 'unreal', name: 'Unreal', icon: '⬡' },
  { id: 'vscode', name: 'VS Code', icon: '⬡' }, { id: 'figma', name: 'Figma', icon: '⬡' },
];

const TABS = ['overview', 'profile', 'security', 'notifications'];

function Avatar({ user, size = 'lg', onClick }) {
  const initials = (user?.username ?? user?.email ?? 'U').slice(0, 2).toUpperCase();
  const sz = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
  return (
    <button onClick={onClick} className={`${sz} rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white relative group overflow-hidden`}>
      {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : initials}
      {onClick && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><Camera size={16} /></div>}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, accent = 'purple' }) {
  const colors = {
    purple: 'from-purple-600/20 to-pink-600/20 border-purple-500/20 text-purple-400',
    blue: 'from-blue-600/20 to-cyan-600/20 border-blue-500/20 text-blue-400',
    green: 'from-green-600/20 to-emerald-600/20 border-green-500/20 text-green-400',
    amber: 'from-amber-600/20 to-orange-600/20 border-amber-500/20 text-amber-400',
  };
  return (
    <div className={`p-5 rounded-xl border bg-gradient-to-br ${colors[accent]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value ?? '—'}</div>
    </div>
  );
}

export default function UserDashboard({ initialTab = 'overview' }) {
  const { user, refreshUser, logout } = useAuth();
  const { t, language, setLanguage, supportedLanguages } = useI18n();
  const [tab, setTab] = useState(initialTab);
  const [profile, setProfile] = useState({ username: '', bio: '', language: 'en', region: 'US' });
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [platforms, setPlatforms] = useState({});
  const [sessions, setSessions] = useState([]);
  const [notifPrefs, setNotifPrefs] = useState({ email: true, security: true, projects: true, analytics: false });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    const data = await API('/api/user/dashboard').catch(() => ({}));
    setStats(data.stats ?? null);
    setActivity(data.activity ?? []);
    setPlatforms(data.platforms ?? {});
    setSessions(data.sessions ?? []);
    setNotifPrefs((p) => ({ ...p, ...(data.notifPrefs ?? {}) }));
    if (user) setProfile({ username: user.username ?? '', bio: user.bio ?? '', language: user.language ?? 'en', region: user.region ?? 'US' });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    setSaveOk(false);
    try {
      await API('/api/user/profile', { method: 'PUT', body: JSON.stringify(profile) });
      await refreshUser();
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwError('');
    if (pwForm.next.length < 13) { setPwError('Password must be at least 13 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    await API('/api/user/change-password', { method: 'POST', body: JSON.stringify({ current: pwForm.current, password: pwForm.next }) });
    setPwForm({ current: '', next: '', confirm: '' });
    setPwOk(true);
    setTimeout(() => setPwOk(false), 4000);
  };

  const signOutAll = async () => {
    if (!confirm('Sign out all other devices?')) return;
    await API('/api/user/sessions/revoke-all', { method: 'POST' }).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.current));
  };

  const revokeSession = async (id) => {
    await API(`/api/user/sessions/${id}`, { method: 'DELETE' }).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('avatar', file);
    const token = sessionStorage.getItem('nexus:token');
    const res = await fetch('/api/user/avatar', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    if (res.ok) await refreshUser();
  };

  const toggle2FA = async () => {
    const method = user?.twoFactorEnabled ? 'DELETE' : 'POST';
    await API('/api/user/2fa', { method }).catch(() => {});
    await refreshUser();
  };

  const toggleBiometric = async () => {
    const method = user?.biometricEnabled ? 'DELETE' : 'POST';
    await API('/api/user/biometric', { method }).catch(() => {});
    await refreshUser();
  };

  const toggleNotif = async (key) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    await API('/api/user/notifications', { method: 'PUT', body: JSON.stringify(next) }).catch(() => {});
  };

  const tierStyle = TIER_STYLES[user?.tier ?? 'free'];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-start gap-5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <Avatar user={user} onClick={() => fileRef.current?.click()} />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              My Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Welcome back, <span className="text-white font-semibold">{user?.username ?? user?.email}</span>
            </p>
            <span className={`mt-2 inline-flex px-3 py-1 text-xs font-semibold rounded-full border capitalize ${tierStyle.badge}`}>
              {user?.tier ?? 'free'}
            </span>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${tab === t ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Subscription Card */}
            <div className={`p-6 rounded-2xl bg-gradient-to-br ${tierStyle.gradient} border border-white/10`}>
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">Current Plan</p>
                  <p className="text-2xl font-bold text-white capitalize mt-1">{user?.tier ?? 'Free'}</p>
                  {stats?.billingDate && <p className="text-xs text-white/60 mt-1">Renews {stats.billingDate}</p>}
                </div>
                {(user?.tier ?? 'free') !== 'enterprise' && (
                  <a href="/checkout" className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition flex items-center gap-1.5">
                    <Zap size={14} /> Upgrade
                  </a>
                )}
              </div>
              <ul className="space-y-1.5">
                {tierStyle.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle size={14} className="text-white/60 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {stats?.usagePercent !== undefined && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Usage</span><span>{stats.usagePercent}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${stats.usagePercent}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={FolderOpen} label="Projects" value={stats?.projects} accent="purple" />
              <StatCard icon={Trophy} label="Achievements" value={stats?.achievements} accent="amber" />
              <StatCard icon={BarChart3} label="Analytics Sources" value={stats?.analyticsSources} accent="blue" />
              <StatCard icon={Shield} label="Security Score" value={stats?.securityScore ? `${stats.securityScore}%` : '—'} accent="green" />
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity size={18} className="text-purple-400" /> Recent Activity
              </h2>
              <div className="space-y-2">
                {activity.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent activity.</p>
                ) : activity.slice(0, 10).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 transition">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
                      <Activity size={14} />
                    </div>
                    <div>
                      <p className="text-sm text-white">{a.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.time ? new Date(a.time).toLocaleString() : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Platforms */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Connected Platforms</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PLATFORMS.map((p) => {
                  const connected = platforms[p.id];
                  return (
                    <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between ${connected ? 'border-purple-500/20 bg-purple-500/5' : 'border-white/10 bg-white/3'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.icon}</span>
                        <p className="text-sm text-white">{p.name}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-600'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div className="max-w-xl space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar user={user} size="lg" onClick={() => fileRef.current?.click()} />
              <div>
                <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm flex items-center gap-2 hover:bg-purple-500/20 transition">
                  <Upload size={14} /> Upload Avatar
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Username (emoji/unicode allowed)</label>
              <input value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} placeholder="Your username" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Bio</label>
              <textarea value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500/50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Language</label>
                <select value={profile.language} onChange={(e) => { setProfile((p) => ({ ...p, language: e.target.value })); setLanguage(e.target.value); }} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50">
                  {supportedLanguages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Region</label>
                <input value={profile.region} onChange={(e) => setProfile((p) => ({ ...p, region: e.target.value }))} placeholder="US" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50" />
              </div>
            </div>

            <button onClick={saveProfile} disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold disabled:opacity-60 hover:opacity-90 transition flex items-center justify-center gap-2">
              {saving ? 'Saving...' : <><Save size={16} /> Save Profile</>}
              {saveOk && <CheckCircle size={16} className="text-green-300" />}
            </button>
          </div>
        )}

        {/* SECURITY TAB */}
        {tab === 'security' && (
          <div className="max-w-xl space-y-8">
            {/* Change Password */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/3 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Lock size={16} className="text-purple-400" /> Change Password</h3>
              <p className="text-xs text-gray-500">Minimum 13 characters required.</p>
              {pwError && <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertTriangle size={14} /> {pwError}</p>}
              {pwOk && <p className="text-sm text-green-400 flex items-center gap-1.5"><CheckCircle size={14} /> Password updated!</p>}
              {[
                { field: 'current', placeholder: 'Current password' },
                { field: 'next', placeholder: 'New password (13+ chars)' },
                { field: 'confirm', placeholder: 'Confirm new password' },
              ].map(({ field, placeholder }) => (
                <div key={field} className="relative">
                  <input
                    type={showPw[field] ? 'text' : 'password'}
                    value={pwForm[field]}
                    onChange={(e) => setPwForm((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                  <button onClick={() => setShowPw((p) => ({ ...p, [field]: !p[field] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition">
                    {showPw[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              ))}
              <button onClick={changePassword} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition">Update Password</button>
            </div>

            {/* 2FA & Biometrics */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/3 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Key size={16} className="text-purple-400" /> Authentication</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Two-Factor Authentication (TOTP)</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <button onClick={toggle2FA} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${user?.twoFactorEnabled ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'}`}>
                  {user?.twoFactorEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-sm text-gray-300 flex items-center gap-2"><Fingerprint size={14} className="text-cyan-400" /> Biometric Auth</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.biometricEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <button onClick={toggleBiometric} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${user?.biometricEnabled ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'}`}>
                  {user?.biometricEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>

            {/* Sessions */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/3 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2"><Smartphone size={16} className="text-purple-400" /> Active Sessions</h3>
                <button onClick={signOutAll} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1.5">
                  <LogOut size={12} /> Sign out all devices
                </button>
              </div>
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-gray-500">No other active sessions.</p>
                ) : sessions.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border ${s.current ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-white/3'}`}>
                    <div>
                      <p className="text-sm text-white">{s.device ?? 'Unknown device'} {s.current && <span className="text-xs text-green-400 ml-1">(this session)</span>}</p>
                      <p className="text-xs text-gray-500">{s.ip ?? '—'} · {s.lastActive ? new Date(s.lastActive).toLocaleString() : '—'}</p>
                    </div>
                    {!s.current && (
                      <button onClick={() => revokeSession(s.id)} className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === 'notifications' && (
          <div className="max-w-xl space-y-4">
            <p className="text-gray-400 text-sm mb-6">Control which notifications you receive.</p>
            {[
              { key: 'email', label: 'Email Notifications', desc: 'General platform updates via email' },
              { key: 'security', label: 'Security Alerts', desc: 'Login attempts, password changes, suspicious activity' },
              { key: 'projects', label: 'Project Updates', desc: 'Build results, collaborator activity, deadlines' },
              { key: 'analytics', label: 'Analytics Reports', desc: 'Weekly performance summaries and insights' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-5 rounded-xl border border-white/10 bg-white/3">
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
                <button onClick={() => toggleNotif(key)} className={`w-12 h-6 rounded-full relative transition-colors ${notifPrefs[key] ? 'bg-purple-600' : 'bg-gray-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${notifPrefs[key] ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
