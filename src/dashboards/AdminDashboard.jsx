// nexus-ai-pro/src/dashboards/AdminDashboard.jsx | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Admin-only dashboard: user management, audit log, system health, integrations

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Activity, Database, Settings, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, TrendingUp, Server,
  Key, Globe, Clock, Search, Ban, UserCheck,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

function StatCard({ label, value, sub, icon: Icon, color = 'indigo' }) {
  const colorMap = { indigo: 'text-indigo-400', green: 'text-green-400', red: 'text-red-400', yellow: 'text-yellow-400', cyan: 'text-cyan-400' };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        {Icon && <Icon size={18} className={colorMap[color]} />}
      </div>
      <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function UserRow({ user, onSuspend, onActivate, onPromote }) {
  const roleColors = { superadmin: 'text-red-400', admin: 'text-orange-400', developer: 'text-purple-400', moderator: 'text-blue-400', user: 'text-gray-400' };
  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition">
      <td className="py-3 px-4">
        <div>
          <p className="text-sm text-white font-medium">{user.username}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-xs font-medium capitalize" style={{ color: roleColors[user.role] ?? '#9ca3af' }}>{user.role}</td>
      <td className="py-3 px-4">
        <span className={`px-2 py-0.5 rounded-full text-xs ${user.status === 'active' ? 'bg-green-500/10 text-green-300' : user.status === 'suspended' ? 'bg-red-500/10 text-red-300' : 'bg-gray-500/10 text-gray-300'}`}>
          {user.status}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-gray-500">{user.tier}</td>
      <td className="py-3 px-4 text-xs text-gray-500">{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}</td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          {user.status === 'active'
            ? <button onClick={() => onSuspend(user.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition" title="Suspend"><Ban size={13} /></button>
            : <button onClick={() => onActivate(user.id)} className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition" title="Activate"><UserCheck size={13} /></button>}
        </div>
      </td>
    </tr>
  );
}

function AuditRow({ entry }) {
  const resultColor = { ok: 'text-green-400', denied: 'text-yellow-400', error: 'text-red-400' }[entry.result] ?? 'text-gray-400';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0 text-sm">
      <span className="text-gray-500 text-xs w-36 flex-shrink-0">{new Date(entry.ts).toLocaleString()}</span>
      <span className="text-white font-mono text-xs">{entry.label}</span>
      <span className={`text-xs ${resultColor} ml-auto`}>{entry.result}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [integrations, setIntegrations] = useState({});
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken')}` });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, auditRes, intRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeader() }),
        fetch('/api/admin/users', { headers: authHeader() }),
        fetch('/api/admin/audit?limit=50', { headers: authHeader() }),
        fetch('/api/admin/integrations', { headers: authHeader() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers((await usersRes.json()).users ?? []);
      if (auditRes.ok) setAuditLog((await auditRes.json()).entries ?? []);
      if (intRes.ok) setIntegrations(await intRes.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateUserStatus = async (userId, status) => {
    await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
  };

  const filteredUsers = users.filter(u =>
    !userSearch || u.username.includes(userSearch) || u.email.includes(userSearch)
  );

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audit', label: 'Audit Log', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield size={24} className="text-orange-400" />Admin Dashboard</h1>
          <p className="text-gray-400 text-sm">Full system control & user management</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={14} />{error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition flex-shrink-0
              ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <tab.icon size={14} />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users"    value={stats.totalUsers}    sub="All registered" icon={Users}    color="indigo" />
            <StatCard label="Active Now"     value={stats.activeToday}   sub="Last 24h"       icon={Activity} color="green" />
            <StatCard label="Revenue (mo)"   value={stats.monthRevenue ? `$${(stats.monthRevenue/100).toFixed(0)}` : '—'} sub="Current month" icon={TrendingUp} color="cyan" />
            <StatCard label="API Calls"      value={stats.apiCallsToday} sub="Today"          icon={Server}   color="yellow" />
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="py-3 px-4 text-left">User</th>
                  <th className="py-3 px-4 text-left">Role</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Tier</th>
                  <th className="py-3 px-4 text-left">Last Login</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onSuspend={id => updateUserStatus(id, 'suspended')}
                    onActivate={id => updateUserStatus(id, 'active')}
                    onPromote={() => {}}
                  />
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No users found</p>}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Audit Entries</h2>
          {auditLog.map((e, i) => <AuditRow key={e.id ?? i} entry={e} />)}
          {auditLog.length === 0 && <p className="text-gray-500 text-sm text-center py-6">No audit entries</p>}
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(integrations).map(([key, enabled]) => (
            <div key={key} className={`p-3 rounded-xl border ${enabled ? 'border-green-500/30 bg-green-500/5' : 'border-gray-800 bg-gray-900'}`}>
              <div className="flex items-center gap-2">
                {enabled ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-gray-600" />}
                <span className="text-sm capitalize text-white">{key}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{enabled ? 'Connected' : 'Not configured'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
