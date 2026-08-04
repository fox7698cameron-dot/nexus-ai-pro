/**
 * AdminDashboard.jsx — Role-gated Administration Panel
 * Nexus AI Pro | 2026-08-04
 *
 * Separate dashboard for roles: admin, dev, moderator, user
 * Features: user management, system metrics, audit log, platform config
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Settings, Activity, Database, Globe,
  AlertTriangle, CheckCircle, Clock, Download, RefreshCw,
  Key, Lock, Eye, EyeOff, Trash2, Edit3, Plus,
  BarChart3, Server, Cpu, HardDrive, Wifi, TrendingUp,
  Crown, Star, UserCheck, UserX, Bell, FileText,
} from 'lucide-react';

// ─── Role Config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  admin: {
    label: 'Administrator',
    icon: Crown,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    tabs: ['overview', 'users', 'security', 'system', 'audit', 'config'],
  },
  dev: {
    label: 'Developer',
    icon: Settings,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    tabs: ['overview', 'system', 'audit', 'config'],
  },
  moderator: {
    label: 'Moderator',
    icon: Shield,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    tabs: ['overview', 'users', 'audit'],
  },
  user: {
    label: 'User',
    icon: UserCheck,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    tabs: ['overview'],
  },
};

// ─── Mock Data (replace with real API calls) ──────────────────────────────────

const MOCK_USERS = [
  { id: 'u1', username: 'Cameron Fox 🦊',   email: 'admin@nexusai.pro',  role: 'admin',     status: 'active',   plan: 'enterprise', joined: '2025-01-15', mfa: true  },
  { id: 'u2', username: 'DevUser_42',        email: 'dev@nexusai.pro',    role: 'dev',        status: 'active',   plan: 'pro',        joined: '2025-03-22', mfa: true  },
  { id: 'u3', username: 'Moderator_Apex',    email: 'mod@nexusai.pro',    role: 'moderator',  status: 'active',   plan: 'pro',        joined: '2025-05-10', mfa: false },
  { id: 'u4', username: 'User_NeonLight ⚡', email: 'user1@example.com',  role: 'user',       status: 'active',   plan: 'free',       joined: '2025-06-01', mfa: false },
  { id: 'u5', username: 'TestAccount_99',    email: 'test@example.com',   role: 'user',       status: 'suspended',plan: 'free',       joined: '2025-07-20', mfa: false },
];

const MOCK_AUDIT = [
  { id: 'l1', event: 'USER_LOGIN',        user: 'admin@nexusai.pro',  ip: '192.168.1.1',  severity: 'info',    ts: '2026-08-04T14:30:00Z' },
  { id: 'l2', event: 'ROLE_CHANGED',      user: 'mod@nexusai.pro',    ip: '10.0.0.5',     severity: 'warning', ts: '2026-08-04T13:15:00Z' },
  { id: 'l3', event: 'FAILED_LOGIN',      user: 'unknown@test.com',   ip: '203.0.113.42', severity: 'warning', ts: '2026-08-04T12:00:00Z' },
  { id: 'l4', event: 'KEY_ROTATED',       user: 'admin@nexusai.pro',  ip: '192.168.1.1',  severity: 'info',    ts: '2026-08-04T11:45:00Z' },
  { id: 'l5', event: 'THREAT_BLOCKED',    user: 'system',             ip: '198.51.100.7', severity: 'critical',ts: '2026-08-04T10:30:00Z' },
  { id: 'l6', event: 'SUBSCRIPTION_PAID', user: 'user1@example.com',  ip: '172.16.0.10',  severity: 'info',    ts: '2026-08-04T09:00:00Z' },
];

const MOCK_SYSTEM = {
  uptime: '14d 6h 22m',
  cpuUsage: 34,
  memUsage: 58,
  diskUsage: 41,
  activeConnections: 127,
  requestsPerMin: 342,
  errorRate: 0.3,
  tlsValid: true,
  redisConnected: true,
  dbConnected: true,
  version: '2.0.0',
  nodeVersion: '22.x',
  platform: 'linux',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const colors = {
    admin:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dev:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    moderator: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    user:      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[role] ?? ''}`}>
      {role}
    </span>
  );
}

function Gauge({ value, label, color = 'bg-blue-500' }) {
  const clr = value > 80 ? 'bg-red-500' : value > 60 ? 'bg-yellow-500' : color;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span><span className="font-medium">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${clr}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function OverviewTab({ role }) {
  const stats = [
    { label: 'Total Users',     value: MOCK_USERS.length,  icon: Users,    color: 'text-blue-500' },
    { label: 'Active Sessions', value: 127,                 icon: Activity, color: 'text-green-500' },
    { label: 'Threats Blocked', value: 34,                  icon: Shield,   color: 'text-red-500' },
    { label: 'Uptime',          value: '14d 6h',            icon: Clock,    color: 'text-purple-500' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <s.icon size={20} className={`${s.color} mb-3`} />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" /> Request Volume
          </h3>
          <div className="space-y-2">
            {['API', 'Auth', 'Analytics', 'Payments', 'Gaming'].map((r, i) => (
              <Gauge key={r} label={r} value={[85, 40, 60, 25, 55][i]} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-500" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {MOCK_AUDIT.slice(0, 4).map((l) => (
              <div key={l.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  l.severity === 'critical' ? 'bg-red-500' :
                  l.severity === 'warning'  ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{l.event}</span>
                  <span className="text-gray-400 text-xs ml-2">{new Date(l.ts).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filtered = MOCK_USERS.filter((u) => {
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email…"
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Roles</option>
          {Object.keys(ROLE_CONFIG).map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Invite User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {['User', 'Role', 'Plan', 'MFA', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{u.username}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3">
                  <span className="capitalize text-gray-600 dark:text-gray-400">{u.plan}</span>
                </td>
                <td className="px-4 py-3">
                  {u.mfa
                    ? <CheckCircle size={14} className="text-green-500" />
                    : <AlertTriangle size={14} className="text-yellow-500" />}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    u.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>{u.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button title="Edit" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <Edit3 size={14} className="text-gray-500" />
                    </button>
                    <button title="Suspend" className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <UserX size={14} className="text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SystemTab() {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'CPU Usage',  value: MOCK_SYSTEM.cpuUsage,  color: 'bg-blue-500' },
          { label: 'Memory',     value: MOCK_SYSTEM.memUsage,  color: 'bg-purple-500' },
          { label: 'Disk Usage', value: MOCK_SYSTEM.diskUsage, color: 'bg-orange-500' },
        ].map((g) => (
          <div key={g.label} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <Gauge label={g.label} value={g.value} color={g.color} />
            <p className="text-xs text-gray-400 mt-2">Live system metric</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Service Status</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: 'API Server',     ok: true  },
            { name: 'TLS/HTTPS',      ok: MOCK_SYSTEM.tlsValid },
            { name: 'Redis',          ok: MOCK_SYSTEM.redisConnected },
            { name: 'Database',       ok: MOCK_SYSTEM.dbConnected },
            { name: 'Socket.IO',      ok: true  },
            { name: 'Rate Limiter',   ok: true  },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              {s.ok
                ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                : <AlertTriangle size={16} className="text-red-500 shrink-0" />}
              <span className="text-sm text-gray-700 dark:text-gray-300">{s.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Uptime',    value: MOCK_SYSTEM.uptime },
            { label: 'Req/min',   value: MOCK_SYSTEM.requestsPerMin },
            { label: 'Error %',   value: MOCK_SYSTEM.errorRate + '%' },
            { label: 'Version',   value: MOCK_SYSTEM.version },
          ].map((m) => (
            <div key={m.label} className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{m.value}</div>
              <div className="text-xs text-gray-500">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditTab() {
  const [filter, setFilter] = useState('all');
  const EVENTS = ['all', 'USER_LOGIN', 'FAILED_LOGIN', 'ROLE_CHANGED', 'THREAT_BLOCKED', 'KEY_ROTATED'];
  const filtered = filter === 'all' ? MOCK_AUDIT : MOCK_AUDIT.filter((l) => l.event === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {EVENTS.map((e) => (
            <button key={e} onClick={() => setFilter(e)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === e ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
              {e === 'all' ? 'All Events' : e.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Download size={14} /> Export
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((l) => (
          <div key={l.id} className="flex items-start gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
              l.severity === 'critical' ? 'bg-red-500' :
              l.severity === 'warning'  ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">{l.event}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${
                  l.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  l.severity === 'warning'  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>{l.severity}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {l.user} · IP: {l.ip}
              </div>
            </div>
            <time className="text-xs text-gray-400 shrink-0">{new Date(l.ts).toLocaleString()}</time>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard({ userRole = 'user', currentUser }) {
  const role = ROLE_CONFIG[userRole] ?? ROLE_CONFIG.user;
  const [tab, setTab] = useState(role.tabs[0]);

  const TAB_LABELS = {
    overview: 'Overview',
    users:    'Users',
    security: 'Security',
    system:   'System',
    audit:    'Audit Log',
    config:   'Config',
  };

  const RoleIcon = role.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.bgColor}`}>
              <RoleIcon size={20} className={role.color} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {role.label} Panel
              </h1>
              {currentUser && (
                <p className="text-sm text-gray-500">
                  Signed in as <span className="font-medium">{currentUser.email}</span>
                </p>
              )}
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${role.borderColor} ${role.bgColor}`}>
          <RoleIcon size={14} className={role.color} />
          <span className={`text-sm font-medium capitalize ${role.color}`}>{userRole}</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 flex-wrap mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {role.tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {TAB_LABELS[t] ?? t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && <OverviewTab role={userRole} />}
      {tab === 'users'    && <UsersTab />}
      {tab === 'system'   && <SystemTab />}
      {tab === 'audit'    && <AuditTab />}
      {tab === 'security' && (
        <div className="text-center py-12 text-gray-400">
          <Shield size={40} className="mx-auto mb-3 opacity-30" />
          <p>Load SecurityDashboard component here</p>
        </div>
      )}
      {tab === 'config' && (
        <div className="text-center py-12 text-gray-400">
          <Settings size={40} className="mx-auto mb-3 opacity-30" />
          <p>System configuration panel — coming soon</p>
        </div>
      )}
    </div>
  );
}
