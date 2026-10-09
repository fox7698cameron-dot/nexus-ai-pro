// src/components/AdminDashboard.jsx
// Nexus AI Pro - Role-Separated Admin / Developer / Moderator / User Dashboards
// Date: 2026-10-09

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, Settings, Activity, AlertTriangle,
  CheckCircle, XCircle, Edit3, Trash2, RefreshCw,
  BarChart3, Terminal, Key, Globe, Cpu, Server,
  UserCheck, MessageSquare, Flag, Eye, Ban,
} from 'lucide-react';

const ROLE_META = {
  admin:     { label: 'Admin',     color: '#ef4444', icon: Shield   },
  developer: { label: 'Developer', color: '#3b82f6', icon: Terminal },
  moderator: { label: 'Moderator', color: '#f59e0b', icon: UserCheck },
  user:      { label: 'User',      color: '#6b7280', icon: Users    },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.user;
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium" style={{ background: meta.color + '22', color: meta.color }}>
      <meta.icon size={10} />
      {meta.label}
    </span>
  );
}

// ── Admin Panel ────────────────────────────────────────────────────────────
function AdminPanel() {
  const [users, setUsers] = useState([
    { id: 'u1', username: 'Cameron Fox 🦊', email: 'cameron@nexus.ai', role: 'admin',     createdAt: '2026-01-15', lastLoginAt: '2026-10-09', active: true },
    { id: 'u2', username: 'DevBot_X',       email: 'dev@nexus.ai',    role: 'developer', createdAt: '2026-03-02', lastLoginAt: '2026-10-08', active: true },
    { id: 'u3', username: 'ModerX',         email: 'mod@nexus.ai',    role: 'moderator', createdAt: '2026-04-10', lastLoginAt: '2026-10-07', active: true },
    { id: 'u4', username: 'Alice 🌸',       email: 'alice@mail.com',  role: 'user',      createdAt: '2026-06-22', lastLoginAt: '2026-10-06', active: true },
    { id: 'u5', username: 'Bob',            email: 'bob@mail.com',    role: 'user',      createdAt: '2026-07-01', lastLoginAt: '2026-09-30', active: false },
  ]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  const updateRole = async () => {
    if (!selectedUser || !newRole) return;
    const token = sessionStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedUser.id, newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
        setSelectedUser(null);
        setNewRole('');
      }
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(ROLE_META).map(([role, meta]) => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="bg-gray-800 rounded-xl p-3 border border-gray-700 flex items-center gap-2">
              <meta.icon size={16} style={{ color: meta.color }} />
              <div>
                <div className="text-lg font-bold text-white">{count}</div>
                <div className="text-xs text-gray-400">{meta.label}s</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Users size={14} />All Users</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400">
                <th className="text-left px-4 py-2">User</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-2 hidden lg:table-cell">Last Login</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-700 last:border-0 hover:bg-gray-750">
                  <td className="px-4 py-2.5 font-medium text-white">{u.username}</td>
                  <td className="px-4 py-2.5"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-2.5 text-gray-400 hidden lg:table-cell">{u.lastLoginAt}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${u.active ? 'text-green-400' : 'text-red-400'}`}>
                      {u.active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setSelectedUser(u); setNewRole(u.role); }}
                        className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                        title="Edit role"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => setUsers(prev => prev.map(uu => uu.id === u.id ? { ...uu, active: !uu.active } : uu))}
                        className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400"
                        title={u.active ? 'Suspend' : 'Activate'}
                      >
                        <Ban size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role change modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
            <h4 className="font-bold text-white mb-1">Change Role</h4>
            <p className="text-xs text-gray-400 mb-4">User: <span className="text-white">{selectedUser.username}</span></p>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white mb-4"
            >
              {Object.keys(ROLE_META).map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={updateRole} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-medium">Apply</button>
              <button onClick={() => setSelectedUser(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Developer Panel ────────────────────────────────────────────────────────
function DeveloperPanel() {
  const [metrics] = useState({
    apiRequests: 18420,
    errorRate: 0.8,
    avgLatency: 142,
    uptime: 99.97,
    deployments: 3,
  });

  const [logs] = useState([
    { id: 1, level: 'info',  msg: 'Server started on port 3001',                ts: '10:00:01' },
    { id: 2, level: 'info',  msg: 'Socket.IO client connected: socket_abc123', ts: '10:05:14' },
    { id: 3, level: 'warn',  msg: 'Rate limit approached for /api/chat (89/100)', ts: '10:12:33' },
    { id: 4, level: 'info',  msg: 'Security scan completed: 0 critical',        ts: '11:00:00' },
    { id: 5, level: 'error', msg: 'Gemini API timeout: model variable undefined', ts: '11:03:21' },
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'API Calls', value: metrics.apiRequests.toLocaleString(), color: '#3b82f6' },
          { label: 'Error Rate', value: `${metrics.errorRate}%`, color: metrics.errorRate > 1 ? '#ef4444' : '#34d399' },
          { label: 'Avg Latency', value: `${metrics.avgLatency}ms`, color: '#f59e0b' },
          { label: 'Uptime', value: `${metrics.uptime}%`, color: '#34d399' },
          { label: 'Deployments', value: metrics.deployments, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-3 border-b border-gray-700">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Terminal size={14} />Server Logs</h4>
        </div>
        <div className="font-mono text-xs p-3 space-y-1 max-h-64 overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">{log.ts}</span>
              <span className={`shrink-0 w-10 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-400'}`}>
                [{log.level.toUpperCase().slice(0, 4)}]
              </span>
              <span className="text-gray-300">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Moderator Panel ────────────────────────────────────────────────────────
function ModeratorPanel() {
  const [reports] = useState([
    { id: 'r1', type: 'Spam',        user: 'alice',       content: 'Repetitive AI output spam', status: 'pending', ts: '2026-10-09 10:22' },
    { id: 'r2', type: 'Abuse',       user: 'anon_user_3', content: 'Inappropriate image gen',   status: 'reviewed', ts: '2026-10-09 09:15' },
    { id: 'r3', type: 'Harassment',  user: 'bob',         content: 'Targeting another user',    status: 'resolved', ts: '2026-10-08 18:00' },
  ]);

  const statusColor = { pending: '#f59e0b', reviewed: '#3b82f6', resolved: '#34d399' };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Flag size={14} className="text-yellow-400" />Reports Queue</h4>
      {reports.map(r => (
        <div key={r.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-red-400">{r.type}</span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-400">@{r.user}</span>
              <span className="text-xs text-gray-500">{r.ts}</span>
            </div>
            <p className="text-sm text-white">{r.content}</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded font-medium shrink-0" style={{ background: (statusColor[r.status] || '#6b7280') + '22', color: statusColor[r.status] || '#6b7280' }}>
            {r.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── User Panel ─────────────────────────────────────────────────────────────
function UserPanel({ user }) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Settings size={14} />Profile &amp; Settings</h4>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-xl">
            {(user?.username?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-white">{user?.username || 'User'}</div>
            <div className="text-xs text-gray-400">{user?.email || ''}</div>
            <RoleBadge role={user?.role || 'user'} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Member since', value: user?.createdAt || 'Unknown' },
            { label: 'Last login', value: user?.lastLoginAt || 'Now' },
            { label: '2FA', value: user?.mfaEnabled ? 'Enabled' : 'Disabled', ok: user?.mfaEnabled },
            { label: 'Biometrics', value: user?.biometricEnabled ? 'Enabled' : 'Not set' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-gray-400">{item.label}</div>
              <div className={`font-medium mt-0.5 ${item.ok === false ? 'text-yellow-400' : item.ok === true ? 'text-green-400' : 'text-white'}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ───────────────────────────────────────────────
export default function RoleDashboard({ userRole = 'user', currentUser }) {
  const [tab, setTab] = useState(userRole === 'admin' ? 'users' : userRole === 'developer' ? 'dev' : userRole === 'moderator' ? 'mod' : 'profile');

  const tabs = {
    admin: [
      { id: 'users',    label: 'Users',       icon: Users     },
      { id: 'security', label: 'Security',    icon: Shield    },
      { id: 'dev',      label: 'Dev Tools',   icon: Terminal  },
    ],
    developer: [
      { id: 'dev',      label: 'Dev Tools',   icon: Terminal  },
      { id: 'security', label: 'Security',    icon: Shield    },
    ],
    moderator: [
      { id: 'mod',      label: 'Moderation',  icon: Flag      },
    ],
    user: [
      { id: 'profile',  label: 'Profile',     icon: Users     },
    ],
  };

  const roleTabs = [
    ...(tabs[userRole] || tabs.user),
    { id: 'profile', label: 'My Profile', icon: Users },
  ];

  const roleLabel = ROLE_META[userRole]?.label || 'User';
  const RoleIcon = ROLE_META[userRole]?.icon || Users;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <RoleIcon size={20} style={{ color: ROLE_META[userRole]?.color || '#6b7280' }} />
            {roleLabel} Dashboard
          </h2>
          <p className="text-gray-400 text-xs">Welcome, {currentUser?.username || 'User'}</p>
        </div>
        <RoleBadge role={userRole} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-800">
        {roleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'users'    && userRole === 'admin'     && <AdminPanel />}
        {tab === 'dev'      && (userRole === 'admin' || userRole === 'developer') && <DeveloperPanel />}
        {tab === 'mod'      && (userRole === 'admin' || userRole === 'moderator') && <ModeratorPanel />}
        {tab === 'profile'  && <UserPanel user={currentUser} />}
        {tab === 'security' && (
          <div className="text-center text-gray-400 py-8">
            <Shield size={32} className="mx-auto mb-2 text-green-400" />
            <p className="text-sm">Security metrics available in the Security Dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}
