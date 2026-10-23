// src/components/AnalyticsDashboard.jsx
// 2026-10-23 - Social media analytics dashboard with real-time Socket.IO updates

import React, { useState, useEffect, useCallback, Component } from 'react';
import { TrendingUp, RefreshCw, Clock } from 'lucide-react';
import { t, detectLang } from '../i18n/translations.js';

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORM_META = {
  tiktok:    { emoji: '🎵', label: 'TikTok',    bg: 'bg-black',           text: 'text-white',  accent: '#fe2c55' },
  instagram: { emoji: '📸', label: 'Instagram', bg: 'bg-gradient-to-br from-purple-600 to-orange-500', text: 'text-white', accent: '#e1306c' },
  facebook:  { emoji: '👥', label: 'Facebook',  bg: 'bg-[#1877f2]',       text: 'text-white',  accent: '#1877f2' },
  twitch:    { emoji: '🎮', label: 'Twitch',    bg: 'bg-[#9146ff]',       text: 'text-white',  accent: '#9146ff' },
  discord:   { emoji: '💬', label: 'Discord',   bg: 'bg-[#5865f2]',       text: 'text-white',  accent: '#5865f2' },
  lemon8:    { emoji: '🍋', label: 'Lemon8',    bg: 'bg-[#ffd600]',       text: 'text-gray-900', accent: '#ffd600' },
  reddit:    { emoji: '🤖', label: 'Reddit',    bg: 'bg-[#ff4500]',       text: 'text-white',  accent: '#ff4500' },
  redgifs:   { emoji: '🔴', label: 'RedGifs',   bg: 'bg-[#d32f2f]',       text: 'text-white',  accent: '#d32f2f' },
};

const PLATFORM_KEYS = Object.keys(PLATFORM_META);
const TIME_RANGES = ['7d', '30d', '90d', 'all'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── SVG bar chart ────────────────────────────────────────────────────────────
function BarChart({ values, color, height = 36 }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);
  const w = 100 / values.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" aria-hidden="true">
      {values.map((v, i) => {
        const barH = (v / max) * height;
        return <rect key={i} x={i * w + 1} y={height - barH} width={w - 2} height={barH} fill={color} opacity={0.85} rx="1" />;
      })}
    </svg>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />)}
      </div>
      <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

// ─── Platform card ────────────────────────────────────────────────────────────
function PlatformCard({ metrics, lang }) {
  const meta = PLATFORM_META[metrics.platform] || {};
  const chartValues = [
    metrics.impressions * 0.2,
    metrics.views * 0.5,
    metrics.reach * 0.3,
    metrics.likes * 2,
    metrics.views,
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      <div className={`${meta.bg} ${meta.text} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-label={meta.label}>{meta.emoji}</span>
          <span className="font-semibold text-sm">{meta.label}</span>
        </div>
        {metrics.connected && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Live</span>}
      </div>
      <div className="p-4 flex-1 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Views</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{fmt(metrics.views)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Likes</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{fmt(metrics.likes)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Reach</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{fmt(metrics.reach)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Retention</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{metrics.retention}%</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Followers: {fmt(metrics.followers)}</span>
          <span>ER: {metrics.engagementRate}%</span>
        </div>
        <BarChart values={chartValues} color={meta.accent} />
      </div>
    </div>
  );
}

// ─── Aggregate stats ──────────────────────────────────────────────────────────
function AggregateStats({ totals, avgRetention, topPlatform, lang }) {
  const topMeta = PLATFORM_META[topPlatform] || {};
  const stats = [
    { label: t('analytics.totalViews', lang),   value: fmt(totals.views),   icon: '👁️' },
    { label: t('analytics.totalReach', lang),   value: fmt(totals.reach),   icon: '📡' },
    { label: t('analytics.avgRetention', lang), value: `${avgRetention}%`,  icon: '⏱️' },
    { label: t('analytics.topPlatform', lang),  value: `${topMeta.emoji || ''} ${topMeta.label || topPlatform}`, icon: '🏆' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{s.icon}</span>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="font-bold text-gray-900 dark:text-white">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────────
class AnalyticsErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-500 dark:text-red-400">
          <p className="font-semibold">Analytics dashboard encountered an error.</p>
          <button onClick={() => this.setState({ hasError: false })} className="mt-2 text-sm underline">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * @param {{ socket: object|null, userRole: string }} props
 */
export default function AnalyticsDashboard({ socket, userRole }) {
  const lang = detectLang();
  const [metrics, setMetrics] = useState([]);
  const [totals, setTotals] = useState({ views: 0, likes: 0, reach: 0, impressions: 0, followers: 0 });
  const [avgRetention, setAvgRetention] = useState(0);
  const [topPlatform, setTopPlatform] = useState('');
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async (r) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics/dashboard?range=${r}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setMetrics(data.platforms || []);
      setTotals(data.totals || {});
      setAvgRetention(data.avgRetention || 0);
      setTopPlatform(data.topPlatform || '');
      setLastUpdated(new Date(data.updatedAt));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(range); }, [range, fetchDashboard]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.metrics) {
        setMetrics(data.metrics);
        setLastUpdated(new Date(data.ts));
      }
    };
    socket.on('analytics:update', handler);
    return () => socket.off('analytics:update', handler);
  }, [socket]);

  return (
    <AnalyticsErrorBoundary>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('nav.analytics', lang)}</h2>
            {lastUpdated && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={11} /> {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
              {TIME_RANGES.map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${range === r ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={() => fetchDashboard(range)} disabled={loading}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
        )}

        {/* Aggregate stats */}
        {!loading && metrics.length > 0 && (
          <AggregateStats totals={totals} avgRetention={avgRetention} topPlatform={topPlatform} lang={lang} />
        )}

        {/* Platform cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? PLATFORM_KEYS.map(k => <SkeletonCard key={k} />)
            : metrics.length > 0
              ? metrics.map(m => <PlatformCard key={m.platform} metrics={m} lang={lang} />)
              : PLATFORM_KEYS.map(k => <SkeletonCard key={k} />)
          }
        </div>
      </div>
    </AnalyticsErrorBoundary>
  );
}
