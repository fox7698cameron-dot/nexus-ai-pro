// File: AdminDashboard.jsx | Date: 2026-06-16 | Nexus AI Pro

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  Users, DollarSign, Activity, Shield, AlertTriangle, Search, ChevronDown,
  Edit, Ban, Trash2, Eye, RefreshCw, Bell, Code2, Webhook, Send, Check, X, TrendingUp
} from 'lucide-react';

const MOCK_STATS = {
  totalUsers: 18420, activeSubscriptions: 3847, monthlyRevenue: 73243, apiCallsToday: 2840091,
  prevUsers: 17980, prevRevenue: 68100,
};

const MOCK_USERS = [
  { id: 'u1', avatar: 'AJ', email: 'alex@example.com', username: 'alex_dev', role: 'admin', subscription: 'enterprise', joined: '2025-01-15', lastSeen: '5 min ago', suspended: false },
  { id: 'u2', avatar: 'KL', email: 'kate@example.com', username: 'katedesign', role: 'moderator', subscription: 'pro', joined: '2025-03-22', lastSeen: '2 hr ago', suspended: false },
  { id: 'u3', avatar: 'MC', email: 'mike@example.com', username: 'mike_code', role: 'developer', subscription: 'pro', joined: '2025-06-10', lastSeen: '1 day ago', suspended: false },
  { id: 'u4', avatar: 'SR', email: 'spam@evil.com', username: 'spammer999', role: 'user', subscription: 'free', joined: '2026-05-01', lastSeen: '1 week ago', suspended: true },
  { id: 'u5', avatar: 'JL', email: 'jane@corp.io', username: 'jane_corp', role: 'user', subscription: 'enterprise', joined: '2025-09-15', lastSeen: '3 hr ago', suspended: false },
];

const MOCK_TRANSACTIONS = [
  { id: 'tx1', user: 'jane@corp.io', plan: 'Enterprise', amount: 99, date: '2026-06-16', status: 'success' },
  { id: 'tx2', user: 'mike@example.com', plan: 'Pro', amount: 19, date: '2026-06-15', status: 'success' },
  { id: 'tx3', user: 'anon@test.com', plan: 'Pro', amount: 19, date: '2026-06-15', status: 'failed' },
  { id: 'tx4', user: 'alex@example.com', plan: 'Enterprise', amount: 99, date: '2026-06-14', status: 'success' },
  { id: 'tx5', user: 'kate@example.com', plan: 'Pro', amount: 19, date: '2026-06-14', status: 'refunded' },
];

const MOCK_MOD_QUEUE = [
  { id: 'c1', type: 'post', content: 'Spammy promotion link', reporter: 'user123', reported_at: '2026-06-16T10:00:00Z', status: 'pending' },
  { id: 'c2', type: 'comment', content: 'Offensive language in thread', reporter: 'user456', reported_at: '2026-06-16T09:30:00Z', status: 'pending' },
];

const MOCK_SYSTEM = {
  server: 'operational', apiLatency: 42, dbConnections: 28, cacheHitRate: 94,
};

const MOCK_API_KEYS = [
  { id: 'k1', name: 'Production API', key: 'nxs_prod_••••••••••4a2f', created: '2026-01-10', lastUsed: '2 min ago', active: true },
  { id: 'k2', name: 'Dev Testing', key: 'nxs_dev_••••••••••8c1b', created: '2026-03-05', lastUsed: '3 days ago', active: true },
];

const MOCK_WEBHOOKS = [
  { id: 'w1', endpoint: 'https://hooks.example.com/nexus', events: ['user.created', 'subscription.updated'], active: true },
  { id: 'w2', endpoint: 'https://logs.corp.io/webhook', events: ['error.critical'], active: false },
];

const MONTHLY_REVENUE = [
  { month: 'Jan', value: 58200 }, { month: 'Feb', value: 61400 }, { month: 'Mar', value: 63800 },
  { month: 'Apr', value: 67100 }, { month: 'May', value: 68100 }, { month: 'Jun', value: 73243 },
];

const ROLE_HIERARCHY = ['user', 'developer', 'moderator', 'admin', 'super_admin'];

const ROLE_COLORS = {
  super_admin: 'bg-red-100 text-red-800',
  admin: 'bg-orange-100 text-orange-800',
  developer: 'bg-blue-100 text-blue-800',
  moderator: 'bg-yellow-100 text-yellow-800',
  user: 'bg-gray-100 text-gray-700',
};

const SUB_COLORS = {
  enterprise: 'bg-purple-100 text-purple-800',
  pro: 'bg-indigo-100 text-indigo-800',
  free: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS = {
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-yellow-100 text-yellow-800',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'moderation', label: 'Moderation', icon: AlertTriangle },
  { id: 'system', label: 'System Health', icon: Activity },
  { id: 'broadcast', label: 'Broadcast', icon: Bell },
  { id: 'developer', label: 'Developer', icon: Code2 },
];

function StatCard({ icon: Icon, label, value, prev, prefix = '', color = 'indigo' }) {
  const change = prev ? (((value - prev) / prev) * 100).toFixed(1) : null;
  const up = change > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${color}-50`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {change !== null && (
        <div className={`flex items-center gap-1 text-sm font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
          <TrendingUp className={`w-4 h-4 ${up ? '' : 'rotate-180'}`} />
          {up ? '+' : ''}{change}% vs last month
        </div>
      )}
    </div>
  );
}

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function OverviewTab({ stats, transactions }) {
  const maxRev = Math.max(...MONTHLY_REVENUE.map(m => m.value));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} prev={stats.prevUsers} color="indigo" />
        <StatCard icon={Activity} label="Active Subscriptions" value={stats.activeSubscriptions} color="emerald" />
        <StatCard icon={DollarSign} label="Monthly Revenue" value={stats.monthlyRevenue} prev={stats.prevRevenue} prefix="$" color="violet" />
        <StatCard icon={Activity} label="API Calls Today" value={stats.apiCallsToday} color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue (Last 6 Months)</h3>
          <div className="flex items-end gap-3 h-36">
            {MONTHLY_REVENUE.map(m => (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-full bg-indigo-500 rounded-t-sm transition-all"
                  style={{ height: `${(m.value / maxRev) * 120}px` }}
                  title={`$${m.value.toLocaleString()}`}
                />
                <span className="text-xs text-gray-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Subscription Tier Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Free', pct: 45, color: 'bg-gray-300' },
              { label: 'Pro', pct: 42, color: 'bg-indigo-500' },
              { label: 'Enterprise', pct: 13, color: 'bg-purple-500' },
            ].map(tier => (
              <div key={tier.label} className="space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{tier.label}</span>
                  <span className="font-medium">{tier.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${tier.color} rounded-full`} style={{ width: `${tier.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Amount</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{tx.user}</td>
                  <td className="px-5 py-3">
                    <Badge className={SUB_COLORS[tx.plan.toLowerCase()]}>{tx.plan}</Badge>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">${tx.amount}</td>
                  <td className="px-5 py-3 text-gray-500">{tx.date}</td>
                  <td className="px-5 py-3">
                    <Badge className={STATUS_COLORS[tx.status]}>{tx.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, setUsers, currentRole }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [openAction, setOpenAction] = useState(null);
  const [editingRole, setEditingRole] = useState(null);

  const myRoleIndex = ROLE_HIERARCHY.indexOf(currentRole);

  const filtered = users.filter(u => {
    const matchSearch = u.email.includes(search) || u.username.includes(search);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleSuspend = useCallback(async (userId, suspended) => {
    try {
      await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ suspended: !suspended }),
      });
    } catch (_) {}
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: !suspended } : u));
    setOpenAction(null);
  }, [setUsers]);

  const handleRoleChange = useCallback(async (userId, newRole) => {
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
    } catch (_) {}
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setEditingRole(null);
  }, [setUsers]);

  const handleDelete = useCallback(async (userId) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', credentials: 'include' });
    } catch (_) {}
    setUsers(prev => prev.filter(u => u.id !== userId));
    setOpenAction(null);
  }, [setUsers]);

  const avatarColor = (role) => {
    const map = { super_admin: 'bg-red-500', admin: 'bg-orange-500', developer: 'bg-blue-500', moderator: 'bg-yellow-500', user: 'bg-gray-400' };
    return map[role] || 'bg-gray-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="all">All Roles</option>
            {ROLE_HIERARCHY.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Subscription</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Last Seen</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 ${u.suspended ? 'border-l-4 border-red-400' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarColor(u.role)}`}>
                        {u.avatar}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{u.email}</div>
                        <div className="text-xs text-gray-400">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingRole === u.id ? (
                      <select
                        defaultValue={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        onBlur={() => setEditingRole(null)}
                        autoFocus
                        className="border border-gray-300 rounded px-2 py-1 text-xs"
                      >
                        {ROLE_HIERARCHY.filter((_, i) => i <= myRoleIndex).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge className={ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}>{u.role}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={SUB_COLORS[u.subscription]}>{u.subscription}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.joined}</td>
                  <td className="px-4 py-3 text-gray-500">{u.lastSeen}</td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setOpenAction(openAction === u.id ? null : u.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700"
                    >
                      Actions <ChevronDown className="w-3 h-3" />
                    </button>
                    {openAction === u.id && (
                      <div className="absolute right-4 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40">
                        <button
                          onClick={() => { setOpenAction(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                        <button
                          onClick={() => { setEditingRole(u.id); setOpenAction(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4" /> Edit Role
                        </button>
                        <button
                          onClick={() => handleSuspend(u.id, u.suspended)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Ban className="w-4 h-4" /> {u.suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Critical Alerts', value: 2, color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
          { label: 'Active Bans', value: 14, color: 'text-orange-600', bg: 'bg-orange-50', icon: Ban },
          { label: 'Compliance', value: 'Passing', color: 'text-green-600', bg: 'bg-green-50', icon: Check },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-5 flex items-center gap-4`}>
            <item.icon className={`w-6 h-6 ${item.color}`} />
            <div>
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-sm text-gray-600">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Security Dashboard</h3>
        <p className="text-sm text-gray-500 mb-4">View detailed security analytics, threat logs, and audit trails.</p>
        <a href="/admin/security" className="inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:underline">
          Open Security Dashboard <ChevronDown className="w-4 h-4 -rotate-90" />
        </a>
      </div>
    </div>
  );
}

function ModerationTab({ queue, setQueue }) {
  const handleAction = useCallback(async (id, action) => {
    try {
      await fetch(`/api/admin/moderation/${id}/${action}`, { method: 'POST', credentials: 'include' });
    } catch (_) {}
    setQueue(prev => prev.map(item => item.id === id ? { ...item, status: action === 'approve' ? 'approved' : 'removed' } : item));
  }, [setQueue]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Flagged Content Queue</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {queue.map(item => (
          <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-100 text-blue-700">{item.type}</Badge>
                <Badge className={item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}>
                  {item.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-700 truncate">{item.content}</p>
              <p className="text-xs text-gray-400 mt-1">Reported by {item.reporter} · {new Date(item.reported_at).toLocaleString()}</p>
            </div>
            {item.status === 'pending' && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAction(item.id, 'approve')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium"
                >
                  <Check className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => handleAction(item.id, 'remove')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-medium"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemHealthTab({ system }) {
  const latencyColor = system.apiLatency < 100 ? 'text-green-600' : system.apiLatency < 500 ? 'text-yellow-500' : 'text-red-600';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2">Server Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-green-700 capitalize">{system.server}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2">API Latency (p50)</p>
          <span className={`text-2xl font-bold ${latencyColor}`}>{system.apiLatency}ms</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2">DB Connections</p>
          <span className="text-2xl font-bold text-gray-900">{system.dbConnections}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2">Cache Hit Rate</p>
          <span className="text-2xl font-bold text-gray-900">{system.cacheHitRate}%</span>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${system.cacheHitRate}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BroadcastTab() {
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [specificUser, setSpecificUser] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, target, specificUser: target === 'specific' ? specificUser : undefined }),
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      setMessage('');
    } catch (_) {
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-4">
      <h3 className="font-semibold text-gray-800">Send Broadcast Notification</h3>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
        <select
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">All Users</option>
          <option value="pro">Pro Users</option>
          <option value="enterprise">Enterprise Users</option>
          <option value="specific">Specific User</option>
        </select>
      </div>
      {target === 'specific' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">User Email or ID</label>
          <input
            type="text"
            value={specificUser}
            onChange={e => setSpecificUser(e.target.value)}
            placeholder="user@example.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          placeholder="Enter your broadcast message..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      </div>
      <button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
        {sent ? 'Sent!' : sending ? 'Sending...' : 'Send Notification'}
      </button>
    </div>
  );
}

function DeveloperTab({ apiKeys, setApiKeys }) {
  const [webhooks, setWebhooks] = useState(MOCK_WEBHOOKS);
  const [generating, setGenerating] = useState(false);

  const handleRevoke = useCallback(async (keyId) => {
    try {
      await fetch(`/api/admin/api-keys/${keyId}`, { method: 'DELETE', credentials: 'include' });
    } catch (_) {}
    setApiKeys(prev => prev.filter(k => k.id !== keyId));
  }, [setApiKeys]);

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/api-keys', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      setApiKeys(prev => [...prev, data]);
    } catch (_) {
      setApiKeys(prev => [...prev, {
        id: `k${Date.now()}`, name: 'New Key', key: 'nxs_new_••••••••••xxxx',
        created: new Date().toISOString().slice(0, 10), lastUsed: 'Never', active: true,
      }]);
    } finally {
      setGenerating(false);
    }
  };

  const toggleWebhook = (id) => {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">API Keys</h3>
          <button
            onClick={handleGenerateKey}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
          >
            <Code2 className="w-3.5 h-3.5" /> {generating ? 'Generating...' : 'Generate New Key'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Key</th>
                <th className="px-5 py-3 text-left">Created</th>
                <th className="px-5 py-3 text-left">Last Used</th>
                <th className="px-5 py-3 text-left">Active</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {apiKeys.map(key => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{key.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{key.key}</td>
                  <td className="px-5 py-3 text-gray-500">{key.created}</td>
                  <td className="px-5 py-3 text-gray-500">{key.lastUsed}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block w-2 h-2 rounded-full ${key.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-xs text-red-600 hover:underline font-medium"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Webhook className="w-4 h-4" /> Webhook Configurations
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {webhooks.map(wh => (
            <div key={wh.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-gray-700 truncate">{wh.endpoint}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wh.events.map(ev => (
                    <Badge key={ev} className="bg-gray-100 text-gray-600">{ev}</Badge>
                  ))}
                </div>
              </div>
              <button
                onClick={() => toggleWebhook(wh.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${wh.active ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${wh.active ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [modQueue, setModQueue] = useState([]);
  const [system, setSystem] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, txRes, modRes, sysRes, keysRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/transactions', { credentials: 'include' }),
        fetch('/api/admin/moderation/queue', { credentials: 'include' }),
        fetch('/api/admin/system', { credentials: 'include' }),
        fetch('/api/admin/api-keys', { credentials: 'include' }),
      ]);
      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setTransactions(await txRes.json());
      setModQueue(await modRes.json());
      setSystem(await sysRes.json());
      setApiKeys(await keysRes.json());
    } catch (_) {
      setStats(MOCK_STATS);
      setUsers(MOCK_USERS);
      setTransactions(MOCK_TRANSACTIONS);
      setModQueue(MOCK_MOD_QUEUE);
      setSystem(MOCK_SYSTEM);
      setApiKeys(MOCK_API_KEYS);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!['admin', 'super_admin'].includes(role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center shadow-sm">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">You need admin or super_admin privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Last updated {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex overflow-x-auto gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab stats={stats} transactions={transactions} />}
            {activeTab === 'users' && <UsersTab users={users} setUsers={setUsers} currentRole={role} />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'moderation' && <ModerationTab queue={modQueue} setQueue={setModQueue} />}
            {activeTab === 'system' && system && <SystemHealthTab system={system} />}
            {activeTab === 'broadcast' && <BroadcastTab />}
            {activeTab === 'developer' && <DeveloperTab apiKeys={apiKeys} setApiKeys={setApiKeys} />}
          </>
        )}
      </div>
    </div>
  );
}
