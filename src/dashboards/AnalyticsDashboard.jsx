// src/dashboards/AnalyticsDashboard.jsx
// 2026-07-23 | Nexus AI Pro - Social Media Analytics Dashboard
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
// Real-time metrics | Light/Dark | Mobile/Tablet/Desktop | Multi-language

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, Users, MessageSquare,
  BarChart3, Activity, RefreshCw, Plus, Trash2, Settings,
  Bell, Filter, Download, Calendar, ChevronDown, AlertTriangle,
  Globe, Zap, Star, Play, Clock
} from 'lucide-react';

const PLATFORM_CONFIG = {
  tiktok: { name: 'TikTok', icon: '🎵', color: '#010101', accent: '#fe2c55', bg: 'from-gray-900 to-red-900' },
  instagram: { name: 'Instagram', icon: '📸', color: '#e1306c', accent: '#f77737', bg: 'from-pink-600 to-orange-500' },
  facebook: { name: 'Facebook', icon: '👤', color: '#1877f2', accent: '#42b72a', bg: 'from-blue-700 to-blue-900' },
  twitch: { name: 'Twitch', icon: '🎮', color: '#9146ff', accent: '#bf94ff', bg: 'from-purple-700 to-purple-900' },
  discord: { name: 'Discord', icon: '💬', color: '#5865f2', accent: '#57f287', bg: 'from-indigo-700 to-indigo-900' },
  lemon8: { name: 'Lemon8', icon: '🍋', color: '#ffca28', accent: '#ff7043', bg: 'from-yellow-500 to-orange-600' },
  reddit: { name: 'Reddit', icon: '🤖', color: '#ff4500', accent: '#ffd635', bg: 'from-orange-700 to-red-800' },
  redgifs: { name: 'RedGifs', icon: '🎬', color: '#ff3d00', accent: '#ff6d00', bg: 'from-red-700 to-orange-800' },
};

const METRIC_ICONS = {
  views: Eye, likes: Heart, followers: Users, shares: Share2,
  comments: MessageSquare, reach: Globe, subscribers: Users,
  members: Users, viewers: Eye, watchTime: Clock, impressions: Eye,
  messages: MessageSquare, boosts: Star, upvotes: TrendingUp,
  retention: Activity, avgViewers: Eye, peakViewers: Zap,
};

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function MetricCard({ label, value, change, icon: Icon, accent }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={16} className="text-gray-400" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(value)}</div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change).toFixed(1)}% vs prev
        </div>
      )}
    </div>
  );
}

function PlatformCard({ account, metrics, onDisconnect, onRefresh }) {
  const config = PLATFORM_CONFIG[account.platform] || {};
  const [expanded, setExpanded] = useState(false);

  const latestMetrics = metrics[metrics.length - 1] || {};
  const prevMetrics = metrics[metrics.length - 2] || {};

  const calcChange = (key) => {
    const curr = latestMetrics[key];
    const prev = prevMetrics[key];
    if (!curr || !prev || prev === 0) return undefined;
    return ((curr - prev) / prev) * 100;
  };

  const topMetrics = Object.keys(latestMetrics)
    .filter(k => typeof latestMetrics[k] === 'number' && k !== 'id' && k !== 'timestamp' && k !== 'accountId')
    .slice(0, 6);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className={`bg-gradient-to-r ${config.bg || 'from-gray-700 to-gray-900'} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon || '📊'}</span>
          <div>
            <div className="text-white font-bold text-lg">{config.name}</div>
            <div className="text-white/70 text-sm">@{account.handle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Refresh">
            <RefreshCw size={14} className="text-white" />
          </button>
          <button onClick={onDisconnect} className="p-2 bg-white/20 rounded-lg hover:bg-red-500/50 transition-colors" title="Disconnect">
            <Trash2 size={14} className="text-white" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {topMetrics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topMetrics.map(key => {
              const Icon = METRIC_ICONS[key] || Activity;
              return (
                <MetricCard
                  key={key}
                  label={key.replace(/([A-Z])/g, ' $1').trim()}
                  value={latestMetrics[key]}
                  change={calcChange(key)}
                  icon={Icon}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <Activity size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No metrics yet — data will appear after the first sync</p>
          </div>
        )}

        {metrics.length > 1 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-4 w-full text-xs text-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Hide' : 'Show'} retention & history
          </button>
        )}

        {expanded && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">View & Retention Trend</div>
            <div className="flex gap-1 items-end h-16">
              {metrics.slice(-20).map((m, i) => {
                const val = m.views || m.viewers || m.impressions || m.reach || 0;
                const max = Math.max(...metrics.slice(-20).map(x => x.views || x.viewers || x.impressions || x.reach || 0), 1);
                const pct = max > 0 ? (val / max) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{ height: `${pct}%`, backgroundColor: config.accent || '#6366f1', minHeight: 2 }}
                    title={`${formatNumber(val)} at ${new Date(m.timestamp).toLocaleTimeString()}`}
                  />
                );
              })}
            </div>
            {metrics.slice(-1)[0]?.retention !== undefined && (
              <div className="mt-3 flex items-center gap-2">
                <div className="text-xs text-gray-500">Retention:</div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${metrics.slice(-1)[0].retention || 0}%`, backgroundColor: config.accent }}
                  />
                </div>
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{metrics.slice(-1)[0].retention?.toFixed(1)}%</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectModal({ onConnect, onClose }) {
  const [platform, setPlatform] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!platform || !handle.trim()) return;
    setLoading(true);
    await onConnect({ platform, handle: handle.trim() });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Connect Social Account</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select platform...</option>
                {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Handle / Username</label>
              <input
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@yourhandle"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button
              onClick={handleConnect}
              disabled={!platform || !handle.trim() || loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ userId, socket, locale = 'en' }) {
  const [accounts, setAccounts] = useState([]);
  const [metricsMap, setMetricsMap] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [period, setPeriod] = useState('7d');
  const [showConnect, setShowConnect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filterPlatform, setFilterPlatform] = useState('all');

  const fetchAccounts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/accounts/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:session')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
      const map = {};
      for (const acc of data.accounts || []) {
        const mRes = await fetch(`/api/analytics/metrics/${acc.id}?period=${period}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:session')}` }
        });
        if (mRes.ok) {
          const mData = await mRes.json();
          map[acc.id] = mData.metrics || [];
        }
      }
      setMetricsMap(map);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = ({ accountId, snapshot }) => {
      if (!snapshot) return;
      setMetricsMap(prev => ({
        ...prev,
        [accountId]: [...(prev[accountId] || []), snapshot].slice(-1000),
      }));
      setLastUpdated(new Date());
    };

    const handleAlert = ({ alert, value }) => {
      setAlerts(prev => [{ ...alert, currentValue: value, triggeredAt: Date.now() }, ...prev].slice(0, 20));
    };

    socket.on('analytics:update', handleUpdate);
    socket.on('analytics:alert', handleAlert);
    socket.on('analytics:metric', ({ accountId, entry }) => {
      setMetricsMap(prev => ({
        ...prev,
        [accountId]: [...(prev[accountId] || []), entry].slice(-1000),
      }));
    });

    return () => {
      socket.off('analytics:update', handleUpdate);
      socket.off('analytics:alert', handleAlert);
    };
  }, [socket]);

  const handleConnect = async ({ platform, handle }) => {
    try {
      const res = await fetch('/api/analytics/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus:session')}`,
        },
        body: JSON.stringify({ userId, platform, handle }),
      });
      if (!res.ok) throw new Error('Failed to connect account');
      await fetchAccounts();
    } catch (err) {
      console.error('Connect error:', err);
    }
  };

  const handleDisconnect = async (accountId) => {
    if (!window.confirm('Disconnect this account?')) return;
    try {
      await fetch(`/api/analytics/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:session')}` },
      });
      setAccounts(prev => prev.filter(a => a.id !== accountId));
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const filteredAccounts = useMemo(() =>
    filterPlatform === 'all' ? accounts : accounts.filter(a => a.platform === filterPlatform),
  [accounts, filterPlatform]);

  const totalFollowers = useMemo(() =>
    accounts.reduce((sum, acc) => {
      const m = (metricsMap[acc.id] || []).slice(-1)[0];
      return sum + (m?.followers || m?.subscribers || m?.members || 0);
    }, 0),
  [accounts, metricsMap]);

  const totalReach = useMemo(() =>
    accounts.reduce((sum, acc) => {
      const m = (metricsMap[acc.id] || []).slice(-1)[0];
      return sum + (m?.reach || m?.impressions || m?.views || 0);
    }, 0),
  [accounts, metricsMap]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-indigo-600" size={24} />
              <div>
                <h1 className="text-xl font-bold">Analytics Dashboard</h1>
                {lastUpdated && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1d">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Platforms</option>
                {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.name}</option>
                ))}
              </select>
              <button
                onClick={fetchAccounts}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={() => setShowConnect(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus size={14} />
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                <Bell size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-sm text-amber-800 dark:text-amber-300">
                  {PLATFORM_CONFIG[alert.platform]?.name} alert: {alert.metric} {alert.condition} {alert.threshold} (current: {formatNumber(alert.currentValue)})
                </span>
                <button onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))} className="ml-auto text-amber-600 hover:text-amber-800">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Connected Platforms</div>
            <div className="text-3xl font-bold text-indigo-600">{accounts.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Followers</div>
            <div className="text-3xl font-bold text-green-600">{formatNumber(totalFollowers)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Reach</div>
            <div className="text-3xl font-bold text-blue-600">{formatNumber(totalReach)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Active Alerts</div>
            <div className={`text-3xl font-bold ${alerts.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{alerts.length}</div>
          </div>
        </div>

        {/* Platform Cards */}
        {filteredAccounts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAccounts.map(account => (
              <PlatformCard
                key={account.id}
                account={account}
                metrics={metricsMap[account.id] || []}
                onDisconnect={() => handleDisconnect(account.id)}
                onRefresh={fetchAccounts}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-16 text-center">
            <BarChart3 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">No platforms connected</h3>
            <p className="text-gray-400 dark:text-gray-500 mb-6 text-sm">Connect TikTok, Instagram, Facebook, Twitch, Discord, and more to track your metrics in one place.</p>
            <button
              onClick={() => setShowConnect(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus size={16} />
              Connect Your First Platform
            </button>
          </div>
        )}
      </div>

      {showConnect && <ConnectModal onConnect={handleConnect} onClose={() => setShowConnect(false)} />}
    </div>
  );
}
