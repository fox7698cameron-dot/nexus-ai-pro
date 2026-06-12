// src/components/AnalyticsDashboard.jsx
// 2026-06-12 | Social media analytics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Users, Eye, Heart, Share2,
  RefreshCw, Activity, Globe, Radio, Clock, Wifi
} from 'lucide-react';

const PLATFORM_CONFIG = {
  tiktok: { name: 'TikTok', color: '#010101', accent: '#FE2C55', icon: '🎵' },
  instagram: { name: 'Instagram', color: '#E1306C', accent: '#F77737', icon: '📸' },
  facebook: { name: 'Facebook', color: '#1877F2', accent: '#42B72A', icon: '👥' },
  twitch: { name: 'Twitch', color: '#9146FF', accent: '#BF94FF', icon: '🎮' },
  discord: { name: 'Discord', color: '#5865F2', accent: '#EB459E', icon: '💬' },
  lemon8: { name: 'Lemon8', color: '#FFD00D', accent: '#FF6B35', icon: '🍋' },
  reddit: { name: 'Reddit', color: '#FF4500', accent: '#FF6534', icon: '🤖' },
  redgifs: { name: 'RedGIFs', color: '#E74C3C', accent: '#C0392B', icon: '🎬' }
};

function MetricCard({ label, value, icon: Icon, change, accent }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={14} className="text-gray-500" />}
      </div>
      <span className="text-2xl font-bold text-white">{formatNumber(value)}</span>
      {change !== undefined && (
        <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs last period
        </span>
      )}
    </div>
  );
}

function formatNumber(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function RetentionChart({ data }) {
  if (!data?.retentionCurve?.length) return null;
  const max = 100;
  const points = data.retentionCurve;
  const pathD = points.map((p, i) => {
    const x = (p.pct / 100) * 280;
    const y = ((max - p.retention) / max) * 80;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Retention Curve</p>
      <svg viewBox="0 0 280 80" className="w-full h-20 overflow-visible">
        <defs>
          <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L280,80 L0,80 Z`} fill="url(#retGrad)" />
        <path d={pathD} stroke="#60A5FA" strokeWidth="2" fill="none" />
      </svg>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>
    </div>
  );
}

function PlatformCard({ platform, data, selected, onSelect }) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return null;
  const snap = data?.snapshot;

  return (
    <button
      onClick={() => onSelect(platform)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.icon}</span>
          <span className="font-semibold text-white text-sm">{cfg.name}</span>
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: cfg.color + '33', color: cfg.accent }}
        >
          Live
        </span>
      </div>
      {snap && (
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
          <span className="text-gray-500">Followers</span>
          <span className="text-right font-mono">{formatNumber(snap.followers || snap.members)}</span>
          <span className="text-gray-500">Views</span>
          <span className="text-right font-mono">{formatNumber(snap.views)}</span>
          <span className="text-gray-500">Engagement</span>
          <span className="text-right font-mono">{snap.engagementRate}%</span>
        </div>
      )}
    </button>
  );
}

export default function AnalyticsDashboard({ token }) {
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState('tiktok');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/overview', { headers });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setLastUpdated(Date.now());
      }
    } catch {
      // network error - do not throw
    }
  }, [token]);

  const fetchDetail = useCallback(async (platform) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/${platform}`, { headers });
      if (res.ok) setDetail(await res.json());
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { fetchDetail(selected); }, [selected, fetchDetail]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      fetchOverview();
      fetchDetail(selected);
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, selected, fetchOverview, fetchDetail]);

  const platforms = Object.keys(PLATFORM_CONFIG);
  const snap = overview?.summary;

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <BarChart3 size={20} className="text-blue-400" />
          <div>
            <h1 className="text-lg font-bold">Analytics Dashboard</h1>
            <p className="text-xs text-gray-400">
              {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition ${
              autoRefresh ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-gray-600 text-gray-400'
            }`}
          >
            <Radio size={12} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={() => { fetchOverview(); fetchDetail(selected); }}
            className="p-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary row */}
      {snap && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-gray-800">
          <MetricCard label="Total Reach" value={snap.totalReach} icon={Globe} change={3.2} />
          <MetricCard label="Total Followers" value={snap.totalFollowers} icon={Users} change={1.8} />
          <MetricCard label="Total Views" value={snap.totalViews} icon={Eye} change={5.4} />
          <MetricCard label="Avg Engagement" value={`${snap.avgEngagement}%`} icon={TrendingUp} change={0.3} />
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Platform list */}
        <div className="md:w-64 flex-shrink-0 p-4 border-r border-gray-800 overflow-y-auto">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Platforms</p>
          <div className="flex flex-col gap-2">
            {platforms.map(p => (
              <PlatformCard
                key={p}
                platform={p}
                data={overview?.platforms?.find(pl => pl.platform === p) ? { snapshot: overview.platforms.find(pl => pl.platform === p) } : null}
                selected={selected === p}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={24} className="animate-spin text-gray-500" />
            </div>
          )}
          {!loading && detail && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{PLATFORM_CONFIG[selected]?.icon}</span>
                <div>
                  <h2 className="text-lg font-bold">{PLATFORM_CONFIG[selected]?.name}</h2>
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <Activity size={10} />
                    <span>Real-time metrics</span>
                  </div>
                </div>
              </div>

              {/* Snapshot metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {Object.entries(detail.snapshot || {})
                  .filter(([k]) => !['platform', 'timestamp', 'engagementRate', 'reach', 'impressions'].includes(k))
                  .map(([k, v]) => (
                    <MetricCard key={k} label={k} value={v} icon={Eye} />
                  ))}
                <MetricCard label="Reach" value={detail.snapshot?.reach} icon={Globe} />
                <MetricCard label="Impressions" value={detail.snapshot?.impressions} icon={TrendingUp} />
                <MetricCard
                  label="Engagement Rate"
                  value={`${detail.snapshot?.engagementRate}%`}
                  icon={Heart}
                />
              </div>

              <RetentionChart data={detail.retention} />

              {/* 30-day trend sparkline */}
              {detail.history?.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">30-Day Trend — Views</p>
                  <div className="flex items-end gap-0.5 h-16">
                    {detail.history.map((h, i) => {
                      const max = Math.max(...detail.history.map(x => x.views || 0));
                      const height = max ? Math.max(4, ((h.views || 0) / max) * 60) : 4;
                      return (
                        <div
                          key={i}
                          title={new Date(h.timestamp).toLocaleDateString()}
                          className="flex-1 rounded-sm bg-blue-500 opacity-70 hover:opacity-100 transition"
                          style={{ height: `${height}px` }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>30d ago</span><span>Today</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
