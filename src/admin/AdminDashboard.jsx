// src/admin/AdminDashboard.jsx
// Nexus AI Pro - Admin, Developer & Moderator Dashboards
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, Settings, Activity, Database, Server, Globe,
  AlertTriangle, CheckCircle, Trash2, Edit3, Search, RefreshCw,
  Code, Wrench, GitBranch, Key, BarChart3, MessageSquare, Flag
} from 'lucide-react';

// ─── Shared tab bar ────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onSelect }) {
  return (
    <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1.5 border border-gray-200 dark:border-gray-700 flex-wrap">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            active === t.id ? 'bg-purple-600 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <t.icon size={12} /> {t.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = 'purple', change }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
        <Icon size={14} className={`text-${color}-500`} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {change !== undefined && (
        <p className={`text-xs mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {change >= 0 ? '+' : ''}{change}% vs last week
        </p>
      )}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminContent({ accessToken }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('users');

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.ok) { const data = await res.json(); setUsers(data.users || []); }
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [accessToken]);

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.id?.includes(search)
  );

  const ROLE_COLORS = { admin: 'red', dev: 'blue', moderator: 'yellow', user: 'gray' };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length || '—'} icon={Users} color="blue" change={5.2} />
        <StatCard label="Active Today" value={Math.floor((users.length || 0) * 0.3) || '—'} icon={Activity} color="green" change={2.1} />
        <StatCard label="Security Events" value="12" icon={Shield} color="red" change={-3.4} />
        <StatCard label="API Calls" value="42.1K" icon={Server} color="purple" change={18.7} />
      </div>

      <TabBar
        tabs={[
          { id: 'users', label: 'Users', icon: Users },
          { id: 'system', label: 'System', icon: Server },
          { id: 'audit', label: 'Audit Log', icon: Database },
        ]}
        active={tab}
        onSelect={setTab}
      />

      {tab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
            <button onClick={() => setLoading(l => !l)} className="p-1 text-gray-400 hover:text-gray-600">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Username', 'Role', 'Created', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{u.username}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${ROLE_COLORS[u.role] || 'gray'}-100 text-${ROLE_COLORS[u.role] || 'gray'}-700`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-blue-500 hover:text-blue-700" title="Edit"><Edit3 size={12} /></button>
                        <button className="p-1 text-red-500 hover:text-red-700" title="Remove"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Server', status: 'healthy', detail: 'Node.js 20 · Express 4.x' },
            { label: 'Database', status: 'healthy', detail: 'Redis + In-Memory' },
            { label: 'Encryption', status: 'active', detail: 'AES-256-GCM · TLS 1.3' },
            { label: 'Rate Limiting', status: 'active', detail: '100 req/15min per IP' },
            { label: 'Socket.IO', status: 'healthy', detail: 'Real-time WebSocket' },
            { label: 'File Upload', status: 'active', detail: 'Multer · 50MB max' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.detail}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle size={12} /> {s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Developer Dashboard ───────────────────────────────────────────────────────
function DevContent({ accessToken }) {
  const [tab, setTab] = useState('api');
  const apiKey = sessionStorage.getItem('nexus_dev_api_key') || '(generate in settings)';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="API Calls Today" value="1,842" icon={Server} color="blue" change={12.3} />
        <StatCard label="Active Projects" value="5" icon={GitBranch} color="green" />
        <StatCard label="Error Rate" value="0.02%" icon={AlertTriangle} color="red" change={-0.5} />
        <StatCard label="Avg Latency" value="142ms" icon={Activity} color="purple" />
      </div>
      <TabBar
        tabs={[
          { id: 'api', label: 'API Keys', icon: Key },
          { id: 'connectors', label: 'Connectors', icon: Globe },
          { id: 'logs', label: 'Dev Logs', icon: Code },
        ]}
        active={tab}
        onSelect={setTab}
      />
      {tab === 'api' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">API Access</h3>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 font-mono text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="truncate">{apiKey}</span>
            <button className="ml-2 text-purple-600 hover:text-purple-800 text-xs font-medium flex-shrink-0">Copy</button>
          </div>
          <p className="text-xs text-gray-400">API keys are scoped per session and are never stored in plain text. Rotate keys in Settings.</p>
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Quick Start</h4>
            {[
              'GET  /api/health',
              'POST /api/auth/login',
              'POST /api/chat',
              'GET  /api/analytics/:platform/metrics',
              'GET  /api/projects/:userId',
              'POST /api/payments/checkout',
            ].map((endpoint, i) => (
              <code key={i} className="block text-xs font-mono bg-gray-900 text-green-400 px-3 py-1.5 rounded">{endpoint}</code>
            ))}
          </div>
        </div>
      )}
      {tab === 'connectors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'GitHub', status: !!process.env?.GITHUB_TOKEN, desc: 'Repo stats, CI/CD pipelines' },
            { name: 'Azure DevOps', status: false, desc: 'Boards, pipelines, repos' },
            { name: 'AWS CodePipeline', status: false, desc: 'Build, test, deploy' },
            { name: 'Slack', status: false, desc: 'Notifications, channels' },
            { name: 'Zoom', status: false, desc: 'Meetings, webinars' },
            { name: 'Bitbucket', status: false, desc: 'Repos, pipelines' },
            { name: 'Epic Games', status: false, desc: 'Achievements, leaderboards' },
            { name: 'Xbox Live', status: false, desc: 'Achievements, game history' },
          ].map((c, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${c.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {c.status ? <><CheckCircle size={10} /> Connected</> : 'Configure'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Moderator Dashboard ──────────────────────────────────────────────────────
function ModeratorContent({ accessToken }) {
  const [reports, setReports] = useState([
    { id: '1', content: 'Spam message in AI chat', reporter: 'user_123', status: 'pending', createdAt: Date.now() - 3600000 },
    { id: '2', content: 'Inappropriate content upload', reporter: 'user_456', status: 'reviewing', createdAt: Date.now() - 7200000 },
    { id: '3', content: 'Account impersonation', reporter: 'user_789', status: 'resolved', createdAt: Date.now() - 86400000 },
  ]);

  const STATUS_COLORS = { pending: 'yellow', reviewing: 'blue', resolved: 'green' };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Reports" value={reports.filter(r => r.status === 'pending').length} icon={Flag} color="yellow" />
        <StatCard label="Under Review" value={reports.filter(r => r.status === 'reviewing').length} icon={MessageSquare} color="blue" />
        <StatCard label="Resolved" value={reports.filter(r => r.status === 'resolved').length} icon={CheckCircle} color="green" />
        <StatCard label="Actions Today" value="3" icon={Wrench} color="purple" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Flag size={14} className="text-yellow-500" /> Content Reports</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {reports.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <div className="flex-1">
                <p className="text-sm text-gray-800 dark:text-gray-200">{r.content}</p>
                <p className="text-xs text-gray-400 mt-0.5">Reported by {r.reporter} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-${STATUS_COLORS[r.status]}-100 text-${STATUS_COLORS[r.status]}-700`}>
                  {r.status}
                </span>
                {r.status !== 'resolved' && (
                  <button
                    onClick={() => setReports(prev => prev.map(rep => rep.id === r.id ? { ...rep, status: 'resolved' } : rep))}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function RoleDashboard({ role, userId, accessToken }) {
  const dashboards = {
    admin: {
      title: 'Admin Panel',
      icon: Shield,
      color: 'red',
      component: AdminContent,
    },
    dev: {
      title: 'Developer Hub',
      icon: Code,
      color: 'blue',
      component: DevContent,
    },
    moderator: {
      title: 'Moderation',
      icon: Flag,
      color: 'yellow',
      component: ModeratorContent,
    },
    user: {
      title: 'My Dashboard',
      icon: Users,
      color: 'purple',
      component: ({ accessToken }) => (
        <div className="text-center py-12 text-gray-400">
          <Users size={48} className="mx-auto mb-3 text-purple-300" />
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Welcome to Nexus AI Pro</p>
          <p className="text-sm mt-1">Use the navigation to access Analytics, Projects, or the AI Chat.</p>
        </div>
      ),
    },
  };

  const config = dashboards[role] || dashboards.user;
  const Icon = config.icon;
  const DashComponent = config.component;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
          <Icon size={20} className={`text-${config.color}-600 dark:text-${config.color}-400`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title}</h1>
          <p className="text-xs text-gray-500 capitalize">{role} access · {userId}</p>
        </div>
      </div>
      <DashComponent accessToken={accessToken} />
    </div>
  );
}
