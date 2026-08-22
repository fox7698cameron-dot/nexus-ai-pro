/**
 * File: src/admin/AdminDashboard.jsx
 * Purpose: Enterprise admin dashboard — system health, user management, audit logs,
 *          security alerts, platform statistics, API metrics, and real-time monitoring
 *          via WebSocket. Requires a valid admin-role JWT; isolated from other dashboards.
 * Date: 2026-08-22
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';

// ---------------------------------------------------------------------------
// Auth context — expects an admin JWT injected by the app's auth layer
// ---------------------------------------------------------------------------
const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminDashboard');
  return ctx;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ROLES = ['admin', 'developer', 'moderator', 'user'];

const WS_RECONNECT_DELAY_MS = 3000;
const METRICS_POLL_INTERVAL_MS = 10_000;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes) {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

function formatNumber(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function ago(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// API helper — all requests include the admin Bearer token
// ---------------------------------------------------------------------------
function useAdminApi(token) {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api';

  const call = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers ?? {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`API ${res.status}: ${text}`);
      }
      return res.json();
    },
    [base, token],
  );

  return call;
}

// ---------------------------------------------------------------------------
// WebSocket hook for real-time metrics
// ---------------------------------------------------------------------------
function useAdminSocket(token, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const wsBase = (import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:3001');
    const ws = new WebSocket(`${wsBase}/admin/metrics?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try { onMessage(JSON.parse(evt.data)); }
      catch { /* ignore malformed frames */ }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      reconnectTimer.current = setTimeout(connect, WS_RECONNECT_DELAY_MS);
    };

    ws.onerror = () => ws.close();
  }, [token, onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** System health tile */
function HealthCard({ label, value, unit, warn, danger }) {
  const pct = typeof value === 'number' ? value : null;
  const color =
    pct == null ? '#6b7280'
    : pct >= danger ? '#ef4444'
    : pct >= warn   ? '#f59e0b'
    :                  '#22c55e';

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardLabel }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>
        {pct != null ? `${pct.toFixed(1)}${unit}` : '—'}
      </div>
      {pct != null && (
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressBar, width: `${Math.min(pct, 100)}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

/** Stat tile (DAU, MAU, revenue…) */
function StatTile({ label, value, delta }) {
  const positive = delta >= 0;
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value ?? '—'}</div>
      {delta != null && (
        <div style={{ color: positive ? '#22c55e' : '#ef4444', fontSize: 12 }}>
          {positive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

/** User management table */
function UserManagement({ api }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user' });
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/admin/users');
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const suspendUser = async (id) => {
    try {
      await api(`/admin/users/${id}/suspend`, { method: 'POST' });
      await load();
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Permanently delete this user?')) return;
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const saveEdit = async () => {
    try {
      await api(`/admin/users/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editTarget.name, role: editTarget.role }),
      });
      setEditTarget(null);
      await load();
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const createUser = async () => {
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify(newUser) });
      setShowCreate(false);
      setNewUser({ email: '', name: '', role: 'user' });
      await load();
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>User Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={styles.input}
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button style={styles.btn} onClick={() => setShowCreate(true)}>+ New User</button>
          <button style={styles.btnOutline} onClick={load}>Refresh</button>
        </div>
      </div>

      {showCreate && (
        <div style={styles.modal}>
          <h3>Create User</h3>
          <label style={styles.formLabel}>Email</label>
          <input style={styles.input} value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          <label style={styles.formLabel}>Name</label>
          <input style={styles.input} value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
          <label style={styles.formLabel}>Role</label>
          <select style={styles.input} value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={styles.btn} onClick={createUser}>Create</button>
            <button style={styles.btnOutline} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {editTarget && (
        <div style={styles.modal}>
          <h3>Edit User</h3>
          <label style={styles.formLabel}>Name</label>
          <input style={styles.input} value={editTarget.name}
            onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })} />
          <label style={styles.formLabel}>Role</label>
          <select style={styles.input} value={editTarget.role}
            onChange={(e) => setEditTarget({ ...editTarget, role: e.target.value })}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={styles.btn} onClick={saveEdit}>Save</button>
            <button style={styles.btnOutline} onClick={() => setEditTarget(null)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.muted}>Loading…</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Name', 'Email', 'Role', 'MFA', 'Biometric', 'Status', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={styles.tr}>
                <td style={styles.td}>{u.name}</td>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: roleColor(u.role) }}>{u.role}</span>
                </td>
                <td style={styles.td}>
                  <span style={{ color: u.mfaEnabled ? '#22c55e' : '#ef4444' }}>
                    {u.mfaEnabled ? '✔ Enabled' : '✘ Off'}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ color: u.biometricEnrolled ? '#22c55e' : '#6b7280' }}>
                    {u.biometricEnrolled ? '✔ Enrolled' : '—'}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    background: u.suspended ? '#ef4444' : '#22c55e',
                  }}>
                    {u.suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button style={styles.btnSm} onClick={() => setEditTarget({ ...u })}>Edit</button>
                  <button style={styles.btnSm} onClick={() => suspendUser(u.id)}>
                    {u.suspended ? 'Reinstate' : 'Suspend'}
                  </button>
                  <button style={{ ...styles.btnSm, background: '#ef4444' }}
                    onClick={() => deleteUser(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center' }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function roleColor(role) {
  return { admin: '#7c3aed', developer: '#2563eb', moderator: '#d97706', user: '#374151' }[role] ?? '#374151';
}

/** Audit log viewer */
function AuditLog({ api }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (search) qs.set('search', search);
      if (filterAction) qs.set('action', filterAction);
      const data = await api(`/admin/audit-logs?${qs}`);
      setLogs(data.logs ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, page, search, filterAction]);

  useEffect(() => { load(); }, [load]);

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Audit Log</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={styles.input} placeholder="Search…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <input style={styles.input} placeholder="Action filter…" value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} />
          <button style={styles.btnOutline} onClick={load}>Refresh</button>
        </div>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Time', 'Actor', 'Action', 'Target', 'IP', 'Result'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={styles.tr}>
                <td style={styles.td}>{new Date(l.createdAt).toLocaleString()}</td>
                <td style={styles.td}>{l.actorEmail ?? l.actorId}</td>
                <td style={styles.td}><code>{l.action}</code></td>
                <td style={styles.td}>{l.target ?? '—'}</td>
                <td style={styles.td}>{l.ip ?? '—'}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    background: l.result === 'success' ? '#22c55e' : '#ef4444',
                  }}>
                    {l.result}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center' }}>No logs</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button style={styles.btnOutline} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
        <span style={styles.muted}>Page {page}</span>
        <button style={styles.btnOutline} disabled={logs.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next →</button>
      </div>
    </section>
  );
}

/** Security alerts */
function SecurityAlerts({ api }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api('/admin/security-alerts');
      setAlerts(data.alerts ?? []);
    } catch { /* non-fatal */ } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const dismiss = async (id) => {
    try {
      await api(`/admin/security-alerts/${id}/dismiss`, { method: 'POST' });
      setAlerts((a) => a.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  };

  const severityColor = (s) => ({ critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#6b7280' }[s] ?? '#6b7280');

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Security Alerts</h2>
        <button style={styles.btnOutline} onClick={load}>Refresh</button>
      </div>
      {loading && <p style={styles.muted}>Loading…</p>}
      {!loading && alerts.length === 0 && <p style={{ color: '#22c55e' }}>No active alerts.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((a) => (
          <div key={a.id} style={{ ...styles.alertCard, borderLeftColor: severityColor(a.severity) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>{a.title}</span>
              <span style={{ color: '#6b7280', fontSize: 12 }}>{ago(a.createdAt)}</span>
            </div>
            <p style={{ margin: '4px 0', fontSize: 13 }}>{a.description}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ ...styles.badge, background: severityColor(a.severity) }}>{a.severity}</span>
              <button style={styles.btnSm} onClick={() => dismiss(a.id)}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** CORS / security policy configuration */
function SecurityPolicies({ api }) {
  const [policy, setPolicy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api('/admin/security-policy').then((d) => setPolicy(d)).catch(() => {});
  }, [api]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await api('/admin/security-policy', { method: 'PUT', body: JSON.stringify(policy) });
      setMsg({ ok: true, text: 'Policy saved.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!policy) return <section style={styles.section}><p style={styles.muted}>Loading policy…</p></section>;

  const field = (label, key) => (
    <div style={{ marginBottom: 10 }}>
      <label style={styles.formLabel}>{label}</label>
      <input style={styles.input} value={policy[key] ?? ''}
        onChange={(e) => setPolicy({ ...policy, [key]: e.target.value })} />
    </div>
  );

  const toggle = (label, key) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <input type="checkbox" checked={!!policy[key]}
        onChange={(e) => setPolicy({ ...policy, [key]: e.target.checked })} />
      <label style={styles.formLabel}>{label}</label>
    </div>
  );

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Security Policies</h2>
      {field('Allowed CORS Origins (comma-separated)', 'corsOrigins')}
      {field('Content Security Policy header', 'cspHeader')}
      {field('HSTS max-age (seconds)', 'hstsMaxAge')}
      {toggle('Enforce MFA for all admins', 'enforceMfaForAdmins')}
      {toggle('Block concurrent sessions', 'blockConcurrentSessions')}
      {toggle('Require biometric for sensitive actions', 'requireBiometric')}
      {field('Session timeout (minutes)', 'sessionTimeoutMinutes')}
      {msg && <p style={{ color: msg.ok ? '#22c55e' : '#ef4444' }}>{msg.text}</p>}
      <button style={styles.btn} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Policies'}
      </button>
    </section>
  );
}

/** API usage metrics */
function ApiMetrics({ realtimeMetrics }) {
  const m = realtimeMetrics?.api ?? {};
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>API Usage Metrics</h2>
      <div style={styles.grid}>
        <HealthCard label="Requests / sec" value={m.rps} unit="" warn={500} danger={900} />
        <HealthCard label="Error Rate" value={m.errorRate} unit="%" warn={2} danger={5} />
        <HealthCard label="P99 Latency (ms)" value={m.p99Latency} unit="ms" warn={500} danger={2000} />
        <HealthCard label="Active Connections" value={m.activeConnections} unit="" warn={800} danger={950} />
      </div>
    </section>
  );
}

/** Database health */
function DatabaseHealth({ api, realtimeMetrics }) {
  const [dbInfo, setDbInfo] = useState(null);

  useEffect(() => {
    api('/admin/database/health').then(setDbInfo).catch(() => {});
  }, [api]);

  const db = dbInfo ?? {};
  const rt = realtimeMetrics?.database ?? {};

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Database Health</h2>
      <div style={styles.grid}>
        <HealthCard label="Connection Pool %" value={rt.poolUsagePct ?? db.poolUsagePct} unit="%" warn={70} danger={90} />
        <HealthCard label="Query Time (ms)" value={rt.avgQueryMs ?? db.avgQueryMs} unit="ms" warn={100} danger={500} />
        <HealthCard label="Replication Lag (s)" value={rt.replicationLagSec ?? db.replicationLagSec} unit="s" warn={5} danger={30} />
        <StatTile label="Total Rows" value={formatNumber(db.totalRows)} />
        <StatTile label="DB Size" value={formatBytes(db.sizeBytes)} />
        <StatTile label="Slow Queries (1h)" value={formatNumber(db.slowQueries1h)} />
      </div>
    </section>
  );
}

/** Biometric enrollment management */
function BiometricManagement({ api }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/biometrics/enrollments').then((d) => {
      setEnrollments(d.enrollments ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  const revoke = async (userId) => {
    if (!confirm('Revoke biometric enrollment for this user?')) return;
    try {
      await api(`/admin/biometrics/enrollments/${userId}`, { method: 'DELETE' });
      setEnrollments((e) => e.filter((x) => x.userId !== userId));
    } catch (e) { alert(e.message); }
  };

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Biometric Enrollment</h2>
      {loading && <p style={styles.muted}>Loading…</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['User', 'Email', 'Type', 'Enrolled At', 'Device', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.userId} style={styles.tr}>
                <td style={styles.td}>{e.name}</td>
                <td style={styles.td}>{e.email}</td>
                <td style={styles.td}>{e.biometricType}</td>
                <td style={styles.td}>{new Date(e.enrolledAt).toLocaleString()}</td>
                <td style={styles.td}>{e.deviceId}</td>
                <td style={styles.td}>
                  <button style={{ ...styles.btnSm, background: '#ef4444' }}
                    onClick={() => revoke(e.userId)}>Revoke</button>
                </td>
              </tr>
            ))}
            {!loading && enrollments.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center' }}>No enrollments</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Navigation tabs
// ---------------------------------------------------------------------------
const TABS = [
  'Overview',
  'Users',
  'Audit Log',
  'Security Alerts',
  'Security Policies',
  'API Metrics',
  'Database',
  'Biometrics',
];

// ---------------------------------------------------------------------------
// Main AdminDashboard component
// ---------------------------------------------------------------------------
export default function AdminDashboard({ adminToken }) {
  const [tab, setTab] = useState('Overview');
  const [health, setHealth] = useState({});
  const [stats, setStats] = useState({});
  const [realtimeMetrics, setRealtimeMetrics] = useState({});
  const [initError, setInitError] = useState(null);

  if (!adminToken) {
    return (
      <div style={{ ...styles.root, color: '#ef4444', padding: 40 }}>
        Admin JWT required. This dashboard is restricted to admin-role users only.
      </div>
    );
  }

  const api = useAdminApi(adminToken);

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      api('/admin/system-health').then(setHealth),
      api('/admin/stats').then(setStats),
    ]).catch((e) => setInitError(e.message));
  }, [api]);

  // Real-time metrics via WebSocket
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'system_health') setHealth(msg.data);
    if (msg.type === 'realtime_metrics') setRealtimeMetrics(msg.data);
  }, []);

  useAdminSocket(adminToken, handleWsMessage);

  // Poll as fallback if WS is not available
  useEffect(() => {
    const id = setInterval(() => {
      api('/admin/system-health').then(setHealth).catch(() => {});
    }, METRICS_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [api]);

  return (
    <AdminAuthContext.Provider value={{ token: adminToken, api }}>
      <div style={styles.root}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Nexus AI Pro — Admin Dashboard</h1>
            <span style={styles.roleBadge}>ADMIN</span>
          </div>
          <div style={styles.muted}>Real-time monitoring active</div>
        </header>

        {initError && (
          <div style={styles.errorBanner}>
            Failed to load dashboard: {initError}
          </div>
        )}

        <nav style={styles.nav}>
          {TABS.map((t) => (
            <button
              key={t}
              style={{ ...styles.navBtn, ...(tab === t ? styles.navBtnActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>

        <main style={styles.main}>
          {tab === 'Overview' && (
            <>
              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>System Health</h2>
                <div style={styles.grid}>
                  <HealthCard label="CPU Usage" value={health.cpuPct} unit="%" warn={70} danger={90} />
                  <HealthCard label="Memory Usage" value={health.memPct} unit="%" warn={75} danger={90} />
                  <HealthCard label="Disk Usage" value={health.diskPct} unit="%" warn={80} danger={95} />
                  <HealthCard label="Network Rx (Mbps)" value={health.networkRxMbps} unit=" Mbps" warn={800} danger={950} />
                  <HealthCard label="Network Tx (Mbps)" value={health.networkTxMbps} unit=" Mbps" warn={800} danger={950} />
                </div>
              </section>

              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Platform Statistics</h2>
                <div style={styles.grid}>
                  <StatTile label="DAU" value={formatNumber(stats.dau)} delta={stats.dauDelta} />
                  <StatTile label="MAU" value={formatNumber(stats.mau)} delta={stats.mauDelta} />
                  <StatTile label="Revenue (MRR)" value={stats.mrr ? `$${formatNumber(stats.mrr)}` : '—'} delta={stats.mrrDelta} />
                  <StatTile label="Total Users" value={formatNumber(stats.totalUsers)} />
                  <StatTile label="Active Sessions" value={formatNumber(stats.activeSessions)} />
                  <StatTile label="API Calls Today" value={formatNumber(stats.apiCallsToday)} />
                </div>
              </section>
            </>
          )}
          {tab === 'Users'            && <UserManagement api={api} />}
          {tab === 'Audit Log'        && <AuditLog api={api} />}
          {tab === 'Security Alerts'  && <SecurityAlerts api={api} />}
          {tab === 'Security Policies'&& <SecurityPolicies api={api} />}
          {tab === 'API Metrics'      && <ApiMetrics realtimeMetrics={realtimeMetrics} />}
          {tab === 'Database'         && <DatabaseHealth api={api} realtimeMetrics={realtimeMetrics} />}
          {tab === 'Biometrics'       && <BiometricManagement api={api} />}
        </main>
      </div>
    </AdminAuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------
const styles = {
  root: {
    fontFamily: 'system-ui, sans-serif',
    background: '#0f172a',
    color: '#e2e8f0',
    minHeight: '100vh',
  },
  header: {
    background: '#1e293b',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
  },
  headerTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
  roleBadge: {
    background: '#7c3aed',
    color: '#fff',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    marginLeft: 8,
    letterSpacing: 1,
  },
  nav: {
    display: 'flex',
    gap: 4,
    padding: '8px 24px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    flexWrap: 'wrap',
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  navBtnActive: { background: '#334155', color: '#f1f5f9' },
  main: { padding: 24 },
  section: {
    background: '#1e293b',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    border: '1px solid #334155',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  card: {
    background: '#0f172a',
    borderRadius: 8,
    padding: 14,
    border: '1px solid #334155',
  },
  cardLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  progressTrack: { background: '#334155', borderRadius: 4, height: 6, marginTop: 8 },
  progressBar: { height: 6, borderRadius: 4, transition: 'width 0.4s' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: '1px solid #334155',
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #1e293b', verticalAlign: 'middle' },
  tr: { background: 'transparent' },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    color: '#fff',
    fontWeight: 600,
  },
  btn: {
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    padding: '7px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  btnOutline: {
    background: 'none',
    color: '#94a3b8',
    border: '1px solid #475569',
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  btnSm: {
    background: '#334155',
    color: '#e2e8f0',
    border: 'none',
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    marginRight: 4,
  },
  input: {
    background: '#0f172a',
    border: '1px solid #475569',
    borderRadius: 6,
    color: '#e2e8f0',
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    minWidth: 160,
  },
  formLabel: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  modal: {
    background: '#0f172a',
    border: '1px solid #475569',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  error: { color: '#ef4444', fontSize: 13 },
  errorBanner: {
    background: '#450a0a',
    borderLeft: '4px solid #ef4444',
    color: '#fca5a5',
    padding: '10px 20px',
    fontSize: 13,
  },
  muted: { color: '#64748b', fontSize: 13 },
  alertCard: {
    background: '#0f172a',
    borderLeft: '4px solid #ef4444',
    borderRadius: 6,
    padding: '12px 16px',
  },
};
