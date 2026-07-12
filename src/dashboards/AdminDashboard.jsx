// src/dashboards/AdminDashboard.jsx
// 2026-07-12 | Admin dashboard: user management, system health, billing, audit logs

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, BarChart3, Settings, AlertTriangle,
  CheckCircle, XCircle, TrendingUp, Database, Server,
  Lock, Unlock, Trash2, Edit3, Plus, Search, Filter,
  Crown, Star, Zap, Activity, DollarSign, Globe
} from 'lucide-react';

const MOCK_USERS = [
  { id: '1', username: 'Cameron Fox 🦊', email: 'cam@nexusai.pro', role: 'admin', status: 'active', plan: 'enterprise', joined: Date.now() - 30 * 86400000, lastSeen: Date.now() - 300000 },
  { id: '2', username: 'alex_dev', email: 'alex@dev.io', role: 'developer', status: 'active', plan: 'pro', joined: Date.now() - 15 * 86400000, lastSeen: Date.now() - 900000 },
  { id: '3', username: 'mod_sarah', email: 'sarah@mod.io', role: 'moderator', status: 'active', plan: 'pro', joined: Date.now() - 20 * 86400000, lastSeen: Date.now() - 7200000 },
  { id: '4', username: 'user_mike', email: 'mike@gmail.com', role: 'user', status: 'active', plan: 'starter', joined: Date.now() - 5 * 86400000, lastSeen: Date.now() - 3600000 },
  { id: '5', username: 'test_account', email: 'test@test.io', role: 'user', status: 'suspended', plan: 'free', joined: Date.now() - 60 * 86400000, lastSeen: Date.now() - 86400000 * 10 },
];

const ROLE_COLORS = { admin: '#f97316', developer: '#7c3aed', moderator: '#3b82f6', user: '#10b981' };
const PLAN_ICONS = { enterprise: <Crown size={13} />, pro: <Star size={13} />, starter: <Zap size={13} />, free: null };

const AUDIT_LOG = [
  { id: 1, event: 'USER_LOGIN', user: 'Cameron Fox', ip: '192.168.1.1', timestamp: Date.now() - 300000, severity: 'info' },
  { id: 2, event: 'PLAN_UPGRADED', user: 'alex_dev', ip: '10.0.0.2', timestamp: Date.now() - 900000, severity: 'info' },
  { id: 3, event: 'FAILED_LOGIN', user: 'unknown', ip: '185.220.101.4', timestamp: Date.now() - 1800000, severity: 'warning' },
  { id: 4, event: 'USER_SUSPENDED', user: 'test_account', ip: '::1', timestamp: Date.now() - 3600000, severity: 'warning' },
  { id: 5, event: 'SECURITY_SCAN', user: 'system', ip: 'internal', timestamp: Date.now() - 7200000, severity: 'info' },
  { id: 6, event: 'KEY_ROTATION', user: 'system', ip: 'internal', timestamp: Date.now() - 86400000, severity: 'info' },
];

const SEVERITY_STYLES = {
  info: { color: '#3b82f6', bg: '#1e3a5f' },
  warning: { color: '#eab308', bg: '#713f12' },
  critical: { color: '#ef4444', bg: '#7f1d1d' },
};

function RelativeTime({ ts }) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return <span>Just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  if (hours < 24) return <span>{hours}h ago</span>;
  return <span>{Math.floor(hours / 24)}d ago</span>;
}

export default function AdminDashboard({ currentUser, user, onLogout }) {
  const activeUser = user || currentUser;
  const [users, setUsers] = useState(MOCK_USERS);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 38, memory: 62, disk: 45, uptime: '14d 6h 42m',
    activeConnections: 247, requestsPerMin: 1840, errorRate: 0.02,
    revenue: { monthly: 4280, growth: 12.4 },
  });

  useEffect(() => {
    const t = setInterval(() => {
      setSystemMetrics(prev => ({
        ...prev,
        cpu: Math.min(95, Math.max(10, prev.cpu + (Math.random() - 0.5) * 8)),
        memory: Math.min(90, Math.max(40, prev.memory + (Math.random() - 0.5) * 4)),
        activeConnections: Math.floor(200 + Math.random() * 100),
        requestsPerMin: Math.floor(1600 + Math.random() * 500),
      }));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleSuspend = (id) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u
    ));
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    paidUsers: users.filter(u => u.plan !== 'free').length,
    newToday: users.filter(u => Date.now() - u.joined < 86400000).length,
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1><Crown size={22} style={{ display: 'inline', marginRight: '0.5rem', color: '#f97316', verticalAlign: 'middle' }} />Admin Dashboard</h1>
          <p className="admin-sub">System management, users, billing &amp; audit</p>
        </div>
        <div className="admin-user-badge">
          <Shield size={14} style={{ color: '#f97316' }} />
          <span>{activeUser?.username || 'Admin'}</span>
          <span className="role-chip" style={{ background: '#7c2d12', color: '#f97316' }}>ADMIN</span>
          {onLogout && (
            <button onClick={onLogout} style={{ marginLeft: 8, padding: '4px 10px', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#888', fontSize: '0.78rem', cursor: 'pointer' }}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      <div className="admin-tabs">
        {['overview', 'users', 'billing', 'audit', 'system'].map(tab => (
          <button
            key={tab}
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="overview-stats">
            <div className="overview-stat">
              <Users size={20} style={{ color: '#3b82f6' }} />
              <div><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Total Users</div></div>
            </div>
            <div className="overview-stat">
              <CheckCircle size={20} style={{ color: '#10b981' }} />
              <div><div className="stat-value">{stats.activeUsers}</div><div className="stat-label">Active</div></div>
            </div>
            <div className="overview-stat">
              <DollarSign size={20} style={{ color: '#f97316' }} />
              <div><div className="stat-value">${systemMetrics.revenue.monthly.toLocaleString()}</div><div className="stat-label">MRR</div></div>
            </div>
            <div className="overview-stat">
              <TrendingUp size={20} style={{ color: '#7c3aed' }} />
              <div><div className="stat-value">+{systemMetrics.revenue.growth}%</div><div className="stat-label">Growth</div></div>
            </div>
          </div>

          <div className="system-health">
            <h2>System Health</h2>
            <div className="health-grid">
              <div className="health-item">
                <span>CPU</span>
                <div className="h-bar"><div style={{ width: `${systemMetrics.cpu}%`, background: systemMetrics.cpu > 80 ? '#ef4444' : '#10b981' }} /></div>
                <span className="h-val">{Math.round(systemMetrics.cpu)}%</span>
              </div>
              <div className="health-item">
                <span>Memory</span>
                <div className="h-bar"><div style={{ width: `${systemMetrics.memory}%`, background: systemMetrics.memory > 80 ? '#ef4444' : '#3b82f6' }} /></div>
                <span className="h-val">{Math.round(systemMetrics.memory)}%</span>
              </div>
              <div className="health-item">
                <span>Disk</span>
                <div className="h-bar"><div style={{ width: `${systemMetrics.disk}%`, background: '#7c3aed' }} /></div>
                <span className="h-val">{systemMetrics.disk}%</span>
              </div>
            </div>
            <div className="health-meta">
              <div className="hm-item"><Activity size={13} /><span>{systemMetrics.activeConnections} connections</span></div>
              <div className="hm-item"><Globe size={13} /><span>{systemMetrics.requestsPerMin.toLocaleString()} req/min</span></div>
              <div className="hm-item"><Server size={13} /><span>Uptime: {systemMetrics.uptime}</span></div>
              <div className="hm-item"><AlertTriangle size={13} /><span>Error rate: {systemMetrics.errorRate}%</span></div>
            </div>
          </div>

          <div className="recent-audit">
            <h2>Recent Activity</h2>
            {AUDIT_LOG.slice(0, 4).map(entry => (
              <div key={entry.id} className="audit-row">
                <div className="audit-event" style={{ color: SEVERITY_STYLES[entry.severity]?.color }}>{entry.event}</div>
                <div className="audit-user">{entry.user}</div>
                <div className="audit-ip">{entry.ip}</div>
                <div className="audit-time"><RelativeTime ts={entry.timestamp} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="users-controls">
            <div className="user-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="role-filters">
              {['all', 'admin', 'developer', 'moderator', 'user'].map(r => (
                <button
                  key={r}
                  className={`role-filter ${roleFilter === r ? 'active' : ''}`}
                  style={roleFilter === r ? { background: ROLE_COLORS[r] || '#7c3aed' } : {}}
                  onClick={() => setRoleFilter(r)}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className={u.status === 'suspended' ? 'suspended-row' : ''}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ background: ROLE_COLORS[u.role] + '20', color: ROLE_COLORS[u.role] }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="user-name">{u.username}</div>
                          <div className="user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="role-chip" style={{ background: ROLE_COLORS[u.role] + '20', color: ROLE_COLORS[u.role] }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="plan-chip">
                        {PLAN_ICONS[u.plan]}
                        {u.plan}
                      </span>
                    </td>
                    <td>
                      <span className={`status-chip ${u.status}`}>
                        {u.status === 'active' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {u.status}
                      </span>
                    </td>
                    <td className="last-seen"><RelativeTime ts={u.lastSeen} /></td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn edit" title="Edit">
                          <Edit3 size={13} />
                        </button>
                        <button
                          className={`action-btn ${u.status === 'active' ? 'suspend' : 'activate'}`}
                          title={u.status === 'active' ? 'Suspend' : 'Activate'}
                          onClick={() => toggleSuspend(u.id)}
                        >
                          {u.status === 'active' ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                        <button className="action-btn delete" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="billing-section">
          <div className="billing-summary">
            <div className="billing-stat">
              <DollarSign size={20} style={{ color: '#10b981' }} />
              <div><div className="stat-value">${systemMetrics.revenue.monthly.toLocaleString()}</div><div className="stat-label">Monthly Revenue</div></div>
            </div>
            <div className="billing-stat">
              <Users size={20} style={{ color: '#7c3aed' }} />
              <div><div className="stat-value">{stats.paidUsers}</div><div className="stat-label">Paid Subscribers</div></div>
            </div>
            <div className="billing-stat">
              <TrendingUp size={20} style={{ color: '#3b82f6' }} />
              <div><div className="stat-value">+{systemMetrics.revenue.growth}%</div><div className="stat-label">MoM Growth</div></div>
            </div>
          </div>
          <div className="plan-breakdown">
            <h3>Subscribers by Plan</h3>
            {['enterprise', 'pro', 'starter'].map(plan => {
              const count = users.filter(u => u.plan === plan).length;
              return (
                <div key={plan} className="plan-row">
                  <span className="plan-name">{PLAN_ICONS[plan]} {plan}</span>
                  <div className="plan-bar-track">
                    <div className="plan-bar-fill" style={{ width: `${(count / users.length) * 100}%` }} />
                  </div>
                  <span className="plan-count">{count} users</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="audit-section">
          <h2>Audit Log</h2>
          <div className="audit-list">
            {AUDIT_LOG.map(entry => (
              <div key={entry.id} className="audit-entry">
                <div className="audit-sev" style={SEVERITY_STYLES[entry.severity]}>
                  {entry.severity.toUpperCase()}
                </div>
                <div className="audit-event-name">{entry.event}</div>
                <div className="audit-user">{entry.user}</div>
                <div className="audit-ip-addr">{entry.ip}</div>
                <div className="audit-ts">{new Date(entry.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="system-section">
          <h2>System Configuration</h2>
          <div className="config-groups">
            {['Encryption', 'Rate Limiting', 'CORS', 'Session Management', 'MFA Enforcement'].map(group => (
              <div key={group} className="config-group">
                <div className="config-group-name">{group}</div>
                <div className="config-status active">
                  <CheckCircle size={13} />
                  Configured
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .admin-dashboard { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
        .admin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .admin-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
        .admin-sub { margin: 0.25rem 0 0; font-size: 0.875rem; color: #888; }
        .admin-user-badge { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; background: #111; border-radius: 8px; border: 1px solid #222; font-size: 0.875rem; }
        .role-chip { font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; }
        .admin-tabs { display: flex; gap: 0.25rem; background: #111; border-radius: 8px; padding: 0.25rem; margin-bottom: 1.5rem; }
        .admin-tab { flex: 1; padding: 0.5rem; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 0.875rem; color: #888; }
        .admin-tab.active { background: #7c3aed; color: white; }
        .overview-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .overview-stat { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #111; border-radius: 10px; border: 1px solid #222; }
        .stat-value { font-size: 1.4rem; font-weight: 700; }
        .stat-label { font-size: 0.75rem; color: #888; }
        .system-health { background: #111; border-radius: 10px; padding: 1.25rem; border: 1px solid #222; margin-bottom: 1.5rem; }
        .system-health h2 { margin: 0 0 1rem; font-size: 1rem; }
        .health-grid { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }
        .health-item { display: grid; grid-template-columns: 70px 1fr 50px; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
        .h-bar { height: 8px; background: #222; border-radius: 4px; overflow: hidden; }
        .h-bar div { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .h-val { text-align: right; font-weight: 600; font-size: 0.8rem; }
        .health-meta { display: flex; flex-wrap: wrap; gap: 1rem; }
        .hm-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: #888; }
        .recent-audit { background: #111; border-radius: 10px; padding: 1.25rem; border: 1px solid #222; }
        .recent-audit h2 { margin: 0 0 0.75rem; font-size: 1rem; }
        .audit-row { display: grid; grid-template-columns: 1fr 120px 100px 80px; gap: 0.5rem; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #1a1a1a; font-size: 0.8rem; }
        .audit-event { font-family: monospace; font-weight: 600; }
        .audit-user, .audit-ip { color: #888; }
        .audit-time { color: #666; }
        .users-controls { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .user-search { display: flex; align-items: center; gap: 0.5rem; background: #111; border: 1px solid #222; border-radius: 8px; padding: 0.4rem 0.75rem; flex: 1; min-width: 180px; }
        .user-search input { background: transparent; border: none; color: white; font-size: 0.875rem; outline: none; flex: 1; }
        .role-filters { display: flex; gap: 0.25rem; flex-wrap: wrap; }
        .role-filter { padding: 0.35rem 0.6rem; border-radius: 6px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 0.78rem; color: #888; }
        .role-filter.active { color: white; border-color: transparent; }
        .users-table-wrap { overflow-x: auto; }
        .users-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .users-table th { text-align: left; padding: 0.5rem 0.75rem; color: #888; font-weight: 500; border-bottom: 1px solid #222; }
        .users-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid #111; }
        .suspended-row { opacity: 0.5; }
        .user-cell { display: flex; align-items: center; gap: 0.625rem; }
        .user-avatar { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; flex-shrink: 0; }
        .user-name { font-weight: 600; font-size: 0.875rem; }
        .user-email { font-size: 0.75rem; color: #888; }
        .plan-chip { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: #aaa; }
        .status-chip { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 600; }
        .status-chip.active { color: #10b981; }
        .status-chip.suspended { color: #ef4444; }
        .last-seen { color: #888; font-size: 0.8rem; }
        .action-btns { display: flex; gap: 0.3rem; }
        .action-btn { padding: 0.3rem; border-radius: 5px; border: 1px solid #333; background: transparent; cursor: pointer; color: #888; display: flex; }
        .action-btn.suspend { color: #eab308; }
        .action-btn.activate { color: #10b981; }
        .action-btn.delete { color: #ef4444; }
        .billing-section { }
        .billing-summary { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
        .billing-stat { display: flex; align-items: center; gap: 0.75rem; flex: 1; padding: 1rem; background: #111; border-radius: 10px; border: 1px solid #222; }
        .plan-breakdown { background: #111; border-radius: 10px; padding: 1.25rem; border: 1px solid #222; }
        .plan-breakdown h3 { margin: 0 0 1rem; font-size: 0.95rem; }
        .plan-row { display: grid; grid-template-columns: 100px 1fr 70px; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; font-size: 0.85rem; }
        .plan-name { display: flex; align-items: center; gap: 0.3rem; color: #888; }
        .plan-bar-track { height: 8px; background: #222; border-radius: 4px; overflow: hidden; }
        .plan-bar-fill { height: 100%; background: #7c3aed; border-radius: 4px; }
        .plan-count { text-align: right; color: #888; }
        .audit-section h2 { margin: 0 0 1rem; }
        .audit-list { display: flex; flex-direction: column; gap: 0.4rem; }
        .audit-entry { display: grid; grid-template-columns: 70px 1fr 120px 120px 160px; gap: 0.75rem; align-items: center; padding: 0.5rem 0.75rem; background: #111; border-radius: 8px; font-size: 0.8rem; }
        .audit-sev { padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-align: center; }
        .audit-event-name { font-family: monospace; font-weight: 600; }
        .audit-user, .audit-ip-addr, .audit-ts { color: #888; }
        .system-section h2 { margin: 0 0 1rem; }
        .config-groups { display: flex; flex-direction: column; gap: 0.5rem; }
        .config-group { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #111; border-radius: 8px; border: 1px solid #222; }
        .config-group-name { font-size: 0.875rem; font-weight: 500; }
        .config-status { display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; }
        .config-status.active { color: #10b981; }
        @media (max-width: 640px) {
          .overview-stats { grid-template-columns: repeat(2, 1fr); }
          .audit-row { grid-template-columns: 1fr 80px; }
          .audit-user, .audit-ip { display: none; }
          .billing-summary { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
