// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File: src/components/AdminPanel.jsx
// Created: 2026-08-13
// Admin Dashboard - Separate admin/dev/moderator/user role panels

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Settings, Activity, BarChart3,
  Bell, Search, Filter, Plus, Edit3, Trash2,
  CheckCircle, XCircle, AlertTriangle, Clock,
  Lock, Key, Database, Server, Globe, RefreshCw,
  ChevronDown, ChevronRight, MoreVertical,
  TrendingUp, TrendingDown, Minus, Download,
  Eye, EyeOff, UserCheck, UserX, Crown,
  Code, Wrench, MessageSquare, Flag
} from 'lucide-react';

// ============================================================
// ROLE DEFINITIONS
// ============================================================
const ROLES = {
  admin: {
    label: 'Administrator',
    icon: Crown,
    color: 'text-purple-600 bg-purple-100',
    permissions: ['all'],
    description: 'Full system access and control',
  },
  developer: {
    label: 'Developer',
    icon: Code,
    color: 'text-blue-600 bg-blue-100',
    permissions: ['api', 'logs', 'deployments', 'analytics'],
    description: 'API access, logs, deployments',
  },
  moderator: {
    label: 'Moderator',
    icon: Flag,
    color: 'text-orange-600 bg-orange-100',
    permissions: ['users', 'content', 'reports'],
    description: 'User management and content moderation',
  },
  user: {
    label: 'User',
    icon: Users,
    color: 'text-gray-600 bg-gray-100',
    permissions: ['profile', 'content'],
    description: 'Standard user access',
  },
};

// ============================================================
// MOCK DATA GENERATORS
// ============================================================
function mockUsers(count = 20) {
  const roles = ['user', 'moderator', 'developer'];
  const statuses = ['active', 'suspended', 'pending'];
  return Array.from({ length: count }, (_, i) => ({
    id: `usr_${i + 1}`,
    username: `user${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: roles[i % roles.length],
    status: statuses[i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0],
    createdAt: new Date(Date.now() - Math.random() * 1e10).toISOString(),
    lastSeen: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    subscription: i % 4 === 0 ? 'enterprise' : i % 2 === 0 ? 'pro' : 'free',
    twoFactorEnabled: i % 3 === 0,
    biometricEnabled: i % 5 === 0,
  }));
}

function mockSystemMetrics() {
  return {
    totalUsers: 1243,
    activeToday: 387,
    newThisWeek: 42,
    suspendedAccounts: 7,
    totalRevenue: 18420,
    activeSubscriptions: { free: 890, pro: 284, enterprise: 69 },
    apiCalls: { today: 142800, week: 987000 },
    errorRate: 0.12,
    avgResponseTime: 124,
    uptime: 99.97,
  };
}

// ============================================================
// HELPER COMPONENTS
// ============================================================
function RoleBadge({ role }) {
  const def = ROLES[role] || ROLES.user;
  const Icon = def.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${def.color}`}>
      <Icon size={10} /> {def.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    active:    { cls: 'text-green-700 bg-green-100',   label: 'Active' },
    suspended: { cls: 'text-red-700 bg-red-100',       label: 'Suspended' },
    pending:   { cls: 'text-yellow-700 bg-yellow-100', label: 'Pending' },
  };
  const s = map[status] || map.active;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function MetricTile({ label, value, sub, icon: Icon, trend, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-200 text-blue-600',
    green:  'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    red:    'bg-red-50 border-red-200 text-red-600',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={16} className="opacity-70" />}
      </div>
      <p className="text-2xl font-bold">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
          {trend > 0 ? <TrendingUp size={10} /> : trend < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
          {Math.abs(trend)}% vs last period
        </div>
      )}
    </div>
  );
}

// ============================================================
// TABS
// ============================================================

// Admin-only users panel
function UsersPanel({ token }) {
  const [users, setUsers] = useState(mockUsers());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.username.includes(search) || u.email.includes(search);
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const handleAction = useCallback(async (userId, action) => {
    setLoadingAction(`${userId}:${action}`);
    try {
      // API call would go here
      await new Promise(r => setTimeout(r, 500));
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, status: action === 'suspend' ? 'suspended' : action === 'activate' ? 'active' : u.status }
          : u
      ));
    } finally {
      setLoadingAction(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="all">All Roles</option>
          {Object.keys(ROLES).map(r => (
            <option key={r} value={r}>{ROLES[r].label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        <button className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-auto">
          <Plus size={14} /> Invite User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">2FA</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium capitalize ${
                      user.subscription === 'enterprise' ? 'text-purple-600' :
                      user.subscription === 'pro' ? 'text-blue-600' : 'text-gray-500'
                    }`}>{user.subscription}</span>
                  </td>
                  <td className="px-4 py-3">
                    {user.twoFactorEnabled
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <XCircle size={14} className="text-gray-300" />}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(user.lastSeen).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-500"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleAction(user.id, 'suspend')}
                          disabled={loadingAction === `${user.id}:suspend`}
                          className="p-1.5 hover:bg-red-50 rounded text-red-500"
                          title="Suspend"
                        >
                          <UserX size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(user.id, 'activate')}
                          disabled={loadingAction === `${user.id}:activate`}
                          className="p-1.5 hover:bg-green-50 rounded text-green-500"
                          title="Activate"
                        >
                          <UserCheck size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500">
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">User Profile: {selectedUser.username}</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Role</p>
                  <RoleBadge role={selectedUser.role} />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Status</p>
                  <StatusBadge status={selectedUser.status} />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Subscription</p>
                  <p className="font-medium capitalize">{selectedUser.subscription}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">2FA</p>
                  <p className={selectedUser.twoFactorEnabled ? 'text-green-600' : 'text-gray-400'}>
                    {selectedUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Biometric</p>
                  <p className={selectedUser.biometricEnabled ? 'text-green-600' : 'text-gray-400'}>
                    {selectedUser.biometricEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Joined</p>
                  <p>{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Last Seen</p>
                  <p>{new Date(selectedUser.lastSeen).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <select
                  defaultValue={selectedUser.role}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  {Object.keys(ROLES).map(r => (
                    <option key={r} value={r}>{ROLES[r].label}</option>
                  ))}
                </select>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// System metrics panel (Admin + Developer)
function SystemPanel({ metrics }) {
  if (!metrics) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricTile label="Total Users"       value={metrics.totalUsers}     icon={Users}      color="blue"   trend={3.2} />
        <MetricTile label="Active Today"      value={metrics.activeToday}    icon={Activity}   color="green"  trend={7.1} />
        <MetricTile label="New This Week"     value={metrics.newThisWeek}    icon={TrendingUp} color="purple" trend={12.4} />
        <MetricTile label="Suspended"         value={metrics.suspendedAccounts} icon={XCircle} color="red"    trend={-2.1} />
        <MetricTile label="Revenue (MRR)"     value={`$${metrics.totalRevenue.toLocaleString()}`} icon={BarChart3} color="green" trend={8.7} />
        <MetricTile label="API Calls Today"   value={metrics.apiCalls?.today?.toLocaleString()} icon={Server} color="blue" />
        <MetricTile label="Error Rate"        value={`${metrics.errorRate}%`} icon={AlertTriangle} color="orange" trend={-0.3} />
        <MetricTile label="Avg Response"      value={`${metrics.avgResponseTime}ms`} icon={Clock} color="purple" trend={-5.2} />
      </div>

      {/* Subscription breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-500" /> Subscription Distribution
        </h3>
        <div className="space-y-3">
          {[
            { tier: 'Enterprise', count: metrics.activeSubscriptions?.enterprise, color: 'bg-purple-500', max: metrics.totalUsers },
            { tier: 'Pro',        count: metrics.activeSubscriptions?.pro,        color: 'bg-blue-500',   max: metrics.totalUsers },
            { tier: 'Free',       count: metrics.activeSubscriptions?.free,       color: 'bg-gray-400',   max: metrics.totalUsers },
          ].map(({ tier, count, color, max }) => (
            <div key={tier}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{tier}</span>
                <span className="text-gray-500">{count?.toLocaleString()} ({Math.round((count / max) * 100)}%)</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`${color} h-2 rounded-full transition-all`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System uptime */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Server size={16} className="text-green-500" /> System Health
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-green-600">{metrics.uptime}%</p>
            <p className="text-sm text-gray-500">Uptime (30 days)</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{metrics.avgResponseTime}ms</p>
            <p className="text-sm text-gray-500">Avg response time</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-orange-600">{metrics.errorRate}%</p>
            <p className="text-sm text-gray-500">Error rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Moderator reports panel
function ModerationPanel() {
  const reports = [
    { id: 'rpt1', type: 'spam', user: 'user42', content: 'Repeated promotional messages', severity: 'medium', status: 'pending', date: new Date().toISOString() },
    { id: 'rpt2', type: 'abuse', user: 'user17', content: 'Harassment report from multiple users', severity: 'high', status: 'reviewing', date: new Date().toISOString() },
    { id: 'rpt3', type: 'content', user: 'user89', content: 'Inappropriate content uploaded', severity: 'high', status: 'resolved', date: new Date().toISOString() },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="Pending Reports" value={1} icon={Flag}     color="orange" />
        <MetricTile label="Under Review"    value={1} icon={Eye}      color="yellow" />
        <MetricTile label="Resolved Today"  value={3} icon={CheckCircle} color="green" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-sm">
          Content Reports
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {reports.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.severity === 'high' ? 'text-red-700 bg-red-100' : 'text-yellow-700 bg-yellow-100'
                  }`}>{r.severity}</span>
                  <span className="text-xs text-gray-500 capitalize">{r.type}</span>
                  <span className="text-xs text-gray-400">@{r.user}</span>
                </div>
                <p className="text-sm">{r.content}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
                  Resolve
                </button>
                <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
                  Action
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Developer API panel
function DevApiPanel({ token }) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Key size={16} className="text-blue-500" /> API Access
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Your API Token</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-mono">
                {showToken ? (token || 'No token') : '●'.repeat(40)}
              </code>
              <button
                onClick={() => setShowToken(p => !p)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(token || '')}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Rate Limit</p>
              <p className="font-medium">1,000 req/min</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Calls Today</p>
              <p className="font-medium">2,847</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Server size={16} className="text-green-500" /> API Endpoints
        </h3>
        <div className="space-y-2 text-sm font-mono">
          {[
            { method: 'GET',    path: '/api/analytics/overview',    desc: 'Analytics summary' },
            { method: 'POST',   path: '/api/analytics/metrics',     desc: 'Platform metrics' },
            { method: 'GET',    path: '/api/security/status',       desc: 'Security status' },
            { method: 'POST',   path: '/api/security/scan',         desc: 'Run scan' },
            { method: 'GET',    path: '/api/gamedev/projects',      desc: 'List projects' },
            { method: 'POST',   path: '/api/subscriptions/checkout', desc: 'Create checkout' },
          ].map(ep => (
            <div key={ep.path} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                ep.method === 'GET' ? 'bg-green-100 text-green-700' :
                ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                ep.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{ep.method}</span>
              <span className="text-gray-700 dark:text-gray-300 text-xs">{ep.path}</span>
              <span className="text-gray-400 text-xs ml-auto">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN ADMIN PANEL
// ============================================================
export default function AdminPanel({ userRole = 'admin', token }) {
  const [metrics, setMetrics] = useState(mockSystemMetrics());
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(false);

  // Set default tab based on role
  useEffect(() => {
    if (userRole === 'admin') setActiveTab('system');
    else if (userRole === 'developer') setActiveTab('api');
    else if (userRole === 'moderator') setActiveTab('moderation');
    else setActiveTab('profile');
  }, [userRole]);

  const roleConfig = ROLES[userRole] || ROLES.user;
  const RoleIcon = roleConfig.icon;

  // Define tabs per role
  const TABS_BY_ROLE = {
    admin: [
      { id: 'system',     label: 'System',      icon: Server },
      { id: 'users',      label: 'Users',        icon: Users },
      { id: 'api',        label: 'API Dev',      icon: Code },
      { id: 'moderation', label: 'Moderation',   icon: Flag },
      { id: 'settings',   label: 'Settings',     icon: Settings },
    ],
    developer: [
      { id: 'api',    label: 'API Access', icon: Code },
      { id: 'system', label: 'Metrics',    icon: BarChart3 },
    ],
    moderator: [
      { id: 'moderation', label: 'Reports',   icon: Flag },
      { id: 'users',      label: 'Users',     icon: Users },
    ],
    user: [
      { id: 'profile', label: 'Profile', icon: Users },
    ],
  };

  const tabs = TABS_BY_ROLE[userRole] || TABS_BY_ROLE.user;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${roleConfig.color}`}>
              <RoleIcon size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold">{roleConfig.label} Panel</h1>
              <p className="text-sm text-gray-500">{roleConfig.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMetrics(mockSystemMetrics())}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            {userRole === 'admin' && (
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg">
                <Download size={14} /> Export Report
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {activeTab === 'system'     && <SystemPanel metrics={metrics} />}
        {activeTab === 'users'      && <UsersPanel token={token} />}
        {activeTab === 'api'        && <DevApiPanel token={token} />}
        {activeTab === 'moderation' && <ModerationPanel />}
        {activeTab === 'settings'   && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">System Settings</h3>
            <p className="text-gray-500 text-sm">Configure system-wide settings, security policies, and integrations.</p>
            <div className="mt-4 space-y-3">
              {['Maintenance Mode', 'New User Registration', 'Email Notifications', 'API Rate Limiting'].map(setting => (
                <div key={setting} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium">{setting}</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">My Profile</h3>
            <p className="text-sm text-gray-500">Manage your account settings, security, and preferences.</p>
          </div>
        )}
      </div>
    </div>
  );
}
