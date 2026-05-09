/*
 * Copyright © 2025-2026 Cameron Fox
 * Licensed under the Apache 2.0 License
 * File: src/dashboards/AdminDashboard.jsx
 * Last updated: 2026-05-09
 */

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

function apiFetch(path, options = {}) {
  const token = localStorage.getItem('nexus_token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  }).then((r) => r.json());
}

const SIDEBAR_ITEMS = [
  { label: 'Overview',       key: 'overview',    roles: ['admin', 'dev', 'moderator', 'user'] },
  { label: 'User Management',key: 'users',       roles: ['admin', 'moderator'] },
  { label: 'Audit Logs',     key: 'audit',       roles: ['admin'] },
  { label: 'Connectors',     key: 'connectors',  roles: ['admin', 'dev'] },
  { label: 'Activity Feed',  key: 'activity',    roles: ['moderator'] },
  { label: 'My Stats',       key: 'mystats',     roles: ['user'] },
];

const ROLE_OPTIONS = ['user', 'moderator', 'dev', 'admin'];

/* ── Stat Card ─────────────────────────────────────────── */
function StatCard({ label, value, color = 'indigo' }) {
  const ring = `border-${color}-500`;
  return (
    <div className={`bg-gray-800 border ${ring} rounded-xl p-4 flex flex-col gap-1`}>
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-white">{value ?? '—'}</span>
    </div>
  );
}

/* ── Stats Row ──────────────────────────────────────────── */
function StatsRow({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard label="Total Users"          value={stats.totalUsers}          color="indigo" />
      <StatCard label="Active Projects"      value={stats.activeProjects}      color="emerald" />
      <StatCard label="Achievements Unlocked" value={stats.achievementsUnlocked} color="yellow" />
      <StatCard label="Security Score"       value={stats.securityScore != null ? `${stats.securityScore}%` : null} color="rose" />
    </div>
  );
}

/* ── User Table ─────────────────────────────────────────── */
function UserTable({ role: viewerRole }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/admin/users')
      .then((d) => setUsers(d.users ?? d ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeRole = (id, newRole) => {
    setSaving(id);
    apiFetch(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole }),
    }).then(() => {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    }).finally(() => setSaving(null));
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading users…</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="min-w-full text-sm text-gray-300">
        <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
          <tr>
            {['Username', 'Email', 'Role', 'Created', 'MFA'].map((h) => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-700 hover:bg-gray-800/50">
              <td className="px-4 py-2 font-medium text-white">{u.username}</td>
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2">
                {viewerRole === 'admin' ? (
                  <select
                    value={u.role}
                    disabled={saving === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-gray-700 text-xs">{u.role}</span>
                )}
              </td>
              <td className="px-4 py-2 text-gray-400">
                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.mfaEnabled ? 'bg-emerald-700 text-emerald-200' : 'bg-gray-700 text-gray-400'}`}>
                  {u.mfaEnabled ? 'On' : 'Off'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Audit Log Table ────────────────────────────────────── */
function AuditLog() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/audit')
      .then((d) => setLogs(d.logs ?? d ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading audit logs…</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="min-w-full text-sm text-gray-300">
        <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
          <tr>
            {['Event', 'Timestamp', 'Details'].map((h) => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} className="border-t border-gray-700 hover:bg-gray-800/50">
              <td className="px-4 py-2 font-medium text-indigo-300">{log.event}</td>
              <td className="px-4 py-2 text-gray-400">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
              </td>
              <td className="px-4 py-2 text-gray-400 truncate max-w-xs">{log.details ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Connector Card ─────────────────────────────────────── */
function ConnectorCard({ connector, viewerRole, onConnect, onDisconnect }) {
  const [token, setToken]   = useState('');
  const [open, setOpen]     = useState(false);
  const [busy, setBusy]     = useState(false);

  const handleConnect = () => {
    setBusy(true);
    onConnect(connector.id, token).finally(() => { setBusy(false); setOpen(false); setToken(''); });
  };

  const handleDisconnect = () => {
    setBusy(true);
    onDisconnect(connector.id).finally(() => setBusy(false));
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">{connector.name ?? connector.id}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${connector.connected ? 'bg-emerald-700 text-emerald-200' : 'bg-gray-700 text-gray-400'}`}>
          {connector.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="flex gap-2">
        {!connector.connected && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded"
          >
            Connect
          </button>
        )}
        {connector.connected && viewerRole === 'admin' && (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="text-xs bg-rose-700 hover:bg-rose-600 text-white px-3 py-1 rounded disabled:opacity-50"
          >
            Disconnect
          </button>
        )}
      </div>
      {open && !connector.connected && (
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            placeholder="API token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
          />
          <button
            onClick={handleConnect}
            disabled={busy || !token.trim()}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded disabled:opacity-50"
          >
            {busy ? '…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Connectors Section ─────────────────────────────────── */
function ConnectorsSection({ viewerRole }) {
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(() => {
    apiFetch('/connectors')
      .then((d) => setConnectors(d.connectors ?? d ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConnect = (id, token) =>
    apiFetch(`/connectors/${id}/connect`, { method: 'POST', body: JSON.stringify({ token }) })
      .then(() => setConnectors((prev) => prev.map((c) => (c.id === id ? { ...c, connected: true } : c))));

  const handleDisconnect = (id) =>
    apiFetch(`/connectors/${id}/disconnect`, { method: 'POST' })
      .then(() => setConnectors((prev) => prev.map((c) => (c.id === id ? { ...c, connected: false } : c))));

  if (loading) return <p className="text-gray-400 text-sm">Loading connectors…</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {connectors.map((c) => (
        <ConnectorCard
          key={c.id}
          connector={c}
          viewerRole={viewerRole}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      ))}
    </div>
  );
}

/* ── Activity Feed ──────────────────────────────────────── */
function ActivityFeed() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/users')
      .then((d) => {
        const users = d.users ?? d ?? [];
        const feed = users.slice(0, 20).map((u) => ({
          text: `${u.username} joined`,
          time: u.createdAt,
        }));
        setItems(feed);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading activity…</p>;

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex justify-between bg-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300">
          <span>{item.text}</span>
          <span className="text-gray-500 text-xs">{item.time ? new Date(item.time).toLocaleString() : ''}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── My Stats (user role) ───────────────────────────────── */
function MyStats({ user }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="My Projects"     value={user?.stats?.projects}     color="indigo" />
      <StatCard label="Achievements"    value={user?.stats?.achievements} color="yellow" />
      <StatCard label="Subscription"    value={user?.subscription ?? 'Free'} color="emerald" />
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function AdminDashboard({ user }) {
  const role = user?.role ?? localStorage.getItem('nexus_role') ?? 'user';

  const allowedItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(role));
  const [activeSection, setActiveSection] = useState(allowedItems[0]?.key ?? 'overview');
  const [stats, setStats] = useState({});

  useEffect(() => {
    apiFetch('/admin/users').then((d) => {
      const users = d.users ?? d ?? [];
      setStats((prev) => ({ ...prev, totalUsers: users.length }));
    }).catch(() => {});
    apiFetch('/connectors').then((d) => {
      const connectors = d.connectors ?? d ?? [];
      const connected = connectors.filter((c) => c.connected).length;
      setStats((prev) => ({
        ...prev,
        activeProjects: prev.activeProjects ?? connected,
        achievementsUnlocked: prev.achievementsUnlocked ?? null,
        securityScore: prev.securityScore ?? null,
      }));
    }).catch(() => {});
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <>
            <StatsRow stats={stats} />
            {(role === 'admin' || role === 'dev') && (
              <>
                <h2 className="text-lg font-semibold text-white mb-3">Connectors</h2>
                <ConnectorsSection viewerRole={role} />
              </>
            )}
          </>
        );
      case 'users':
        return (
          <>
            <h2 className="text-lg font-semibold text-white mb-3">
              {role === 'admin' ? 'User Management' : 'Users (Read-only)'}
            </h2>
            <UserTable role={role} />
          </>
        );
      case 'audit':
        return (
          <>
            <h2 className="text-lg font-semibold text-white mb-3">Audit Logs</h2>
            <AuditLog />
          </>
        );
      case 'connectors':
        return (
          <>
            <h2 className="text-lg font-semibold text-white mb-3">Connector Management</h2>
            <ConnectorsSection viewerRole={role} />
          </>
        );
      case 'activity':
        return (
          <>
            <h2 className="text-lg font-semibold text-white mb-3">Recent Activity</h2>
            <ActivityFeed />
          </>
        );
      case 'mystats':
        return (
          <>
            <h2 className="text-lg font-semibold text-white mb-3">My Stats</h2>
            <MyStats user={user} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col py-6 px-3 gap-1">
        <div className="px-3 mb-4">
          <h1 className="text-xl font-bold text-indigo-400">Nexus AI Pro</h1>
          <p className="text-xs text-gray-500 capitalize mt-0.5">{role} dashboard</p>
        </div>
        {allowedItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === item.key
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="mt-auto px-3 pt-4 text-xs text-gray-600">
          <p>© 2025-2026 Cameron Fox</p>
          <p>Apache 2.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {renderSection()}
      </main>
    </div>
  );
}
