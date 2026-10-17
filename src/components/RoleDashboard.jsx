/**
 * RoleDashboard.jsx
 * Nexus AI Pro — Role-Based Dashboard Router
 * Admin / Developer / Moderator / User separate dashboards
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    color: '#f56565',
    badge: '🛡',
    nav: ['Users', 'System', 'Audit Log', 'Settings'],
  },
  developer: {
    label: 'Developer',
    color: '#63b3ed',
    badge: '⚙',
    nav: ['API Keys', 'Webhooks', 'Coverage', 'Build Logs', 'Connectors'],
  },
  moderator: {
    label: 'Moderator',
    color: '#f6ad55',
    badge: '🔍',
    nav: ['Content Queue', 'Reports', 'Flags', 'Actions'],
  },
  user: {
    label: 'User',
    color: '#68d391',
    badge: '👤',
    nav: ['Profile', 'Subscription', 'Apps', 'Activity'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
/** @param {string} token @returns {{ userId: string, role: string, email: string } | null} */
function parseJWT(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch { return null; }
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ token, activeNav }) {
  const hdrs = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [audit,   setAudit]   = useState([]);
  const [sysStats,setSysStats]= useState(null);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`, { headers: hdrs });
      if (r.ok) setUsers(await r.json());
    } finally { setLoading(false); }
  }, [search, token]);

  const loadAudit = useCallback(async () => {
    const r = await fetch('/api/admin/audit?limit=50', { headers: hdrs });
    if (r.ok) setAudit(await r.json());
  }, [token]);

  const loadStats = useCallback(async () => {
    const r = await fetch('/api/admin/stats', { headers: hdrs });
    if (r.ok) setSysStats(await r.json());
  }, [token]);

  useEffect(() => {
    if (activeNav === 'Users')     loadUsers();
    if (activeNav === 'Audit Log') loadAudit();
    if (activeNav === 'System')    loadStats();
  }, [activeNav, loadUsers, loadAudit, loadStats]);

  const banUser = async (userId, banned) => {
    await fetch(`/api/admin/users/${userId}/${banned ? 'ban' : 'unban'}`, { method: 'POST', headers: hdrs });
    loadUsers();
  };

  const changeRole = async (userId, role) => {
    await fetch(`/api/admin/users/${userId}/role`, { method: 'PUT', headers: hdrs, body: JSON.stringify({ role }) });
    loadUsers();
  };

  if (activeNav === 'System') return (
    <div>
      <h3>System Stats</h3>
      {sysStats ? (
        <div className="stats-grid">
          {Object.entries(sysStats).map(([k, v]) => (
            <div key={k} className="stat-tile">
              <div className="stat-label">{k}</div>
              <div className="stat-value">{String(v)}</div>
            </div>
          ))}
        </div>
      ) : <p className="empty-msg">Loading…</p>}
    </div>
  );

  if (activeNav === 'Audit Log') return (
    <div>
      <h3>Audit Log</h3>
      <div className="audit-list">
        {audit.map((e, i) => (
          <div key={i} className="audit-row">
            <span className="audit-ts">{new Date(e.timestamp).toLocaleString()}</span>
            <span className="audit-event">{e.event}</span>
            <span className="audit-detail">{JSON.stringify(e.details).slice(0, 80)}</span>
          </div>
        ))}
        {audit.length === 0 && <p className="empty-msg">No audit entries.</p>}
      </div>
    </div>
  );

  return (
    <div>
      <h3>User Management</h3>
      <div className="search-bar">
        <input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn-ghost" onClick={loadUsers}>Search</button>
      </div>
      {loading && <p className="empty-msg">Loading…</p>}
      <div className="user-table-wrap">
        <table className="user-table">
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={u.banned ? 'user-banned' : ''}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <select defaultValue={u.role} onChange={e => changeRole(u.id, e.target.value)} className="role-select">
                    {['user','moderator','developer','admin'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td><span className={`user-status ${u.banned ? 'status-banned' : 'status-active'}`}>{u.banned ? 'Banned' : 'Active'}</span></td>
                <td>
                  <button className={`btn-sm ${u.banned ? 'btn-success' : 'btn-danger'}`}
                    onClick={() => banUser(u.id, !u.banned)}>{u.banned ? 'Unban' : 'Ban'}</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && <tr><td colSpan={5} className="empty-msg">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Developer Dashboard ───────────────────────────────────────────────────────
function DevDashboard({ token, activeNav }) {
  const hdrs = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [apiKeys,  setApiKeys]  = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [buildLogs,setBuildLogs]= useState([]);

  useEffect(() => {
    if (activeNav === 'API Keys')  fetch('/api/dev/api-keys',  { headers: hdrs }).then(r => r.json()).then(setApiKeys).catch(() => {});
    if (activeNav === 'Webhooks')  fetch('/api/dev/webhooks',  { headers: hdrs }).then(r => r.json()).then(setWebhooks).catch(() => {});
    if (activeNav === 'Coverage')  fetch('/api/dev/coverage',  { headers: hdrs }).then(r => r.json()).then(setCoverage).catch(() => {});
    if (activeNav === 'Build Logs')fetch('/api/dev/builds',    { headers: hdrs }).then(r => r.json()).then(setBuildLogs).catch(() => {});
  }, [activeNav, token]);

  const createKey = async () => {
    const r = await fetch('/api/dev/api-keys', { method: 'POST', headers: hdrs });
    if (r.ok) { const k = await r.json(); setApiKeys(prev => [k, ...prev]); }
  };

  const revokeKey = async (id) => {
    await fetch(`/api/dev/api-keys/${id}`, { method: 'DELETE', headers: hdrs });
    setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  if (activeNav === 'API Keys') return (
    <div>
      <div className="section-header">
        <h3>API Keys</h3>
        <button className="btn-primary" onClick={createKey}>+ New Key</button>
      </div>
      {apiKeys.map(k => (
        <div key={k.id} className="key-row">
          <code className="key-val">{k.key}</code>
          <span className="key-meta">Created {new Date(k.createdAt).toLocaleDateString()}</span>
          <button className="btn-danger sm" onClick={() => revokeKey(k.id)}>Revoke</button>
        </div>
      ))}
    </div>
  );

  if (activeNav === 'Webhooks') return (
    <div>
      <h3>Webhooks</h3>
      {webhooks.map(w => (
        <div key={w.id} className="webhook-row">
          <span className="webhook-url">{w.url}</span>
          <span className={`webhook-status ${w.active ? 'status-active' : 'status-banned'}`}>{w.active ? 'Active' : 'Inactive'}</span>
          <span className="webhook-events">{(w.events ?? []).join(', ')}</span>
        </div>
      ))}
      {webhooks.length === 0 && <p className="empty-msg">No webhooks configured.</p>}
    </div>
  );

  if (activeNav === 'Coverage') return (
    <div>
      <h3>Code Coverage</h3>
      {coverage ? (
        <div className="coverage-grid">
          {Object.entries(coverage).map(([k, v]) => (
            <div key={k} className="coverage-tile">
              <div className="coverage-label">{k}</div>
              <div className="coverage-bar-wrap">
                <div className="coverage-bar" style={{ width: `${v}%`, background: v >= 80 ? '#48bb78' : v >= 50 ? '#d69e2e' : '#f56565' }} />
              </div>
              <div className="coverage-pct" style={{ color: v >= 80 ? '#48bb78' : v >= 50 ? '#d69e2e' : '#f56565' }}>{v}%</div>
            </div>
          ))}
        </div>
      ) : <p className="empty-msg">Loading coverage…</p>}
    </div>
  );

  if (activeNav === 'Build Logs') return (
    <div>
      <h3>Build Logs</h3>
      {buildLogs.map(b => (
        <div key={b.id} className="build-log-row">
          <span className={`build-status build-${b.status}`}>{b.status}</span>
          <span>{b.branch}</span>
          <span className="build-ts">{new Date(b.startedAt).toLocaleString()}</span>
          <details><summary>Logs</summary><pre className="build-log-pre">{b.log}</pre></details>
        </div>
      ))}
      {buildLogs.length === 0 && <p className="empty-msg">No builds yet.</p>}
    </div>
  );

  return <p className="empty-msg">Select a section.</p>;
}

// ── Moderator Dashboard ───────────────────────────────────────────────────────
function ModDashboard({ token, activeNav }) {
  const hdrs   = { Authorization: `Bearer ${token}` };
  const [items, setItems] = useState([]);

  useEffect(() => {
    const ep = activeNav === 'Content Queue' ? '/api/mod/queue' : activeNav === 'Reports' ? '/api/mod/reports' : '/api/mod/flags';
    fetch(ep, { headers: hdrs }).then(r => r.json()).then(setItems).catch(() => setItems([]));
  }, [activeNav, token]);

  const action = async (id, act) => {
    await fetch(`/api/mod/items/${id}/${act}`, { method: 'POST', headers: hdrs });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div>
      <h3>{activeNav}</h3>
      {items.map(item => (
        <div key={item.id} className="mod-item">
          <div className="mod-content">{item.content ?? item.reason ?? item.description}</div>
          <div className="mod-meta">
            <span>by {item.author ?? 'unknown'}</span>
            <span>{new Date(item.createdAt).toLocaleString()}</span>
          </div>
          <div className="mod-actions">
            <button className="btn-success sm" onClick={() => action(item.id, 'approve')}>Approve</button>
            <button className="btn-danger sm"  onClick={() => action(item.id, 'remove')}>Remove</button>
            <button className="btn-ghost sm"   onClick={() => action(item.id, 'warn')}>Warn</button>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="empty-msg">Queue is clear!</p>}
    </div>
  );
}

// ── User Dashboard ────────────────────────────────────────────────────────────
function UserDashboard({ token, activeNav, user }) {
  const hdrs = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [profile, setProfile] = useState(user);
  const [apps,    setApps]    = useState([]);
  const [activity,setActivity]= useState([]);
  const [sub,     setSub]     = useState(null);

  useEffect(() => {
    if (activeNav === 'Apps')     fetch('/api/user/apps',     { headers: hdrs }).then(r => r.json()).then(setApps).catch(() => {});
    if (activeNav === 'Activity') fetch('/api/user/activity', { headers: hdrs }).then(r => r.json()).then(setActivity).catch(() => {});
    if (activeNav === 'Subscription') fetch('/api/payments/subscription', { headers: hdrs }).then(r => r.json()).then(setSub).catch(() => {});
  }, [activeNav, token]);

  if (activeNav === 'Profile') return (
    <div className="profile-section">
      <div className="profile-avatar">{profile?.username?.[0]?.toUpperCase() ?? '?'}</div>
      <div className="profile-info">
        <div className="profile-name">{profile?.username}</div>
        <div className="profile-email">{profile?.email}</div>
        <div className="profile-meta">Role: <span className="role-chip">{profile?.role}</span></div>
      </div>
    </div>
  );

  if (activeNav === 'Subscription') return (
    <div>
      <h3>Subscription</h3>
      {sub ? (
        <div className="sub-info">
          <div>Plan: <strong>{sub.plan}</strong></div>
          <div>Status: <span className={sub.active ? 'status-active' : 'status-banned'}>{sub.active ? 'Active' : 'Inactive'}</span></div>
          {sub.endsAt && <div>Renews: {new Date(sub.endsAt).toLocaleDateString()}</div>}
        </div>
      ) : <p className="empty-msg">Loading…</p>}
    </div>
  );

  if (activeNav === 'Apps') return (
    <div>
      <h3>Connected Apps</h3>
      {apps.map(a => (
        <div key={a.id} className="app-row">
          <span className="app-name">{a.name}</span>
          <span className={`app-status ${a.connected ? 'status-active' : 'status-banned'}`}>{a.connected ? 'Connected' : 'Disconnected'}</span>
          <span className="app-last-sync">Last sync: {a.lastSync ? new Date(a.lastSync).toLocaleDateString() : 'Never'}</span>
        </div>
      ))}
      {apps.length === 0 && <p className="empty-msg">No apps connected.</p>}
    </div>
  );

  if (activeNav === 'Activity') return (
    <div>
      <h3>Activity History</h3>
      {activity.map((a, i) => (
        <div key={i} className="activity-row">
          <span className="activity-ts">{new Date(a.timestamp).toLocaleString()}</span>
          <span>{a.action}</span>
        </div>
      ))}
      {activity.length === 0 && <p className="empty-msg">No recent activity.</p>}
    </div>
  );

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
/**
 * @param {{ token: string }} props
 */
export default function RoleDashboard({ token }) {
  const user    = token ? parseJWT(token) : null;
  const role    = user?.role ?? 'user';
  const cfg     = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
  const [activeNav, setActiveNav] = useState(cfg.nav[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) return <div className="rd-root"><p className="empty-msg">Not authenticated.</p></div>;

  const DashComp =
    role === 'admin'     ? AdminDashboard :
    role === 'developer' ? DevDashboard   :
    role === 'moderator' ? ModDashboard   :
                           UserDashboard;

  return (
    <div className="rd-root">
      <style>{RD_CSS}</style>

      {/* Top nav */}
      <header className="rd-header">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(s => !s)}>☰</button>
        <span className="rd-logo">⬡ Nexus AI Pro</span>
        <span className="role-badge" style={{ background: cfg.color + '33', color: cfg.color, border: `1px solid ${cfg.color}` }}>
          {cfg.badge} {cfg.label}
        </span>
        <span className="rd-user">{user.email}</span>
      </header>

      <div className="rd-body">
        {/* Sidebar */}
        <aside className={`rd-sidebar${sidebarOpen ? '' : ' rd-sidebar-closed'}`}>
          {cfg.nav.map(item => (
            <button key={item}
              className={`sidebar-item${activeNav === item ? ' active' : ''}`}
              style={activeNav === item ? { borderLeftColor: cfg.color, color: cfg.color } : {}}
              onClick={() => setActiveNav(item)}>
              {item}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="rd-content">
          <DashComp token={token} activeNav={activeNav} user={user} />
        </main>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const RD_CSS = `
:root{--bg:#0f1117;--surface:#1a1d27;--border:#2a2d3a;--text:#e2e8f0;--muted:#718096;--radius:8px;}
@media(prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#f7f8fc;--surface:#fff;--border:#e2e8f0;--text:#1a202c;--muted:#4a5568;}}
.rd-root{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column;}
.rd-header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--surface);border-bottom:1px solid var(--border);flex-wrap:wrap;}
.sidebar-toggle{background:none;border:none;color:var(--text);font-size:1.2rem;cursor:pointer;}
.rd-logo{font-weight:700;font-size:1.1rem;margin-right:auto;}
.role-badge{font-size:.78rem;padding:3px 10px;border-radius:9999px;}
.rd-user{font-size:.82rem;color:var(--muted);}
.rd-body{display:flex;flex:1;}
.rd-sidebar{background:var(--surface);border-right:1px solid var(--border);width:180px;min-height:calc(100vh - 50px);display:flex;flex-direction:column;padding:12px 0;transition:width .2s;}
.rd-sidebar-closed{width:0;overflow:hidden;padding:0;}
.sidebar-item{background:none;border:none;border-left:3px solid transparent;color:var(--muted);padding:10px 16px;text-align:left;cursor:pointer;font-size:.9rem;width:100%;}
.sidebar-item:hover{color:var(--text);}
.sidebar-item.active{color:var(--text);}
.rd-content{flex:1;padding:20px;overflow-y:auto;}
.rd-content h3{margin:0 0 16px;font-size:1.15rem;}
.empty-msg{color:var(--muted);font-style:italic;}
.search-bar{display:flex;gap:8px;margin-bottom:16px;}
.search-bar input{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:8px 12px;}
.btn-ghost{background:none;border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:6px 14px;cursor:pointer;}
.btn-primary{background:#3182ce;color:#fff;border:none;border-radius:var(--radius);padding:6px 14px;cursor:pointer;}
.btn-success{background:none;border:1px solid #48bb78;color:#48bb78;border-radius:6px;padding:4px 10px;cursor:pointer;}
.btn-danger{background:none;border:1px solid #f56565;color:#f56565;border-radius:6px;padding:4px 10px;cursor:pointer;}
.btn-success.sm,.btn-danger.sm,.btn-ghost.sm{font-size:.8rem;padding:3px 8px;}
.user-table-wrap{overflow-x:auto;}
.user-table{width:100%;border-collapse:collapse;font-size:.88rem;}
.user-table th{text-align:left;padding:8px 12px;background:var(--surface);border-bottom:1px solid var(--border);color:var(--muted);}
.user-table td{padding:8px 12px;border-bottom:1px solid var(--border);}
.user-banned td{opacity:.6;}
.user-status,.app-status{font-size:.75rem;padding:2px 8px;border-radius:9999px;}
.status-active{background:rgba(72,187,120,.2);color:#48bb78;}
.status-banned{background:rgba(245,101,101,.2);color:#f56565;}
.role-select{background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:2px 6px;font-size:.8rem;}
.audit-list{display:flex;flex-direction:column;gap:4px;}
.audit-row{display:flex;gap:12px;font-size:.82rem;padding:6px 0;border-bottom:1px solid var(--border);}
.audit-ts{color:var(--muted);white-space:nowrap;}
.audit-event{font-weight:600;white-space:nowrap;}
.audit-detail{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
.stat-tile{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;}
.stat-label{font-size:.75rem;color:var(--muted);margin-bottom:4px;}
.stat-value{font-size:1.4rem;font-weight:700;}
.key-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);}
.key-val{flex:1;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;background:var(--surface);padding:4px 8px;border-radius:4px;}
.key-meta{font-size:.75rem;color:var(--muted);white-space:nowrap;}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.section-header h3{margin:0;}
.webhook-row{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:.85rem;align-items:center;}
.webhook-url{flex:1;overflow:hidden;text-overflow:ellipsis;color:#63b3ed;}
.webhook-events{font-size:.75rem;color:var(--muted);}
.coverage-grid{display:flex;flex-direction:column;gap:10px;}
.coverage-tile{display:flex;align-items:center;gap:12px;}
.coverage-label{width:100px;font-size:.85rem;}
.coverage-bar-wrap{flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;}
.coverage-bar{height:100%;border-radius:4px;transition:width .5s;}
.coverage-pct{width:40px;text-align:right;font-size:.85rem;font-weight:600;}
.build-log-row{padding:10px 0;border-bottom:1px solid var(--border);}
.build-status{font-size:.75rem;padding:2px 8px;border-radius:9999px;margin-right:10px;}
.build-success{background:rgba(72,187,120,.2);color:#48bb78;}
.build-failed{background:rgba(245,101,101,.2);color:#f56565;}
.build-running{background:rgba(49,130,206,.2);color:#63b3ed;}
.build-ts{color:var(--muted);font-size:.8rem;margin-left:12px;}
.build-log-pre{background:var(--bg);border-radius:4px;padding:10px;font-size:.75rem;overflow-x:auto;white-space:pre;}
.mod-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:10px;}
.mod-content{margin-bottom:6px;}
.mod-meta{display:flex;gap:16px;font-size:.78rem;color:var(--muted);margin-bottom:8px;}
.mod-actions{display:flex;gap:8px;}
.profile-section{display:flex;align-items:center;gap:20px;padding:16px;}
.profile-avatar{width:64px;height:64px;border-radius:50%;background:#3182ce;color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;}
.profile-name{font-size:1.2rem;font-weight:600;}
.profile-email{color:var(--muted);font-size:.9rem;}
.profile-meta{margin-top:4px;font-size:.85rem;}
.role-chip{background:var(--surface);border:1px solid var(--border);border-radius:9999px;padding:1px 8px;font-size:.78rem;}
.sub-info{display:flex;flex-direction:column;gap:8px;font-size:.9rem;}
.app-row,.activity-row{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-size:.85rem;align-items:center;}
.app-name,.activity-ts{font-weight:600;}
.app-last-sync{color:var(--muted);}
.activity-ts{color:var(--muted);}
@media(max-width:640px){.rd-sidebar{position:fixed;z-index:100;height:100vh;top:0;left:0;} .rd-sidebar-closed{width:0;}}
`;
