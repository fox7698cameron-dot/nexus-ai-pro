// Date: 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Activity, DollarSign, Zap, Server, Database, Radio, Clock,
  Shield, Bell, Search, Filter, ChevronLeft, ChevronRight, Trash2,
  Ban, CheckCircle, RefreshCw, ToggleLeft, ToggleRight, AlertTriangle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

// ─── Mock data (replace with real API calls) ─────────────────────────────────
const MOCK_STATS = {
  totalUsers: 12847,
  activeSessions: 342,
  monthlyRevenue: 48290,
  apiUsage: 2340000,
};

const MOCK_SYSTEM = [
  { name: 'API Server', status: 'healthy', latency: '12ms', uptime: '99.98%' },
  { name: 'Database (Postgres)', status: 'healthy', latency: '3ms', uptime: '99.99%' },
  { name: 'Redis Cache', status: 'healthy', latency: '1ms', uptime: '100%' },
  { name: 'Job Queue', status: 'degraded', latency: '145ms', uptime: '97.2%' },
  { name: 'AI Model Router', status: 'healthy', latency: '55ms', uptime: '99.95%' },
];

const MOCK_USERS = Array.from({ length: 20 }, (_, i) => ({
  id: `usr_${1000 + i}`,
  name: ['Alice Chen', 'Bob Park', 'Carol Davis', 'Dan Moore', 'Eve Wilson'][i % 5],
  email: `user${1000 + i}@example.com`,
  role: ['user', 'moderator', 'developer', 'admin'][i % 4],
  plan: ['free', 'pro', 'business'][i % 3],
  status: i === 3 ? 'banned' : 'active',
  joined: new Date(2025, i % 12, (i % 28) + 1),
  lastActive: new Date(2026, 6, 20 - (i % 5)),
}));

const MOCK_AUDIT = Array.from({ length: 30 }, (_, i) => ({
  id: `audit_${i}`,
  action: ['LOGIN', 'PLAN_UPGRADE', 'USER_BANNED', 'API_KEY_CREATED', 'WEBHOOK_UPDATED', 'CONFIG_CHANGED'][i % 6],
  user: `user${1000 + (i % 20)}@example.com`,
  date: new Date(2026, 6, 20 - Math.floor(i / 5)),
  details: 'Auto-generated audit entry for demonstration.',
}));

const REVENUE_DATA = Array.from({ length: 7 }, (_, i) => ({
  day: format(new Date(2026, 6, 14 + i), 'EEE'),
  revenue: 4000 + Math.round(Math.random() * 3000),
  users: 30 + Math.round(Math.random() * 50),
}));

const FEATURE_FLAGS = [
  { id: 'new_chat_ui', label: 'New Chat UI', enabled: true },
  { id: 'crypto_payments', label: 'Crypto Payments', enabled: true },
  { id: 'ai_model_v3', label: 'AI Model v3', enabled: false },
  { id: 'beta_analytics', label: 'Beta Analytics', enabled: false },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-violet-400' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-start gap-4">
      <div className={`p-2.5 bg-gray-800 rounded-xl ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = { healthy: 'bg-green-400', degraded: 'bg-amber-400', down: 'bg-red-400' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-500'} mr-2`} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState(MOCK_USERS);
  const [auditLog, setAuditLog] = useState(MOCK_AUDIT);
  const [flags, setFlags] = useState(FEATURE_FLAGS);
  const [searchUser, setSearchUser] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  const PER_PAGE = 10;
  const filteredAudit = auditLog.filter((a) =>
    !auditFilter || a.action.includes(auditFilter.toUpperCase()) || a.user.includes(auditFilter)
  );
  const auditPages = Math.ceil(filteredAudit.length / PER_PAGE);
  const auditSlice = filteredAudit.slice(auditPage * PER_PAGE, (auditPage + 1) * PER_PAGE);

  const filteredUsers = users.filter(
    (u) => !searchUser || u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.includes(searchUser)
  );

  const toggleBan = (id) => {
    setUsers((prev) =>
      prev.map((u) => u.id === id ? { ...u, status: u.status === 'banned' ? 'active' : 'banned' } : u)
    );
  };

  const changeRole = (id, role) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
  };

  const toggleFlag = (id) => {
    setFlags((prev) => prev.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const sendBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastSent(true);
    setBroadcastMsg('');
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'system', label: 'System Health' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'broadcast', label: 'Broadcast' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={22} className="text-violet-400" />
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
        </div>
        <span className="text-xs text-gray-500">All times UTC</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* ── Overview ── */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={MOCK_STATS.totalUsers.toLocaleString()} sub="+12% this month" />
              <StatCard icon={Activity} label="Active Sessions" value={MOCK_STATS.activeSessions} sub="Right now" color="text-cyan-400" />
              <StatCard icon={DollarSign} label="Monthly Revenue" value={`$${MOCK_STATS.monthlyRevenue.toLocaleString()}`} sub="MRR" color="text-green-400" />
              <StatCard icon={Zap} label="API Calls" value={`${(MOCK_STATS.apiUsage / 1e6).toFixed(1)}M`} sub="This month" color="text-amber-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-4 text-sm text-gray-400">Revenue (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-4 text-sm text-gray-400">New Users (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="users" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <Search size={14} className="text-gray-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Name', 'Role', 'Plan', 'Status', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-gray-200 font-medium">{u.name}</p>
                        <p className="text-gray-600 text-xs">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1"
                        >
                          {['user', 'moderator', 'developer', 'admin'].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 capitalize">{u.plan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          u.status === 'active' ? 'text-green-400 bg-green-950 border border-green-800' : 'text-red-400 bg-red-950 border border-red-800'
                        }`}>{u.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{format(u.joined, 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleBan(u.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.status === 'banned' ? 'text-green-400 hover:bg-green-950' : 'text-amber-400 hover:bg-amber-950'
                            }`}
                            title={u.status === 'banned' ? 'Unban' : 'Ban'}
                          >
                            {u.status === 'banned' ? <CheckCircle size={14} /> : <Ban size={14} />}
                          </button>
                          <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-950 transition-colors" title="Delete">
                            <Trash2 size={14} />
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

        {/* ── System Health ── */}
        {tab === 'system' && (
          <div className="grid grid-cols-1 gap-4">
            {MOCK_SYSTEM.map((s) => (
              <div key={s.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                {s.name.includes('Database') ? <Database size={18} className="text-gray-500" />
                  : s.name.includes('Redis') ? <Radio size={18} className="text-gray-500" />
                  : <Server size={18} className="text-gray-500" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{s.name}</p>
                  <p className="text-xs text-gray-500">Latency: {s.latency} | Uptime: {s.uptime}</p>
                </div>
                <div className="flex items-center">
                  <StatusDot status={s.status} />
                  <span className={`text-xs font-medium capitalize ${
                    s.status === 'healthy' ? 'text-green-400' : s.status === 'degraded' ? 'text-amber-400' : 'text-red-400'
                  }`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Audit Log ── */}
        {tab === 'audit' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center gap-3">
              <Filter size={14} className="text-gray-500" />
              <input
                type="text"
                placeholder="Filter by action or user..."
                value={auditFilter}
                onChange={(e) => { setAuditFilter(e.target.value); setAuditPage(0); }}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-violet-500"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Time', 'Action', 'User', 'Details'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditSlice.map((a) => (
                    <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{format(a.date, 'MMM d, HH:mm')}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-violet-300 bg-violet-950 px-2 py-0.5 rounded">{a.action}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{a.user}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-xs">{a.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-gray-800 flex items-center justify-between text-sm text-gray-500">
              <span>{filteredAudit.length} entries</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setAuditPage((p) => Math.max(0, p - 1))} disabled={auditPage === 0} className="p-1 hover:text-gray-300 disabled:opacity-30">
                  <ChevronLeft size={16} />
                </button>
                <span>Page {auditPage + 1} of {auditPages || 1}</span>
                <button onClick={() => setAuditPage((p) => Math.min(auditPages - 1, p + 1))} disabled={auditPage >= auditPages - 1} className="p-1 hover:text-gray-300 disabled:opacity-30">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Feature Flags ── */}
        {tab === 'flags' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {flags.map((f) => (
              <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">{f.label}</p>
                  <p className="text-xs text-gray-600 font-mono mt-0.5">{f.id}</p>
                </div>
                <button onClick={() => toggleFlag(f.id)} className={`transition-colors ${f.enabled ? 'text-green-400' : 'text-gray-600'}`}>
                  {f.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Broadcast ── */}
        {tab === 'broadcast' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-violet-400" />
              <h3 className="font-semibold">Broadcast Notification</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">Send a notification to all platform users.</p>
            <textarea
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder="Enter message to broadcast..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-violet-500 transition-colors resize-none mb-3"
            />
            {broadcastSent && (
              <div className="flex items-center gap-2 text-green-400 text-sm mb-3">
                <CheckCircle size={15} /> Broadcast sent successfully
              </div>
            )}
            <button
              onClick={sendBroadcast}
              disabled={!broadcastMsg.trim()}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
            >
              Send to All Users ({MOCK_STATS.totalUsers.toLocaleString()})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
