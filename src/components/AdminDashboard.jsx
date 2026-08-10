// ================================================
// NEXUS AI PRO - Role-Based Dashboards
// Admin | Developer | Moderator | User
// 2026-08-10 | Version 2.1.0
// ================================================

import React, { useState, useEffect, useCallback } from 'react';

// ── Role definitions ─────────────────────────────
const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    icon: '👑',
    color: '#f59e0b',
    description: 'Full system access',
    navItems: ['overview', 'users', 'security', 'analytics', 'connectors', 'billing', 'audit', 'system']
  },
  dev: {
    label: 'Developer',
    icon: '🔧',
    color: '#60a5fa',
    description: 'Development & API access',
    navItems: ['overview', 'projects', 'analytics', 'connectors', 'api-keys', 'security']
  },
  moderator: {
    label: 'Moderator',
    icon: '🛡️',
    color: '#a78bfa',
    description: 'Content & community management',
    navItems: ['overview', 'users', 'reports', 'analytics']
  },
  user: {
    label: 'User',
    icon: '👤',
    color: '#4ade80',
    description: 'Standard user access',
    navItems: ['overview', 'projects', 'analytics', 'billing']
  }
};

const NAV_LABELS = {
  overview:   { icon: '🏠', label: 'Overview' },
  users:      { icon: '👥', label: 'Users' },
  security:   { icon: '🛡️', label: 'Security' },
  analytics:  { icon: '📊', label: 'Analytics' },
  connectors: { icon: '🔗', label: 'Connectors' },
  billing:    { icon: '💳', label: 'Billing' },
  audit:      { icon: '📋', label: 'Audit Log' },
  system:     { icon: '⚙️', label: 'System' },
  projects:   { icon: '🗂️', label: 'Projects' },
  'api-keys': { icon: '🔑', label: 'API Keys' },
  reports:    { icon: '⚠️', label: 'Reports' }
};

// ── Stat card ────────────────────────────────────
function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px', flex: '1 1 160px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {trend != null && (
          <span style={{ fontSize: 11, color: trend >= 0 ? '#4ade80' : '#f87171', background: trend >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || '#fff', marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── User row (admin users panel) ─────────────────
function UserRow({ user, onRoleChange }) {
  const [roleLoading, setRoleLoading] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#94a3b8' }}>
        {user.username?.[0]?.toUpperCase() || '?'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{user.displayName || user.username}</div>
        <div style={{ fontSize: 11, color: '#475569' }}>{user.email}</div>
      </div>
      <span style={{ fontSize: 11, color: ROLE_CONFIG[user.role]?.color || '#6b7280', background: `${ROLE_CONFIG[user.role]?.color || '#6b7280'}20`, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
        {ROLE_CONFIG[user.role]?.icon} {user.role}
      </span>
      <select
        value={user.role}
        onChange={async e => { setRoleLoading(true); await onRoleChange(user.id, e.target.value); setRoleLoading(false); }}
        disabled={roleLoading}
        style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#aaa', padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
      >
        {Object.keys(ROLE_CONFIG).map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <span style={{ fontSize: 11, color: '#334155' }}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</span>
    </div>
  );
}

// ── Connector status row ──────────────────────────
function ConnectorRow({ name, connected, service }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 14 }}>{connected ? '✅' : '⭕'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#e2e8f0' }}>{name}</div>
        <div style={{ fontSize: 11, color: '#475569' }}>{service}</div>
      </div>
      <span style={{ fontSize: 11, color: connected ? '#4ade80' : '#6b7280', fontWeight: 600 }}>
        {connected ? 'Connected' : 'Not configured'}
      </span>
    </div>
  );
}

// ── Overview panels ───────────────────────────────
function OverviewPanel({ role, user }) {
  return (
    <div>
      <div style={{ background: `${ROLE_CONFIG[role]?.color || '#60a5fa'}10`, border: `1px solid ${ROLE_CONFIG[role]?.color || '#60a5fa'}30`, borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', color: ROLE_CONFIG[role]?.color, fontSize: 18 }}>
          {ROLE_CONFIG[role]?.icon} Welcome, {user?.displayName || user?.username || 'User'}
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{ROLE_CONFIG[role]?.description} · {role} dashboard</p>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="⏱" label="Session" value="Active" color="#4ade80" />
        <StatCard icon="🔒" label="MFA" value={user?.mfaEnabled ? 'Enabled' : 'Disabled'} color={user?.mfaEnabled ? '#4ade80' : '#f87171'} />
        <StatCard icon="🌐" label="Language" value={user?.lang?.toUpperCase() || 'EN'} color="#94a3b8" />
      </div>
    </div>
  );
}

// ── Main role-based dashboard ─────────────────────
export default function RoleDashboard({ user, authToken, onNavigate }) {
  const [activeNav, setActiveNav] = useState('overview');
  const [users, setUsers] = useState([]);
  const [connectors, setConnectors] = useState({});
  const [loading, setLoading] = useState(false);

  const role = user?.role || 'user';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  const headers = { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };

  const fetchSection = useCallback(async (section) => {
    setLoading(true);
    try {
      if (section === 'users' && (role === 'admin' || role === 'moderator')) {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) setUsers(await res.json());
      }
      if (section === 'connectors') {
        const res = await fetch('/api/connectors/status', { headers });
        if (res.ok) setConnectors(await res.json());
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [role, authToken]);

  useEffect(() => { fetchSection(activeNav); }, [activeNav, fetchSection]);

  const changeUserRole = async (userId, newRole) => {
    await fetch(`/api/admin/users/${userId}/role`, { method: 'PATCH', headers, body: JSON.stringify({ role: newRole }) });
    await fetchSection('users');
  };

  const s = {
    layout: { display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif' },
    sidebar: { width: 220, background: '#050508', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0 },
    sideHeader: { padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 },
    navItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', cursor: 'pointer',
      background: active ? `${config.color}15` : 'transparent',
      borderLeft: `2px solid ${active ? config.color : 'transparent'}`,
      color: active ? config.color : '#64748b', fontSize: 13, fontWeight: active ? 600 : 400,
      transition: 'all .15s', userSelect: 'none'
    }),
    main: { flex: 1, padding: '24px', overflowY: 'auto' },
    sectionTitle: { fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }
  };

  return (
    <div style={s.layout}>
      {/* Sidebar */}
      <nav style={s.sidebar}>
        <div style={s.sideHeader}>
          <div style={{ fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nexus AI Pro</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{config.icon}</span>
            <div>
              <div style={{ fontSize: 13, color: config.color, fontWeight: 700 }}>{config.label}</div>
              <div style={{ fontSize: 11, color: '#374151' }}>{user?.username || 'Guest'}</div>
            </div>
          </div>
        </div>
        {config.navItems.map(item => {
          const nav = NAV_LABELS[item];
          return (
            <div key={item} style={s.navItem(activeNav === item)} onClick={() => setActiveNav(item)}>
              <span style={{ fontSize: 16 }}>{nav?.icon}</span>
              <span>{nav?.label}</span>
            </div>
          );
        })}
        {/* External nav links */}
        {onNavigate && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto', paddingTop: 12 }}>
            {[
              { key: 'game', icon: '🎮', label: 'Game Connectors' },
              { key: 'analytics', icon: '📊', label: 'Full Analytics' },
              { key: 'payment', icon: '💳', label: 'Subscription' }
            ].map(({ key, icon, label }) => (
              <div key={key} style={s.navItem(false)} onClick={() => onNavigate(key)}>
                <span style={{ fontSize: 16 }}>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Main content */}
      <main style={s.main}>
        {activeNav === 'overview' && <OverviewPanel role={role} user={user} />}

        {activeNav === 'users' && (
          <div>
            <h2 style={s.sectionTitle}>👥 User Management</h2>
            {loading ? <div style={{ color: '#555' }}>Loading…</div> : (
              users.length === 0
                ? <div style={{ color: '#475569', fontSize: 14 }}>No users found. Register the first account!</div>
                : users.map(u => <UserRow key={u.id} user={u} onRoleChange={changeUserRole} />)
            )}
          </div>
        )}

        {activeNav === 'connectors' && (
          <div>
            <h2 style={s.sectionTitle}>🔗 Service Connectors</h2>
            {loading ? <div style={{ color: '#555' }}>Loading…</div> : (
              Object.entries(connectors).map(([name, info]) => (
                <ConnectorRow key={name} name={name.toUpperCase()} connected={info.connected} service={info.service} />
              ))
            )}
          </div>
        )}

        {activeNav === 'system' && role === 'admin' && (
          <div>
            <h2 style={s.sectionTitle}>⚙️ System Information</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <StatCard icon="🖥" label="Node.js" value={process?.versions?.node || 'N/A'} color="#60a5fa" />
              <StatCard icon="📦" label="Platform" value="Linux / Win / macOS" color="#a78bfa" />
              <StatCard icon="🌍" label="Env" value={import.meta.env?.MODE || 'development'} color="#fbbf24" />
              <StatCard icon="📡" label="API Version" value="2.1.0" color="#34d399" />
            </div>
          </div>
        )}

        {activeNav === 'api-keys' && (
          <div>
            <h2 style={s.sectionTitle}>🔑 API Keys</h2>
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#fbbf24' }}>
              ⚠ API keys are managed via environment variables. Never expose them in the UI or commit them to version control.
              Set them in your <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>.env</code> file.
            </div>
          </div>
        )}

        {(activeNav === 'analytics' || activeNav === 'projects' || activeNav === 'security' || activeNav === 'billing' || activeNav === 'audit' || activeNav === 'reports') && (
          <div>
            <h2 style={s.sectionTitle}>{NAV_LABELS[activeNav]?.icon} {NAV_LABELS[activeNav]?.label}</h2>
            <div style={{ color: '#64748b', fontSize: 14 }}>
              Use the {NAV_LABELS[activeNav]?.label} tab in the main navigation to access this feature.
              {onNavigate && (
                <button onClick={() => onNavigate(activeNav)}
                  style={{ display: 'block', marginTop: 12, background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Open {NAV_LABELS[activeNav]?.label} →
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
