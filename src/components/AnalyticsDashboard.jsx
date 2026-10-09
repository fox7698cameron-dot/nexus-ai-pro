// src/components/AnalyticsDashboard.jsx
// Nexus AI Pro - Social Media Analytics Dashboard
// Date: 2026-10-09

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, MessageSquare,
  Users, Play, RefreshCw, Activity, BarChart3, PieChart,
  Globe, Calendar, Filter, Download, Bell, Zap,
} from 'lucide-react';

// Platform definitions
const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',    color: '#010101', accent: '#fe2c55', icon: '🎵' },
  { id: 'instagram', name: 'Instagram', color: '#833ab4', accent: '#fd1d1d', icon: '📸' },
  { id: 'facebook',  name: 'Facebook',  color: '#1877f2', accent: '#42b72a', icon: '👥' },
  { id: 'twitch',    name: 'Twitch',    color: '#9146ff', accent: '#bf94ff', icon: '📡' },
  { id: 'discord',   name: 'Discord',   color: '#5865f2', accent: '#57f287', icon: '💬' },
  { id: 'lemon8',    name: 'Lemon8',    color: '#ffc300', accent: '#ff5733', icon: '🍋' },
  { id: 'reddit',    name: 'Reddit',    color: '#ff4500', accent: '#ff6534', icon: '👾' },
  { id: 'redgifs',   name: 'RedGIFs',   color: '#d4000d', accent: '#ff6b6b', icon: '🎬' },
];

// Simulated real-time metrics generator (replace with real API calls per platform)
function generateMetrics(platform, seed = 1) {
  const base = {
    tiktok:    { views: 482000, likes: 38400, shares: 9800, comments: 4200, followers: 128000, reach: 621000, retention: 68 },
    instagram: { views: 194000, likes: 24100, shares: 5100, comments: 2800, followers: 87000,  reach: 253000, retention: 54 },
    facebook:  { views: 143000, likes: 11200, shares: 3400, comments: 1900, followers: 212000, reach: 188000, retention: 42 },
    twitch:    { views: 31000,  likes: 8700,  shares: 1100, comments: 6100, followers: 44000,  reach: 38000,  retention: 78 },
    discord:   { views: 18000,  likes: 3200,  shares: 420,  comments: 9400, followers: 22000,  reach: 22000,  retention: 91 },
    lemon8:    { views: 62000,  likes: 14800, shares: 2700, comments: 1300, followers: 31000,  reach: 74000,  retention: 61 },
    reddit:    { views: 89000,  likes: 7600,  shares: 3800, comments: 5200, followers: 68000,  reach: 112000, retention: 47 },
    redgifs:   { views: 221000, likes: 18900, shares: 7200, comments: 3400, followers: 95000,  reach: 278000, retention: 72 },
  };
  const m = base[platform] || base.tiktok;
  const jitter = (v) => Math.round(v * (0.96 + Math.random() * 0.08) * seed);
  return {
    views:     jitter(m.views),
    likes:     jitter(m.likes),
    shares:    jitter(m.shares),
    comments:  jitter(m.comments),
    followers: jitter(m.followers),
    reach:     jitter(m.reach),
    retention: Math.min(99, Math.max(10, m.retention + Math.round((Math.random() - 0.5) * 6))),
    engagementRate: +(((m.likes + m.comments + m.shares) / m.views) * 100).toFixed(2),
  };
}

function generateTimeSeries(days = 14) {
  const series = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    series.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views:  Math.round(40000 + Math.random() * 80000),
      likes:  Math.round(2000  + Math.random() * 12000),
      shares: Math.round(500   + Math.random() * 4000),
    });
  }
  return series;
}

function StatCard({ label, value, icon: Icon, delta, color, format = 'number' }) {
  const fmt = (v) => {
    if (format === 'pct') return `${v}%`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
    return String(v);
  };
  const up = delta >= 0;
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{fmt(value)}</div>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? '+' : ''}{delta.toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function TimeSeriesChart({ data, metric, color }) {
  if (!data.length) return null;
  const values = data.map(d => d[metric] || 0);
  const max = Math.max(...values, 1);
  const width = 100 / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = i * width;
    const y = 100 - (d[metric] / max) * 90;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-24">
      <defs>
        <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#grad-${metric})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function AnalyticsDashboard() {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [metrics, setMetrics] = useState({});
  const [timeSeries, setTimeSeries] = useState([]);
  const [dateRange, setDateRange] = useState('14d');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [alerts, setAlerts] = useState([]);
  const timerRef = useRef(null);

  const platform = PLATFORMS.find(p => p.id === activePlatform) || PLATFORMS[0];

  const loadMetrics = useCallback(() => {
    const allMetrics = {};
    PLATFORMS.forEach(p => {
      allMetrics[p.id] = generateMetrics(p.id);
    });
    setMetrics(allMetrics);
    setTimeSeries(generateTimeSeries(dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 14));
    setLastUpdated(new Date());
  }, [dateRange]);

  useEffect(() => {
    loadMetrics();
    timerRef.current = setInterval(loadMetrics, 30000);
    return () => clearInterval(timerRef.current);
  }, [loadMetrics]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMetrics();
    setTimeout(() => setRefreshing(false), 600);
  };

  const current = metrics[activePlatform] || {};
  const prev = {
    views: (current.views || 0) * 0.91,
    likes: (current.likes || 0) * 0.88,
  };
  const totalReach = Object.values(metrics).reduce((s, m) => s + (m?.reach || 0), 0);
  const totalFollowers = Object.values(metrics).reduce((s, m) => s + (m?.followers || 0), 0);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 size={20} className="text-purple-400" />
            Social Analytics
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Real-time metrics · Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <StatCard label="Total Reach" value={totalReach} icon={Globe} color="#a78bfa" delta={8.3} />
        <StatCard label="Total Followers" value={totalFollowers} icon={Users} color="#34d399" delta={3.2} />
        <StatCard label="Avg Retention" value={Math.round(Object.values(metrics).reduce((s, m) => s + (m?.retention || 0), 0) / (PLATFORMS.length || 1))} icon={Activity} color="#60a5fa" format="pct" delta={1.1} />
        <StatCard label="Active Platforms" value={PLATFORMS.length} icon={Zap} color="#fbbf24" />
      </div>

      {/* Platform Selector */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePlatform(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
              activePlatform === p.id
                ? 'text-white border-transparent shadow-lg scale-105'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
            }`}
            style={activePlatform === p.id ? { background: p.color, borderColor: p.accent } : {}}
          >
            <span>{p.icon}</span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Active Platform Detail */}
      <div className="px-4 pb-4 space-y-4">
        {/* Platform header */}
        <div
          className="rounded-xl p-4 border"
          style={{ background: platform.color + '22', borderColor: platform.accent + '55' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{platform.icon}</span>
              <div>
                <h3 className="font-bold text-white">{platform.name}</h3>
                <span className="text-xs text-gray-400">Live metrics</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-green-400 flex items-center gap-1">
                <Activity size={12} className="animate-pulse" />
                LIVE
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Views" value={current.views || 0} icon={Eye} color={platform.accent} delta={((current.views || 0) - prev.views) / (prev.views || 1) * 100} />
            <StatCard label="Likes" value={current.likes || 0} icon={Heart} color="#f472b6" delta={((current.likes || 0) - prev.likes) / (prev.likes || 1) * 100} />
            <StatCard label="Shares" value={current.shares || 0} icon={Share2} color="#34d399" />
            <StatCard label="Comments" value={current.comments || 0} icon={MessageSquare} color="#60a5fa" />
          </div>
        </div>

        {/* Retention + Engagement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Play size={14} className="text-purple-400" />
              Retention Rate
            </h4>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-white">{current.retention || 0}%</span>
              <span className="text-gray-400 text-sm pb-1">avg watch time</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${current.retention || 0}%`,
                  background: `linear-gradient(90deg, ${platform.color}, ${platform.accent})`,
                }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {current.retention >= 70 ? 'Excellent' : current.retention >= 50 ? 'Good' : 'Needs improvement'}
            </p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" />
              Engagement Rate
            </h4>
            <div className="text-3xl font-bold text-white mb-1">{current.engagementRate || 0}%</div>
            <div className="space-y-1.5 mt-2">
              {[
                { label: 'Likes / Views', value: current.views ? ((current.likes / current.views) * 100).toFixed(1) : 0 },
                { label: 'Comments / Views', value: current.views ? ((current.comments / current.views) * 100).toFixed(2) : 0 },
                { label: 'Shares / Views', value: current.views ? ((current.shares / current.views) * 100).toFixed(2) : 0 },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{row.label}</span>
                    <span className="text-white font-medium">{row.value}%</span>
                  </div>
                  <MiniBar value={parseFloat(row.value)} max={20} color={platform.accent} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Activity size={14} className="text-blue-400" />
            Views Trend — {platform.name}
          </h4>
          <TimeSeriesChart data={timeSeries} metric="views" color={platform.accent} />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            {timeSeries.length > 0 && (
              <>
                <span>{timeSeries[0]?.date}</span>
                <span>{timeSeries[Math.floor(timeSeries.length / 2)]?.date}</span>
                <span>{timeSeries[timeSeries.length - 1]?.date}</span>
              </>
            )}
          </div>
        </div>

        {/* All Platforms Overview */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <PieChart size={14} className="text-yellow-400" />
            Cross-Platform Overview
          </h4>
          <div className="space-y-2">
            {PLATFORMS.map(p => {
              const m = metrics[p.id] || {};
              const maxReach = Math.max(...PLATFORMS.map(pp => metrics[pp.id]?.reach || 1));
              return (
                <div key={p.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => setActivePlatform(p.id)}>
                  <span className="text-lg w-6">{p.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className={`font-medium ${activePlatform === p.id ? 'text-white' : 'text-gray-400'}`}>{p.name}</span>
                      <span className="text-gray-400">{m.reach >= 1000 ? `${(m.reach / 1000).toFixed(0)}K` : m.reach || 0} reach</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${((m.reach || 0) / maxReach) * 100}%`, background: p.accent }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 w-12 text-right">
                    {m.engagementRate || 0}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
