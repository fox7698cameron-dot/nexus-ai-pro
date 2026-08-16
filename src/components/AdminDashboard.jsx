/**
 * nexus-ai-pro/src/components/AdminDashboard.jsx
 * Admin / Moderator / Dev dashboard — separate from user dashboard
 * Role-gated: admin sees everything, mod sees users, dev sees system
 * Date: 2026-08-16
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Activity, Server, Database, Plug,
  RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  BarChart3, Settings, Ban, Megaphone, Eye, Clock,
  Cpu, HardDrive, Wifi, Globe, Code
} from 'lucide-react';

function StatCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const colors = {
    blue:   'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    green:  'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    red:    'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={16} />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ConnectorRow({ connector }) {
  const ok = connector.configured;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{connector.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{connector.category}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
        {ok ? 'Ready' : 'Not set'}
      </span>
    </div>
  );
}

function SystemHealth({ system }) {
  if (!system) return null;
  const memPct = system.memory ? Math.round((system.memory.used / system.memory.total) * 100) : 0;
  const uptime = system.uptime ? `${Math.floor(system.uptime / 3600)}h ${Math.floor((system.uptime % 3600) / 60)}m` : '—';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
      <div className="flex items-center gap-2">
        <Server size={16} className="text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">System Health</h3>
        <span className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full">Healthy</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Memory</span>
            <span className="font-medium">{memPct}% — {system.env}</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${memPct}%`, background: memPct > 90 ? '#ef4444' : memPct > 70 ? '#f59e0b' : '#22c55e' }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-bold text-gray-900 dark:text-white">{uptime}</p>
            <p className="text-gray-400 dark:text-gray-500">Uptime</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-bold text-gray-900 dark:text-white">{system.nodeVersion || '—'}</p>
            <p className="text-gray-400 dark:text-gray-500">Node.js</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-bold text-gray-900 dark:text-white capitalize">{system.platform || '—'}</p>
            <p className="text-gray-400 dark:text-gray-500">Platform</p>
          </div>
        </div>
        {system.cpu && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            CPU Load: {system.cpu.map(l => l.toFixed(2)).join(' / ')} (1m/5m/15m)
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard({ token, role = 'user' }) {
  const [dashboard, setDashboard] = useState(null);
  const [connectors, setConnectors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);

  const isAdmin = role === 'admin';
  const isDev = role === 'dev' || isAdmin;
  const isMod = role === 'moderator' || isDev;

  if (!isMod) return (
    <div className="flex flex-col items-center gap-3 py-16 text-gray-400 px-4">
      <Shield size={40} />
      <p className="font-medium text-gray-700 dark:text-gray-300">Access Denied</p>
      <p className="text-sm text-center">This dashboard requires moderator or higher permissions.</p>
    </div>
  );

  const headers = { Authorization: `Bearer ${token}` };

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const resp = await fetch('/api/admin/dashboard', { headers });
      if (!resp.ok) throw new Error('Failed to load admin dashboard');
      setDashboard(await resp.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchConnectors = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await fetch('/api/admin/connectors', { headers });
      if (resp.ok) setConnectors(await resp.json());
    } catch { /* silent */ }
  }, [token, isAdmin]);

  useEffect(() => {
    fetchDashboard();
    fetchConnectors();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard, fetchConnectors]);

  const broadcast = async () => {
    if (!broadcastMsg.trim() || !isAdmin) return;
    setBroadcasting(true);
    try {
      await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMsg.trim(), type: 'info' }),
      });
      setBroadcastDone(true);
      setBroadcastMsg('');
      setTimeout(() => setBroadcastDone(false), 3000);
    } catch { /* silent */ }
    setBroadcasting(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, show: true },
    { id: 'system', label: 'System', icon: Server, show: isDev },
    { id: 'connectors', label: 'Connectors', icon: Plug, show: isAdmin },
    { id: 'broadcast', label: 'Broadcast', icon: Megaphone, show: isAdmin },
  ].filter(t => t.show);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-purple-500" size={22} />
            {role === 'admin' ? 'Admin' : role === 'dev' ? 'Dev' : 'Moderator'} Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-red-500' : isDev ? 'bg-orange-500' : 'bg-blue-500'}`} />
            Role: <span className="font-semibold capitalize">{role}</span>
          </p>
        </div>
        <button onClick={fetchDashboard} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Users" value={dashboard?.stats?.totalUsers || '—'} icon={Users} color="blue" />
            <StatCard label="Active Users" value={dashboard?.stats?.activeUsers || '—'} icon={Activity} color="green" />
            <StatCard label="Projects" value={dashboard?.stats?.totalProjects || '—'} icon={Code} color="purple" />
            <StatCard label="Subscriptions" value={dashboard?.stats?.activeSubscriptions || '—'} icon={CheckCircle2} color="green" />
            <StatCard label="Revenue/mo" value={dashboard?.stats?.revenueThisMonth ? `$${dashboard.stats.revenueThisMonth}` : '—'} icon={BarChart3} color="orange" sub="Requires billing integration" />
            <StatCard label="Environment" value={dashboard?.system?.env || '—'} icon={Server} color="blue" />
          </div>
          {isAdmin && dashboard?.secretsConfigured && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Settings size={14} className="text-gray-500" /> Configuration Status
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(dashboard.secretsConfigured).map(([key, ok]) => (
                  <div key={key} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    {ok ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                    <span className={`font-medium ${ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* System tab */}
      {activeTab === 'system' && <SystemHealth system={dashboard?.system} />}

      {/* Connectors tab */}
      {activeTab === 'connectors' && connectors && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {connectors.configured} of {connectors.total} connectors configured
            </p>
          </div>
          {Object.entries(connectors.byCategory || {}).map(([category, items]) => (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 tracking-wide">{category}</h3>
              {items.map(c => <ConnectorRow key={c.id} connector={c} />)}
            </div>
          ))}
        </div>
      )}

      {/* Broadcast tab */}
      {activeTab === 'broadcast' && isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-orange-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">System Broadcast</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Send a notification to all connected users.</p>
          <textarea
            value={broadcastMsg}
            onChange={e => setBroadcastMsg(e.target.value)}
            rows={4}
            placeholder="Type your announcement..."
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
          {broadcastDone && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm"><CheckCircle2 size={15} /> Broadcast sent!</div>
          )}
          <button onClick={broadcast} disabled={broadcasting || !broadcastMsg.trim()}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            {broadcasting && <RefreshCw size={14} className="animate-spin" />}
            Send Broadcast
          </button>
        </div>
      )}
    </div>
  );
}
