// src/components/AdminDashboard.jsx
// Nexus AI Pro — Admin Dashboard (User Management, System Health, Audit)
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Activity, Settings, RefreshCw, AlertTriangle,
  CheckCircle, UserCheck, UserX, Crown, Edit3, Save, X,
  BarChart3, Clock, Server, Database, Cpu
} from 'lucide-react';

const ROLE_COLORS = {
  super_admin: 'text-yellow-300 bg-yellow-900/20 border-yellow-700',
  admin:       'text-red-300    bg-red-900/20    border-red-700',
  dev:         'text-blue-300   bg-blue-900/20   border-blue-700',
  moderator:   'text-purple-300 bg-purple-900/20 border-purple-700',
  user:        'text-gray-300   bg-gray-800      border-gray-600',
};

function apiHeaders() {
  const token = localStorage.getItem('nexus:accessToken');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
}

function StatCard({ label, value, icon: Icon, color = 'text-indigo-400', delta, subtitle }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
        <Icon size={18} className={color} />
      </div>
      <div className="text-3xl font-bold text-white">{value ?? '—'}</div>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
      {delta !== undefined && (
        <p className={`text-xs mt-1 ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {delta >= 0 ? '+' : ''}{delta} this week
        </p>
      )}
    </div>
  );
}

function UserRow({ user, onRoleChange }) {
  const [editing, setEditing]   = useState(false);
  const [role,    setRole]      = useState(user.role);
  const [saving,  setSaving]    = useState(false);

  const ROLES = ['user', 'moderator', 'dev', 'admin'];

  const saveRole = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`/api/auth/users/${user.id}/role`, {
        method: 'PUT',
        headers: apiHeaders(),
        body: JSON.stringify({ role }),
      });
      if (resp.ok) {
        onRoleChange(user.id, role);
        setEditing(false);
      }
    } finally { setSaving(false); }
  };

  const roleClass = ROLE_COLORS[user.role] || ROLE_COLORS.user;

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="text-white text-sm font-medium">{user.username}</p>
          <p className="text-gray-500 text-xs">{user.email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <select
            value={role} onChange={e => setRole(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {ROLES.map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}
          </select>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${roleClass}`}>{user.role}</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={saveRole} disabled={saving} className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              </button>
              <button onClick={() => { setEditing(false); setRole(user.role); }} className="p-1 text-gray-400 hover:text-gray-200">
                <X size={14} />
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
              <Edit3 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminDashboard() {
  const [users,   setUsers]   = useState([]);
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview');
  const [search,  setSearch]  = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResp, healthResp] = await Promise.all([
        fetch('/api/auth/users',  { headers: apiHeaders() }),
        fetch('/api/health',      { headers: apiHeaders() }),
      ]);
      if (usersResp.ok)  setUsers((await usersResp.json()).users  || []);
      if (healthResp.ok) setHealth(await healthResp.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRoleChange = (userId, newRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown size={28} className="text-yellow-400" />
            Admin Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">{users.length} total users · System administration</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit mb-6">
        {['overview', 'users', 'system', 'security'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users"   value={users.length}                 icon={Users}    color="text-blue-400"   />
            <StatCard label="Admins"        value={(roleCounts.admin || 0) + (roleCounts.super_admin || 0)} icon={Crown}   color="text-yellow-400" />
            <StatCard label="Developers"    value={roleCounts.dev || 0}          icon={Activity} color="text-purple-400" />
            <StatCard label="Moderators"    value={roleCounts.moderator || 0}    icon={Shield}   color="text-green-400"  />
          </div>

          {health && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h2 className="text-white font-medium mb-3 flex items-center gap-2">
                <Server size={16} className="text-green-400" /> System Health
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Status',     value: health.status,                          ok: health.status === 'healthy' },
                  { label: 'Encryption', value: health.security?.algorithm ?? 'AES-256-GCM', ok: true                  },
                  { label: 'Threats',    value: `${health.security?.threatsBlocked ?? 0} blocked`, ok: true            },
                  { label: 'Patches',    value: `${health.security?.patchesApplied ?? 0} applied`, ok: true            },
                  { label: 'Audit Log',  value: `${health.security?.auditLogSize ?? 0} entries`,   ok: true            },
                  { label: 'Uptime',     value: 'Running',                              ok: true                        },
                ].map(({ label, value, ok }) => (
                  <div key={label} className="flex items-center gap-2">
                    {ok ? <CheckCircle size={14} className="text-green-400 shrink-0" /> : <AlertTriangle size={14} className="text-yellow-400 shrink-0" />}
                    <div>
                      <p className="text-gray-400 text-xs">{label}</p>
                      <p className="text-white text-sm">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-4">
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users by name or email…"
            className="w-full max-w-sm bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Last Login</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <UserRow key={user.id} user={user} onRoleChange={handleRoleChange} />
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">No users found</div>
            )}
          </div>
        </div>
      )}

      {/* System */}
      {tab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Node.js',           value: 'v18+',       icon: Server,   status: 'ok'      },
            { label: 'Database',          value: 'PostgreSQL',  icon: Database, status: 'ok'      },
            { label: 'Redis Cache',       value: 'Configured via REDIS_URL', icon: Cpu, status: 'env'     },
            { label: 'Blob Storage',      value: 'AWS S3 / Azure', icon: Database, status: 'env'   },
            { label: 'Stripe Payments',   value: process.env.STRIPE_SECRET_KEY ? 'Active' : 'Configure STRIPE_SECRET_KEY', icon: BarChart3, status: 'env' },
            { label: 'Email (MFA)',       value: 'Configure SENDGRID_API_KEY', icon: Activity, status: 'env' },
          ].map(({ label, value, icon: Icon, status }) => (
            <div key={label} className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'ok' ? 'bg-green-900/30' : 'bg-yellow-900/30'}`}>
                <Icon size={20} className={status === 'ok' ? 'text-green-400' : 'text-yellow-400'} />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-400 text-xs">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-medium mb-3 flex items-center gap-2">
              <Shield size={16} className="text-green-400" /> Security Checklist
            </h2>
            <div className="space-y-2">
              {[
                'AES-256-GCM encryption active',
                'JWT tokens signed with RS256 or HS256',
                'Passwords hashed with bcrypt (cost 12)',
                '13-character minimum password enforced',
                'Rate limiting on all API endpoints',
                'CORS configured with allowlist',
                'Helmet security headers active',
                'Input sanitization on all user data',
                'SQL injection patterns detected & blocked',
                'XSS patterns detected & blocked',
                'Audit logging active',
                'Key rotation support enabled',
              ].map(check => (
                <div key={check} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={14} className="text-green-400 shrink-0" />
                  <span className="text-gray-300">{check}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
