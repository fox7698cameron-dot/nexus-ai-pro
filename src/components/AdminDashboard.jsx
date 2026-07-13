// ================================================
// NEXUS AI PRO – AdminDashboard Component
// Full admin panel: users, security, analytics,
// subscriptions, gift cards, audit log, system health
// ================================================
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldAlert,
  BarChart3,
  CreditCard,
  Gift,
  ScrollText,
  Activity,
  Plug,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  Ban,
  UserCheck,
  KeyRound,
  ScanLine,
  Server,
  Cpu,
  Wifi,
  TrendingUp,
  DollarSign,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  MoreHorizontal,
} from 'lucide-react';

// ================================================
// UTILITIES
// ================================================
function cls(...args) {
  return args.filter(Boolean).join(' ');
}

function Badge({ children, variant = 'gray' }) {
  const variants = {
    gray:    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    green:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    red:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    yellow:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    orange:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return (
    <span className={cls('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant])}>
      {children}
    </span>
  );
}

function Alert({ type = 'error', message }) {
  const styles = {
    error:   'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  };
  const Icon = type === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={cls('flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm', styles[type])}>
      <Icon className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}

function StatCard({ label, value, subLabel, icon: Icon, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  };
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex items-center gap-4">
      <div className={cls('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colors[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        {subLabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subLabel}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
        {Icon && <Icon className="w-5 h-5 text-indigo-500" />}
        {title}
      </h2>
      {action}
    </div>
  );
}

function TableWrapper({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      {children}
    </div>
  );
}

// Role badge colors
const roleBadgeVariant = {
  admin:     'purple',
  dev:       'blue',
  moderator: 'orange',
  user:      'gray',
};

// ================================================
// MOCK DATA GENERATORS
// ================================================
const MOCK_USERS = Array.from({ length: 30 }, (_, i) => ({
  id: `user_${i + 1}`,
  name: ['Alice Chen', 'Bob Martinez', 'Carol White', 'David Kim', 'Eva Singh',
         'Frank Muller', 'Grace Liu', 'Henry Park', 'Iris Tan', 'James Fox'][i % 10],
  email: `user${i + 1}@example.com`,
  role: ['user', 'user', 'user', 'dev', 'moderator', 'user', 'user', 'admin', 'user', 'user'][i % 10],
  status: i % 8 === 0 ? 'disabled' : 'active',
  plan: ['free', 'starter', 'pro', 'enterprise', 'free'][i % 5],
  joinedAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
  lastLoginAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
}));

const MOCK_AUDIT = Array.from({ length: 50 }, (_, i) => ({
  id: `audit_${i + 1}`,
  timestamp: new Date(Date.now() - i * 3600000 * Math.random() * 5).toISOString(),
  event: ['USER_LOGIN', 'USER_REGISTER', 'PLAN_UPGRADE', 'ADMIN_ACTION',
          'GIFT_CARD_REDEEM', 'SECURITY_SCAN', 'USER_DISABLED', 'KEY_ROTATION',
          'WEBHOOK_RECEIVED', 'API_KEY_CREATED'][i % 10],
  user: `user${(i % 20) + 1}@example.com`,
  details: ['Logged in from 192.168.1.1', 'Registered new account', 'Upgraded to Pro',
            'Admin changed user role', 'Redeemed gift card $10',
            'Security scan completed: 0 critical', 'Account suspended by admin',
            'RSA-4096 key rotated', 'Stripe webhook: payment_succeeded',
            'New API key generated'][i % 10],
  severity: ['info', 'info', 'info', 'warning', 'info', 'success', 'warning', 'warning', 'info', 'info'][i % 10],
}));

const MOCK_VULNERABILITIES = [
  { id: 1, severity: 'critical', title: 'Outdated dependency: lodash@4.17.20', status: 'open' },
  { id: 2, severity: 'high', title: 'Missing rate limit on /api/auth/login', status: 'open' },
  { id: 3, severity: 'medium', title: 'CSRF token not validated on form submit', status: 'patched' },
  { id: 4, severity: 'low', title: 'Verbose error messages in production', status: 'open' },
  { id: 5, severity: 'medium', title: 'Missing Content-Security-Policy header', status: 'patched' },
];

const MOCK_THREATS = [
  '185.220.101.56', '45.33.32.156', '198.20.70.114', '91.108.56.150', '104.21.85.20',
];

// ================================================
// SECTIONS
// ================================================

// ---- USERS ----
function UsersSection() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const PAGE_SIZE = 8;

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) ||
           u.email.toLowerCase().includes(search.toLowerCase()),
  );
  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const simAction = async (action, userId) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      if (action === 'disable') return { ...u, status: 'disabled' };
      if (action === 'enable')  return { ...u, status: 'active' };
      if (action === 'delete')  return null;
      if (action === 'roleChange') return { ...u, role: editUser?.newRole || u.role };
      return u;
    }).filter(Boolean));
    setMsg({ type: 'success', text: `Action "${action}" applied.` });
    setEditUser(null);
    setLoading(false);
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="User Management" icon={Users} />

      {msg.text && <Alert type={msg.type} message={msg.text} />}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search users..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Last login</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paged.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {editUser?.id === u.id ? (
                    <select
                      value={editUser.newRole}
                      onChange={(e) => setEditUser({ ...editUser, newRole: e.target.value })}
                      className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {['admin', 'dev', 'moderator', 'user'].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={roleBadgeVariant[u.role] || 'gray'}>{u.role}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.plan === 'enterprise' ? 'purple' : u.plan === 'pro' ? 'blue' : 'gray'}>
                    {u.plan}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.status === 'active' ? 'green' : 'red'}>{u.status}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                  {new Date(u.lastLoginAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {editUser?.id === u.id ? (
                      <>
                        <button
                          onClick={() => simAction('roleChange', u.id)}
                          disabled={loading}
                          className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          title="Save"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditUser(null)}
                          className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditUser({ id: u.id, newRole: u.role })}
                        className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        title="Edit role"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {u.status === 'active' ? (
                      <button
                        onClick={() => simAction('disable', u.id)}
                        disabled={loading}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Disable user"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => simAction('enable', u.id)}
                        disabled={loading}
                        className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        title="Enable user"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${u.name}?`)) simAction('delete', u.id);
                      }}
                      disabled={loading}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.alert(`Login history for ${u.email} — (connect to /api/users/${u.id}/login-history)`)}
                      className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="View login history"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrapper>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <p>Showing {paged.length} of {filtered.length} users</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- SECURITY ----
function SecuritySection() {
  const [scanning, setScanning] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [vulns, setVulns] = useState(MOCK_VULNERABILITIES);
  const [threats, setThreats] = useState(MOCK_THREATS);
  const [newThreat, setNewThreat] = useState('');

  const runScan = async () => {
    setScanning(true);
    setScanMsg('');
    await new Promise((r) => setTimeout(r, 1800));
    setScanMsg('Scan complete — 2 critical, 2 medium, 1 low vulnerabilities found.');
    setScanning(false);
  };

  const rotateKeys = async () => {
    setRotating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setScanMsg('RSA-4096 keys rotated successfully.');
    setRotating(false);
  };

  const patchVuln = (id) => {
    setVulns((prev) => prev.map((v) => v.id === id ? { ...v, status: 'patched' } : v));
  };

  const addThreat = (e) => {
    e.preventDefault();
    if (newThreat.trim()) {
      setThreats((prev) => [newThreat.trim(), ...prev]);
      setNewThreat('');
    }
  };

  const removeThreat = (ip) => setThreats((prev) => prev.filter((t) => t !== ip));

  const severityVariant = { critical: 'red', high: 'orange', medium: 'yellow', low: 'gray' };

  return (
    <div className="space-y-6">
      <SectionHeader title="Security" icon={ShieldAlert} />

      {scanMsg && <Alert type="success" message={scanMsg} />}

      {/* Control buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl text-sm transition"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
          Run Security Scan
        </button>
        <button
          onClick={rotateKeys}
          disabled={rotating}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold rounded-xl text-sm transition"
        >
          {rotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Rotate Encryption Keys
        </button>
      </div>

      {/* Vulnerabilities */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Vulnerability Report
        </h3>
        <div className="space-y-2">
          {vulns.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Badge variant={severityVariant[v.severity] || 'gray'}>{v.severity}</Badge>
                <span className="text-sm text-gray-700 dark:text-gray-300">{v.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={v.status === 'patched' ? 'green' : 'red'}>{v.status}</Badge>
                {v.status === 'open' && (
                  <button
                    onClick={() => patchVuln(v.id)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Patch
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threat IP list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Blocked IP Addresses
        </h3>
        <form onSubmit={addThreat} className="flex gap-2 mb-3">
          <input
            type="text"
            value={newThreat}
            onChange={(e) => setNewThreat(e.target.value)}
            placeholder="Add IP address to block list"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm"
          >
            Block
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {threats.map((ip) => (
            <div key={ip} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
              <span className="text-sm font-mono text-red-700 dark:text-red-400">{ip}</span>
              <button onClick={() => removeThreat(ip)} className="text-red-400 hover:text-red-700 dark:hover:text-red-300">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- ANALYTICS OVERVIEW ----
function AnalyticsSection() {
  const stats = [
    { label: 'Total Users',         value: '2,847', subLabel: '+143 this month', icon: Users,       color: 'indigo' },
    { label: 'Active Subscriptions',value: '1,203', subLabel: '42% conversion',  icon: TrendingUp,  color: 'green'  },
    { label: 'Monthly Revenue',     value: '$18,940',subLabel: '+22% MoM',        icon: DollarSign,  color: 'purple' },
    { label: 'AI Messages Today',   value: '52,391', subLabel: '3.8M this month', icon: MessageSquare,color: 'blue'  },
  ];

  const plans = [
    { name: 'Free',       count: 1644, pct: 58 },
    { name: 'Starter',    count:  612, pct: 21 },
    { name: 'Pro',        count:  433, pct: 15 },
    { name: 'Enterprise', count:  158, pct:  6 },
  ];

  const platforms = [
    { name: 'Web',      pct: 61 },
    { name: 'iOS',      pct: 18 },
    { name: 'Android',  pct: 13 },
    { name: 'Desktop',  pct:  8 },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics Overview" icon={BarChart3} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan distribution */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Plan Distribution</h3>
          <div className="space-y-3">
            {plans.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{p.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">{p.count.toLocaleString()} ({p.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Platform Breakdown</h3>
          <div className="space-y-3">
            {platforms.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{p.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">{p.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 dark:bg-purple-400 transition-all"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- GIFT CARDS ----
function GiftCardsSection() {
  const [count, setCount] = useState(5);
  const [value, setValue] = useState(10);
  const [expires, setExpires] = useState(365);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [error, setError] = useState('');

  const generate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/payments/giftcard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, value, expiresInDays: expires }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGenerated(data.codes);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Gift Card Generator" icon={Gift} />

      {error && <Alert type="error" message={error} />}

      <form onSubmit={generate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Number of codes
          </label>
          <input
            type="number"
            min={1} max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Value ($)
          </label>
          <input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Expires (days)
          </label>
          <input
            type="number"
            min={1}
            value={expires}
            onChange={(e) => setExpires(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl text-sm transition"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            Generate {count} Gift Card{count !== 1 ? 's' : ''} (${value} each)
          </button>
        </div>
      </form>

      {/* Generated codes */}
      {generated.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Generated Codes ({generated.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {generated.map((code) => (
              <div
                key={code}
                className="flex items-center justify-between rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2"
              >
                <span className="font-mono text-sm text-green-800 dark:text-green-300">{code}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="text-green-500 hover:text-green-700 dark:hover:text-green-300"
                  title="Copy"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- AUDIT LOG ----
function AuditLogSection() {
  const [logs] = useState(MOCK_AUDIT);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const PAGE_SIZE = 10;

  const filtered = logs.filter(
    (l) => !filter ||
      l.event.toLowerCase().includes(filter.toLowerCase()) ||
      l.user.toLowerCase().includes(filter.toLowerCase()) ||
      l.details.toLowerCase().includes(filter.toLowerCase()),
  );
  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const severityVariant = { info: 'blue', warning: 'yellow', success: 'green', error: 'red' };

  return (
    <div className="space-y-4">
      <SectionHeader title="Audit Log" icon={ScrollText} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          placeholder="Filter events..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Timestamp</th>
              <th className="text-left px-4 py-3">Event</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Details</th>
              <th className="text-left px-4 py-3">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paged.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                  {new Date(l.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {l.event}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{l.user}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">{l.details}</td>
                <td className="px-4 py-3">
                  <Badge variant={severityVariant[l.severity] || 'gray'}>{l.severity}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrapper>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <p>Showing {paged.length} of {filtered.length} events</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- SYSTEM HEALTH ----
function SystemHealthSection() {
  const [metrics, setMetrics] = useState({
    uptime: '14d 7h 23m',
    memoryUsed: 512,
    memoryTotal: 2048,
    activeConnections: 847,
    cpuPercent: 34,
    requestsPerMin: 2340,
  });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setMetrics((m) => ({
      ...m,
      memoryUsed: 480 + Math.floor(Math.random() * 100),
      activeConnections: 800 + Math.floor(Math.random() * 100),
      cpuPercent: 20 + Math.floor(Math.random() * 40),
      requestsPerMin: 2000 + Math.floor(Math.random() * 600),
    }));
    setRefreshing(false);
  };

  const memPct = Math.round((metrics.memoryUsed / metrics.memoryTotal) * 100);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="System Health"
        icon={Activity}
        action={
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <RefreshCw className={cls('w-4 h-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Uptime"            value={metrics.uptime}                   icon={Server}  color="green" />
        <StatCard label="Active Connections" value={metrics.activeConnections.toLocaleString()} icon={Wifi}    color="blue" />
        <StatCard label="Requests/min"      value={metrics.requestsPerMin.toLocaleString()}     icon={TrendingUp} color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Memory */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Memory — {metrics.memoryUsed} MB / {metrics.memoryTotal} MB ({memPct}%)
            </span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={cls('h-full rounded-full transition-all',
                memPct > 80 ? 'bg-red-500' : memPct > 60 ? 'bg-yellow-400' : 'bg-green-500'
              )}
              style={{ width: `${memPct}%` }}
            />
          </div>
        </div>

        {/* CPU */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              CPU — {metrics.cpuPercent}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={cls('h-full rounded-full transition-all',
                metrics.cpuPercent > 80 ? 'bg-red-500' : metrics.cpuPercent > 60 ? 'bg-yellow-400' : 'bg-indigo-500'
              )}
              style={{ width: `${metrics.cpuPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- MODERATOR ACTIONS ----
function ModeratorSection() {
  const [targetUser, setTargetUser] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ type: '', text: '' });

  const doAction = async (action) => {
    if (!targetUser.trim()) {
      setResult({ type: 'error', text: 'Enter a user email or ID.' });
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const actions = {
      suspend: `User "${targetUser}" suspended.`,
      clearContent: `Content cleared for "${targetUser}".`,
      message: `Message sent to "${targetUser}".`,
    };
    setResult({ type: 'success', text: actions[action] || 'Action applied.' });
    if (action !== 'message') setTargetUser('');
    setMessage('');
    setLoading(false);
    setTimeout(() => setResult({ type: '', text: '' }), 3000);
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Moderator Actions" icon={ShieldAlert} />

      {result.text && <Alert type={result.type} message={result.text} />}

      <div className="max-w-md space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            User email or ID
          </label>
          <input
            type="text"
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            placeholder="user@example.com or user_42"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => doAction('suspend')}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg text-sm"
          >
            <Ban className="w-4 h-4" /> Suspend User
          </button>
          <button
            onClick={() => doAction('clearContent')}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm"
          >
            <Trash2 className="w-4 h-4" /> Clear Content
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Send message to user
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message to send..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <button
          onClick={() => doAction('message')}
          disabled={loading || !message.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Message
        </button>
      </div>
    </div>
  );
}

// ---- CONNECTORS ----
function ConnectorsSection() {
  const connectors = [
    { id: 'stripe',   name: 'Stripe',           status: 'connected',    icon: CreditCard  },
    { id: 'coinbase', name: 'Coinbase Commerce', status: 'connected',    icon: MoreHorizontal },
    { id: 'slack',    name: 'Slack',             status: 'disconnected', icon: MessageSquare },
    { id: 'github',   name: 'GitHub',            status: 'connected',    icon: Activity    },
    { id: 'n8n',      name: 'n8n Automation',    status: 'connected',    icon: Plug        },
    { id: 'prometheus',name: 'Prometheus',        status: 'connected',    icon: BarChart3   },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Connectors" icon={Plug} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
              </div>
              <Badge variant={c.status === 'connected' ? 'green' : 'red'}>{c.status}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================================================
// NAVIGATION CONFIG
// ================================================
const NAV_SECTIONS = [
  { id: 'users',       label: 'Users',             icon: Users        },
  { id: 'security',    label: 'Security',           icon: ShieldAlert  },
  { id: 'analytics',   label: 'Analytics',          icon: BarChart3    },
  { id: 'subscriptions',label: 'Subscriptions',     icon: CreditCard   },
  { id: 'connectors',  label: 'Connectors',         icon: Plug         },
  { id: 'giftcards',   label: 'Gift Cards',         icon: Gift         },
  { id: 'auditlog',    label: 'Audit Log',          icon: ScrollText   },
  { id: 'moderator',   label: 'Moderator',          icon: MessageSquare},
  { id: 'health',      label: 'System Health',      icon: Activity     },
];

// ================================================
// MAIN COMPONENT
// ================================================
export default function AdminDashboard({ user }) {
  const [activeSection, setActiveSection] = useState('users');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Guard: only render for admin role
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This panel requires admin privileges. You are signed in as <strong>{user?.role || 'guest'}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'users':          return <UsersSection />;
      case 'security':       return <SecuritySection />;
      case 'analytics':      return <AnalyticsSection />;
      case 'subscriptions':  return <AnalyticsSection />; // reuses analytics overview with sub detail
      case 'connectors':     return <ConnectorsSection />;
      case 'giftcards':      return <GiftCardsSection />;
      case 'auditlog':       return <AuditLogSection />;
      case 'moderator':      return <ModeratorSection />;
      case 'health':         return <SystemHealthSection />;
      default:               return <UsersSection />;
    }
  };

  const currentNav = NAV_SECTIONS.find((n) => n.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside
        className={cls(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200',
          sidebarOpen ? 'w-56' : 'w-16',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <ShieldAlert className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
          {sidebarOpen && (
            <span className="font-bold text-gray-900 dark:text-white text-sm truncate">
              Admin Panel
            </span>
          )}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="ml-auto text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Admin user badge */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user.name || user.email}
            </p>
            <Badge variant="purple">admin</Badge>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cls(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition',
                activeSection === id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-r-2 border-indigo-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className={cls('flex-1 transition-all duration-200', sidebarOpen ? 'ml-56' : 'ml-16')}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {currentNav && <currentNav.icon className="w-5 h-5 text-indigo-500" />}
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {currentNav?.label || 'Dashboard'}
            </h1>
          </div>
        </header>

        {/* Section content */}
        <div className="p-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            {renderSection()}
          </div>
        </div>
      </main>
    </div>
  );
}
