// 2026-07-20
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  BarChart2, Users, Heart, Eye, Radio,
  Download, RefreshCw, Zap, Globe, ChevronDown,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import SocialMetrics, { PLATFORM_CONFIG } from './SocialMetrics.jsx';
import MetricsCharts from './MetricsCharts.jsx';
import PlatformConnector from './PlatformConnector.jsx';
import RetentionTracker from './RetentionTracker.jsx';

// ------------------------------------------------
// Constants
// ------------------------------------------------
const ALL_PLATFORMS = Object.keys(PLATFORM_CONFIG);
const TIME_RANGES = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: Globe },
  { id: 'charts', label: 'Charts', icon: BarChart2 },
  { id: 'retention', label: 'Retention', icon: Radio },
  { id: 'connect', label: 'Connections', icon: Zap },
];

// ------------------------------------------------
// Format helpers
// ------------------------------------------------
function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ------------------------------------------------
// Summary stat tile
// ------------------------------------------------
function StatTile({ icon: Icon, label, value, change, color }) {
  const positive = change > 0;
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col gap-2 shadow">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg" style={{ background: color + '22' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-gray-400 text-xs font-medium">{label}</span>
      </div>
      <div className="text-white text-2xl font-bold leading-none">{value}</div>
      {change != null && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------
// Platform tab button
// ------------------------------------------------
function PlatformTabBtn({ platform, active, onClick }) {
  const cfg = PLATFORM_CONFIG[platform];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
        active ? 'text-white shadow' : 'text-gray-400 border-gray-700 bg-gray-800 hover:border-gray-500'
      }`}
      style={active ? { background: cfg.color + '33', borderColor: cfg.color } : {}}
    >
      <span>{cfg.emoji}</span>
      {cfg.label}
    </button>
  );
}

// ================================================
// Main Dashboard
// ================================================
export default function AnalyticsDashboard({ apiBase = '/api/analytics' }) {
  const [tab, setTab] = useState('overview');
  const [platformTab, setPlatformTab] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [realtimeBadge, setRealtimeBadge] = useState(false);
  const [realtimeCount, setRealtimeCount] = useState(0);
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);
  const socketRef = useRef(null);
  const badgeTimerRef = useRef(null);

  // ------------------------------------------------
  // Data fetch
  // ------------------------------------------------
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/overview`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setOverview(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview, timeRange]);

  // ------------------------------------------------
  // Socket.IO — real-time updates
  // ------------------------------------------------
  useEffect(() => {
    const socket = io({ auth: { token: localStorage.getItem('authToken') || '' } });
    socketRef.current = socket;

    socket.on('analytics:update', (data) => {
      // Merge incoming real-time delta into overview
      setOverview((prev) => {
        if (!prev) return prev;
        const updatedPlatforms = prev.platforms.map((p) =>
          p.platform === data.platform ? { ...p, ...data.metrics } : p
        );
        return { ...prev, platforms: updatedPlatforms };
      });
      // Flash real-time badge
      setRealtimeBadge(true);
      setRealtimeCount((n) => n + 1);
      clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = setTimeout(() => setRealtimeBadge(false), 4000);
    });

    socket.on('analytics:connected', () => {
      // Re-fetch after a platform connection event
      fetchOverview();
    });

    return () => {
      socket.disconnect();
      clearTimeout(badgeTimerRef.current);
    };
  }, [fetchOverview]);

  // ------------------------------------------------
  // CSV export
  // ------------------------------------------------
  function handleExport() {
    const url = `${apiBase}/export`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ------------------------------------------------
  // Derived data
  // ------------------------------------------------
  const platforms = overview?.platforms || [];
  const summary = overview?.summary || {};

  const displayedPlatforms =
    platformTab === 'all' ? platforms : platforms.filter((p) => p.platform === platformTab);

  // ------------------------------------------------
  // Render
  // ------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BarChart2 size={22} className="text-purple-400 shrink-0" />
          <h1 className="text-lg font-bold truncate">Analytics Dashboard</h1>

          {overview?.isMock && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-400 border border-amber-700/50 shrink-0">
              MOCK DATA
            </span>
          )}

          {realtimeBadge && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/60 text-green-400 border border-green-700/50 animate-pulse shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              LIVE +{realtimeCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time range */}
          <div className="relative">
            <button
              onClick={() => setTimeRangeOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition-colors"
            >
              {TIME_RANGES.find((r) => r.value === timeRange)?.label}
              <ChevronDown size={13} />
            </button>
            {timeRangeOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[80px]">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => { setTimeRange(r.value); setTimeRangeOpen(false); }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                      r.value === timeRange ? 'text-purple-400 font-semibold' : 'text-gray-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 border border-indigo-600 text-sm text-white font-semibold transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error} — showing estimated data.
          <button onClick={fetchOverview} className="ml-auto underline hover:no-underline text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Main tab navigation */}
      <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-xl border border-gray-700 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                active
                  ? 'bg-indigo-700 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ============================================
          TAB: OVERVIEW
          ============================================ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              icon={Users}
              label="Total Followers"
              value={fmt(summary.totalFollowers)}
              change={3.4}
              color="#8b5cf6"
            />
            <StatTile
              icon={Heart}
              label="Total Likes"
              value={fmt(summary.totalLikes)}
              change={7.2}
              color="#ec4899"
            />
            <StatTile
              icon={Eye}
              label="Total Views"
              value={fmt(summary.totalViews)}
              change={-1.8}
              color="#06b6d4"
            />
            <StatTile
              icon={TrendingUp}
              label="Avg Engagement"
              value={summary.avgEngagement ? `${summary.avgEngagement}%` : '—'}
              change={2.1}
              color="#10b981"
            />
          </div>

          {/* Best performing callout */}
          {overview?.bestPlatform && (
            <div
              className="flex flex-wrap items-center gap-3 bg-gray-800 rounded-xl border px-5 py-3"
              style={{
                borderColor: PLATFORM_CONFIG[overview.bestPlatform]?.color + '55',
                background: PLATFORM_CONFIG[overview.bestPlatform]?.color + '11',
              }}
            >
              <span className="text-2xl">{PLATFORM_CONFIG[overview.bestPlatform]?.emoji}</span>
              <div>
                <div className="text-white text-sm font-semibold">
                  Best performing: {PLATFORM_CONFIG[overview.bestPlatform]?.label}
                </div>
                <div className="text-gray-400 text-xs">Highest engagement rate this period</div>
              </div>
            </div>
          )}

          {/* Platform tab row */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPlatformTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                platformTab === 'all'
                  ? 'bg-purple-700 border-purple-600 text-white'
                  : 'text-gray-400 border-gray-700 bg-gray-800 hover:border-gray-500'
              }`}
            >
              All Platforms
            </button>
            {ALL_PLATFORMS.map((p) => (
              <PlatformTabBtn
                key={p}
                platform={p}
                active={platformTab === p}
                onClick={() => setPlatformTab(p)}
              />
            ))}
          </div>

          {/* Platform cards grid */}
          {loading && platforms.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">Loading analytics…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedPlatforms.map((m) => (
                <SocialMetrics
                  key={m.platform}
                  platform={m.platform}
                  metrics={m}
                  compact={platformTab === 'all'}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================
          TAB: CHARTS
          ============================================ */}
      {tab === 'charts' && (
        <MetricsCharts platforms={platforms} />
      )}

      {/* ============================================
          TAB: RETENTION
          ============================================ */}
      {tab === 'retention' && (
        <RetentionTracker apiBase={apiBase} />
      )}

      {/* ============================================
          TAB: CONNECTIONS
          ============================================ */}
      {tab === 'connect' && (
        <PlatformConnector apiBase={apiBase} />
      )}
    </div>
  );
}
