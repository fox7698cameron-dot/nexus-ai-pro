// src/components/dashboards/AdminDashboard.jsx
// Created: 2026-10-18
// Admin-only dashboard: user management, system health, audit logs

import React, { useState, useEffect, useCallback } from 'react';

const ROLE_COLORS = { admin: '#ef4444', dev: '#f97316', moderator: '#eab308', user: '#22c55e' };

function UserRow({ user, onRoleChange, onDeactivate }) {
  const [editRole, setEditRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);

  const save = () => {
    onRoleChange(user.id, selectedRole);
    setEditRole(false);
  };

  return (
    <tr style={styles.tr}>
      <td style={styles.td}><span style={styles.username}>{user.username}</span></td>
      <td style={styles.td}><span style={{ color: '#94a3b8' }}>{user.email}</span></td>
      <td style={styles.td}>
        {editRole ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <select style={styles.roleSelect} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
              {['admin', 'dev', 'moderator', 'user'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button style={styles.saveBtn} onClick={save}>✓</button>
            <button style={styles.cancelBtn} onClick={() => setEditRole(false)}>✕</button>
          </div>
        ) : (
          <span
            style={{ background: ROLE_COLORS[user.role] + '30', color: ROLE_COLORS[user.role], padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => setEditRole(true)}
          >
            {user.role?.toUpperCase()}
          </span>
        )}
      </td>
      <td style={styles.td}>
        <span style={{ color: user.active ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 600 }}>
          {user.active ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td style={styles.td}><span style={{ color: '#64748b', fontSize: 12 }}>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</span></td>
      <td style={styles.td}>
        {user.active && (
          <button style={styles.deactivateBtn} onClick={() => onDeactivate(user.id)}>Deactivate</button>
        )}
      </td>
    </tr>
  );
}

export default function AdminDashboard({ token }) {
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  const apiFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [token]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, healthData] = await Promise.allSettled([
        apiFetch('/api/auth/users'),
        apiFetch('/api/health'),
      ]);
      if (usersData.status === 'fulfilled') setUsers(usersData.value);
      if (healthData.status === 'fulfilled') setHealth(healthData.value);
    } catch (err) {
      console.error('[AdminDashboard]', err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRoleChange = async (userId, role) => {
    try {
      await apiFetch(`/api/auth/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err) {
      console.error('[AdminDashboard] role change:', err.message);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await apiFetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: false } : u));
    } catch (err) {
      console.error('[AdminDashboard] deactivate:', err.message);
    }
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.active).length,
    admins: users.filter(u => u.role === 'admin').length,
    devs: users.filter(u => u.role === 'dev').length,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚙️ Admin Dashboard</h1>
        <button style={styles.refreshBtn} onClick={loadData}>⟳ Refresh</button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}><div style={styles.statVal}>{stats.total}</div><div style={styles.statLabel}>Total Users</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statVal, color: '#22c55e' }}>{stats.active}</div><div style={styles.statLabel}>Active</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statVal, color: '#ef4444' }}>{stats.admins}</div><div style={styles.statLabel}>Admins</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statVal, color: '#f97316' }}>{stats.devs}</div><div style={styles.statLabel}>Developers</div></div>
        {health && (
          <div style={styles.statCard}>
            <div style={{ ...styles.statVal, color: '#22c55e', fontSize: 16 }}>✅ {health.status}</div>
            <div style={styles.statLabel}>Server Health</div>
          </div>
        )}
      </div>

      <div style={styles.tabs}>
        {['users', 'system'].map(tab => (
          <button key={tab} style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={styles.cardTitle}>User Management</div>
            <input
              style={{ ...styles.searchInput }}
              placeholder="Search users…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {loading ? (
            <div style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>Loading users…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Username', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <UserRow key={user.id} user={user} onRoleChange={handleRoleChange} onDeactivate={handleDeactivate} />
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>No users found</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'system' && health && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>System Health</div>
          <div style={styles.systemGrid}>
            <div style={styles.sysItem}><span style={styles.sysLabel}>Status</span><span style={{ color: '#22c55e', fontWeight: 700 }}>{health.status?.toUpperCase()}</span></div>
            <div style={styles.sysItem}><span style={styles.sysLabel}>Encryption</span><span style={styles.sysVal}>{health.security?.algorithm}</span></div>
            <div style={styles.sysItem}><span style={styles.sysLabel}>Threats Blocked</span><span style={styles.sysVal}>{health.security?.threatsBlocked}</span></div>
            <div style={styles.sysItem}><span style={styles.sysLabel}>Patches Applied</span><span style={styles.sysVal}>{health.security?.patchesApplied}</span></div>
            <div style={styles.sysItem}><span style={styles.sysLabel}>Audit Log Size</span><span style={styles.sysVal}>{health.security?.auditLogSize}</span></div>
            <div style={styles.sysItem}><span style={styles.sysLabel}>Server Time</span><span style={styles.sysVal}>{new Date(health.timestamp).toLocaleString()}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' },
  refreshBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', textAlign: 'center' },
  statVal: { fontSize: 32, fontWeight: 800, color: '#f8fafc', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20 },
  tab: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 500 },
  tabActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  cardTitle: { fontWeight: 700, fontSize: 16, color: '#f1f5f9' },
  searchInput: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #334155' },
  tr: { borderBottom: '1px solid #1e293b' },
  td: { padding: '12px', verticalAlign: 'middle' },
  username: { fontWeight: 600, color: '#f1f5f9' },
  roleSelect: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 4, padding: '4px 8px', fontSize: 12 },
  saveBtn: { background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 },
  cancelBtn: { background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 },
  deactivateBtn: { background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  systemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, marginTop: 16 },
  sysItem: { background: '#0f172a', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sysLabel: { fontSize: 12, color: '#64748b' },
  sysVal: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 },
};
