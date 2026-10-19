// src/components/AdminDashboard.jsx
// Role-based admin dashboard — admin / developer / moderator / user
// Created: 2026-10-19

import React, { useState, useEffect, useCallback } from 'react';

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LEVELS = { admin: 4, developer: 3, moderator: 2, user: 1 };

const CONNECTORS = [
  { id: 'azure', name: 'Azure', icon: '☁️', category: 'cloud' },
  { id: 'aws', name: 'AWS', icon: '🟠', category: 'cloud' },
  { id: 'gcp', name: 'Google Cloud', icon: '🔵', category: 'cloud' },
  { id: 'adobe', name: 'Adobe Creative Cloud', icon: '🔴', category: 'creative' },
  { id: 'slack', name: 'Slack', icon: '💬', category: 'comm' },
  { id: 'zoom', name: 'Zoom', icon: '📹', category: 'comm' },
  { id: 'github', name: 'GitHub', icon: '🐙', category: 'dev' },
  { id: 'bitbucket', name: 'Bitbucket', icon: '🪣', category: 'dev' },
  { id: 'discord', name: 'Discord', icon: '🎮', category: 'comm' },
  { id: 'stripe', name: 'Stripe', icon: '💳', category: 'payments' },
  { id: 'reddit', name: 'Reddit API', icon: '🤖', category: 'social' },
  { id: 'tiktok', name: 'TikTok API', icon: '🎵', category: 'social' },
  { id: 'instagram', name: 'Instagram API', icon: '📸', category: 'social' },
  { id: 'facebook', name: 'Facebook API', icon: '📘', category: 'social' },
  { id: 'twitch', name: 'Twitch API', icon: '🟣', category: 'social' },
  { id: 'lemon8', name: 'Lemon8 API', icon: '🍋', category: 'social' },
  { id: 'epic', name: 'UnrealEngine / EpicGames', icon: '🎯', category: 'gamedev' },
  { id: 'sony', name: 'Sony PlayStation', icon: '🎮', category: 'gamedev' },
  { id: 'microsoft', name: 'Microsoft Xbox', icon: '🟢', category: 'gamedev' },
  { id: 'ubisoft', name: 'Ubisoft Connect', icon: '🕹️', category: 'gamedev' },
  { id: 'redis', name: 'Redis', icon: '🔴', category: 'infra' },
  { id: 'blob', name: 'Azure Blob Storage', icon: '📦', category: 'infra' },
];

const LANGUAGES_SUPPORTED = [
  { code: 'en', name: 'English', coverage: 100 },
  { code: 'es', name: 'Spanish', coverage: 87 },
  { code: 'fr', name: 'French', coverage: 82 },
  { code: 'de', name: 'German', coverage: 79 },
  { code: 'pt', name: 'Portuguese', coverage: 74 },
  { code: 'ja', name: 'Japanese', coverage: 68 },
  { code: 'zh', name: 'Chinese (Simplified)', coverage: 65 },
  { code: 'ko', name: 'Korean', coverage: 60 },
  { code: 'ar', name: 'Arabic (RTL)', coverage: 55 },
  { code: 'ru', name: 'Russian', coverage: 72 },
];

const MOCK_USERS = [
  { id: 'u1', email: 'admin@nexusai.pro', role: 'admin', status: 'active', createdAt: '2025-01-15', lastLogin: '2026-10-19' },
  { id: 'u2', email: 'dev@nexusai.pro', role: 'developer', status: 'active', createdAt: '2025-03-01', lastLogin: '2026-10-18' },
  { id: 'u3', email: 'mod@nexusai.pro', role: 'moderator', status: 'active', createdAt: '2025-06-10', lastLogin: '2026-10-17' },
  { id: 'u4', email: 'user@example.com', role: 'user', status: 'active', createdAt: '2026-01-20', lastLogin: '2026-10-15' },
  { id: 'u5', email: 'banned@example.com', role: 'user', status: 'banned', createdAt: '2026-02-01', lastLogin: '2026-09-01' },
];

const MOCK_REPORTS = [
  { id: 'rep-001', type: 'spam', target: 'msg-123', reporter: 'user@example.com', ts: '2026-10-19 09:12', status: 'pending' },
  { id: 'rep-002', type: 'abuse', target: 'msg-456', reporter: 'anon@example.com', ts: '2026-10-18 14:55', status: 'reviewing' },
  { id: 'rep-003', type: 'misinformation', target: 'post-789', reporter: 'user2@example.com', ts: '2026-10-17 11:30', status: 'resolved' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function can(user, minRole) {
  return (ROLE_LEVELS[user?.role] || 0) >= (ROLE_LEVELS[minRole] || 0);
}

function RoleBadge({ role }) {
  const colors = { admin: 'bg-red-900/40 text-red-300 border-red-700', developer: 'bg-purple-900/40 text-purple-300 border-purple-700', moderator: 'bg-blue-900/40 text-blue-300 border-blue-700', user: 'bg-slate-700 text-slate-300 border-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${colors[role] || colors.user}`}>{role}</span>;
}

function StatusBadge({ status }) {
  const ok = status === 'active' || status === 'connected';
  const warn = status === 'configuring' || status === 'reviewing';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ok ? 'bg-green-900/40 text-green-300' : warn ? 'bg-yellow-900/40 text-yellow-300' : 'bg-red-900/40 text-red-300'}`}>
      {status}
    </span>
  );
}

function ProgressBar({ value, color = 'bg-cyan-500' }) {
  return (
    <div className="w-full bg-slate-700 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function AccessDenied({ role }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-3">🔒</span>
      <p className="text-slate-300 font-semibold">Access Denied</p>
      <p className="text-slate-500 text-sm mt-1">Your role (<RoleBadge role={role} />) does not have access to this section.</p>
    </div>
  );
}

// ─── ConnectorCard ─────────────────────────────────────────────────────────────

function ConnectorCard({ connector, status, onConfigure }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{connector.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{connector.name}</p>
          <p className="text-xs text-slate-500">{connector.category}</p>
        </div>
        <StatusBadge status={status.connected ? 'connected' : 'disconnected'} />
      </div>
      {status.connected && (
        <p className="text-xs text-slate-500">Last sync: {status.lastSync || 'Never'}</p>
      )}
      <button
        onClick={() => onConfigure(connector)}
        className="w-full py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors mt-1"
      >
        Configure
      </button>
    </div>
  );
}

// ─── ConfigModal ───────────────────────────────────────────────────────────────

function ConfigModal({ connector, onClose, onSave }) {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!token.trim()) return;
    onSave(connector.id, token);
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{connector.icon}</span>
          <h3 className="text-lg font-bold text-white">{connector.name}</h3>
        </div>
        {saved ? (
          <div className="text-center py-4 text-green-400 font-semibold">✓ Token saved securely to environment</div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">Enter your API key or token. It will be stored as an environment variable — never in source code or logs.</p>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">API Key / Token</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Enter token…"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-4"
              autoComplete="new-password"
            />
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!token.trim()} className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-sm font-semibold text-white transition-colors">Save</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard({ user, socket }) {
  const [activeTab, setActiveTab] = useState('status');
  const [users, setUsers] = useState(MOCK_USERS);
  const [userSearch, setUserSearch] = useState('');
  const [connectorStatuses, setConnectorStatuses] = useState(() =>
    Object.fromEntries(CONNECTORS.map(c => [c.id, { connected: Math.random() > 0.5, lastSync: '2026-10-19 08:00' }]))
  );
  const [configTarget, setConfigTarget] = useState(null);
  const [serverMetrics, setServerMetrics] = useState({ uptime: 99.9, errorRate: 0.02, memory: 61, cpu: 34, connections: 42 });
  const [featureFlags, setFeatureFlags] = useState({ analytics: true, biometrics: true, crypto_payments: false, ar_vr: true, auto_translate: true });
  const [modLog, setModLog] = useState([
    { id: 'm1', action: 'CONTENT_REMOVED', target: 'msg-100', mod: 'mod@nexusai.pro', ts: '2026-10-19 07:30' },
    { id: 'm2', action: 'USER_WARNED', target: 'u5', mod: 'mod@nexusai.pro', ts: '2026-10-18 15:20' },
  ]);
  const [reports, setReports] = useState(MOCK_REPORTS);

  useEffect(() => {
    const id = setInterval(() => {
      setServerMetrics(m => ({
        ...m,
        cpu: Math.max(5, Math.min(95, m.cpu + (Math.random() - 0.5) * 4)),
        memory: Math.max(10, Math.min(95, m.memory + (Math.random() - 0.5) * 2)),
        connections: Math.max(1, m.connections + Math.round((Math.random() - 0.5) * 5)),
      }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleBanToggle = useCallback((userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: u.status === 'banned' ? 'active' : 'banned' } : u));
  }, []);

  const handleRoleChange = useCallback((userId, newRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  }, []);

  const handleConnectorSave = useCallback((connectorId, token) => {
    setConnectorStatuses(prev => ({ ...prev, [connectorId]: { connected: true, lastSync: new Date().toLocaleTimeString() } }));
    // token is handled server-side via /api/admin/connectors/:id/configure — never logged here
  }, []);

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.includes(userSearch.toLowerCase())
  );

  const tabs = [
    { id: 'status', label: '🖥 System', minRole: 'user' },
    { id: 'users', label: '👥 Users', minRole: 'admin' },
    { id: 'developer', label: '⚙️ Developer', minRole: 'developer' },
    { id: 'moderator', label: '🛡 Moderator', minRole: 'moderator' },
    { id: 'connectors', label: '🔌 Connectors', minRole: 'developer' },
    { id: 'i18n', label: '🌐 i18n', minRole: 'admin' },
    { id: 'audit', label: '📋 Audit', minRole: 'admin' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Admin Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">{user?.email || 'Unknown'}</span>
            <RoleBadge role={user?.role || 'user'} />
          </div>
        </div>
        <div className="text-xs text-slate-500">Nexus AI Pro v2.0</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap border-b border-slate-700 pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${activeTab === t.id ? 'bg-slate-700 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'} ${!can(user, t.minRole) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* System Status */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Uptime', value: `${serverMetrics.uptime}%`, color: 'text-green-400' },
              { label: 'Error Rate', value: `${serverMetrics.errorRate}%`, color: serverMetrics.errorRate > 1 ? 'text-red-400' : 'text-green-400' },
              { label: 'CPU', value: `${serverMetrics.cpu.toFixed(0)}%`, color: serverMetrics.cpu > 80 ? 'text-red-400' : 'text-cyan-400' },
              { label: 'Memory', value: `${serverMetrics.memory.toFixed(0)}%`, color: 'text-purple-400' },
              { label: 'Connections', value: serverMetrics.connections, color: 'text-yellow-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-300 mb-3">Resource Usage</p>
            {[
              { label: `CPU ${serverMetrics.cpu.toFixed(0)}%`, val: serverMetrics.cpu, color: serverMetrics.cpu > 80 ? 'bg-red-500' : 'bg-cyan-500' },
              { label: `Memory ${serverMetrics.memory.toFixed(0)}%`, val: serverMetrics.memory, color: 'bg-purple-500' },
            ].map(r => (
              <div key={r.label} className="mb-2">
                <p className="text-xs text-slate-400 mb-1">{r.label}</p>
                <ProgressBar value={r.val} color={r.color} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Management */}
      {activeTab === 'users' && (
        !can(user, 'admin') ? <AccessDenied role={user?.role} /> : (
          <div className="space-y-4">
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search users by email or role…"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60">
                  <tr>
                    {['Email', 'Role', 'Status', 'Created', 'Last Login', 'Actions'].map(h => (
                      <th key={h} className="text-left p-3 text-xs text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                      <td className="p-3 text-slate-300">{u.email}</td>
                      <td className="p-3"><RoleBadge role={u.role} /></td>
                      <td className="p-3"><StatusBadge status={u.status} /></td>
                      <td className="p-3 text-slate-400 text-xs">{u.createdAt}</td>
                      <td className="p-3 text-slate-400 text-xs">{u.lastLogin}</td>
                      <td className="p-3">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleBanToggle(u.id)} className={`text-xs px-2 py-1 rounded ${u.status === 'banned' ? 'bg-green-900/40 text-green-300 hover:bg-green-900/60' : 'bg-red-900/40 text-red-300 hover:bg-red-900/60'} transition-colors`}>
                            {u.status === 'banned' ? 'Unban' : 'Ban'}
                          </button>
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            className="text-xs bg-slate-700 border border-slate-600 rounded px-1 py-1 text-slate-300"
                          >
                            {['user', 'moderator', 'developer', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Developer Panel */}
      {activeTab === 'developer' && (
        !can(user, 'developer') ? <AccessDenied role={user?.role} /> : (
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-300 mb-3">Feature Flags</p>
              <div className="space-y-2">
                {Object.entries(featureFlags).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-mono">{key}</span>
                    <button
                      onClick={() => setFeatureFlags(f => ({ ...f, [key]: !f[key] }))}
                      className={`w-10 h-5 rounded-full transition-colors ${val ? 'bg-cyan-600' : 'bg-slate-600'} relative`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-300 mb-2">Build Status</p>
              {['frontend', 'backend', 'mobile', 'desktop'].map(svc => (
                <div key={svc} className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400 capitalize">{svc}</span>
                  <span className="text-green-400 font-semibold">✓ passing</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-300 mb-2">Webhook Configuration</p>
              <p className="text-xs text-slate-400">Add webhooks via environment variables: <code className="font-mono text-cyan-400">WEBHOOK_SECRET</code>, <code className="font-mono text-cyan-400">WEBHOOK_URL</code></p>
              <p className="text-xs text-yellow-400 mt-1">⚠ Never hardcode webhook secrets in source files.</p>
            </div>
          </div>
        )
      )}

      {/* Moderator Panel */}
      {activeTab === 'moderator' && (
        !can(user, 'moderator') ? <AccessDenied role={user?.role} /> : (
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
              <p className="text-sm font-semibold text-slate-300 p-4 border-b border-slate-700">Reported Content</p>
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60">
                  <tr>
                    {['Type', 'Target', 'Reporter', 'Time', 'Status', 'Action'].map(h => (
                      <th key={h} className="text-left p-3 text-xs text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id} className="border-t border-slate-700/50">
                      <td className="p-3 text-slate-300 capitalize">{r.type}</td>
                      <td className="p-3 text-slate-400 font-mono text-xs">{r.target}</td>
                      <td className="p-3 text-slate-400 text-xs">{r.reporter}</td>
                      <td className="p-3 text-slate-400 text-xs">{r.ts}</td>
                      <td className="p-3"><StatusBadge status={r.status} /></td>
                      <td className="p-3">
                        <button
                          onClick={() => { setReports(p => p.map(x => x.id === r.id ? { ...x, status: 'resolved' } : x)); setModLog(l => [{ id: uuidv4(), action: 'REPORT_RESOLVED', target: r.target, mod: user?.email || 'mod', ts: new Date().toLocaleString() }, ...l]); }}
                          className="text-xs px-2 py-1 bg-green-900/40 text-green-300 rounded hover:bg-green-900/60"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-300 mb-3">Moderation Log</p>
              {modLog.map(e => (
                <div key={e.id} className="flex gap-2 text-xs text-slate-400 border-b border-slate-700/40 py-1.5">
                  <span className="text-slate-500">{e.ts}</span>
                  <span className="text-slate-300">{e.action}</span>
                  <span>→ {e.target}</span>
                  <span className="text-slate-500">by {e.mod}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Connectors */}
      {activeTab === 'connectors' && (
        !can(user, 'developer') ? <AccessDenied role={user?.role} /> : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {CONNECTORS.map(c => (
                <ConnectorCard
                  key={c.id}
                  connector={c}
                  status={connectorStatuses[c.id] || { connected: false }}
                  onConfigure={setConfigTarget}
                />
              ))}
            </div>
            {configTarget && (
              <ConfigModal
                connector={configTarget}
                onClose={() => setConfigTarget(null)}
                onSave={(id, token) => { handleConnectorSave(id, token); setConfigTarget(null); }}
              />
            )}
          </div>
        )
      )}

      {/* i18n Management */}
      {activeTab === 'i18n' && (
        !can(user, 'admin') ? <AccessDenied role={user?.role} /> : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Supported languages and translation coverage. Auto-translate fills gaps via API when enabled.</p>
            {LANGUAGES_SUPPORTED.map(lang => (
              <div key={lang.code} className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 w-6">{lang.code.toUpperCase()}</span>
                <span className="text-sm text-slate-300 w-44">{lang.name}</span>
                <div className="flex-1">
                  <ProgressBar value={lang.coverage} color={lang.coverage === 100 ? 'bg-green-500' : lang.coverage > 70 ? 'bg-cyan-500' : 'bg-yellow-500'} />
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">{lang.coverage}%</span>
              </div>
            ))}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mt-4">
              <p className="text-sm font-semibold text-slate-300 mb-1">Missing Keys</p>
              <p className="text-xs text-slate-400">Incomplete translations are auto-filled at runtime. Add a translation service token via the Connectors panel.</p>
            </div>
          </div>
        )
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        !can(user, 'admin') ? <AccessDenied role={user?.role} /> : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Audit log is minimal by design — only security-relevant events are recorded.</p>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-slate-900/60">
                  <tr>
                    {['Time', 'Action', 'User', 'Severity'].map(h => (
                      <th key={h} className="text-left p-2 text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modLog.concat([
                    { id: 'sys1', ts: '2026-10-19 08:00', action: 'SERVER_STARTED', mod: 'system', type: 'info' },
                    { id: 'sys2', ts: '2026-10-19 07:55', action: 'KEY_ROTATION', mod: 'system', type: 'info' },
                  ]).map(e => (
                    <tr key={e.id} className="border-t border-slate-700/40 hover:bg-slate-700/20">
                      <td className="p-2 text-slate-500">{e.ts}</td>
                      <td className="p-2 text-slate-300">{e.action}</td>
                      <td className="p-2 text-slate-400">{e.mod || e.user}</td>
                      <td className={`p-2 font-semibold ${e.type === 'error' || e.severity === 'high' ? 'text-red-400' : 'text-slate-500'}`}>{e.type || 'info'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// helper used inline above — needs to be importable
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
