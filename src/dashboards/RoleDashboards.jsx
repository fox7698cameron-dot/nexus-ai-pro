// src/dashboards/RoleDashboards.jsx
// Nexus AI Pro — Role-Based Dashboards (Admin / Developer / Moderator / User)
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// 2026-04-23

import { useState, useEffect } from 'react';
import {
  Shield, Code2, Eye, User, Users, Activity, TrendingUp,
  AlertTriangle, CheckCircle, Settings, Zap, Database,
  Server, BarChart3, Clock, Globe, Lock, Bell, Cpu,
  GitBranch, FileText, MessageSquare, Star, Crown
} from 'lucide-react';
import { useAuth } from '../auth/AuthSystem.jsx';

function StatCard({ label, value, icon: Icon, color, trend }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {trend !== undefined && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <TrendingUp size={10} />
          {trend >= 0 ? '+' : ''}{trend}% this week
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const [stats] = useState({
    totalUsers:     12847,
    activeNow:      342,
    revenue:        '$84,291',
    securityScore:  92,
    apiCalls:       2840000,
    uptime:         '99.97%',
    flaggedContent: 18,
    openTickets:    24,
  });

  const [recentUsers] = useState([
    { id: 1, name: 'AlexDev 🚀',    email: 'alex@example.com', role: 'developer', status: 'active',  joined: '2h ago' },
    { id: 2, name: 'Sarah_M ✨',    email: 'sarah@example.com', role: 'user',      status: 'active',  joined: '4h ago' },
    { id: 3, name: 'GameMaster99',  email: 'gm@example.com',   role: 'moderator', status: 'active',  joined: '1d ago' },
    { id: 4, name: '🎮 ProPlayer',  email: 'pro@example.com',  role: 'user',      status: 'flagged', joined: '2d ago' },
  ]);

  const roleBadge = (role) => {
    const cfg = {
      admin:     'bg-red-900/30 text-red-400 border-red-500/30',
      developer: 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30',
      moderator: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
      user:      'bg-emerald-900/30 text-emerald-400 border-emerald-500/30',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-md border font-medium capitalize ${cfg[role] || cfg.user}`}>{role}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Crown size={22} className="text-red-400" />
        <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
        <span className="text-xs bg-red-900/30 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full ml-2">Full Access</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Users"     value={stats.totalUsers.toLocaleString()} icon={Users}    color="#6366F1" trend={12.4} />
        <StatCard label="Active Now"      value={stats.activeNow}                   icon={Activity} color="#10B981" trend={8.1} />
        <StatCard label="Monthly Revenue" value={stats.revenue}                     icon={TrendingUp} color="#F59E0B" trend={23.7} />
        <StatCard label="Security Score"  value={`${stats.securityScore}/100`}      icon={Shield}   color="#EC4899" trend={2.1} />
        <StatCard label="API Calls/day"   value={`${(stats.apiCalls/1000000).toFixed(1)}M`} icon={Zap} color="#14B8A6" trend={18.3} />
        <StatCard label="Uptime"          value={stats.uptime}                      icon={Server}   color="#8B5CF6" />
        <StatCard label="Flagged Content" value={stats.flaggedContent}              icon={AlertTriangle} color="#F97316" trend={-5.2} />
        <StatCard label="Open Tickets"    value={stats.openTickets}                 icon={MessageSquare} color="#EF4444" trend={-11.8} />
      </div>

      {/* User Management */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Users size={14} className="text-indigo-400" /> Recent Registrations
        </h3>
        <div className="space-y-2">
          {recentUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between p-2.5 bg-gray-900 rounded-xl hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                  {u.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {roleBadge(u.role)}
                <span className={`text-xs ${u.status === 'flagged' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {u.status}
                </span>
                <span className="text-xs text-gray-600">{u.joined}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Database',   icon: Database, status: 'healthy', latency: '4ms',  color: '#10B981' },
          { label: 'Redis Cache', icon: Cpu,     status: 'healthy', latency: '1ms',  color: '#10B981' },
          { label: 'API Server',  icon: Server,  status: 'healthy', latency: '12ms', color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-emerald-500/20 flex items-center gap-3">
            <s.icon size={16} style={{ color: s.color }} />
            <div>
              <div className="text-sm font-medium text-white">{s.label}</div>
              <div className="text-xs text-emerald-400">{s.status} · {s.latency}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Developer Dashboard ──────────────────────────────────────────────────────

function DeveloperDashboard() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Code2 size={22} className="text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Developer Dashboard</h2>
        <span className="text-xs bg-indigo-900/30 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full ml-2">Dev Access</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Open Issues"   value={14}      icon={AlertTriangle} color="#F97316" trend={-3} />
        <StatCard label="Pull Requests" value={6}       icon={GitBranch}     color="#6366F1" />
        <StatCard label="Test Coverage" value="87%"     icon={CheckCircle}   color="#10B981" trend={2.1} />
        <StatCard label="Build Status"  value="Passing" icon={Zap}           color="#10B981" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <GitBranch size={14} className="text-indigo-400" /> Recent Commits
          </h3>
          {[
            { sha: 'a1b2c3d', msg: 'feat: add analytics dashboard', author: 'cameron', ago: '2h' },
            { sha: 'e4f5g6h', msg: 'fix: security scan real-time', author: 'cameron', ago: '4h' },
            { sha: 'i7j8k9l', msg: 'chore: update dependencies',   author: 'cameron', ago: '1d' },
          ].map(c => (
            <div key={c.sha} className="flex items-start gap-2 py-2 border-b border-gray-700/50 last:border-0">
              <code className="text-xs text-indigo-400 bg-indigo-900/20 px-1.5 py-0.5 rounded font-mono flex-shrink-0">{c.sha}</code>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{c.msg}</div>
                <div className="text-xs text-gray-500">{c.author} · {c.ago}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Activity size={14} className="text-cyan-400" /> API Health
          </h3>
          {[
            { route: 'POST /api/chat',         latency: '142ms', status: 200 },
            { route: 'GET  /api/security',     latency: '18ms',  status: 200 },
            { route: 'POST /api/auth/login',   latency: '85ms',  status: 200 },
            { route: 'GET  /api/analytics',    latency: '32ms',  status: 200 },
            { route: 'POST /api/payments',     latency: '220ms', status: 200 },
          ].map(r => (
            <div key={r.route} className="flex items-center justify-between py-1.5 border-b border-gray-700/50 last:border-0">
              <code className="text-xs text-gray-300 font-mono">{r.route}</code>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{r.latency}</span>
                <span className="text-xs text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded">{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Moderator Dashboard ──────────────────────────────────────────────────────

function ModeratorDashboard() {
  const [queue] = useState([
    { id: 1, type: 'Content',  reason: 'Spam',           user: 'User#4821', priority: 'high',   ts: '5m ago' },
    { id: 2, type: 'Report',   reason: 'Harassment',      user: 'User#1937', priority: 'high',   ts: '12m ago' },
    { id: 3, type: 'Content',  reason: 'Off-topic',       user: 'User#7412', priority: 'medium', ts: '28m ago' },
    { id: 4, type: 'Account',  reason: 'Name violation',  user: 'User#5523', priority: 'low',    ts: '1h ago' },
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Eye size={22} className="text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Moderator Dashboard</h2>
        <span className="text-xs bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full ml-2">Mod Access</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Queue"        value={queue.length} icon={Bell}    color="#F59E0B" />
        <StatCard label="High Priority" value={queue.filter(q=>q.priority==='high').length} icon={AlertTriangle} color="#EF4444" />
        <StatCard label="Resolved Today" value={47}         icon={CheckCircle} color="#10B981" trend={12} />
        <StatCard label="Active Users"   value={342}        icon={Users}   color="#6366F1" />
      </div>

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Bell size={14} className="text-yellow-400" /> Moderation Queue
        </h3>
        <div className="space-y-2">
          {queue.map(item => (
            <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${
              item.priority === 'high' ? 'bg-red-900/15 border-red-500/20' :
              item.priority === 'medium' ? 'bg-yellow-900/15 border-yellow-500/20' :
              'bg-gray-900 border-gray-700'
            }`}>
              <div>
                <div className="text-sm font-medium text-white">{item.type}: {item.reason}</div>
                <div className="text-xs text-gray-500">{item.user} · {item.ts}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  item.priority === 'high' ? 'bg-red-900/40 text-red-300' :
                  item.priority === 'medium' ? 'bg-yellow-900/40 text-yellow-300' :
                  'bg-gray-700 text-gray-400'
                }`}>{item.priority}</span>
                <button className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded-lg transition-colors">Review</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── User Dashboard ───────────────────────────────────────────────────────────

function UserDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <User size={22} className="text-emerald-400" />
        <h2 className="text-xl font-bold text-white">My Dashboard</h2>
      </div>

      <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-2xl">
            {user?.displayName?.[0] || user?.username?.[0] || '👤'}
          </div>
          <div>
            <div className="text-lg font-bold text-white">{user?.displayName || user?.username || 'User'}</div>
            <div className="text-sm text-gray-400">{user?.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-xl font-bold text-white">147</div>
            <div className="text-xs text-gray-400">Messages</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-xl font-bold text-white">3</div>
            <div className="text-xs text-gray-400">Projects</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-xl font-bold text-white">Pro</div>
            <div className="text-xs text-gray-400">Plan</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="AI Tokens Used" value="48.2K" icon={Zap}     color="#6366F1" />
        <StatCard label="Storage Used"   value="2.1 GB" icon={Database} color="#F59E0B" />
      </div>

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Activity</h3>
        {[
          { action: 'Chat with Claude Opus 4',     time: '10 min ago', icon: MessageSquare },
          { action: 'Generated image with DALL-E', time: '1 hour ago',  icon: Star },
          { action: 'Ran security scan',           time: '3 hours ago', icon: Shield },
          { action: 'Created new project',         time: '1 day ago',   icon: Code2 },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-700/50 last:border-0">
            <item.icon size={14} className="text-indigo-400 flex-shrink-0" />
            <div className="flex-1 text-sm text-gray-300">{item.action}</div>
            <div className="text-xs text-gray-600 flex-shrink-0">{item.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Role Router ──────────────────────────────────────────────────────────────

export default function RoleDashboardRouter() {
  const { user } = useAuth();
  const role = user?.role || 'user';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {role === 'admin'     && <AdminDashboard />}
      {role === 'developer' && <DeveloperDashboard />}
      {role === 'moderator' && <ModeratorDashboard />}
      {(role === 'user' || !['admin','developer','moderator'].includes(role)) && <UserDashboard />}
    </div>
  );
}

export { AdminDashboard, DeveloperDashboard, ModeratorDashboard, UserDashboard };
