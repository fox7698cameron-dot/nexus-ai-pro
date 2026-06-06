// src/dashboards/AdminDashboard.jsx
// 2026-06-06 | Role-specific dashboards: admin, dev, moderator, user views

import React, { useState, useEffect } from 'react';
import { authFetch, getCurrentUser, hasRole } from '../auth/AuthService.js';

// ─── Shared chart bar ─────────────────────────────────────────────────────────
function StatBar({ label, value, max, color = '#818cf8' }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#aaa', fontSize: '12px' }}>{label}</span>
        <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{value}</span>
      </div>
      <div style={{ height: '4px', background: '#222', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color, borderRadius: '2px', transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sysInfo, setSysInfo] = useState(null);
  const [config, setConfig] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch('/api/admin/stats'),
      authFetch('/api/admin/users?limit=20'),
      authFetch('/api/admin/system'),
      authFetch('/api/admin/config')
    ]).then(async ([s, u, sys, cfg]) => {
      if (s.ok) setStats(await s.json());
      if (u.ok) setUsers((await u.json()).users || []);
      if (sys.ok) setSysInfo(await sys.json());
      if (cfg.ok) setConfig(await cfg.json());
      setLoading(false);
    });
  }, []);

  const searchUsers = async () => {
    const res = await authFetch(`/api/admin/users?search=${encodeURIComponent(search)}&limit=50`);
    if (res.ok) setUsers((await res.json()).users || []);
  };

  const setUserRole = async (userId, role) => {
    const res = await authFetch('/api/auth/admin/set-role', { method: 'POST', body: JSON.stringify({ targetUserId: userId, role }) });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Remove this user? This cannot be undone.')) return;
    const res = await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== userId));
  };

  if (loading) return <p style={{ color: '#666', padding: '24px' }}>Loading admin data…</p>;

  const ROLE_COLORS = { admin: '#ef4444', dev: '#f59e0b', moderator: '#818cf8', user: '#22c55e' };

  return (
    <div>
      <h3 style={{ color: '#ef4444', margin: '0 0 20px', fontSize: '16px' }}>👑 Admin Dashboard</h3>

      {/* Stats grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
            { label: 'Active Today', value: stats.activeToday, icon: '🟢' },
            { label: 'New Today', value: stats.newUsersToday, icon: '🆕' },
            { label: 'MFA Enabled', value: stats.mfaEnabled, icon: '🔐' }
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: '20px' }}>{s.icon}</p>
              <p style={{ margin: '0 0 2px', color: '#fff', fontSize: '22px', fontWeight: '700' }}>{s.value}</p>
              <p style={{ margin: 0, color: '#666', fontSize: '11px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Role breakdown */}
      {stats && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>Users by Role</p>
          {Object.entries(stats.byRole).map(([role, count]) => (
            <StatBar key={role} label={role} value={count} max={stats.totalUsers} color={ROLE_COLORS[role]} />
          ))}
        </div>
      )}

      {/* System info */}
      {sysInfo && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>System Status</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div><span style={{ color: '#666' }}>Uptime:</span> <span style={{ color: '#fff' }}>{Math.round(sysInfo.uptime / 60)} min</span></div>
            <div><span style={{ color: '#666' }}>Heap:</span> <span style={{ color: '#fff' }}>{sysInfo.memory?.heapUsed}MB / {sysInfo.memory?.heapTotal}MB</span></div>
            <div><span style={{ color: '#666' }}>Node:</span> <span style={{ color: '#fff' }}>{sysInfo.nodeVersion}</span></div>
            <div><span style={{ color: '#666' }}>Platform:</span> <span style={{ color: '#fff' }}>{sysInfo.platform}</span></div>
            <div><span style={{ color: '#666' }}>Env:</span> <span style={{ color: sysInfo.env === 'production' ? '#22c55e' : '#f59e0b' }}>{sysInfo.env}</span></div>
          </div>
        </div>
      )}

      {/* Config status */}
      {config && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>Service Configuration</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', fontSize: '12px' }}>
            {Object.entries({ ...config.aiProviders, ...config.payments }).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: v ? '#22c55e' : '#555', display: 'inline-block' }} />
                <span style={{ color: '#aaa' }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User management */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>User Management</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUsers()}
              placeholder="Search users…" style={{ padding: '6px 12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
            <button onClick={searchUsers} style={{ padding: '6px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', color: '#aaa', cursor: 'pointer', fontSize: '12px' }}>Search</button>
          </div>
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p style={{ margin: 0, color: '#fff', fontSize: '13px' }}>{u.username || u.email}</p>
                <p style={{ margin: '2px 0 0', color: '#555', fontSize: '11px' }}>{u.email} · {u.subscription}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', background: ROLE_COLORS[u.role] + '22', color: ROLE_COLORS[u.role] }}>{u.role}</span>
                <select value={u.role} onChange={e => setUserRole(u.id, e.target.value)}
                  style={{ padding: '4px 8px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#aaa', fontSize: '11px', cursor: 'pointer' }}>
                  {['user', 'moderator', 'dev', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => deleteUser(u.id)} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef444466', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dev Panel ────────────────────────────────────────────────────────────────
function DevPanel() {
  const [sysInfo, setSysInfo] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    Promise.all([authFetch('/api/admin/system'), authFetch('/api/admin/config')]).then(async ([s, c]) => {
      if (s.ok) setSysInfo(await s.json());
      if (c.ok) setConfig(await c.json());
    });
  }, []);

  return (
    <div>
      <h3 style={{ color: '#f59e0b', margin: '0 0 20px', fontSize: '16px' }}>🛠️ Dev Dashboard</h3>
      {sysInfo && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '16px', fontFamily: 'monospace', fontSize: '12px', color: '#aaa' }}>
          <p style={{ color: '#f59e0b', margin: '0 0 12px', fontFamily: 'system-ui' }}>Runtime Info</p>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(sysInfo, null, 2)}</pre>
        </div>
      )}
      {config && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', fontFamily: 'monospace', fontSize: '12px', color: '#aaa' }}>
          <p style={{ color: '#f59e0b', margin: '0 0 12px', fontFamily: 'system-ui' }}>Service Config</p>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(config, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Moderator Panel ──────────────────────────────────────────────────────────
function ModeratorPanel() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    authFetch('/api/admin/reports').then(async r => {
      if (r.ok) {
        const d = await r.json();
        setReports(d.reports || []);
      }
    });
  }, []);

  return (
    <div>
      <h3 style={{ color: '#818cf8', margin: '0 0 20px', fontSize: '16px' }}>🛡️ Moderator Dashboard</h3>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px' }}>
        <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>Moderation Queue</p>
        {reports.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '24px 0' }}>✅ Queue is empty — no pending reports</p>
        ) : (
          reports.map((r, i) => <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>{JSON.stringify(r)}</div>)
        )}
      </div>
    </div>
  );
}

// ─── User Panel ───────────────────────────────────────────────────────────────
function UserPanel() {
  const user = getCurrentUser();
  return (
    <div>
      <h3 style={{ color: '#22c55e', margin: '0 0 20px', fontSize: '16px' }}>🏠 My Dashboard</h3>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#fff', fontSize: '18px', fontWeight: '700' }}>{user?.displayName || user?.username}</p>
            <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>{user?.email} · {user?.subscription || 'free'} plan</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
          <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', color: '#666' }}>Account Role</p>
            <p style={{ margin: 0, color: '#fff', fontWeight: '600' }}>{user?.role}</p>
          </div>
          <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', color: '#666' }}>2FA Status</p>
            <p style={{ margin: 0, color: user?.mfaEnabled ? '#22c55e' : '#f59e0b', fontWeight: '600' }}>{user?.mfaEnabled ? 'Enabled' : 'Not Set Up'}</p>
          </div>
          <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', color: '#666' }}>Member Since</p>
            <p style={{ margin: 0, color: '#fff', fontWeight: '600' }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p>
          </div>
          <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', color: '#666' }}>Language</p>
            <p style={{ margin: 0, color: '#fff', fontWeight: '600' }}>{user?.locale || 'en'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const user = getCurrentUser();
  const role = user?.role || 'user';

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'system-ui, -apple-system', maxWidth: '900px', margin: '0 auto' }}>
      {role === 'admin' && <AdminPanel />}
      {role === 'dev' && <DevPanel />}
      {role === 'moderator' && <ModeratorPanel />}
      {role === 'user' && <UserPanel />}
    </div>
  );
}
