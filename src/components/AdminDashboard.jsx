// ================================================
// NEXUS AI PRO - Admin Dashboard
// File: src/components/AdminDashboard.jsx
// Updated: 2026-07-01
// Access: admin (all tabs), moderator (flags),
//         developer (stats, api-usage)
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, BarChart3, Cpu, ShieldAlert, Book, Flag,
  RefreshCw, ChevronDown, Check, Ban, UserCheck,
  AlertTriangle, Loader2, Search, Filter, X,
  TrendingUp, Database, Zap, Clock,
} from 'lucide-react';

const ROLES = ['user', 'moderator', 'developer', 'admin'];

const ROLE_COLORS = {
  user:      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  moderator: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  developer: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  admin:     'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

function StatCard({ label, value, icon: Icon, color = 'text-blue-500', sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
        <Icon size={15} className={color} />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function UserRow({ user, onRoleChange, onSuspend }) {
  const [open, setOpen] = useState(false);
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="py-3 px-4">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username || '—'}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="relative inline-block">
          <button onClick={() => setOpen(o => !o)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>
            {user.role} <ChevronDown size={10} />
          </button>
          {open && (
            <div className="absolute left-0 top-7 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]">
              {ROLES.map(r => (
                <button key={r} onClick={() => { onRoleChange(user.id, r); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${user.role === r ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {r} {user.role === r && <Check size={10} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${user.is_suspended ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
          {user.is_suspended ? 'Suspended' : 'Active'}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-gray-400">
        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
      </td>
      <td className="py-3 px-4">
        <button onClick={() => onSuspend(user.id, !user.is_suspended)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${user.is_suspended ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
          {user.is_suspended ? <><UserCheck size={12} /> Reinstate</> : <><Ban size={12} /> Suspend</>}
        </button>
      </td>
    </tr>
  );
}

export default function AdminDashboard({ userRole = 'admin' }) {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [apiUsage, setApiUsage] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const isAdmin = userRole === 'admin';
  const isDev   = userRole === 'developer' || isAdmin;
  const isMod   = userRole === 'moderator' || isAdmin;

  const token = () => localStorage.getItem('nexus_access_token');
  const hdr   = () => ({ Authorization: `Bearer ${token()}` });

  const fetchTab = useCallback(async (t) => {
    setLoading(true);
    setError(null);
    try {
      if ((t === 'stats' || t === 'api') && isDev) {
        const [sRes, aRes] = await Promise.all([
          fetch('/api/admin/stats',     { headers: hdr() }),
          fetch('/api/admin/api-usage', { headers: hdr() }),
        ]);
        if (sRes.ok) setStats(await sRes.json());
        if (aRes.ok) setApiUsage(await aRes.json());
      }
      if (t === 'users' && isAdmin) {
        const res = await fetch('/api/admin/users', { headers: hdr() });
        if (res.ok) { const d = await res.json(); setUsers(d.users || []); }
      }
      if (t === 'audit' && isAdmin) {
        const res = await fetch('/api/admin/audit-log', { headers: hdr() });
        if (res.ok) { const d = await res.json(); setAuditLog(d.logs || []); }
      }
      if (t === 'flags' && isMod) {
        const res = await fetch('/api/admin/flags', { headers: hdr() });
        if (res.ok) { const d = await res.json(); setFlags(d.flags || []); }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isDev, isMod]);

  useEffect(() => { fetchTab(tab); }, [tab, fetchTab]);

  const changeRole = async (userId, role) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...hdr() },
      body: JSON.stringify({ role }),
    });
    setUsers(p => p.map(u => u.id === userId ? { ...u, role } : u));
  };

  const suspendUser = async (userId, suspend) => {
    await fetch(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hdr() },
      body: JSON.stringify({ suspended: suspend }),
    });
    setUsers(p => p.map(u => u.id === userId ? { ...u, is_suspended: suspend } : u));
  };

  const resolveFlag = async (flagId) => {
    await fetch(`/api/admin/flags/${flagId}/resolve`, { method: 'POST', headers: hdr() });
    setFlags(p => p.filter(f => f.id !== flagId));
  };

  const TABS = [
    { id: 'stats',  label: 'Stats',       icon: BarChart3,   visible: isDev  },
    { id: 'api',    label: 'API Usage',   icon: Cpu,         visible: isDev  },
    { id: 'users',  label: 'Users',       icon: Users,       visible: isAdmin },
    { id: 'flags',  label: 'Flags',       icon: Flag,        visible: isMod  },
    { id: 'audit',  label: 'Audit Log',   icon: Book,        visible: isAdmin },
  ].filter(t => t.visible);

  const filteredUsers = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-500" /> Admin Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Signed in as <span className={`font-medium ${ROLE_COLORS[userRole]?.split(' ')[2]}`}>{userRole}</span>
          </p>
        </div>
        <button onClick={() => fetchTab(tab)} disabled={loading} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === id ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">

        {/* STATS TAB */}
        {tab === 'stats' && stats && (
          <div className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Users"    value={stats.users?.total}      icon={Users}      color="text-blue-500" />
              <StatCard label="Active Today"   value={stats.users?.activeToday} icon={TrendingUp} color="text-green-500" />
              <StatCard label="AI Requests"    value={stats.ai?.totalRequests}  icon={Zap}        color="text-purple-500" />
              <StatCard label="DB Size"         value={stats.system?.dbSize}    icon={Database}   color="text-orange-500" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Subscriptions"  value={stats.subscriptions?.active}   icon={Check}  color="text-emerald-500" />
              <StatCard label="Pro Plans"       value={stats.subscriptions?.pro}      icon={Zap}    color="text-blue-500" />
              <StatCard label="Enterprise"      value={stats.subscriptions?.enterprise} icon={ShieldAlert} color="text-purple-500" />
            </div>
          </div>
        )}

        {/* API USAGE TAB */}
        {tab === 'api' && apiUsage && (
          <div className="max-w-3xl space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI API Cost Breakdown</h2>
            {(apiUsage.usage || []).map(u => (
              <div key={u.provider} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{u.provider}</p>
                    <p className="text-xs text-gray-400">{u.model}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">${u.cost?.toFixed(4)}</p>
                    <p className="text-xs text-gray-400">this period</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{u.requests?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Requests</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{u.inputTokens?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Input tokens</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{u.outputTokens?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Output tokens</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div className="max-w-5xl">
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by email or username…" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice((page - 1) * 20, page * 20).map(u => (
                    <UserRow key={u.id} user={u} onRoleChange={changeRole} onSuspend={suspendUser} />
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">No users found.</div>
              )}
            </div>
            {filteredUsers.length > 20 && (
              <div className="flex justify-center gap-2 mt-4">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Prev</button>
                <span className="px-3 py-1.5 text-sm text-gray-500">Page {page}</span>
                <button disabled={page * 20 >= filteredUsers.length} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Next</button>
              </div>
            )}
          </div>
        )}

        {/* FLAGS TAB */}
        {tab === 'flags' && (
          <div className="max-w-3xl space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content Flags</h2>
            {flags.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Flag size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No open flags — all clear.</p>
              </div>
            ) : flags.map(f => (
              <div key={f.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Flag size={14} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{f.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.content_type} · Reported by {f.reporter_email}</p>
                  {f.notes && <p className="text-xs text-gray-500 mt-1">{f.notes}</p>}
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock size={10} /> {f.created_at ? new Date(f.created_at).toLocaleString() : '—'}
                  </p>
                </div>
                <button onClick={() => resolveFlag(f.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex-shrink-0">
                  <Check size={11} /> Resolve
                </button>
              </div>
            ))}
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {tab === 'audit' && (
          <div className="max-w-4xl">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Audit Log</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {['Time', 'User', 'Action', 'Status'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map(log => (
                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">{log.user_email || log.user_id || 'system'}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-gray-900 dark:text-white">{log.action}</span>
                        {log.resource && <span className="text-xs text-gray-400 ml-1">on {log.resource}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : log.status === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                          {log.status || 'info'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLog.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">No audit log entries.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
