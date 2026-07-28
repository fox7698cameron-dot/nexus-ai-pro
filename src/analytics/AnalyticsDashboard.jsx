// Created: 2026-07-28
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Activity, Eye, Heart, Zap, TrendingUp, Users,
  BarChart2, Radio, Clock, RefreshCw,
  ChevronUp, ChevronDown, ArrowUpDown,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',    emoji: '🎵', primaryLabel: 'Views'   },
  { id: 'instagram', name: 'Instagram', emoji: '📸', primaryLabel: 'Views'   },
  { id: 'facebook',  name: 'Facebook',  emoji: '👥', primaryLabel: 'Reach'   },
  { id: 'twitch',    name: 'Twitch',    emoji: '💜', primaryLabel: 'Viewers' },
  { id: 'discord',   name: 'Discord',   emoji: '🎮', primaryLabel: 'Members' },
  { id: 'lemon8',    name: 'Lemon8',    emoji: '🍋', primaryLabel: 'Views'   },
  { id: 'reddit',    name: 'Reddit',    emoji: '🤖', primaryLabel: 'Members' },
  { id: 'redgifs',   name: 'RedGifs',   emoji: '🔴', primaryLabel: 'Views'   },
];

const TABLE_COLS = [
  { key: 'name',           label: 'Platform'  },
  { key: 'likes',          label: 'Likes'     },
  { key: 'reach',          label: 'Reach'     },
  { key: 'engagementRate', label: 'Eng. Rate' },
];

function formatNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function Sparkline({ data = [] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-8 mt-2">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-purple-500 opacity-60 hover:opacity-100 transition-opacity"
          style={{ height: `${Math.max(8, Math.round((v / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

function TrendBadge({ value }) {
  const up = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === 'desc'
    ? <ChevronDown className="w-3 h-3 text-purple-400" />
    : <ChevronUp   className="w-3 h-3 text-purple-400" />;
}

export default function AnalyticsDashboard({ socket }) {
  const [platforms,        setPlatforms]        = useState([]);
  const [aggregated,       setAggregated]       = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [retention,        setRetention]        = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [lastUpdated,      setLastUpdated]      = useState(null);
  const [liveMode,         setLiveMode]         = useState(true);
  const [activeFilter,     setActiveFilter]     = useState('all');
  const [sortBy,           setSortBy]           = useState('reach');
  const [sortDir,          setSortDir]          = useState('desc');

  // ── Initial fetch ────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, aggRes] = await Promise.all([
        fetch('/api/analytics/summary'),
        fetch('/api/analytics/aggregated'),
      ]);
      const sumData = await sumRes.json();
      const aggData = await aggRes.json();
      setPlatforms(sumData.platforms ?? []);
      setAggregated(aggData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[AnalyticsDashboard] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ── Retention fetch whenever selected platform changes ───────────────────
  useEffect(() => {
    setRetention(null);
    fetch(`/api/analytics/retention/${selectedPlatform}`)
      .then(r => r.json())
      .then(d => setRetention(d))
      .catch(() => setRetention(null));
  }, [selectedPlatform]);

  // ── Socket.io real-time updates ──────────────────────────────────────────
  useEffect(() => {
    if (!socket || !liveMode) return;
    socket.emit('analytics:subscribe');
    const handler = (data) => {
      setPlatforms(prev => {
        const next = [...prev];
        const idx  = next.findIndex(p => p.id === data.id);
        if (idx >= 0) next[idx] = { ...next[idx], ...data };
        return next;
      });
      setLastUpdated(new Date());
    };
    socket.on('analytics:update', handler);
    return () => { socket.off('analytics:update', handler); };
  }, [socket, liveMode]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const platformMap = Object.fromEntries(platforms.map(p => [p.id, p]));

  const visiblePlatforms = activeFilter === 'all'
    ? PLATFORMS
    : PLATFORMS.filter(p => p.id === activeFilter);

  const sortedPlatforms = [...platforms].sort((a, b) => {
    const av = typeof a[sortBy] === 'number' ? a[sortBy] : 0;
    const bv = typeof b[sortBy] === 'number' ? b[sortBy] : 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortBy(col); setSortDir('desc'); }
  }

  const selConfig  = PLATFORMS.find(p => p.id === selectedPlatform);
  const selData    = platformMap[selectedPlatform] ?? {};
  const dropoff    = retention?.dropoff ?? [];
  const dropMax    = Math.max(...dropoff, 1);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-purple-500 shrink-0" />
          <h1 className="text-xl font-bold tracking-tight">Analytics Dashboard</h1>
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${liveMode ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-xs text-gray-500 font-medium">{liveMode ? 'LIVE' : 'PAUSED'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {lastUpdated && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button
            onClick={() => setLiveMode(l => !l)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
              ${liveMode
                ? 'bg-purple-900/40 border-purple-700 text-purple-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
          >
            <Radio className="w-3 h-3" /> {liveMode ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* ── Platform filter tabs ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
            ${activeFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          All Platforms
        </button>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveFilter(p.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
              ${activeFilter === p.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      {/* ── Aggregated stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total Reach',
            value: loading ? null : formatNum(aggregated?.totalReach),
            icon:  <Eye className="w-5 h-5 text-cyan-400" />,
            trend: aggregated?.reachTrend ?? null,
            sub:   'Across all platforms',
          },
          {
            label: 'Total Engagement',
            value: loading ? null : formatNum(aggregated?.totalEngagement),
            icon:  <Heart className="w-5 h-5 text-pink-400" />,
            trend: aggregated?.engagementTrend ?? null,
            sub:   'Likes, comments, shares',
          },
          {
            label: 'Top Platform',
            value: loading ? null : (aggregated?.topPlatform ?? '—'),
            icon:  <Zap className="w-5 h-5 text-yellow-400" />,
            trend: null,
            sub:   'Highest reach this week',
          },
          {
            label: 'Growth Rate',
            value: loading ? null : (aggregated?.growthRate != null ? `${aggregated.growthRate.toFixed(1)}%` : '—'),
            icon:  <TrendingUp className="w-5 h-5 text-purple-400" />,
            trend: aggregated?.growthRate ?? null,
            sub:   'Week over week',
          },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">{card.label}</span>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-white">
              {loading ? <span className="text-gray-700">—</span> : card.value}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{card.sub}</span>
              {card.trend !== null && <TrendBadge value={card.trend} />}
            </div>
          </div>
        ))}
      </div>

      {/* ── Platform grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {visiblePlatforms.map(cfg => {
          const data      = platformMap[cfg.id] ?? {};
          const sparkData = data.sparkline ?? Array.from({ length: 12 }, (_, i) => 30 + i * 5 + Math.random() * 20);
          const primary   = data.primaryMetric ?? data.views ?? data.viewers ?? data.members;

          return (
            <div
              key={cfg.id}
              onClick={() => setSelectedPlatform(cfg.id)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all
                hover:border-purple-600 hover:shadow-lg hover:shadow-purple-900/20
                ${selectedPlatform === cfg.id
                  ? 'border-purple-500 ring-1 ring-purple-500/30'
                  : 'border-gray-800'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{cfg.emoji}</span>
                  <span className="text-sm font-semibold truncate">{cfg.name}</span>
                </div>
                {data.engagementRate != null && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-900/40 border border-cyan-700/40 text-cyan-400 font-medium shrink-0 ml-1">
                    {data.engagementRate.toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="text-2xl font-bold mb-0.5">
                {loading ? <span className="text-gray-700">—</span> : formatNum(primary)}
              </div>
              <div className="text-xs text-gray-500 mb-3">{cfg.primaryLabel}</div>

              <div className="space-y-1.5 mb-1">
                {[
                  { label: 'Likes',    val: data.likes    },
                  { label: 'Comments', val: data.comments },
                  { label: 'Shares',   val: data.shares   },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="text-gray-300 font-medium tabular-nums">{formatNum(row.val)}</span>
                  </div>
                ))}
              </div>

              <Sparkline data={sparkData} />
            </div>
          );
        })}
      </div>

      {/* ── Bottom row: Retention + Table ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Retention panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold mb-4">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            Retention
            <span className="text-gray-500 font-normal">— {selConfig?.emoji} {selConfig?.name}</span>
          </h2>

          {retention ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-800/60 border border-gray-700/40 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Avg Watch Time</div>
                  <div className="text-xl font-bold text-cyan-400 tabular-nums">
                    {retention.avgWatchTime ?? '—'}
                    <span className="text-sm font-normal text-gray-500 ml-1">sec</span>
                  </div>
                </div>
                <div className="bg-gray-800/60 border border-gray-700/40 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Completion Rate</div>
                  <div className="text-xl font-bold text-purple-400 tabular-nums">
                    {retention.completionRate != null ? `${retention.completionRate.toFixed(1)}%` : '—'}
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Completion progress</span>
                  <span className="text-purple-400 font-medium">
                    {retention.completionRate?.toFixed(1) ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, retention.completionRate ?? 0)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-2">
                  Drop-off by content quarter
                </div>
                <div className="flex items-end gap-1 h-16">
                  {dropoff.map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full">
                      <div
                        className="rounded-sm bg-gradient-to-t from-red-600 to-orange-400 opacity-80"
                        style={{ height: `${Math.max(6, Math.round((v / dropMax) * 100))}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1 select-none">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm gap-2">
              <BarChart2 className="w-8 h-8 opacity-30" />
              {loading ? 'Loading retention data…' : 'No retention data available'}
            </div>
          )}
        </div>

        {/* Likes & Reach table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold mb-4">
            <Users className="w-4 h-4 text-cyan-400" />
            Likes &amp; Reach
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  {TABLE_COLS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left text-xs text-gray-400 font-medium pb-2.5 pr-3 cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} sortBy={sortBy} sortDir={sortDir} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlatforms.map(p => {
                  const cfg      = PLATFORMS.find(c => c.id === p.id);
                  const engRate  = p.engagementRate ?? 0;
                  const isActive = selectedPlatform === p.id;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`border-b border-gray-800/40 cursor-pointer transition-colors
                        hover:bg-gray-800/40 ${isActive ? 'bg-purple-900/20' : ''}`}
                    >
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-1.5">
                          <span className="text-base">{cfg?.emoji}</span>
                          <span className={`font-medium ${isActive ? 'text-purple-300' : 'text-gray-200'}`}>
                            {cfg?.name}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-300 tabular-nums">
                        {formatNum(p.likes)}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-300 tabular-nums">
                        {formatNum(p.reach)}
                      </td>
                      <td className="py-2.5">
                        <span className={`text-xs font-semibold tabular-nums
                          ${engRate >= 5 ? 'text-emerald-400'
                          : engRate >= 2 ? 'text-yellow-400'
                          : 'text-red-400'}`}
                        >
                          {p.engagementRate != null ? `${p.engagementRate.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {sortedPlatforms.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-600 text-xs">
                      {loading ? 'Loading…' : 'No platform data available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
