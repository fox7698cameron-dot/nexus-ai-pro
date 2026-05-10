// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Server, DollarSign, Shield, Flag, FileText, ToggleLeft, ToggleRight,
  Radio, Search, ChevronLeft, ChevronRight, Trash2, Edit3, AlertTriangle,
  Activity, Database, Cpu, MemoryStick, Clock, CheckCircle, XCircle,
  RefreshCw, Send, Ban, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const API = async (path, opts = {}) => {
  const token = sessionStorage.getItem('nexus:token');
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

function maskEmail(email = '') {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 2)}***@${domain}`;
}

function Card({ icon: Icon, label, value, sub, accent = 'red' }) {
  const colors = { red: 'text-red-400 bg-red-500/10 border-red-500/20', green: 'text-green-400 bg-green-500/10 border-green-500/20', yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  return (
    <div className={`border rounded-xl p-5 ${colors[accent] || colors.red}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon size={18} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-red-400" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const ROLES = ['user', 'moderator', 'developer', 'admin'];
const TIERS = ['free', 'pro', 'enterprise'];
const PAGE_SIZE = 10;

export default function AdminDashboard() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [broadcast, setBroadcast] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, s] = await Promise.all([
        API('/api/admin/users').catch(() => ({ users: [] })),
        API('/api/admin/stats').catch(() => null),
      ]);
      setUsers(u.users ?? []);
      setStats(s);
      setAuditLogs(s?.auditLog ?? []);
      setFlagged(s?.flaggedContent ?? []);
      setFeatureFlags(s?.featureFlags ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateUser = async (id, patch) => {
    await API(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const deleteUser = async (id) => {
    if (!confirm('Permanently delete this user?')) return;
    await API(`/api/admin/users/${id}`, { method: 'DELETE' });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const sendBroadcast = async () => {
    if (!broadcast.trim()) return;
    await API('/api/admin/broadcast', { method: 'POST', body: JSON.stringify({ message: broadcast }) }).catch(() => {});
    setBroadcastSent(true);
    setBroadcast('');
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  const toggleFlag = async (key, val) => {
    await API('/api/admin/feature-flags', { method: 'PUT', body: JSON.stringify({ key, value: !val }) }).catch(() => {});
    setFeatureFlags((prev) => prev.map((f) => (f.key === key ? { ...f, value: !val } : f)));
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Admin Control Panel
          </h1>
          <p className="text-gray-400 mt-1">Logged in as <span className="text-red-400 font-mono">{me?.email}</span></p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-1.5">
            <CheckCircle size={14} /> Server Online
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm flex items-center gap-1.5">
            <Users size={14} /> {users.length} Users
          </span>
          <button onClick={load} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-1.5 hover:bg-white/10 transition">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* System Health */}
      <Section title="System Health" icon={Activity}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card icon={Cpu} label="CPU" value={stats?.cpu ?? '—'} accent="red" />
          <Card icon={MemoryStick} label="Memory" value={stats?.memory ?? '—'} accent="yellow" />
          <Card icon={Activity} label="Connections" value={stats?.connections ?? '—'} accent="blue" />
          <Card icon={Database} label="Database" value={stats?.dbStatus ?? '—'} accent="green" />
          <Card icon={Server} label="Redis" value={stats?.redisStatus ?? '—'} accent="red" />
          <Card icon={Clock} label="Uptime" value={stats?.uptime ?? '—'} accent="blue" />
        </div>
      </Section>

      {/* Revenue Overview */}
      <Section title="Revenue Overview" icon={DollarSign}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card icon={DollarSign} label="MRR" value={stats?.mrr ?? '$—'} accent="green" />
          <Card icon={Star} label="Pro Users" value={stats?.proUsers ?? '—'} accent="yellow" />
          <Card icon={Shield} label="Enterprise" value={stats?.enterpriseUsers ?? '—'} accent="red" />
        </div>
        {stats?.recentPayments?.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>{['Email', 'Amount', 'Plan', 'Date'].map((h) => <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.recentPayments.map((p, i) => (
                  <tr key={i} className="hover:bg-white/3">
                    <td className="px-4 py-3 font-mono text-gray-300">{maskEmail(p.email)}</td>
                    <td className="px-4 py-3 text-green-400">{p.amount}</td>
                    <td className="px-4 py-3 capitalize text-purple-400">{p.plan}</td>
                    <td className="px-4 py-3 text-gray-500">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* User Management */}
      <Section title="User Management" icon={Users}>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-red-500/50"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>{['Email', 'Username', 'Role', 'Tier', 'Joined', 'Last Login', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
              ) : paginated.map((u) => (
                <tr key={u.id} className="hover:bg-white/3 transition">
                  <td className="px-4 py-3 font-mono text-gray-300 text-xs">{maskEmail(u.email)}</td>
                  <td className="px-4 py-3 text-white">{u.username ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      className="bg-transparent text-yellow-400 text-xs border border-white/10 rounded px-2 py-1"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.tier}
                      onChange={(e) => updateUser(u.id, { tier: e.target.value })}
                      className="bg-transparent text-purple-400 text-xs border border-white/10 rounded px-2 py-1"
                    >
                      {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.suspended ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {u.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => updateUser(u.id, { suspended: !u.suspended })}
                      title={u.suspended ? 'Unsuspend' : 'Suspend'}
                      className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition"
                    >
                      <Ban size={14} />
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
            <span>Page {page + 1} of {totalPages} ({filtered.length} results)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Content Moderation Queue */}
      <Section title="Content Moderation Queue" icon={Flag}>
        {flagged.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 text-center text-gray-500">No flagged content</div>
        ) : (
          <div className="space-y-3">
            {flagged.map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 flex justify-between items-start gap-4">
                <div>
                  <p className="text-sm text-gray-300 line-clamp-2">{item.content}</p>
                  <p className="text-xs text-gray-500 mt-1">Flagged by moderator · {item.reason}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="px-3 py-1 text-xs rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition">Approve</button>
                  <button className="px-3 py-1 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Audit Log */}
      <Section title="Audit Log" icon={FileText}>
        <div className="overflow-x-auto rounded-xl border border-white/10 max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 sticky top-0">
              <tr>{['Time', 'Actor', 'Action', 'Target'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No audit entries</td></tr>
              ) : auditLogs.slice(0, 50).map((log, i) => (
                <tr key={i} className="hover:bg-white/3">
                  <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{new Date(log.ts).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-gray-300 text-xs font-mono">{maskEmail(log.actor)}</td>
                  <td className="px-4 py-2.5 text-yellow-400 text-xs">{log.action}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{log.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Feature Flags */}
      <Section title="Feature Flags" icon={ToggleLeft}>
        {featureFlags.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 text-center text-gray-500">No feature flags configured</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featureFlags.map((f) => (
              <div key={f.key} className="p-4 rounded-xl border border-white/10 bg-white/3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{f.key}</p>
                  {f.description && <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>}
                </div>
                <button onClick={() => toggleFlag(f.key, f.value)} className="transition">
                  {f.value
                    ? <ToggleRight size={28} className="text-green-400" />
                    : <ToggleLeft size={28} className="text-gray-500" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Broadcast Message */}
      <Section title="Broadcast Message" icon={Radio}>
        <div className="p-5 rounded-xl border border-white/10 bg-white/3 space-y-3">
          <textarea
            value={broadcast}
            onChange={(e) => setBroadcast(e.target.value)}
            placeholder="Type a message to broadcast to all connected users..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-red-500/50"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={sendBroadcast}
              disabled={!broadcast.trim()}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition flex items-center gap-2"
            >
              <Send size={15} /> Send Broadcast
            </button>
            {broadcastSent && <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle size={14} /> Sent!</span>}
          </div>
        </div>
      </Section>
    </div>
  );
}
