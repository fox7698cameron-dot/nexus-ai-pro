// AnalyticsDashboard.jsx | Nexus AI Pro | Created: 2026-10-15 | Social Media Analytics

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, TrendingUp, Users, Eye, Heart, Clock,
  Download, RefreshCw, Radio, BarChart3, Zap,
  ChevronDown, Check, AlertCircle, Wifi, WifiOff
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const PLATFORMS = {
  tiktok: { name: 'TikTok', color: '#69C9D0', bgClass: 'bg-cyan-500', textClass: 'text-cyan-400' },
  instagram: { name: 'Instagram', color: '#E1306C', bgClass: 'bg-pink-600', textClass: 'text-pink-400' },
  facebook: { name: 'Facebook', color: '#1877F2', bgClass: 'bg-blue-600', textClass: 'text-blue-400' },
  twitch: { name: 'Twitch', color: '#9146FF', bgClass: 'bg-purple-600', textClass: 'text-purple-400' },
  discord: { name: 'Discord', color: '#5865F2', bgClass: 'bg-indigo-600', textClass: 'text-indigo-400' },
  lemon8: { name: 'Lemon8', color: '#FFD700', bgClass: 'bg-yellow-500', textClass: 'text-yellow-400' },
  reddit: { name: 'Reddit', color: '#FF4500', bgClass: 'bg-orange-600', textClass: 'text-orange-400' },
  redgifs: { name: 'RedGIFs', color: '#FF0050', bgClass: 'bg-red-600', textClass: 'text-red-400' }
};

const DATE_RANGES = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' }
];

// ============================================
// HELPERS
// ============================================

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function generateMetrics(range) {
  const multiplier = range === '90d' ? 4 : range === '30d' ? 2 : range === '7d' ? 1 : 0.2;
  return {
    views: randomInRange(10000, 500000) * multiplier,
    likes: randomInRange(500, 50000) * multiplier,
    reach: randomInRange(5000, 300000) * multiplier,
    retention: randomInRange(30, 95),
    followers: randomInRange(100, 10000) * multiplier,
    engagementRate: (randomInRange(10, 120) / 10).toFixed(1),
    watchTime: randomInRange(5000, 200000) * multiplier
  };
}

function generateChartData(points = 12) {
  return Array.from({ length: points }, (_, i) => ({
    x: i,
    value: randomInRange(20, 100)
  }));
}

function generateConnectionStatuses() {
  return Object.keys(PLATFORMS).reduce((acc, key) => {
    acc[key] = Math.random() > 0.25;
    return acc;
  }, {});
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Sparkline chart rendered as inline SVG
 * @param {{ data: Array<{x:number,value:number}>, color: string }} props
 */
function SparklineChart({ data, color = '#60a5fa' }) {
  const width = 120;
  const height = 40;
  const padding = 2;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const px = padding + (i / (data.length - 1)) * (width - padding * 2);
    const py = height - padding - ((d.value - min) / range) * (height - padding * 2);
    return `${px},${py}`;
  });

  const polylinePoints = points.join(' ');

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`
  ].join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * @param {{ label: string, value: string|number, icon: React.ReactNode, chart: Array, color: string }} props
 */
function MetricCard({ label, value, icon, chart, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        {chart && <SparklineChart data={chart} color={color} />}
      </div>
    </div>
  );
}

/**
 * @param {{ platform: string, connected: boolean }} props
 */
function PlatformStatusBadge({ platform, connected }) {
  const info = PLATFORMS[platform];
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{info.name}</span>
      {connected
        ? <Wifi size={12} className="text-green-400" />
        : <WifiOff size={12} className="text-gray-400" />}
    </div>
  );
}

/**
 * @param {{ platform: string, metrics: object, chartData: object }} props
 */
function PlatformRow({ platform, metrics, chartData }) {
  const info = PLATFORMS[platform];
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full ${info.bgClass} flex items-center justify-center text-white text-xs font-bold`}>
          {info.name[0]}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{info.name}</h3>
        <span className="ml-auto text-xs text-green-500 flex items-center gap-1">
          <Radio size={10} className="animate-pulse" /> Live
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-xs block">Views</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(metrics.views)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-xs block">Likes</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(metrics.likes)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-xs block">Engagement</span>
          <span className="font-semibold text-gray-900 dark:text-white">{metrics.engagementRate}%</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-xs block">Followers</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(metrics.followers)}</span>
        </div>
      </div>
      <div className="mt-3">
        <SparklineChart data={chartData} color={info.color} />
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * AnalyticsDashboard — social media analytics with real-time simulation
 * @param {{ className?: string }} props
 */
export default function AnalyticsDashboard({ className = '' }) {
  const [selectedRange, setSelectedRange] = useState('7d');
  const [isLive, setIsLive] = useState(true);
  const [platformMetrics, setPlatformMetrics] = useState({});
  const [chartData, setChartData] = useState({});
  const [connectionStatuses, setConnectionStatuses] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const refreshData = useCallback(() => {
    const metrics = {};
    const charts = {};
    Object.keys(PLATFORMS).forEach(p => {
      metrics[p] = generateMetrics(selectedRange);
      charts[p] = generateChartData(12);
    });
    setPlatformMetrics(metrics);
    setChartData(charts);
    setConnectionStatuses(generateConnectionStatuses());
    setLastUpdated(new Date());
  }, [selectedRange]);

  // Initial load and range change
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time simulation polling
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(refreshData, 8000);
    return () => clearInterval(interval);
  }, [isLive, refreshData]);

  const totalViews = Object.values(platformMetrics).reduce((s, m) => s + (m?.views || 0), 0);
  const totalFollowers = Object.values(platformMetrics).reduce((s, m) => s + (m?.followers || 0), 0);
  const avgEngagement = Object.values(platformMetrics).length
    ? (Object.values(platformMetrics).reduce((s, m) => s + parseFloat(m?.engagementRate || 0), 0) / Object.values(platformMetrics).length).toFixed(1)
    : 0;
  const connectedCount = Object.values(connectionStatuses).filter(Boolean).length;

  function handleExport() {
    setIsExporting(true);
    setTimeout(() => {
      const data = JSON.stringify({ range: selectedRange, metrics: platformMetrics, exportedAt: new Date().toISOString() }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-analytics-${selectedRange}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 600);
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-blue-500" size={24} />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time social media metrics across all platforms
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date range selector */}
          <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 gap-1">
            {DATE_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setSelectedRange(r.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedRange === r.value
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Live toggle */}
          <button
            onClick={() => setIsLive(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isLive
                ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Radio size={14} className={isLive ? 'animate-pulse' : ''} />
            {isLive ? 'Live' : 'Paused'}
          </button>

          {/* Refresh */}
          <button
            onClick={refreshData}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh now"
          >
            <RefreshCw size={16} />
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Download size={14} />
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {/* Platform connection status */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          Platform Connections — {connectedCount}/{Object.keys(PLATFORMS).length} active
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PLATFORMS).map(p => (
            <PlatformStatusBadge key={p} platform={p} connected={connectionStatuses[p]} />
          ))}
        </div>
      </div>

      {/* Aggregate KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Views"
          value={formatNumber(totalViews)}
          icon={<Eye size={16} />}
          chart={generateChartData(10)}
          color="#60a5fa"
        />
        <MetricCard
          label="Total Followers"
          value={formatNumber(totalFollowers)}
          icon={<Users size={16} />}
          chart={generateChartData(10)}
          color="#34d399"
        />
        <MetricCard
          label="Avg Engagement"
          value={`${avgEngagement}%`}
          icon={<TrendingUp size={16} />}
          chart={generateChartData(10)}
          color="#f59e0b"
        />
        <MetricCard
          label="Platforms Live"
          value={`${connectedCount}/8`}
          icon={<Activity size={16} />}
          chart={generateChartData(10)}
          color="#a78bfa"
        />
      </div>

      {/* Per-platform breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          Platform Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Object.keys(PLATFORMS).map(p => (
            platformMetrics[p] && (
              <PlatformRow
                key={p}
                platform={p}
                metrics={platformMetrics[p]}
                chartData={chartData[p] || generateChartData(12)}
              />
            )
          ))}
        </div>
      </div>

      {/* Detailed metrics table */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Detailed Metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3">Platform</th>
                <th className="text-right px-4 py-3">Views</th>
                <th className="text-right px-4 py-3">Likes</th>
                <th className="text-right px-4 py-3">Reach</th>
                <th className="text-right px-4 py-3">Retention</th>
                <th className="text-right px-4 py-3">Watch Time</th>
                <th className="text-right px-4 py-3">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(PLATFORMS).map(p => {
                const m = platformMetrics[p];
                if (!m) return null;
                return (
                  <tr key={p} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${PLATFORMS[p].bgClass}`} />
                      {PLATFORMS[p].name}
                    </td>
                    <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">{formatNumber(m.views)}</td>
                    <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">{formatNumber(m.likes)}</td>
                    <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">{formatNumber(m.reach)}</td>
                    <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">{m.retention}%</td>
                    <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">{formatNumber(m.watchTime)}h</td>
                    <td className="text-right px-4 py-3">
                      <span className={`font-semibold ${parseFloat(m.engagementRate) > 5 ? 'text-green-500' : 'text-gray-700 dark:text-gray-300'}`}>
                        {m.engagementRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
