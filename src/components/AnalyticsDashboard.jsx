// src/components/AnalyticsDashboard.jsx
// 2026-07-24 | Nexus AI Pro - Social Media Analytics Dashboard
// Real-time metrics for TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, Eye, Heart, Share2, RefreshCw, Wifi, BarChart3, Activity, Globe } from 'lucide-react';

const PLATFORM_COLORS = {
  tiktok:    '#010101',
  instagram: '#E1306C',
  facebook:  '#1877F2',
  twitch:    '#9146FF',
  discord:   '#5865F2',
  lemon8:    '#FFD700',
  reddit:    '#FF4500',
  redgifs:   '#FF2D55',
};

const PLATFORM_ICONS = {
  tiktok: '🎵', instagram: '📸', facebook: '👥', twitch: '🎮',
  discord: '💬', lemon8: '🍋', reddit: '🤖', redgifs: '🎬',
};

function MetricCard({ label, value, icon: Icon, color = 'text-blue-400', trend }) {
  const formatted = typeof value === 'number'
    ? value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K`
    : value.toString()
    : value || '—';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-gray-700 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 truncate">{label}</div>
        <div className="text-lg font-bold text-white">{formatted}</div>
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, metrics, connected, onConnect }) {
  const color = PLATFORM_COLORS[platform] || '#666';
  const icon = PLATFORM_ICONS[platform] || '📊';

  const primaryMetric = metrics?.views ?? metrics?.impressions ?? metrics?.members ?? 0;
  const secondaryMetric = metrics?.likes ?? metrics?.upvotes ?? metrics?.engagement ?? 0;
  const followers = metrics?.followers ?? metrics?.subscribers ?? metrics?.members ?? 0;

  return (
    <div
      className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-500 transition-colors"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-white capitalize">{platform}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">{connected ? 'Live' : 'Demo'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-gray-400">Views</div>
          <div className="text-sm font-bold text-white">
            {primaryMetric >= 1000 ? `${(primaryMetric / 1000).toFixed(1)}K` : primaryMetric}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Likes</div>
          <div className="text-sm font-bold text-white">
            {secondaryMetric >= 1000 ? `${(secondaryMetric / 1000).toFixed(1)}K` : secondaryMetric}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Followers</div>
          <div className="text-sm font-bold text-white">
            {followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers}
          </div>
        </div>
      </div>

      {!connected && (
        <button
          onClick={() => onConnect?.(platform)}
          className="mt-3 w-full text-xs py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Connect {platform}
        </button>
      )}
    </div>
  );
}

function MiniChart({ data = [], color = '#3B82F6' }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120, h = 40;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
}

export function AnalyticsDashboard({ socket }) {
  const [platforms, setPlatforms] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [chartData, setChartData] = useState({});

  const fetchOverview = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexus:accessToken');
      const res = await fetch('/api/analytics/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.platforms || {});
        setLastUpdate(new Date());
      }
    } catch { /* non-critical */ }
  }, []);

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/platforms');
      if (res.ok) setPlatforms(await res.json());
    } catch { /* non-critical */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlatforms();
    fetchOverview();
  }, [fetchPlatforms, fetchOverview]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    socket.emit('subscribe:analytics');
    socket.on('analytics:update', ({ platform, metrics: m }) => {
      setMetrics(prev => ({ ...prev, [platform]: m }));
      setLastUpdate(new Date());
      setChartData(prev => {
        const views = m.views ?? m.impressions ?? 0;
        const existing = prev[platform] || [];
        return { ...prev, [platform]: [...existing.slice(-19), views] };
      });
    });
    return () => socket.off('analytics:update');
  }, [socket]);

  const totalViews = Object.values(metrics).reduce((s, m) => s + (m?.views ?? m?.impressions ?? 0), 0);
  const totalFollowers = Object.values(metrics).reduce((s, m) => s + (m?.followers ?? m?.subscribers ?? m?.members ?? 0), 0);
  const totalEngagement = Object.values(metrics).reduce((s, m) => s + (m?.likes ?? m?.upvotes ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="animate-spin mr-2" size={18} />
        Loading analytics…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={22} className="text-blue-400" />
            Social Analytics
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Real-time metrics across all platforms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-green-400">
            <Activity size={12} className="animate-pulse" />
            <span>Live</span>
          </div>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total Views" value={totalViews} icon={Eye} color="text-blue-400" />
        <MetricCard label="Total Followers" value={totalFollowers} icon={Users} color="text-purple-400" />
        <MetricCard label="Total Engagement" value={totalEngagement} icon={Heart} color="text-pink-400" />
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {platforms.map(p => (
          <PlatformCard
            key={p.id}
            platform={p.id}
            metrics={metrics[p.id]}
            connected={false}
            onConnect={platform => {
              fetch(`/api/analytics/${platform}/oauth-url`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('nexus:accessToken')}` },
              }).then(r => r.json()).then(d => {
                if (d.url) window.open(d.url, '_blank', 'width=600,height=700');
              });
            }}
          />
        ))}
      </div>

      {/* Engagement chart area */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-400" />
          View trends (last 20 updates)
        </h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(chartData).map(([platform, data]) => (
            <div key={platform} className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">{PLATFORM_ICONS[platform]} {platform}</span>
              <MiniChart data={data} color={PLATFORM_COLORS[platform]} />
            </div>
          ))}
          {!Object.keys(chartData).length && (
            <p className="text-sm text-gray-500">Waiting for real-time data…</p>
          )}
        </div>
      </div>

      {/* Platform details table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs">
              <th className="text-left p-3">Platform</th>
              <th className="text-right p-3">Views</th>
              <th className="text-right p-3">Likes</th>
              <th className="text-right p-3">Reach</th>
              <th className="text-right p-3">Retention</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map(p => {
              const m = metrics[p.id] || {};
              return (
                <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-750">
                  <td className="p-3 font-medium text-white">
                    {PLATFORM_ICONS[p.id]} {p.name}
                  </td>
                  <td className="p-3 text-right text-gray-300">
                    {((m.views ?? m.impressions ?? 0) / 1000).toFixed(1)}K
                  </td>
                  <td className="p-3 text-right text-gray-300">
                    {((m.likes ?? m.upvotes ?? 0) / 1000).toFixed(1)}K
                  </td>
                  <td className="p-3 text-right text-gray-300">
                    {((m.reach ?? 0) / 1000).toFixed(1)}K
                  </td>
                  <td className="p-3 text-right text-gray-300">
                    {m.retention ? `${m.retention}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
