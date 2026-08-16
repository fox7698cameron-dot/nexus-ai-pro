/**
 * nexus-ai-pro/src/components/AnalyticsDashboard.jsx
 * Real-time social media analytics dashboard
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
 * Date: 2026-08-16
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Users, Eye, Heart, Share2, MessageSquare,
  RefreshCw, Download, Link, LinkIcon, Activity, BarChart3,
  ChevronUp, ChevronDown, AlertCircle, CheckCircle2, Clock,
  Filter, Calendar, Globe, Wifi, WifiOff
} from 'lucide-react';

const PLATFORMS = {
  tiktok:    { name: 'TikTok',    icon: '🎵', bg: '#010101', accent: '#fe2c55' },
  instagram: { name: 'Instagram', icon: '📸', bg: '#833ab4', accent: '#fd1d1d' },
  facebook:  { name: 'Facebook',  icon: '👥', bg: '#1877f2', accent: '#0866ff' },
  twitch:    { name: 'Twitch',    icon: '🎮', bg: '#9146ff', accent: '#bf94ff' },
  discord:   { name: 'Discord',   icon: '💬', bg: '#5865f2', accent: '#7289da' },
  lemon8:    { name: 'Lemon8',    icon: '🍋', bg: '#ff9500', accent: '#ffb800' },
  reddit:    { name: 'Reddit',    icon: '🤖', bg: '#ff4500', accent: '#ff6314' },
  redgifs:   { name: 'RedGifs',   icon: '🔴', bg: '#c0392b', accent: '#e74c3c' },
  youtube:   { name: 'YouTube',   icon: '▶️', bg: '#ff0000', accent: '#cc0000' },
  twitter:   { name: 'X/Twitter', icon: '𝕏',  bg: '#000000', accent: '#1d9bf0' },
};

const TIMEFRAMES = [
  { id: '24h', label: 'Last 24h' },
  { id: '7d',  label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'all', label: 'All Time' },
];

function formatNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.floor(n));
}

function GrowthBadge({ pct }) {
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${positive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
      {positive ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function MetricCard({ label, value, growth, icon: Icon, color = '#3b82f6' }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
        {growth !== undefined && <GrowthBadge pct={growth} />}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNum(value)}</p>
    </div>
  );
}

function RetentionBar({ segments }) {
  return (
    <div className="space-y-1.5">
      {Object.entries(segments).map(([label, pct]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-16">{label}</span>
          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{pct}%</span>
        </div>
      ))}
    </div>
  );
}

function PlatformCard({ platform, data, info, onConnect, onDisconnect }) {
  const [expanded, setExpanded] = useState(false);

  if (!data?.connected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center gap-3 text-center">
        <span className="text-3xl">{info.icon}</span>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{info.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Not connected</p>
        </div>
        <button
          onClick={() => onConnect(platform)}
          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Connect Account
        </button>
      </div>
    );
  }

  const m = data.metrics;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: info.bg }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{info.icon}</span>
          <span className="font-semibold text-white text-sm">{info.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/70">Live</span>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-white/70 hover:text-white transition-colors ml-1"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      {m && (
        <div className="p-3 grid grid-cols-2 gap-2">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Views</p>
            <p className="font-bold text-gray-900 dark:text-white">{formatNum(m.totals?.views || 0)}</p>
            {m.growth?.views !== undefined && <GrowthBadge pct={m.growth.views} />}
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Likes</p>
            <p className="font-bold text-gray-900 dark:text-white">{formatNum(m.totals?.likes || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Reach</p>
            <p className="font-bold text-gray-900 dark:text-white">{formatNum(m.totals?.reach || 0)}</p>
            {m.growth?.reach !== undefined && <GrowthBadge pct={m.growth.reach} />}
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
            <p className="font-bold text-gray-900 dark:text-white">{formatNum(m.followers?.total || 0)}</p>
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && m && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 space-y-3 pt-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Retention</p>
            <RetentionBar segments={m.retention?.bySegment || {}} />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Engagement</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{m.engagement?.rate?.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Avg Retention</span>
            <span className="font-semibold">{m.retention?.average}%</span>
          </div>
          {/* Top content */}
          {m.topContent?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Top Content</p>
              {m.topContent.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1 text-xs border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{c.title}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">{formatNum(c.views)} views</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onDisconnect(platform)}
            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard({ token }) {
  const [overview, setOverview] = useState(null);
  const [timeframe, setTimeframe] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [filter, setFilter] = useState('all');
  const intervalRef = useRef(null);
  const realtimeRef = useRef(null);

  const fetchOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/analytics/overview?timeframe=${timeframe}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to fetch analytics');
      setOverview(await resp.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, timeframe]);

  const fetchRealtime = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch('/api/analytics/realtime', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) setRealtime(await resp.json());
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    fetchOverview();
    intervalRef.current = setInterval(fetchOverview, 60000); // refresh every minute
    realtimeRef.current = setInterval(fetchRealtime, 10000);  // realtime every 10s
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(realtimeRef.current);
    };
  }, [fetchOverview, fetchRealtime]);

  const handleConnect = async (platform) => {
    // In production: open OAuth flow for the platform
    const token_demo = `demo_token_${Date.now()}`;
    await fetch('/api/analytics/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, accessToken: token_demo }),
    });
    fetchOverview();
  };

  const handleDisconnect = async (platform) => {
    await fetch(`/api/analytics/connect/${platform}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchOverview();
  };

  const handleExport = async () => {
    const resp = await fetch(`/api/analytics/export?timeframe=${timeframe}&format=csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `analytics-${timeframe}-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const platforms = overview?.platforms || [];
  const visible = filter === 'all' ? platforms : platforms.filter(p => filter === 'connected' ? p.connected : !p.connected);
  const s = overview?.summary;

  return (
    <div className="flex flex-col gap-4 p-4 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-blue-500" size={22} />
            Social Analytics
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Real-time metrics across all platforms</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${timeframe === tf.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {tf.label}
            </button>
          ))}
          <button onClick={fetchOverview} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExport} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Download size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Summary row */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total Views" value={s.views} />
          <MetricCard label="Total Likes" value={s.likes} />
          <MetricCard label="Total Reach" value={s.reach} />
          <MetricCard label="Total Followers" value={s.followers} />
        </div>
      )}

      {/* Connected count + realtime indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {s?.connectedCount || 0} of {s?.totalPlatforms || 10} platforms connected
          </span>
          {realtime && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Wifi size={12} /> Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {['all', 'connected', 'disconnected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors capitalize ${filter === f ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Platform grid */}
      {loading && !overview ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {visible.map(p => (
            <PlatformCard
              key={p.platform}
              platform={p.platform}
              data={p}
              info={PLATFORMS[p.platform] || { name: p.name, icon: '🌐', bg: '#374151' }}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      {/* Live viewers row */}
      {realtime?.liveMetrics?.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <Activity size={12} className="text-green-500" /> Live Viewers
          </p>
          <div className="flex gap-4 flex-wrap">
            {realtime.liveMetrics.map(lm => (
              <div key={lm.platform} className="flex items-center gap-1.5 text-xs">
                <span>{PLATFORMS[lm.platform]?.icon}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatNum(lm.liveViewers)}</span>
                <span className="text-gray-500 dark:text-gray-400">live</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Last updated {overview ? new Date(overview.generatedAt).toLocaleTimeString() : '—'} · Auto-refreshes every 60s
      </p>
    </div>
  );
}
