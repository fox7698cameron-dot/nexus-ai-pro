/**
 * AnalyticsDashboard.jsx
 * Real-time social media analytics: TikTok, Instagram, Facebook, Twitch,
 * Discord, Lemon8, Reddit, RedGIFs — views, likes, reach, retention.
 * Updated: 2026-10-10
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Platform configuration ────────────────────────────────────────────────────
const PLATFORMS = {
  tiktok:    { name: 'TikTok',     color: '#010101', accent: '#FE2C55', icon: '🎵', bg: 'from-gray-900 to-pink-900' },
  instagram: { name: 'Instagram',  color: '#E1306C', accent: '#F77737', icon: '📸', bg: 'from-purple-600 to-orange-400' },
  facebook:  { name: 'Facebook',   color: '#1877F2', accent: '#42B72A', icon: '📘', bg: 'from-blue-700 to-blue-500' },
  twitch:    { name: 'Twitch',     color: '#9146FF', accent: '#F0F0FF', icon: '🎮', bg: 'from-purple-700 to-purple-500' },
  discord:   { name: 'Discord',    color: '#5865F2', accent: '#57F287', icon: '💬', bg: 'from-indigo-600 to-indigo-400' },
  lemon8:    { name: 'Lemon8',     color: '#FFD100', accent: '#FF6B35', icon: '🍋', bg: 'from-yellow-400 to-orange-400' },
  reddit:    { name: 'Reddit',     color: '#FF4500', accent: '#FF6314', icon: '🤖', bg: 'from-orange-700 to-red-600' },
  redgifs:   { name: 'RedGIFs',    color: '#FF0000', accent: '#CC0000', icon: '🎬', bg: 'from-red-700 to-red-500' },
};

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, delta, unit = '', color = 'blue', icon }) {
  const deltaColor = delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400';
  const deltaArrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  return (
    <div className={`rounded-xl p-4 bg-gray-800 border border-gray-700 flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{icon} {label}</span>
        <span className={`text-xs font-semibold ${deltaColor}`}>{deltaArrow} {Math.abs(delta).toFixed(1)}%</span>
      </div>
      <div className="text-2xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}{unit}
      </div>
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#60a5fa', height = 48 }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 200;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Retention bar ─────────────────────────────────────────────────────────────
function RetentionBar({ label, pct, color }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 text-gray-400 text-xs truncate">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-gray-300 text-xs">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ── Generate realistic mock metrics (replace with real API calls) ──────────────
function generateMetrics(platform) {
  const base = {
    tiktok:    { views: 1_240_000, likes: 89_000, reach: 2_100_000, followers: 540_000 },
    instagram: { views: 640_000,   likes: 52_000, reach: 980_000,   followers: 312_000 },
    facebook:  { views: 410_000,   likes: 31_000, reach: 760_000,   followers: 890_000 },
    twitch:    { views: 28_000,    likes: 4_200,  reach: 55_000,    followers: 18_700  },
    discord:   { views: 0,         likes: 2_800,  reach: 19_000,    followers: 42_000  },
    lemon8:    { views: 95_000,    likes: 7_600,  reach: 142_000,   followers: 22_000  },
    reddit:    { views: 320_000,   likes: 18_000, reach: 490_000,   followers: 67_000  },
    redgifs:   { views: 780_000,   likes: 44_000, reach: 1_100_000, followers: 98_000  },
  }[platform] || { views: 0, likes: 0, reach: 0, followers: 0 };

  const jitter = () => (Math.random() - 0.48) * 4;
  return {
    ...base,
    views:     Math.round(base.views * (1 + jitter() / 100)),
    likes:     Math.round(base.likes * (1 + jitter() / 100)),
    reach:     Math.round(base.reach * (1 + jitter() / 100)),
    followers: Math.round(base.followers * (1 + jitter() / 100)),
    engagement: (base.likes / (base.views || 1) * 100).toFixed(2),
    retention:  (55 + Math.random() * 30).toFixed(1),
    deltaViews: jitter(),
    deltaLikes: jitter(),
    deltaReach: jitter(),
    retentionData: [
      { label: '0–5s',   pct: 100 },
      { label: '5–15s',  pct: 78 + Math.random() * 10 },
      { label: '15–30s', pct: 58 + Math.random() * 12 },
      { label: '30–60s', pct: 42 + Math.random() * 14 },
      { label: '60s+',   pct: 28 + Math.random() * 16 },
    ],
    history: Array.from({ length: 24 }, (_, i) => Math.round(base.views * (0.7 + Math.random() * 0.6) / 24)),
    topContent: [
      { title: 'Trending Post #1', views: Math.round(base.views * 0.22), likes: Math.round(base.likes * 0.18) },
      { title: 'Viral Clip #2',    views: Math.round(base.views * 0.18), likes: Math.round(base.likes * 0.15) },
      { title: 'Story Highlight',  views: Math.round(base.views * 0.12), likes: Math.round(base.likes * 0.10) },
    ],
  };
}

// ── Platform tile ─────────────────────────────────────────────────────────────
function PlatformTile({ id, platform, metrics, selected, onSelect }) {
  const connected = Boolean(metrics);
  return (
    <button
      onClick={() => onSelect(id)}
      className={`rounded-xl p-3 border transition-all text-left ${
        selected
          ? `border-white bg-gradient-to-br ${platform.bg} text-white shadow-lg scale-105`
          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xl">{platform.icon}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${connected ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
          {connected ? '● Live' : '○ Demo'}
        </span>
      </div>
      <div className="font-semibold text-sm">{platform.name}</div>
      {metrics && (
        <div className="text-xs mt-1 opacity-75">{(metrics.views / 1000).toFixed(0)}K views</div>
      )}
    </button>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ socket }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [metrics, setMetrics]               = useState({});
  const [liveUpdates, setLiveUpdates]       = useState(true);
  const [dateRange, setDateRange]           = useState('7d');
  const [lastUpdated, setLastUpdated]       = useState(new Date());
  const intervalRef = useRef(null);

  const refreshMetrics = useCallback(() => {
    const updated = {};
    Object.keys(PLATFORMS).forEach(id => { updated[id] = generateMetrics(id); });
    setMetrics(updated);
    setLastUpdated(new Date());
  }, []);

  // Initial load + live polling
  useEffect(() => {
    refreshMetrics();
    if (liveUpdates) {
      intervalRef.current = setInterval(refreshMetrics, 30_000);
    }
    return () => clearInterval(intervalRef.current);
  }, [liveUpdates, refreshMetrics]);

  // Socket.io real-time events (server pushes)
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setMetrics(prev => ({
        ...prev,
        [data.platform]: { ...prev[data.platform], ...data.metrics },
      }));
      setLastUpdated(new Date());
    };
    socket.on('analytics:update', handler);
    return () => socket.off('analytics:update', handler);
  }, [socket]);

  const current = metrics[activePlatform];
  const p       = PLATFORMS[activePlatform];

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">Social Analytics</h2>
          <p className="text-xs text-gray-400">Real-time metrics across all platforms</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range */}
          {['24h','7d','30d','90d'].map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                dateRange === r
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {r}
            </button>
          ))}
          {/* Live toggle */}
          <button
            onClick={() => setLiveUpdates(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              liveUpdates ? 'bg-green-600/20 border-green-500 text-green-400' : 'border-gray-700 text-gray-400'
            }`}
          >
            {liveUpdates ? '⚡ Live' : '⏸ Paused'}
          </button>
          <button
            onClick={refreshMetrics}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Last updated: {lastUpdated.toLocaleTimeString()} · Demo data — connect API keys in Settings
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {Object.entries(PLATFORMS).map(([id, platform]) => (
          <PlatformTile
            key={id}
            id={id}
            platform={platform}
            metrics={metrics[id]}
            selected={activePlatform === id}
            onSelect={setActivePlatform}
          />
        ))}
      </div>

      {/* Main metrics */}
      {current && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Views"       value={current.views}     delta={current.deltaViews} icon="👁️"  />
            <MetricCard label="Likes"       value={current.likes}     delta={current.deltaLikes} icon="❤️"  />
            <MetricCard label="Reach"       value={current.reach}     delta={current.deltaReach} icon="📡"  />
            <MetricCard label="Engagement"  value={current.engagement} delta={0}  unit="%" icon="💡"  />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sparkline */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-200">
                  {p.icon} {p.name} — Hourly Views (24h)
                </span>
                <span className="text-xs text-gray-500">{current.views.toLocaleString()} total</span>
              </div>
              <Sparkline data={current.history} color={p.accent} />
            </div>

            {/* Retention */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-sm font-semibold text-gray-200 mb-3">⏱ Audience Retention</div>
              <div className="flex flex-col gap-2">
                {current.retentionData.map(r => (
                  <RetentionBar key={r.label} label={r.label} pct={r.pct} color={p.accent} />
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-400">
                Avg. retention: <span className="text-white font-semibold">{current.retention}%</span>
              </div>
            </div>
          </div>

          {/* Top content table */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-sm font-semibold text-gray-200 mb-3">🏆 Top Content</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-700">
                    <th className="text-left py-2 pr-4">Title</th>
                    <th className="text-right py-2 pr-4">Views</th>
                    <th className="text-right py-2">Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {current.topContent.map((c, i) => (
                    <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="py-2 pr-4 text-gray-300">{c.title}</td>
                      <td className="py-2 pr-4 text-right text-blue-400">{c.views.toLocaleString()}</td>
                      <td className="py-2 text-right text-pink-400">{c.likes.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* All-platforms summary */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-sm font-semibold text-gray-200 mb-3">📊 Cross-Platform Summary</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-700">
                    <th className="text-left py-2 pr-4">Platform</th>
                    <th className="text-right py-2 pr-4">Views</th>
                    <th className="text-right py-2 pr-4">Likes</th>
                    <th className="text-right py-2 pr-4">Reach</th>
                    <th className="text-right py-2">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PLATFORMS).map(([id, plat]) => {
                    const m = metrics[id];
                    if (!m) return null;
                    return (
                      <tr
                        key={id}
                        onClick={() => setActivePlatform(id)}
                        className={`border-b border-gray-700/50 cursor-pointer transition-colors ${
                          id === activePlatform ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'
                        }`}
                      >
                        <td className="py-2 pr-4 font-medium text-gray-200">{plat.icon} {plat.name}</td>
                        <td className="py-2 pr-4 text-right text-gray-300">{(m.views/1000).toFixed(0)}K</td>
                        <td className="py-2 pr-4 text-right text-pink-400">{(m.likes/1000).toFixed(0)}K</td>
                        <td className="py-2 pr-4 text-right text-blue-400">{(m.reach/1000).toFixed(0)}K</td>
                        <td className="py-2 text-right text-green-400">{m.engagement}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* API connect banner */}
      <div className="rounded-xl border border-dashed border-blue-700/50 bg-blue-900/10 p-4 text-sm text-blue-300">
        <strong>Connect real APIs:</strong> Add platform OAuth tokens in <code className="bg-blue-950 px-1 rounded text-xs">.env</code> under{' '}
        <code className="bg-blue-950 px-1 rounded text-xs">TIKTOK_CLIENT_KEY</code>,{' '}
        <code className="bg-blue-950 px-1 rounded text-xs">INSTAGRAM_ACCESS_TOKEN</code>, etc.
        The server analytics endpoint (<code className="bg-blue-950 px-1 rounded text-xs">GET /api/analytics/:platform</code>) will then proxy live data.
      </div>
    </div>
  );
}
