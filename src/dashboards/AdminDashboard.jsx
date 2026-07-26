// src/dashboards/AdminDashboard.jsx — 2026-07-26
// Admin / Dev / Moderator role-specific dashboard with system metrics and user management
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Server, Shield, Activity, Settings, Loader2, AlertTriangle,
  CheckCircle2, RefreshCw, Link2, User, BarChart3, Cpu, HardDrive,
} from 'lucide-react';

const ROLE_META = {
  admin:     { label: 'Admin',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', badge: '👑' },
  dev:       { label: 'Dev',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', badge: '💻' },
  moderator: { label: 'Moderator', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', badge: '🛡️' },
  user:      { label: 'User',      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', badge: '👤' },
};

function UserRow({ user, onRoleChange }) {
  const meta = ROLE_META[user.role] || ROLE_META.user;
  const [newRole, setNewRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  const saveRole = async () => {
    if (newRole === user.role) return;
    setSaving(true);
    onRoleChange(user.id, newRole).finally(() => setSaving(false));
  };

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {user.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">{user.username}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <select value={newRole} onChange={e => setNewRole(e.target.value)}
          className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {Object.keys(ROLE_META).map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
          {user.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
      </td>
      <td className="px-4 py-3">
        <button onClick={saveRole} disabled={saving || newRole === user.role}
          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-40 flex items-center gap-1">
          {saving ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Save
        </button>
      </td>
    </tr>
  );
}

function ConnectorStatusRow({ connector }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
      <span className="text-sm text-gray-700 dark:text-gray-300">{connector.name}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${connector.configured ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
        {connector.configured ? '✓ Configured' : 'Not configured'}
      </span>
    </div>
  );
}

export default function AdminDashboard({ token, currentUser }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemInfo, setSystemInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sysRes, metRes, connRes] = await Promise.all([
        fetch('/api/admin/system', { headers }),
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/connectors', { headers }),
      ]);

      if (sysRes.status === 403) { setError('Access denied: Admin/Dev role required'); setLoading(false); return; }

      setSystemInfo(await sysRes.json());
      setMetrics(await metRes.json());
      setConnectors((await connRes.json()).connectors || []);

      if (currentUser?.role === 'admin') {
        const usersRes = await fetch('/api/admin/users', { headers });
        setUsers((await usersRes.json()).users || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, currentUser]);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = useCallback(async (userId, role) => {
    await fetch(`/api/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ role }),
    });
    await load();
  }, [token]);

  if (loading && !systemInfo) return <div className="flex items-center justify-center h-64 gap-2 text-gray-500"><Loader2 size={20} className="animate-spin" /> Loading…</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={24} className="text-gray-500" />
            {currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'dev' ? 'Developer' : 'Moderator'} Dashboard
          </h1>
          <p className="text-sm text-gray-500">Platform management — {currentUser?.username}</p>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"><RefreshCw size={14} className="text-gray-500" /></button>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"><AlertTriangle size={14} /> {error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit overflow-x-auto">
        {[['overview', 'Overview', BarChart3], ['users', 'Users', Users], ['system', 'System', Server], ['connectors', 'Connectors', Link2]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition ${activeTab === id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && metrics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.users?.total || 0}</div>
              <div className="text-xs text-gray-500">Total Users</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.users?.active || 0}</div>
              <div className="text-xs text-gray-500">Active Users</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.users?.byRole?.admin || 0}</div>
              <div className="text-xs text-gray-500">Admins</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.users?.byRole?.dev || 0}</div>
              <div className="text-xs text-gray-500">Devs</div>
            </div>
          </div>

          {/* Roles breakdown */}
          {metrics.users?.byRole && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Users by Role</h3>
              {Object.entries(metrics.users.byRole).map(([role, count]) => {
                const meta = ROLE_META[role] || ROLE_META.user;
                const pct = metrics.users.total > 0 ? (count / metrics.users.total) * 100 : 0;
                return (
                  <div key={role} className="flex items-center gap-3 mb-2">
                    <span className="text-xs w-20 text-gray-600 dark:text-gray-400">{meta.badge} {meta.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-900 dark:text-white w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {['User', 'Role', 'Status', 'Joined', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0
                  ? <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-500">No users found</td></tr>
                  : users.map(u => <UserRow key={u.id} user={u} onRoleChange={handleRoleChange} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'system' && systemInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2"><Server size={14} /> Server Info</h3>
            {[['Node', systemInfo.node], ['Platform', systemInfo.platform], ['Arch', systemInfo.arch], ['Environment', systemInfo.env], ['PID', systemInfo.pid], ['Uptime', `${Math.floor(systemInfo.uptime / 60)} min`]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2"><Cpu size={14} /> Memory</h3>
            {Object.entries(systemInfo.memory || {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'connectors' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2"><Link2 size={14} /> External Connectors</h3>
            <span className="text-xs text-gray-500">{connectors.filter(c => c.configured).length}/{connectors.length} configured</span>
          </div>
          {connectors.map((c, i) => <ConnectorStatusRow key={i} connector={c} />)}
        </div>
      )}
    </div>
  );
}
