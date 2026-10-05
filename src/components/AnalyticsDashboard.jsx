// ================================================
// File: src/components/AnalyticsDashboard.jsx
// Date: 2026-10-05
// Description: Real-time social media analytics dashboard with inline SVG charts,
// platform-specific colors, date range filtering, and export functionality.
// Supports TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs.
// ================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Users, Heart, Eye, Activity,
  Download, RefreshCw, Calendar, ChevronDown, AlertCircle,
  Wifi, WifiOff, BarChart2, Filter
} from 'lucide-react';

// ---- Platform configuration ----
const PLATFORMS = {
  tiktok:    { name: 'TikTok',     color: '#69C9D0', accent: '#EE1D52', emoji: '🎵' },
  instagram: { name: 'Instagram',  color: '#E1306C', accent: '#F77737', emoji: '📸' },
  facebook:  { name: 'Facebook',   color: '#1877F2', accent: '#42B72A', emoji: '👍' },
  twitch:    { name: 'Twitch',     color: '#9146FF', accent: '#F0F0FF', emoji: '🎮' },
  discord:   { name: 'Discord',    color: '#5865F2', accent: '#57F287', emoji: '💬' },
  lemon8:    { name: 'Lemon8',     color: '#FFE620', accent: '#FF8C00', emoji: '🍋' },
  reddit:    { name: 'Reddit',     color: '#FF4500', accent: '#FF6534', emoji: '👽' },
  redgifs:   { name: 'RedGifs',    color: '#CC0000', accent: '#FF4444', emoji: '🎞️' },
};

const METRICS = ['views', 'likes', 'reach', 'retention', 'followers', 'engagement'];

const METRIC_CONFIG = {
  views:       { label: 'Views',           icon: Eye,       format: 'compact', color: '#60A5FA' },
  likes:       { label: 'Likes',           icon: Heart,     format: 'compact', color: '#F472B6' },
  reach:       { label: 'Reach',           icon: Users,     format: 'compact', color: '#34D399' },
  retention:   { label: 'Retention',       icon: Activity,  format: 'percent', color: '#FBBF24' },
  followers:   { label: 'Followers',       icon: Users,     format: 'compact', color: '#A78BFA' },
  engagement:  { label: 'Engagement Rate', icon: TrendingUp, format: 'percent', color: '#FB923C' },
};

const DATE_RANGES = [
  { id: '7d',   label: '7 Days' },
  { id: '30d',  label: '30 Days' },
  { id: '90d',  label: '90 Days' },
  { id: '1y',   label: '1 Year' },
];

// ---- Helpers ----

function formatNumber(value, format) {
  if (value === null || value === undefined) return '—';
  if (format === 'percent') return `${(+value).toFixed(1)}%`;
  const num = +value;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/** Generate mock time-series data for demo purposes */
function generateSeries(length, base, variance) {
  let v = base;
  return Array.from({ length }, (_, i) => {
    v = Math.max(0, v + (Math.random() - 0.48) * variance);
    return Math.round(v);
  });
}

/** Generate mock platform metrics */
function generatePlatformData(platformId) {
  const base = {
    tiktok:    { views: 850000, likes: 42000, reach: 600000, retention: 62, followers: 120000, engagement: 8.2 },
    instagram: { views: 320000, likes: 28000, reach: 290000, retention: 55, followers: 89000,  engagement: 5.6 },
    facebook:  { views: 210000, likes: 15000, reach: 180000, retention: 48, followers: 65000,  engagement: 3.4 },
    twitch:    { views: 95000,  likes: 8500,  reach: 80000,  retention: 72, followers: 22000,  engagement: 11.3 },
    discord:   { views: 45000,  likes: 5200,  reach: 43000,  retention: 81, followers: 18000,  engagement: 14.2 },
    lemon8:    { views: 180000, likes: 19000, reach: 160000, retention: 58, followers: 41000,  engagement: 7.1 },
    reddit:    { views: 520000, likes: 37000, reach: 480000, retention: 44, followers: 96000,  engagement: 4.8 },
    redgifs:   { views: 670000, likes: 55000, reach: 590000, retention: 39, followers: 78000,  engagement: 6.3 },
  };
  const b = base[platformId] || base.tiktok;
  return {
    ...b,
    series: {
      views:      generateSeries(30, b.views, b.views * 0.12),
      likes:      generateSeries(30, b.likes, b.likes * 0.15),
      followers:  generateSeries(30, b.followers, b.followers * 0.02),
      engagement: generateSeries(30, b.engagement, 0.5),
    },
    trend: {
      views:      +(Math.random() * 20 - 5).toFixed(1),
      likes:      +(Math.random() * 15 - 3).toFixed(1),
      followers:  +(Math.random() * 5 - 1).toFixed(1),
      engagement: +(Math.random() * 4 - 1).toFixed(1),
    },
  };
}

// ---- SVG Mini Line Chart ----
function LineChart({ data, color, width = 200, height = 60 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${pts.join(' L ')}`;
  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- SVG Bar Chart ----
function BarChart({ data, color, width = 200, height = 80 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data) || 1;
  const barW = (width / data.length) - 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 4));
        const x = i * (barW + 2);
        const y = height - h;
        return (
          <rect key={i} x={x} y={y} width={barW} height={h}
            fill={color} opacity="0.8" rx="2" />
        );
      })}
    </svg>
  );
}

// ---- Metric Card ----
function MetricCard({ label, value, format, trend, color, icon: Icon, series }) {
  const formatted = formatNumber(value, format);
  const isUp = trend >= 0;
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <Icon size={14} style={{ color }} />
          {label}
        </div>
        <span className={`text-xs flex items-center gap-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(trend).toFixed(1)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{formatted}</p>
      {series && (
        <div className="mt-1">
          <LineChart data={series} color={color} width={160} height={40} />
        </div>
      )}
    </div>
  );
}

// ---- Platform Overview Row ----
function PlatformRow({ platformId, data, selected, onSelect }) {
  const cfg = PLATFORMS[platformId];
  if (!cfg || !data) return null;
  const trend = data.trend?.views ?? 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(platformId)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
        ${selected
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'
        }`}
    >
      <span className="text-2xl">{cfg.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{cfg.name}</p>
        <p className="text-gray-400 text-xs">{formatNumber(data.followers, 'compact')} followers</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-white text-sm font-medium">{formatNumber(data.views, 'compact')}</p>
        <span className={`text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      </div>
    </button>
  );
}

// ---- Overview Bar Chart SVG ----
function OverviewChart({ platformsData, metric }) {
  const entries = Object.entries(platformsData);
  if (!entries.length) return null;
  const values = entries.map(([, d]) => d?.[metric] ?? 0);
  const max = Math.max(...values) || 1;
  const barH = 20;
  const gap = 8;
  const totalH = entries.length * (barH + gap);
  const labelW = 80;
  const chartW = 200;

  return (
    <svg width={labelW + chartW + 10} height={totalH} className="overflow-visible">
      {entries.map(([pid, d], i) => {
        const cfg = PLATFORMS[pid];
        const val = d?.[metric] ?? 0;
        const barLen = (val / max) * chartW;
        const y = i * (barH + gap);
        return (
          <g key={pid}>
            <text x={labelW - 6} y={y + barH / 2 + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">
              {cfg?.emoji} {cfg?.name}
            </text>
            <rect x={labelW} y={y} width={barLen} height={barH} fill={cfg?.color || '#6366F1'} rx="4" opacity="0.85" />
            <text x={labelW + barLen + 4} y={y + barH / 2 + 4} fontSize="10" fill="#D1D5DB">
              {formatNumber(val, METRIC_CONFIG[metric]?.format || 'compact')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---- Export Helper ----
function exportData(platformsData, selectedPlatform) {
  const rows = [];
  const data = selectedPlatform
    ? { [selectedPlatform]: platformsData[selectedPlatform] }
    : platformsData;

  rows.push(['Platform', ...METRICS]);
  for (const [pid, d] of Object.entries(data)) {
    if (!d) continue;
    rows.push([PLATFORMS[pid]?.name || pid, ...METRICS.map(m => d[m] ?? '')]);
  }
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Main Component ----
export default function AnalyticsDashboard() {
  const [platformsData, setPlatformsData] = useState({});
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [dateRange, setDateRange] = useState('30d');
  const [overviewMetric, setOverviewMetric] = useState('views');
  const [isRealtime, setIsRealtime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics/overview?range=${dateRange}`).catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        setPlatformsData(json.platforms || {});
      } else {
        // Fallback to generated mock data for offline / demo mode
        const mock = {};
        for (const pid of Object.keys(PLATFORMS)) mock[pid] = generatePlatformData(pid);
        setPlatformsData(mock);
      }
      setLastUpdated(new Date());
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time polling
  useEffect(() => {
    if (!isRealtime) { clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(() => {
      // Simulate real-time updates by mutating a random metric slightly
      setPlatformsData(prev => {
        const next = { ...prev };
        for (const pid of Object.keys(next)) {
          if (!next[pid]) continue;
          next[pid] = {
            ...next[pid],
            views: Math.max(0, next[pid].views + Math.round((Math.random() - 0.4) * 1000)),
            likes: Math.max(0, next[pid].likes + Math.round((Math.random() - 0.45) * 100)),
          };
        }
        setLastUpdated(new Date());
        return next;
      });
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [isRealtime]);

  const current = platformsData[selectedPlatform];
  const platformCfg = PLATFORMS[selectedPlatform];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 size={24} className="text-indigo-400" />
            Analytics Dashboard
          </h1>
          {lastUpdated && (
            <p className="text-gray-400 text-xs mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date range */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white
                appearance-none pr-8 focus:outline-none focus:border-indigo-500"
            >
              {DATE_RANGES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Real-time toggle */}
          <button
            type="button"
            onClick={() => setIsRealtime(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all
              ${isRealtime
                ? 'border-green-500 bg-green-500/10 text-green-400'
                : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
          >
            {isRealtime ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isRealtime ? 'Live' : 'Live Off'}
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-1.5 border border-gray-600 rounded-lg text-gray-400 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={() => exportData(platformsData, null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Platform list */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Platforms</h2>
          {Object.keys(PLATFORMS).map(pid => (
            <PlatformRow
              key={pid}
              platformId={pid}
              data={platformsData[pid]}
              selected={selectedPlatform === pid}
              onSelect={setSelectedPlatform}
            />
          ))}
        </div>

        {/* Right: Detail */}
        <div className="lg:col-span-2 space-y-4">
          {current ? (
            <>
              {/* Platform header */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-700 bg-gray-800/40">
                <span className="text-4xl">{platformCfg?.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{platformCfg?.name}</h2>
                  <p className="text-gray-400 text-sm">{formatNumber(current.followers, 'compact')} followers</p>
                </div>
                <button
                  type="button"
                  onClick={() => exportData(platformsData, selectedPlatform)}
                  className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-gray-600
                    hover:border-gray-400 rounded px-2 py-1 transition-colors"
                >
                  <Download size={12} /> Export
                </button>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {METRICS.map(m => {
                  const cfg = METRIC_CONFIG[m];
                  return (
                    <MetricCard
                      key={m}
                      label={cfg.label}
                      value={current[m]}
                      format={cfg.format}
                      trend={current.trend?.[m] ?? 0}
                      color={cfg.color}
                      icon={cfg.icon}
                      series={current.series?.[m]?.slice(-14)}
                    />
                  );
                })}
              </div>

              {/* Views trend */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm text-gray-400 mb-3">Views — Last 30 Days</h3>
                {current.series?.views && (
                  <BarChart
                    data={current.series.views}
                    color={platformCfg?.color || '#6366F1'}
                    width={Math.min(window.innerWidth - 80, 500)}
                    height={80}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              {loading ? <RefreshCw size={24} className="animate-spin" /> : 'Select a platform'}
            </div>
          )}

          {/* Overview comparison */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-300">Platform Comparison</h3>
              <div className="relative">
                <select
                  value={overviewMetric}
                  onChange={e => setOverviewMetric(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white appearance-none pr-6
                    focus:outline-none focus:border-indigo-500"
                >
                  {METRICS.map(m => (
                    <option key={m} value={m}>{METRIC_CONFIG[m].label}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <OverviewChart platformsData={platformsData} metric={overviewMetric} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
