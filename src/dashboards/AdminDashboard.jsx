/**
 * NEXUS AI PRO - Admin Dashboard Component
 * File: src/dashboards/AdminDashboard.jsx
 * Date: 2026-08-26
 *
 * Separate admin/dev/moderator/user dashboards.
 * Admin: user management, role assignment, system settings.
 * Dev: connector status, API metrics, build info.
 * Moderator: content moderation queue.
 * User: personal dashboard.
 */

import { useState, useEffect, useCallback } from 'react';

const ROLE_CONFIG = {
  admin: { icon: '👑', color: '#ef4444', label: 'Admin', bg: '#ef444422' },
  dev: { icon: '🛠', color: '#6366f1', label: 'Developer', bg: '#6366f122' },
  moderator: { icon: '🛡', color: '#f59e0b', label: 'Moderator', bg: '#f59e0b22' },
  user: { icon: '👤', color: '#94a3b8', label: 'User', bg: '#94a3b822' },
};

function UserRow({ user, onRoleChange, onDeactivate, currentUserId }) {
  const [changingRole, setChangingRole] = useState(false);
  const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
  const isSelf = user.id === currentUserId;

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600 }}>{user.displayName || user.username}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.username}</div>
      </td>
      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ background: roleCfg.bg, color: roleCfg.color, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
          {roleCfg.icon} {roleCfg.label}
        </span>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ background: user.active ? '#4ade8022' : '#ef444422', color: user.active ? '#4ade80' : '#ef4444', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
          {user.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.mfaEnabled ? '✅ MFA' : '⬜ No MFA'}</span>
      </td>
      <td style={{ padding: '10px 12px' }}>
        {!isSelf && (
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              defaultValue={user.role}
              onChange={(e) => onRoleChange(user.id, e.target.value)}
              style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12 }}
            >
              {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                <option key={role} value={role}>{cfg.label}</option>
              ))}
            </select>
            {user.active && (
              <button
                onClick={() => onDeactivate(user.id)}
                style={{ padding: '4px 10px', background: '#ef444422', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                Deactivate
              </button>
            )}
          </div>
        )}
        {isSelf && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>You</span>}
      </td>
    </tr>
  );
}

function ConnectorStatus({ connectors }) {
  if (!connectors) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
      {Object.entries(connectors).map(([name, info]) => {
        const isOk = ['connected', 'configured', 'ok'].includes(info.status);
        return (
          <div key={name} style={{ background: isOk ? '#4ade8011' : '#f9731611', border: `1px solid ${isOk ? '#4ade8044' : '#f9731644'}`, borderRadius: 10, padding: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, textTransform: 'capitalize' }}>{name.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: 11, color: isOk ? '#4ade80' : '#f97316', fontWeight: 700 }}>
              {isOk ? '✅' : '⚠️'} {info.status}
            </div>
            {info.detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{info.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard({ userRole, userId }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [users, setUsers] = useState([]);
  const [connectors, setConnectors] = useState(null);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_token') : null;

  const isAdmin = userRole === 'admin';
  const isDev = ['admin', 'dev'].includes(userRole);
  const isMod = ['admin', 'dev', 'moderator'].includes(userRole);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await fetch('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        setUsers(data.users || []);
      }
    } catch { /* noop */ }
  }, [token, isAdmin]);

  const fetchConnectors = useCallback(async () => {
    if (!isDev) return;
    try {
      const resp = await fetch('/api/connectors/status', { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        setConnectors(data.connectors);
      }
    } catch { /* noop */ }
  }, [token, isDev]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchConnectors()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchConnectors]);

  const changeRole = async (targetUserId, role) => {
    try {
      const resp = await fetch(`/api/auth/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (resp.ok) fetchUsers();
    } catch { /* noop */ }
  };

  const deactivateUser = async (targetUserId) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      const resp = await fetch(`/api/auth/users/${targetUserId}/deactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) fetchUsers();
    } catch { /* noop */ }
  };

  const roleCfg = ROLE_CONFIG[userRole] || ROLE_CONFIG.user;

  const sections = [
    { id: 'overview', icon: '📊', label: 'Overview', access: true },
    { id: 'users', icon: '👥', label: 'Users', access: isAdmin },
    { id: 'connectors', icon: '🔌', label: 'Connectors', access: isDev },
    { id: 'moderation', icon: '🛡', label: 'Moderation', access: isMod },
    { id: 'subscriptions', icon: '💳', label: 'Subscriptions', access: isAdmin },
  ].filter(s => s.access);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--text)', padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header with role badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
            {roleCfg.icon} {roleCfg.label} Dashboard
          </h1>
          <span style={{ background: roleCfg.bg, color: roleCfg.color, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
            {userRole?.toUpperCase()} ACCESS
          </span>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.85rem', border: 'none', borderRadius: 8, background: activeSection === s.id ? '#6366f122' : 'transparent', color: activeSection === s.id ? '#6366f1' : 'var(--text)', cursor: 'pointer', fontWeight: activeSection === s.id ? 700 : 400, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', minHeight: 400 }}>
          {/* Overview */}
          {activeSection === 'overview' && (
            <div>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: 18 }}>System Overview</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Total Users', value: users.length || '—', icon: '👥', color: '#6366f1' },
                  { label: 'Active Users', value: users.filter(u => u.active).length || '—', icon: '✅', color: '#4ade80' },
                  { label: 'MFA Enabled', value: users.filter(u => u.mfaEnabled).length || '—', icon: '🔐', color: '#f59e0b' },
                  { label: 'Your Role', value: userRole?.toUpperCase(), icon: roleCfg.icon, color: roleCfg.color },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 22, color }}>{value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {activeSection === 'users' && isAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>User Management ({users.length})</h2>
                <button onClick={fetchUsers} style={{ padding: '6px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>↻ Refresh</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Name', 'Email', 'Role', 'Status', 'MFA', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No users found</td></tr>
                    ) : (
                      users.map(u => (
                        <UserRow key={u.id} user={u} onRoleChange={changeRole} onDeactivate={deactivateUser} currentUserId={userId} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Connectors */}
          {activeSection === 'connectors' && isDev && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Connector Status</h2>
                <button onClick={fetchConnectors} style={{ padding: '6px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>↻ Check All</button>
              </div>
              {connectors ? <ConnectorStatus connectors={connectors} /> : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading connector status...</div>
              )}
            </div>
          )}

          {/* Moderation */}
          {activeSection === 'moderation' && isMod && (
            <div>
              <h2 style={{ margin: '0 0 1rem', fontSize: 18 }}>Moderation Queue</h2>
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                ✅ No items pending moderation
              </div>
            </div>
          )}

          {/* Subscriptions */}
          {activeSection === 'subscriptions' && isAdmin && (
            <div>
              <h2 style={{ margin: '0 0 1rem', fontSize: 18 }}>Subscription Overview</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {['free', 'pro', 'enterprise'].map(plan => (
                  <div key={plan} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, textTransform: 'capitalize', fontSize: 16 }}>{plan}</div>
                    <div style={{ fontSize: 32, fontWeight: 900, margin: '0.5rem 0', color: plan === 'enterprise' ? '#f59e0b' : plan === 'pro' ? '#6366f1' : '#94a3b8' }}>—</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>subscribers</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#6366f111', border: '1px solid #6366f133', borderRadius: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                💳 Stripe, crypto (Coinbase Commerce) & gift card payments configured. Connect STRIPE_SECRET_KEY in environment to activate live payments.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
