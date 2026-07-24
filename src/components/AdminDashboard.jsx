// src/components/AdminDashboard.jsx
// 2026-07-24 | Nexus AI Pro - Admin/Dev/Moderator Dashboard
// Role-based access: admin sees all, mod sees users, dev sees APIs

import React, { useState, useEffect } from 'react';
import { Users, Shield, Activity, AlertTriangle, CheckCircle2, Settings2, Key, Loader2, RefreshCw, Trash2 } from 'lucide-react';

const ROLE_COLORS = {
  admin: 'bg-red-500/20 text-red-300 border border-red-500/30',
  moderator: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  developer: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  user: 'bg-gray-600/30 text-gray-300 border border-gray-600/30',
};

function StatCard({ label, value, icon: Icon, color = 'text-blue-400' }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl bg-gray-700 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

function UserRow({ user, onRoleChange, onToggleActive }) {
  return (
    <tr className="border-b border-gray-700/50 hover:bg-gray-750">
      <td className="px-4 py-3">
        <div className="font-medium text-white text-sm">{user.username}</div>
        <div className="text-xs text-gray-400">{user.email}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${user.mfaEnabled ? 'bg-green-400' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">{user.mfaEnabled ? 'MFA On' : 'No MFA'}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
      </td>
      <td className="px-4 py-3">
        <select
          value={user.role}
          onChange={e => onRoleChange(user.id, e.target.value)}
          className="text-xs bg-gray-700 text-white rounded px-2 py-1 outline-none"
        >
          <option value="user">user</option>
          <option value="moderator">moderator</option>
          <option value="developer">developer</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleActive(user.id, !user.active)}
          className={`text-xs px-2 py-1 rounded ${user.active ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'} transition-colors`}
        >
          {user.active ? 'Disable' : 'Enable'}
        </button>
      </td>
    </tr>
  );
}

function AuditLog({ logs }) {
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-700/50 text-xs">
          <div className="text-gray-500 shrink-0 tabular-nums">
            {new Date(log.timestamp).toLocaleTimeString()}
          </div>
          <div className="font-mono text-blue-300">{log.event}</div>
          <div className="text-gray-400 ml-auto truncate max-w-[200px]">
            {log.details?.userId || log.details?.email || ''}
          </div>
        </div>
      ))}
      {!logs.length && <p className="text-gray-500 text-sm text-center py-4">No recent activity.</p>}
    </div>
  );
}

export function AdminDashboard({ user: currentUser }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('nexus:accessToken');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const isAdmin = currentUser?.role === 'admin';
  const isMod = currentUser?.role === 'moderator';
  const isDev = currentUser?.role === 'developer';

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const [ov, us, al] = await Promise.all([
            fetch('/api/admin/overview', { headers }).then(r => r.json()),
            fetch('/api/admin/users', { headers }).then(r => r.json()),
            fetch('/api/admin/audit-log', { headers }).then(r => r.json()),
          ]);
          setOverview(ov);
          setUsers(Array.isArray(us) ? us : []);
          setAuditLogs(al?.logs || []);
        } else if (isMod) {
          const us = await fetch('/api/admin/users', { headers }).then(r => r.json());
          setUsers(Array.isArray(us) ? us : []);
        }
      } catch { /* non-critical */ }
      setLoading(false);
    };
    load();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    const res = await fetch(`/api/auth/users/${userId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) setUsers(u => u.map(us => us.id === userId ? { ...us, role: newRole } : us));
  };

  const handleToggleActive = async (userId, active) => {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ active }),
    });
    if (res.ok) setUsers(u => u.map(us => us.id === userId ? { ...us, active } : us));
  };

  const roleName = currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[currentUser?.role]}`}>
          {roleName} Panel
        </div>
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {isAdmin && overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Users" value={overview.users?.total} icon={Users} color="text-blue-400" />
              <StatCard label="Admins" value={overview.users?.byRole?.admin} icon={Shield} color="text-red-400" />
              <StatCard label="Projects" value={overview.projects?.total} icon={Activity} color="text-green-400" />
              <StatCard label="Threats Blocked" value={overview.security?.threatsBlocked} icon={AlertTriangle} color="text-orange-400" />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
            {(isAdmin || isMod) && (
              <button
                onClick={() => setTab('users')}
                className={`text-sm px-4 py-1.5 rounded-md transition-colors ${tab === 'users' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Users ({users.length})
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setTab('audit')}
                className={`text-sm px-4 py-1.5 rounded-md transition-colors ${tab === 'audit' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Audit Log
              </button>
            )}
            {(isAdmin || isDev) && (
              <button
                onClick={() => setTab('api')}
                className={`text-sm px-4 py-1.5 rounded-md transition-colors ${tab === 'api' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                API
              </button>
            )}
          </div>

          {tab === 'users' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">MFA</th>
                    <th className="text-left px-4 py-3">Last Login</th>
                    {isAdmin && <th className="text-left px-4 py-3">Change Role</th>}
                    {isAdmin && <th className="text-left px-4 py-3">Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <UserRow key={u.id} user={u} onRoleChange={handleRoleChange} onToggleActive={handleToggleActive} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'audit' && isAdmin && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Activity size={16} className="text-blue-400" />
                Recent Audit Events
              </h3>
              <AuditLog logs={auditLogs} />
            </div>
          )}

          {tab === 'api' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Key size={16} className="text-yellow-400" />
                Developer API Info
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="bg-gray-700 rounded-lg p-3 font-mono text-xs">
                  Base URL: {window.location.origin}/api
                </div>
                <div className="bg-gray-700 rounded-lg p-3 font-mono text-xs">
                  Auth: Bearer {'<'}accessToken{'>'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <div>POST /api/auth/login</div>
                  <div>POST /api/auth/register</div>
                  <div>GET /api/analytics/overview</div>
                  <div>GET /api/projects</div>
                  <div>GET /api/gaming/platforms</div>
                  <div>GET /api/connectors</div>
                  <div>POST /api/payments/checkout</div>
                  <div>GET /api/i18n/locales</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
