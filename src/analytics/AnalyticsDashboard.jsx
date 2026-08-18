// src/analytics/AnalyticsDashboard.jsx
// Nexus AI Pro — Social Media Analytics Dashboard
// Platforms: TikTok · Instagram · Facebook · Twitch · Discord · Lemon8 · Reddit · RedGIFs
// Real-time metrics via WebSocket
// Date: 2026-08-18

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Eye, Heart, Share2, MessageSquare, Users,
  Play, Clock, BarChart3, PieChart, Activity, Globe,
  RefreshCw, Filter, Calendar, ChevronDown, ArrowUp, ArrowDown,
  Zap, Star, Award
} from 'lucide-react';

// ─── Platform Configs ─────────────────────────────────────────────────────────
const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    emoji: '🎵',
    color: '#ff0050',
    gradientFrom: '#ff0050',
    gradientTo: '#00f2ea',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'reach', 'retention', 'watchTime'],
  },
  instagram: {
    name: 'Instagram',
    emoji: '📸',
    color: '#e1306c',
    gradientFrom: '#405de6',
    gradientTo: '#e1306c',
    metrics: ['impressions', 'reach', 'likes', 'comments', 'saves', 'shares', 'followers', 'stories_views'],
  },
  facebook: {
    name: 'Facebook',
    emoji: '📘',
    color: '#1877f2',
    gradientFrom: '#1877f2',
    gradientTo: '#0d65d9',
    metrics: ['reach', 'impressions', 'likes', 'shares', 'comments', 'page_views', 'followers'],
  },
  twitch: {
    name: 'Twitch',
    emoji: '🎮',
    color: '#9146ff',
    gradientFrom: '#9146ff',
    gradientTo: '#6440e0',
    metrics: ['viewers', 'peak_viewers', 'hours_watched', 'followers', 'subscribers', 'chat_messages', 'clips'],
  },
  discord: {
    name: 'Discord',
    emoji: '💬',
    color: '#5865f2',
    gradientFrom: '#5865f2',
    gradientTo: '#4752c4',
    metrics: ['members', 'online_members', 'messages', 'new_members', 'boost_level', 'active_channels'],
  },
  lemon8: {
    name: 'Lemon8',
    emoji: '🍋',
    color: '#ffd700',
    gradientFrom: '#ffd700',
    gradientTo: '#ff8c00',
    metrics: ['views', 'likes', 'comments', 'saves', 'followers', 'reach'],
  },
  reddit: {
    name: 'Reddit',
    emoji: '🔴',
    color: '#ff4500',
    gradientFrom: '#ff4500',
    gradientTo: '#cc3700',
    metrics: ['upvotes', 'comments', 'awards', 'shares', 'subscribers', 'post_karma', 'impressions'],
  },
  redgifs: {
    name: 'RedGIFs',
    emoji: '🎬',
    color: '#e74c3c',
    gradientFrom: '#e74c3c',
    gradientTo: '#c0392b',
    metrics: ['views', 'likes', 'shares', 'downloads', 'followers'],
  },
};

const TIME_RANGES = [
  { id: '1h', label: '1 Hour' },
  { id: '24h', label: '24 Hours' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
];

// ─── Sparkline Chart (SVG) ────────────────────────────────────────────────────
function Sparkline({ data = [], color = '#3b82f6', width = 120, height = 40 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + (1 - (v - min) / range) * h;
    return `${x},${y}`;
  });

  const path = `M ${points.join(' L ')}`;
  const fill = `M ${points[0]} L ${points.join(' L ')} L ${pad + w},${pad + h} L ${pad},${pad + h} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle
        cx={points[points.length - 1].split(',')[0]}
        cy={points[points.length - 1].split(',')[1]}
        r="3"
        fill={color}
      />
    </svg>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, delta, trend, color, sparkData }) {
  const isPositive = delta >= 0;
  const formattedValue = formatNumber(value);
  const formattedDelta = `${isPositive ? '+' : ''}${delta?.toFixed(1)}%`;

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex flex-col gap-2 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
        {delta !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {formattedDelta}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{formattedValue}</span>
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
    </div>
  );
}

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Platform Tab ─────────────────────────────────────────────────────────────
function PlatformTab({ id, config, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
        ${active
          ? 'text-white shadow-lg'
          : 'bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-700/50'
        }`}
      style={active ? {
        background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})`,
      } : {}}
    >
      <span>{config.emoji}</span>
      <span>{config.name}</span>
    </button>
  );
}

// ─── Retention Chart ──────────────────────────────────────────────────────────
function RetentionChart({ data = [], color = '#3b82f6' }) {
  const max = 100;
  const barCount = data.length || 10;
  const mockData = data.length ? data : Array.from({ length: barCount }, (_, i) =>
    Math.max(10, 100 - i * 8 + Math.random() * 10));

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {mockData.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            <div
              className="w-full rounded-t-sm transition-all duration-300"
              style={{
                height: `${(v / max) * 100}%`,
                background: `linear-gradient(to top, ${color}80, ${color})`,
                minHeight: '4px',
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0s</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ─── Real-time Indicator ──────────────────────────────────────────────────────
function RealtimeIndicator({ connected }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      <span className={connected ? 'text-green-400' : 'text-red-400'}>
        {connected ? 'LIVE' : 'Disconnected'}
      </span>
    </div>
  );
}

// ─── Platform View ────────────────────────────────────────────────────────────
function PlatformView({ platformId, config, data, timeRange }) {
  const metrics = data[platformId] || {};

  const metricDefs = [
    { key: 'views', label: 'Views', icon: <Eye size={14} /> },
    { key: 'impressions', label: 'Impressions', icon: <Eye size={14} /> },
    { key: 'likes', label: 'Likes', icon: <Heart size={14} /> },
    { key: 'shares', label: 'Shares', icon: <Share2 size={14} /> },
    { key: 'comments', label: 'Comments', icon: <MessageSquare size={14} /> },
    { key: 'followers', label: 'Followers', icon: <Users size={14} /> },
    { key: 'reach', label: 'Reach', icon: <Globe size={14} /> },
    { key: 'viewers', label: 'Live Viewers', icon: <Play size={14} /> },
    { key: 'peak_viewers', label: 'Peak Viewers', icon: <Zap size={14} /> },
    { key: 'hours_watched', label: 'Hours Watched', icon: <Clock size={14} /> },
    { key: 'subscribers', label: 'Subscribers', icon: <Star size={14} /> },
    { key: 'members', label: 'Members', icon: <Users size={14} /> },
    { key: 'upvotes', label: 'Upvotes', icon: <ArrowUp size={14} /> },
    { key: 'watchTime', label: 'Watch Time', icon: <Clock size={14} /> },
    { key: 'retention', label: 'Retention %', icon: <Activity size={14} /> },
    { key: 'saves', label: 'Saves', icon: <Award size={14} /> },
  ].filter(m => config.metrics.includes(m.key));

  return (
    <div className="space-y-6">
      {/* Platform Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{config.emoji}</span>
        <div>
          <h2 className="text-xl font-bold text-white">{config.name} Analytics</h2>
          <p className="text-sm text-gray-400">Real-time metrics · {timeRange}</p>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {metricDefs.map(m => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={metrics[m.key]?.value}
            delta={metrics[m.key]?.delta}
            color={config.color}
            sparkData={metrics[m.key]?.history}
          />
        ))}
      </div>

      {/* Retention / Engagement Chart */}
      {(config.metrics.includes('retention') || config.metrics.includes('hours_watched')) && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Activity size={14} />
            {config.name === 'Twitch' ? 'Viewer Retention' : 'Content Retention'}
          </h3>
          <RetentionChart data={metrics.retentionCurve} color={config.color} />
        </div>
      )}

      {/* Top Content */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <TrendingUp size={14} />
          Top Performing Content
        </h3>
        <div className="space-y-3">
          {(metrics.topContent || []).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-gray-500 text-sm font-mono w-4">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.title || `Post ${i + 1}`}</p>
                <p className="text-xs text-gray-400">{formatNumber(item.views || 0)} views</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-400">+{(item.growth || 0).toFixed(1)}%</p>
              </div>
            </div>
          ))}
          {(!metrics.topContent || metrics.topContent.length === 0) && (
            <p className="text-sm text-gray-500">Connect your {config.name} account to see top content</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Overview Panel ───────────────────────────────────────────────────────────
function OverviewPanel({ data }) {
  const totals = Object.entries(PLATFORMS).map(([id, cfg]) => {
    const pd = data[id] || {};
    const reach = pd.reach?.value || pd.views?.value || pd.impressions?.value || 0;
    const engagement = pd.likes?.value || pd.upvotes?.value || 0;
    return { id, config: cfg, reach, engagement };
  });

  totals.sort((a, b) => b.reach - a.reach);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">All Platforms Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Reach', value: totals.reduce((s, t) => s + t.reach, 0), icon: <Globe size={18} />, color: '#3b82f6' },
          { label: 'Total Engagement', value: totals.reduce((s, t) => s + t.engagement, 0), icon: <Heart size={18} />, color: '#ec4899' },
          { label: 'Platforms Connected', value: Object.keys(PLATFORMS).length, icon: <Activity size={18} />, color: '#22c55e' },
          { label: 'Top Platform', value: totals[0]?.config.name || '—', icon: <Award size={18} />, color: '#f59e0b', isText: true },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2" style={{ color: stat.color }}>
              {stat.icon}
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {stat.isText ? stat.value : formatNumber(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Per-platform summary */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-300">Platform Summary</h3>
        </div>
        <div className="divide-y divide-gray-700/30">
          {totals.map(({ id, config, reach, engagement }) => (
            <div key={id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-700/20 transition-colors">
              <span className="text-xl">{config.emoji}</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-white">{config.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{formatNumber(reach)}</p>
                <p className="text-xs text-gray-400">reach</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{formatNumber(engagement)}</p>
                <p className="text-xs text-gray-400">engagement</p>
              </div>
              <div className="w-20 h-1.5 bg-gray-700 rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${reach ? Math.min(100, (reach / (totals[0]?.reach || 1)) * 100) : 0}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Generate Mock Real-time Data ─────────────────────────────────────────────
function generateMockData() {
  const data = {};
  Object.keys(PLATFORMS).forEach(id => {
    const cfg = PLATFORMS[id];
    data[id] = {};
    cfg.metrics.forEach(metric => {
      const base = Math.floor(Math.random() * 500_000) + 1_000;
      data[id][metric] = {
        value: base,
        delta: (Math.random() - 0.4) * 20,
        history: Array.from({ length: 24 }, () => base * (0.8 + Math.random() * 0.4)),
      };
    });
    data[id].retentionCurve = Array.from({ length: 20 },
      (_, i) => Math.max(5, 100 - i * 4.5 - Math.random() * 8));
    data[id].topContent = Array.from({ length: 5 }, (_, i) => ({
      title: `Top Post #${i + 1}`,
      views: Math.floor(Math.random() * 1_000_000),
      growth: Math.random() * 150,
    }));
  });
  return data;
}

// ─── Main Analytics Dashboard ─────────────────────────────────────────────────
export default function AnalyticsDashboard({ socketRef, apiBase = '' }) {
  const [activePlatform, setActivePlatform] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');
  const [data, setData] = useState(generateMockData());
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Real-time data refresh (WebSocket or polling)
  useEffect(() => {
    let interval;
    if (socketRef?.current) {
      const socket = socketRef.current;
      socket.on('analytics:update', (update) => {
        setData(prev => ({
          ...prev,
          [update.platform]: { ...prev[update.platform], ...update.metrics },
        }));
        setLastUpdated(new Date());
      });
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.emit('analytics:subscribe', { platforms: Object.keys(PLATFORMS), timeRange });
    } else {
      // Fallback: simulate live updates
      interval = setInterval(() => {
        setData(generateMockData());
        setLastUpdated(new Date());
        setConnected(true);
      }, 10_000);
    }

    return () => {
      clearInterval(interval);
      if (socketRef?.current) {
        socketRef.current.off('analytics:update');
      }
    };
  }, [socketRef, timeRange]);

  const handleRefresh = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/analytics/metrics?timeRange=${timeRange}`);
      if (res.ok) {
        const freshData = await res.json();
        setData(freshData);
      } else {
        setData(generateMockData());
      }
      setLastUpdated(new Date());
    } catch {
      setData(generateMockData());
      setLastUpdated(new Date());
    }
  }, [apiBase, timeRange]);

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-400" />
              Analytics Dashboard
            </h1>
            <p className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <RealtimeIndicator connected={connected} />

            {/* Time range selector */}
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              {TIME_RANGES.map(tr => (
                <button
                  key={tr.id}
                  onClick={() => setTimeRange(tr.id)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all
                    ${timeRange === tr.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex-shrink-0 border-b border-gray-800 px-4 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setActivePlatform('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${activePlatform === 'overview'
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow'
                : 'bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-700/50'
              }`}
          >
            <Globe size={14} />
            Overview
          </button>
          {Object.entries(PLATFORMS).map(([id, cfg]) => (
            <PlatformTab
              key={id}
              id={id}
              config={cfg}
              active={activePlatform === id}
              onClick={setActivePlatform}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activePlatform === 'overview'
          ? <OverviewPanel data={data} />
          : (
            <PlatformView
              platformId={activePlatform}
              config={PLATFORMS[activePlatform]}
              data={data}
              timeRange={timeRange}
            />
          )
        }
      </div>
    </div>
  );
}
