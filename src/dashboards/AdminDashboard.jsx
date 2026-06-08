/**
 * Nexus AI Pro — Admin Dashboard
 * Separate admin/dev/moderator/user dashboards. User management, system stats,
 * role assignment, subscription management, integrations overview.
 * date: 2026-06-08
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Users, ShieldCheck, Settings, Activity, Zap, Globe, CreditCard, RefreshCw, MoreVertical, Search, Filter, Plus, Lock, Unlock, Trash2, Edit, BarChart2 } from 'lucide-react';

// ── Role display ──────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  admin: { label: 'Admin', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  dev: { label: 'Dev', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  moderator: { label: 'Mod', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  user: { label: 'User', color: 'text-white/60 bg-white/5 border-white/10' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  return <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, sublabel, color = '#6366f1', trend }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/40">{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sublabel && <div className="text-xs text-white/30 mt-0.5">{sublabel}</div>}
      {trend !== undefined && (
        <div className={`text-xs mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({ user, onBan, onUnban, onRoleChange, currentUserRole }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
          {(user.username || user.email || '?')[0].toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/90">{user.username || '—'}</span>
            <RoleBadge role={user.role} />
            {user.banned && <span className="text-[10px] text-red-400">BANNED</span>}
          </div>
          <div className="text-xs text-white/40">{user.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-white/30 hidden sm:block">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
        <div className="relative">
          <button onClick={() => setMenuOpen(m => !m)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a1a1e] border border-white/15 rounded-xl shadow-2xl z-10 w-40 py-1" onMouseLeave={() => setMenuOpen(false)}>
              {Object.keys(ROLE_CONFIG).map(r => r !== user.role && (
                <button key={r} onClick={() => { onRoleChange(user.id, r); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5">
                  Set role: {ROLE_CONFIG[r].label}
                </button>
              ))}
              <div className="border-t border-white/10 mt-1 pt-1">
                {user.banned
                  ? <button onClick={() => { onUnban(user.id); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-emerald-400 hover:bg-white/5 flex items-center gap-2"><Unlock size={11} /> Unban</button>
                  : <button onClick={() => { onBan(user.id); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2"><Lock size={11} /> Ban</button>
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────

export default function AdminDashboard({ currentUser }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const auth = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, subRes, healthRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: auth }),
        fetch('/api/admin/users?limit=50', { headers: auth }),
        fetch('/api/admin/subscriptions', { headers: auth }),
        fetch('/api/security/device', { headers: auth }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (subRes.ok) setSubscriptions(await subRes.json());
      if (healthRes.ok) setSystemHealth(await healthRes.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBan = async (userId) => {
    await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST', headers: auth });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true } : u));
  };

  const handleUnban = async (userId) => {
    await fetch(`/api/admin/users/${userId}/unban`, { method: 'POST', headers: auth });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: false } : u));
  };

  const handleRoleChange = async (userId, role) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  const filteredUsers = users.filter(u =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (!search || (u.email + u.username).toLowerCase().includes(search.toLowerCase()))
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: `Users (${users.length})`, icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'system', label: 'System', icon: Settings },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto text-white space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-red-400" size={24} /> Admin Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">Logged in as <span className="text-red-300">{currentUser?.role}</span></p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
          <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-400' : 'text-white/50'} />
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'}`}>
            <t.icon size={11} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Users" value={stats.totalUsers || 0} icon={Users} color="#6366f1" trend={stats.userGrowth7d} />
            <StatCard label="Active Today" value={stats.activeToday || 0} icon={Activity} color="#22d3ee" />
            <StatCard label="Paid Subscriptions" value={stats.paidSubscriptions || 0} icon={CreditCard} color="#f59e0b" />
            <StatCard label="Revenue MRR" value={`$${((stats.mrrUsd || 0) / 100).toFixed(0)}`} icon={Zap} color="#10b981" trend={stats.mrrGrowth7d} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <div key={role} className="bg-white/3 border border-white/8 rounded-xl p-3 flex items-center gap-3">
                <RoleBadge role={role} />
                <div className="text-xl font-bold text-white">{stats.byRole?.[role] || 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {activeTab === 'users' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 focus:outline-none">
              <option value="all">All roles</option>
              {Object.keys(ROLE_CONFIG).map(r => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
            </select>
          </div>
          <div className="bg-white/3 border border-white/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 px-4 py-2 border-b border-white/8 text-[10px] text-white/30 uppercase tracking-wider">
              <span>User</span><span className="hidden sm:block">Email</span><span className="text-right">Actions</span>
            </div>
            {filteredUsers.map((u, i) => (
              <div key={u.id} className={i < filteredUsers.length - 1 ? 'border-b border-white/5' : ''}>
                <UserRow user={u} onBan={handleBan} onUnban={handleUnban} onRoleChange={handleRoleChange} currentUserRole={currentUser?.role} />
              </div>
            ))}
            {filteredUsers.length === 0 && <div className="text-center py-8 text-white/30 text-sm">No users found</div>}
          </div>
        </div>
      )}

      {/* ── Subscriptions ── */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white/3 border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 px-4 py-2 border-b border-white/8 text-[10px] text-white/30 uppercase tracking-wider">
            <span>User</span><span>Plan</span><span>Status</span><span>Since</span>
          </div>
          {subscriptions.map((s, i) => (
            <div key={s.userId || i} className={`grid grid-cols-4 px-4 py-3 text-sm ${i < subscriptions.length - 1 ? 'border-b border-white/5' : ''}`}>
              <span className="text-white/70 truncate">{s.userId?.slice(0, 8)}...</span>
              <span className="capitalize text-indigo-300">{s.planId}</span>
              <span className={s.status === 'active' ? 'text-emerald-400' : 'text-red-400'}>{s.status}</span>
              <span className="text-white/30 text-xs">{s.activatedAt ? new Date(s.activatedAt).toLocaleDateString() : '—'}</span>
            </div>
          ))}
          {subscriptions.length === 0 && <div className="text-center py-8 text-white/30 text-sm">No subscriptions</div>}
        </div>
      )}

      {/* ── System ── */}
      {activeTab === 'system' && systemHealth && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard label="Platform" value={systemHealth.platform} icon={Settings} color="#6366f1" sublabel={systemHealth.arch} />
            <StatCard label="Node.js" value={systemHealth.nodeVersion} icon={Zap} color="#22d3ee" />
            <StatCard label="Memory" value={`${systemHealth.memory?.usagePercent}%`} icon={Activity}
              color={parseFloat(systemHealth.memory?.usagePercent) > 80 ? '#ef4444' : '#10b981'} />
          </div>
          <div className="bg-white/3 border border-white/10 rounded-xl overflow-hidden">
            {(systemHealth.healthChecks || []).map((h, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 ${i < (systemHealth.healthChecks?.length - 1) ? 'border-b border-white/8' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${h.status === 'ok' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                  <span className="text-sm text-white/80">{h.name}</span>
                </div>
                <span className="text-xs text-white/40">{h.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
