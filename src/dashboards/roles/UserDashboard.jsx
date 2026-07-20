// Date: 2026-07-20
import React, { useState, useEffect } from 'react';
import {
  Activity, BarChart2, Bell, HardDrive, FolderOpen, Settings, Zap,
  ArrowRight, CreditCard, CheckCircle, Clock, Globe, Github,
  Slack, Cloud, Star, TrendingUp,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';

// ─── Mock data ────────────────────────────────────────────────────────────────
const API_USAGE = Array.from({ length: 7 }, (_, i) => ({
  day: format(new Date(2026, 6, 14 + i), 'EEE'),
  calls: 80 + Math.round(Math.random() * 300),
}));

const RECENT_ACTIVITY = [
  { id: 'a1', icon: Zap, text: 'Generated marketing copy for Project Alpha', time: new Date(2026, 6, 20, 14, 5) },
  { id: 'a2', icon: FolderOpen, text: 'Created new project: "E-Commerce Site"', time: new Date(2026, 6, 20, 11, 30) },
  { id: 'a3', icon: Globe, text: 'Connected GitHub integration', time: new Date(2026, 6, 19, 16, 0) },
  { id: 'a4', icon: CreditCard, text: 'Upgraded to Pro plan', time: new Date(2026, 6, 18, 9, 45) },
  { id: 'a5', icon: Activity, text: 'Ran workflow: Daily Summary', time: new Date(2026, 6, 17, 8, 0) },
];

const RECENT_PROJECTS = [
  { id: 'p1', name: 'E-Commerce Site', model: 'Claude 3.7 Sonnet', updated: new Date(2026, 6, 20, 14, 5), starred: true },
  { id: 'p2', name: 'Marketing Automation', model: 'GPT-4o', updated: new Date(2026, 6, 19, 10, 0), starred: false },
  { id: 'p3', name: 'Data Analysis Pipeline', model: 'Gemini 2.0', updated: new Date(2026, 6, 17, 8, 30), starred: false },
];

const NOTIFICATIONS = [
  { id: 'n1', text: 'Your API usage is at 82% of the daily limit', type: 'warning', time: new Date(2026, 6, 20, 15, 0) },
  { id: 'n2', text: 'Workflow "Daily Summary" completed successfully', type: 'success', time: new Date(2026, 6, 20, 8, 0) },
  { id: 'n3', text: 'New feature: Crypto payments now available', type: 'info', time: new Date(2026, 6, 19, 12, 0) },
];

const CONNECTED_PLATFORMS = [
  { name: 'GitHub', icon: Github, connected: true, color: 'text-gray-300' },
  { name: 'Slack', icon: Slack, connected: true, color: 'text-green-400' },
  { name: 'Google Cloud', icon: Cloud, connected: false, color: 'text-blue-400' },
  { name: 'AWS', icon: Cloud, connected: false, color: 'text-amber-400' },
];

const NOTIF_COLORS = {
  warning: 'text-amber-400 bg-amber-950 border-amber-800',
  success: 'text-green-400 bg-green-950 border-green-800',
  info: 'text-blue-400 bg-blue-950 border-blue-800',
};

function QuickActionBtn({ icon: Icon, label, onClick, color = 'text-violet-400' }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-300 hover:text-gray-100 transition-all group"
    >
      <Icon size={16} className={`${color} group-hover:scale-110 transition-transform`} />
      {label}
      <ArrowRight size={13} className="ml-auto text-gray-600 group-hover:text-gray-400 transition-colors" />
    </button>
  );
}

export default function UserDashboard({ user = { name: 'User', email: 'user@example.com' } }) {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [projects, setProjects] = useState(RECENT_PROJECTS);
  const [showAllNotifs, setShowAllNotifs] = useState(false);

  const usage = { apiCalls: 2341, apiLimit: 5000, storage: 2.1, storageLimit: 50 };
  const sub = { plan: 'Pro', renewsAt: new Date(2026, 7, 20) };

  const dismissNotif = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  const toggleStar = (id) => setProjects((prev) => prev.map((p) => p.id === id ? { ...p, starred: !p.starred } : p));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{greeting}, {user.name.split(' ')[0]} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <a href="/settings" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-2 transition-all">
            <Settings size={14} /> Settings
          </a>
        </div>

        {/* Notification center */}
        {notifications.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-violet-400" />
                <span className="font-semibold text-sm">Notifications</span>
                <span className="text-xs bg-violet-700 text-white rounded-full px-2 py-0.5">{notifications.length}</span>
              </div>
              <button
                onClick={() => setShowAllNotifs((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showAllNotifs ? 'Show less' : 'Show all'}
              </button>
            </div>
            <div className="divide-y divide-gray-800">
              {(showAllNotifs ? notifications : notifications.slice(0, 2)).map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    n.type === 'warning' ? 'bg-amber-400' : n.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                  }`} />
                  <p className="text-sm text-gray-300 flex-1">{n.text}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-600">{formatDistanceToNow(n.time, { addSuffix: true })}</span>
                    <button onClick={() => dismissNotif(n.id)} className="text-gray-700 hover:text-gray-400 text-xs transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* API Usage */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-amber-400" />
              <span className="text-sm text-gray-500">API Calls Today</span>
            </div>
            <p className="text-2xl font-bold mb-2">{usage.apiCalls.toLocaleString()}<span className="text-gray-600 text-base font-normal">/{usage.apiLimit.toLocaleString()}</span></p>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usage.apiCalls / usage.apiLimit > 0.8 ? 'bg-amber-500' : 'bg-violet-500'
                }`}
                style={{ width: `${Math.min(100, (usage.apiCalls / usage.apiLimit) * 100)}%` }}
              />
            </div>
          </div>

          {/* Storage */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive size={15} className="text-cyan-400" />
              <span className="text-sm text-gray-500">Storage Used</span>
            </div>
            <p className="text-2xl font-bold mb-2">{usage.storage} GB<span className="text-gray-600 text-base font-normal">/{usage.storageLimit} GB</span></p>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-cyan-600" style={{ width: `${(usage.storage / usage.storageLimit) * 100}%` }} />
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={15} className="text-green-400" />
              <span className="text-sm text-gray-500">Subscription</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold">{sub.plan}</span>
              <span className="text-xs text-violet-300 bg-violet-950 border border-violet-800 rounded-full px-2 py-0.5">Active</span>
            </div>
            <p className="text-xs text-gray-600">Renews {format(sub.renewsAt, 'MMM d, yyyy')}</p>
            <a href="/billing" className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-2 transition-colors">
              Manage <ArrowRight size={10} />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* API usage chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-violet-400" />
                <h3 className="font-semibold text-sm">API Usage (Last 7 Days)</h3>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={API_USAGE}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="calls" stroke="#7c3aed" fill="url(#userGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent projects */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <FolderOpen size={15} className="text-gray-500" />
                  <h3 className="font-semibold text-sm">Recent Projects</h3>
                </div>
                <a href="/projects" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                  All projects <ArrowRight size={11} />
                </a>
              </div>
              <div className="divide-y divide-gray-800">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/30 transition-colors">
                    <button onClick={() => toggleStar(p.id)} className={`transition-colors ${p.starred ? 'text-amber-400' : 'text-gray-700 hover:text-gray-500'}`}>
                      <Star size={14} fill={p.starred ? 'currentColor' : 'none'} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{p.name}</p>
                      <p className="text-xs text-gray-600">{p.model}</p>
                    </div>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{formatDistanceToNow(p.updated, { addSuffix: true })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
                <Activity size={15} className="text-gray-500" />
                <h3 className="font-semibold text-sm">Recent Activity</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {RECENT_ACTIVITY.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/30 transition-colors">
                    <a.icon size={14} className="text-gray-600 shrink-0" />
                    <p className="text-sm text-gray-300 flex-1">{a.text}</p>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{formatDistanceToNow(a.time, { addSuffix: true })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Quick actions */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <QuickActionBtn icon={Zap} label="New Chat" color="text-violet-400" />
                <QuickActionBtn icon={FolderOpen} label="New Project" color="text-cyan-400" />
                <QuickActionBtn icon={Activity} label="Run Workflow" color="text-green-400" />
                <QuickActionBtn icon={CreditCard} label="Manage Billing" color="text-amber-400" />
                <QuickActionBtn icon={Settings} label="Profile Settings" color="text-gray-400" />
              </div>
            </div>

            {/* Connected platforms */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Connected Platforms</h3>
                <a href="/connectors" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Manage</a>
              </div>
              <div className="space-y-2">
                {CONNECTED_PLATFORMS.map((p) => (
                  <div key={p.name} className="flex items-center gap-3 py-1.5">
                    <p.icon size={15} className={p.color} />
                    <span className="text-sm text-gray-300 flex-1">{p.name}</span>
                    {p.connected ? (
                      <CheckCircle size={13} className="text-green-400" />
                    ) : (
                      <span className="text-xs text-gray-600 border border-gray-700 rounded px-1.5 py-0.5">Not connected</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
