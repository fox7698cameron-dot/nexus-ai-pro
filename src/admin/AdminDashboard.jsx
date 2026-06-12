// src/admin/AdminDashboard.jsx
// 2026-06-12 | Admin dashboard: user management, role assignment, system health, audit logs
import React, { useState, useEffect } from 'react';
import {
  Users, ShieldCheck, Activity, BarChart3, Settings,
  UserCheck, UserX, Crown, Code, MessageSquare, RefreshCw,
  Search, ChevronDown, AlertTriangle, Check
} from 'lucide-react';

const ROLE_COLORS = {
  admin: 'text-red-400 bg-red-500/10 border-red-500/30',
  dev: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  moderator: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  user: 'text-gray-400 bg-gray-500/10 border-gray-700'
};

const ROLE_ICONS = { admin: Crown, dev: Code, moderator: MessageSquare, user: Users };

function UserRow({ user, onRoleChange }) {
  const [changing, setChanging] = useState(false);
  const Icon = ROLE_ICONS[user.role] || Users;

  async function handleRoleChange(newRole) {
    setChanging(true);
    await onRoleChange(user.id, newRole);
    setChanging(false);
  }

  return (
    <tr className="border-t border-gray-800 hover:bg-gray-900/50 transition">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
            {user.username?.slice(0, 2).toUpperCase() || '??'}
          </div>
          <div>
            <p className="text-sm text-white font-medium">{user.username}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[user.role]}`}>
          <Icon size={10} />
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {user.mfaEnabled
            ? <><ShieldCheck size={11} className="text-green-400" /> MFA</>
            : <><AlertTriangle size={11} className="text-yellow-400" /> No MFA</>}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
      </td>
      <td className="px-4 py-3">
        <select
          value={user.role}
          onChange={e => handleRoleChange(e.target.value)}
          disabled={changing}
          className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:border-blue-500 focus:outline-none disabled:opacity-50"
        >
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="dev">Developer</option>
          <option value="admin">Admin</option>
        </select>
      </td>
    </tr>
  );
}

export default function AdminDashboard({ token }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setStats({
          total: data.users.length,
          admins: data.users.filter(u => u.role === 'admin').length,
          devs: data.users.filter(u => u.role === 'dev').length,
          mfaEnabled: data.users.filter(u => u.mfaEnabled).length
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, [token]);

  async function changeRole(userId, newRole) {
    const res = await fetch(`/api/auth/users/${userId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role: newRole })
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  }

  const filtered = users.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown size={18} className="text-red-400" />
            <h1 className="font-bold">Admin Dashboard</h1>
          </div>
          <button onClick={fetchUsers} className="p-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Users', value: stats.total, color: 'text-blue-400' },
              { label: 'Admins', value: stats.admins, color: 'text-red-400' },
              { label: 'Developers', value: stats.devs, color: 'text-blue-400' },
              { label: 'MFA Enabled', value: `${stats.mfaEnabled}/${stats.total}`, color: 'text-green-400' }
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-gray-500" />
              <input
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Security</th>
                  <th className="text-left px-4 py-3">Last Login</th>
                  <th className="text-left px-4 py-3">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <UserRow key={u.id} user={u} onRoleChange={changeRole} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500 text-sm">
                      {loading ? 'Loading users...' : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
