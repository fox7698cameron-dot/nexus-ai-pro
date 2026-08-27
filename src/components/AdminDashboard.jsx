/**
 * AdminDashboard.jsx
 * Nexus AI Pro — Admin Dashboard (Role: admin only)
 * Date: 2026-08-27
 * Features: user management, audit logs, system health, subscription overrides,
 *           connector status, real-time metrics
 * Separated from user/developer/moderator dashboards
 * Platforms: Web, Electron, Desktop, Tablet, Mobile
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Mock system data (replace with /api/admin/* calls) ────────────────────────
function buildSystemHealth() {
  return {
    cpuUsage:    Math.round(20 + Math.random() * 40),
    memUsageMB:  Math.round(400 + Math.random() * 600),
    memTotalMB:  2048,
    diskUsedGB:  Math.round(10 + Math.random() * 20),
    diskTotalGB: 100,
    uptime:      Math.round(Date.now() / 1000 - 86400 * 3),
    requestsMin: Math.round(100 + Math.random() * 500),
    activeUsers: Math.round(10 + Math.random() * 80),
    activeWS:    Math.round(5 + Math.random() * 30),
  };
}

function buildUsers() {
  return [
    { id: 'u1', username: 'CamFox🦊',  email: 'cam@nexusai.pro', role: 'admin',     status: 'active',   tier: 'enterprise', lastSeen: Date.now() - 120_000  },
    { id: 'u2', username: 'devUser01', email: 'dev1@test.com',   role: 'developer', status: 'active',   tier: 'pro',        lastSeen: Date.now() - 900_000  },
    { id: 'u3', username: 'mod_team',  email: 'mod@test.com',    role: 'moderator', status: 'active',   tier: 'pro',        lastSeen: Date.now() - 3_600_000},
    { id: 'u4', username: 'jane_doe',  email: 'jane@test.com',   role: 'user',      status: 'active',   tier: 'free',       lastSeen: Date.now() - 86_400_000},
    { id: 'u5', username: '用户五',    email: 'user5@test.com',  role: 'user',      status: 'suspended', tier: 'free',      lastSeen: Date.now() - 172_800_000},
  ];
}

function buildAuditLog() {
  const events = [
    { level: 'info',  msg: 'User login: CamFox🦊'          },
    { level: 'warn',  msg: 'Failed login attempt from 10.0.0.5' },
    { level: 'info',  msg: 'Subscription upgraded: pro → enterprise' },
    { level: 'error', msg: 'Security scan: 2 vulnerabilities found' },
    { level: 'info',  msg: 'Key rotation completed'          },
    { level: 'warn',  msg: 'High CPU usage: 78%'             },
    { level: 'info',  msg: 'New user registered: jane_doe'   },
  ];
  return events.map((e, i) => ({
    ...e,
    id: `log-${i}`,
    ts: new Date(Date.now() - i * 180_000).toLocaleString(),
  }));
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function pct(used, total) { return Math.round((used / total) * 100); }
function barColor(p) {
  if (p > 80) return '#ef4444';
  if (p > 60) return '#eab308';
  return '#22c55e';
}
function relTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)    return 'now';
  if (diff < 3_600_000) return `${Math.round(diff/60_000)}m ago`;
  if (diff < 86_400_000)return `${Math.round(diff/3_600_000)}h ago`;
  return `${Math.round(diff/86_400_000)}d ago`;
}

const ROLE_COLORS = { admin: '#ef4444', developer: '#6366f1', moderator: '#f97316', user: '#22c55e' };
const TIER_COLORS = { enterprise: '#a855f7', pro: '#6366f1', free: '#64748b', lifetime: '#f97316' };
const LOG_COLORS  = { info: '#22c55e', warn: '#eab308', error: '#ef4444' };

// ── Health Gauge ──────────────────────────────────────────────────────────────
function HealthBar({ label, used, total, unit = '%' }) {
  const p = pct(used, total);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: barColor(p) }}>{used}{unit} / {total}{unit} ({p}%)</span>
      </div>
      <div style={{ background: '#334155', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: barColor(p), transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ── User Table ────────────────────────────────────────────────────────────────
function UserTable({ users, onAction }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>👥 Users ({users.length})</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHead}>
              {['Username','Email','Role','Tier','Status','Last Seen','Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={styles.tr}>
                <td style={styles.td}><span style={{ fontSize: 14 }}>{u.username}</span></td>
                <td style={{ ...styles.td, color: '#94a3b8', fontSize: 12 }}>{u.email}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: ROLE_COLORS[u.role] + '22', color: ROLE_COLORS[u.role] }}>
                    {u.role}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: TIER_COLORS[u.tier] + '22', color: TIER_COLORS[u.tier] }}>
                    {u.tier}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: u.status === 'active' ? '#052e16' : '#450a0a', color: u.status === 'active' ? '#22c55e' : '#ef4444' }}>
                    {u.status}
                  </span>
                </td>
                <td style={{ ...styles.td, color: '#64748b', fontSize: 12 }}>{relTime(u.lastSeen)}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => onAction('edit', u)} style={styles.actionBtn}>Edit</button>
                    <button onClick={() => onAction(u.status === 'active' ? 'suspend' : 'activate', u)}
                      style={{ ...styles.actionBtn, color: u.status === 'active' ? '#ef4444' : '#22c55e' }}>
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Audit Log Panel ───────────────────────────────────────────────────────────
function AuditPanel({ entries }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>📋 Audit Log</div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {entries.map(e => (
          <div key={e.id} style={styles.logRow}>
            <span style={{ color: '#475569', fontSize: 11 }}>{e.ts}</span>
            <span style={{ color: LOG_COLORS[e.level], fontWeight: 700, fontSize: 11 }}>[{e.level.toUpperCase()}]</span>
            <span style={{ color: '#cbd5e1', fontSize: 12 }}>{e.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [health,   setHealth]   = useState(buildSystemHealth());
  const [users,    setUsers]    = useState(buildUsers());
  const [auditLog, setAuditLog] = useState(buildAuditLog());
  const [tab,      setTab]      = useState('overview');

  // Real-time refresh
  useEffect(() => {
    const timer = setInterval(() => setHealth(buildSystemHealth()), 5_000);
    return () => clearInterval(timer);
  }, []);

  const handleUserAction = useCallback((action, user) => {
    if (action === 'suspend' || action === 'activate') {
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, status: action === 'suspend' ? 'suspended' : 'active' } : u
      ));
    }
  }, []);

  const uptimeDays = Math.floor(health.uptime / 86400);

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👑 Admin Dashboard</h1>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            System uptime: {uptimeDays}d · {health.activeUsers} active users · {health.requestsMin} req/min
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['overview','users','audit','connectors'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          {/* Stat tiles */}
          <div style={styles.statGrid}>
            {[
              { label: 'Active Users', value: health.activeUsers, color: '#22c55e' },
              { label: 'Active WebSockets', value: health.activeWS, color: '#6366f1' },
              { label: 'Requests/min', value: health.requestsMin, color: '#06b6d4' },
              { label: 'CPU Usage', value: `${health.cpuUsage}%`, color: barColor(health.cpuUsage) },
            ].map(s => (
              <div key={s.label} style={styles.statTile}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Health bars */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>🖥 System Health</div>
            <div style={{ padding: '16px 20px' }}>
              <HealthBar label="CPU" used={health.cpuUsage} total={100} />
              <HealthBar label="Memory" used={health.memUsageMB} total={health.memTotalMB} unit=" MB" />
              <HealthBar label="Disk" used={health.diskUsedGB} total={health.diskTotalGB} unit=" GB" />
            </div>
          </div>
        </>
      )}

      {tab === 'users'      && <UserTable users={users} onAction={handleUserAction} />}
      {tab === 'audit'      && <AuditPanel entries={auditLog} />}
      {tab === 'connectors' && (
        <div style={styles.panel}>
          <div style={styles.panelTitle}>🔗 Platform Connectors</div>
          <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>
            Configure platform API keys in your <code>.env</code> file.
            See <strong>DEPLOYMENT_GUIDE.md</strong> for required environment variables.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    background: '#0f172a',
    minHeight: '100vh',
    color: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: 20,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  tabBtn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 13,
  },
  tabBtnActive: { background: '#6366f1', borderColor: '#6366f1', color: '#fff' },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  statTile: {
    background: '#1e293b',
    borderRadius: 12,
    padding: '16px 20px',
    border: '1px solid #334155',
    textAlign: 'center',
  },
  panel: {
    background: '#1e293b',
    borderRadius: 12,
    border: '1px solid #334155',
    overflow: 'hidden',
    marginBottom: 20,
  },
  panelTitle: {
    padding: '12px 20px',
    borderBottom: '1px solid #334155',
    fontWeight: 600,
    fontSize: 14,
    color: '#f1f5f9',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#0f172a' },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  tr: { borderBottom: '1px solid #0f172a' },
  td: { padding: '12px 14px', fontSize: 13, color: '#e2e8f0' },
  badge: {
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-block',
  },
  actionBtn: {
    padding: '3px 10px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 11,
  },
  logRow: {
    display: 'flex',
    gap: 8,
    padding: '6px 16px',
    borderBottom: '1px solid #0f172a',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
};
