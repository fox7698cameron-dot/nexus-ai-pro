/**
 * src/dashboards/AnalyticsDashboard.jsx
 * Nexus AI Pro — Social Media Analytics Dashboard
 * Real-time metrics: TikTok, Instagram, Facebook, Twitch, Discord,
 *                    Lemon8, Reddit, RedGifs
 * Date: 2026-08-28
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Colour palette per platform ────────────────────────────────────────────
const PLATFORM_CONFIG = {
  tiktok:    { name: 'TikTok',    color: '#010101', accent: '#FE2C55', icon: '🎵', bg: 'bg-black'   },
  instagram: { name: 'Instagram', color: '#E1306C', accent: '#833AB4', icon: '📸', bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  facebook:  { name: 'Facebook',  color: '#1877F2', accent: '#0D5FBF', icon: '👥', bg: 'bg-blue-600' },
  twitch:    { name: 'Twitch',    color: '#9146FF', accent: '#772CE8', icon: '🎮', bg: 'bg-purple-600' },
  discord:   { name: 'Discord',   color: '#5865F2', accent: '#4752C4', icon: '🤖', bg: 'bg-indigo-500' },
  lemon8:    { name: 'Lemon8',    color: '#FFD700', accent: '#FFA500', icon: '🍋', bg: 'bg-yellow-400' },
  reddit:    { name: 'Reddit',    color: '#FF4500', accent: '#CC3600', icon: '🦊', bg: 'bg-orange-500' },
  redgifs:   { name: 'RedGifs',   color: '#FF6B6B', accent: '#FF3333', icon: '🎬', bg: 'bg-red-500'   },
};

// ── Metric card ────────────────────────────────────────────────────────────
function MetricCard({ label, value, delta, icon, format = 'number' }) {
  const formatted = format === 'percent'
    ? `${value?.toFixed(1) ?? '—'}%`
    : format === 'duration'
    ? value ? `${Math.floor(value / 60)}m ${value % 60}s` : '—'
    : value != null ? Number(value).toLocaleString() : '—';

  const positive = delta >= 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">{icon} {label}</span>
        {delta != null && (
          <span className={`text-xs font-semibold ${positive ? 'text-green-500' : 'text-red-500'}`}>
            {positive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatted}</p>
    </div>
  );
}

// ── Sparkline (pure SVG, no lib dependency) ────────────────────────────────
function Sparkline({ data = [], color = '#6366f1', height = 40 }) {
  if (!data.length) return null;
  const max  = Math.max(...data, 1);
  const min  = Math.min(...data, 0);
  const range = max - min || 1;
  const w    = 120;
  const step = w / (data.length - 1 || 1);
  const pts  = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={w} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
}

// ── Platform card ──────────────────────────────────────────────────────────
function PlatformCard({ platform, data, loading, onRefresh }) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`${cfg.bg} text-white p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cfg.icon}</span>
          <span className="font-bold text-lg">{cfg.name}</span>
          {data?.live && (
            <span className="flex items-center gap-1 bg-red-500 rounded-full px-2 py-0.5 text-xs font-bold">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-white/80 hover:text-white transition text-sm"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {/* Metrics */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {loading ? (
          <div className="col-span-2 text-center text-gray-400 py-4">Loading…</div>
        ) : data ? (
          <>
            {data.followers     != null && <MetricCard label="Followers"      value={data.followers}    delta={data.followersDelta}  icon="👤" />}
            {data.views         != null && <MetricCard label="Views"          value={data.views}        delta={data.viewsDelta}      icon="👁️"  />}
            {data.likes         != null && <MetricCard label="Likes"          value={data.likes}        delta={data.likesDelta}      icon="❤️"  />}
            {data.reach         != null && <MetricCard label="Reach"          value={data.reach}        delta={data.reachDelta}      icon="📡" />}
            {data.impressions   != null && <MetricCard label="Impressions"    value={data.impressions}  delta={data.impressionsDelta} icon="👁️" />}
            {data.engagement    != null && <MetricCard label="Engagement Rate" value={data.engagement}   delta={data.engagementDelta} icon="💬" format="percent" />}
            {data.subscribers   != null && <MetricCard label="Subscribers"    value={data.subscribers}  icon="⭐" />}
            {data.watchTime     != null && <MetricCard label="Watch Time"     value={data.watchTime}    icon="⏱️" format="duration" />}
            {data.members       != null && <MetricCard label="Members"        value={data.members}      icon="👥" />}
            {data.online        != null && <MetricCard label="Online Now"     value={data.online}       icon="🟢" />}
            {data.posts         != null && <MetricCard label="Posts"          value={data.posts}        icon="📝" />}
            {data.upvotes       != null && <MetricCard label="Upvotes"        value={data.upvotes}      icon="⬆️"  />}
          </>
        ) : (
          <div className="col-span-2 text-center text-gray-400 py-4">
            Not connected. Configure API key in settings.
          </div>
        )}
      </div>

      {/* Trend sparkline */}
      {data?.trend?.length > 1 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 mb-1">7-day trend</p>
          <Sparkline data={data.trend} color={cfg.accent} />
        </div>
      )}
    </div>
  );
}

// ── Retention & watch time visualizer ─────────────────────────────────────
function RetentionGraph({ data = [] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">📈 Audience Retention</h3>
      <div className="flex items-end gap-0.5 h-24">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 bg-indigo-400 rounded-t opacity-80 hover:opacity-100 transition"
            style={{ height: `${(v / max) * 100}%` }}
            title={`${Math.round((i / data.length) * 100)}%: ${v.toFixed(1)}% retained`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>
  );
}

// ── Main Analytics Dashboard ───────────────────────────────────────────────
export default function AnalyticsDashboard({ userId, socket }) {
  const [metrics, setMetrics]   = useState({});
  const [loading, setLoading]   = useState({});
  const [dateRange, setDateRange] = useState('7d');
  const [tab, setTab]           = useState('overview');
  const [retention, setRetention] = useState([]);

  const platforms = Object.keys(PLATFORM_CONFIG);

  // Fetch metrics from API
  const fetchMetrics = useCallback(async (platform) => {
    setLoading(prev => ({ ...prev, [platform]: true }));
    try {
      const res = await fetch(`/api/analytics/${platform}?range=${dateRange}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMetrics(prev => ({ ...prev, [platform]: data }));
    } catch {
      setMetrics(prev => ({ ...prev, [platform]: null }));
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  }, [dateRange]);

  // Fetch all platforms
  const fetchAll = useCallback(() => {
    platforms.forEach(p => fetchMetrics(p));
    // Fetch retention data
    fetch(`/api/analytics/retention?range=${dateRange}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
    })
      .then(r => r.json())
      .then(d => setRetention(d.points || []))
      .catch(() => {});
  }, [fetchMetrics, dateRange, platforms]);

  // Initial load + real-time socket updates
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000); // refresh every minute

    if (socket) {
      socket.on('analytics:update', ({ platform, data }) => {
        setMetrics(prev => ({ ...prev, [platform]: data }));
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.off('analytics:update');
    };
  }, [fetchAll, socket]);

  // Summary totals
  const totals = platforms.reduce((acc, p) => {
    const d = metrics[p];
    if (!d) return acc;
    acc.followers   += d.followers   || 0;
    acc.views       += d.views       || 0;
    acc.likes       += d.likes       || 0;
    acc.reach       += d.reach       || 0;
    return acc;
  }, { followers: 0, views: 0, likes: 0, reach: 0 });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time social media metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {['1d', '7d', '30d', '90d'].map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                dateRange === r
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Overview totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Followers" value={totals.followers} icon="👤" />
        <MetricCard label="Total Views"     value={totals.views}     icon="👁️"  />
        <MetricCard label="Total Likes"     value={totals.likes}     icon="❤️"  />
        <MetricCard label="Total Reach"     value={totals.reach}     icon="📡" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 overflow-x-auto">
          {[['overview','🌐 All Platforms'], ['tiktok','🎵 TikTok'], ['instagram','📸 Instagram'],
            ['facebook','👥 Facebook'], ['twitch','🎮 Twitch'], ['discord','🤖 Discord'],
            ['lemon8','🍋 Lemon8'], ['reddit','🦊 Reddit'], ['redgifs','🎬 RedGifs'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`whitespace-nowrap pb-2 border-b-2 text-sm font-medium transition ${
                tab === id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Platform cards */}
      <div className={`grid gap-4 ${tab === 'overview' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 max-w-2xl'}`}>
        {(tab === 'overview' ? platforms : [tab]).map(p => (
          <PlatformCard
            key={p}
            platform={p}
            data={metrics[p]}
            loading={loading[p]}
            onRefresh={() => fetchMetrics(p)}
          />
        ))}
      </div>

      {/* Retention graph */}
      {retention.length > 0 && (
        <RetentionGraph data={retention} />
      )}

      {/* View & Retention tracking table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">📋 Platform Comparison</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="text-left p-3 text-gray-600 dark:text-gray-300">Platform</th>
              <th className="text-right p-3 text-gray-600 dark:text-gray-300">Followers</th>
              <th className="text-right p-3 text-gray-600 dark:text-gray-300">Views</th>
              <th className="text-right p-3 text-gray-600 dark:text-gray-300">Likes</th>
              <th className="text-right p-3 text-gray-600 dark:text-gray-300">Engagement</th>
              <th className="text-right p-3 text-gray-600 dark:text-gray-300">Reach</th>
              <th className="text-right p-3 text-gray-600 dark:text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map(p => {
              const cfg = PLATFORM_CONFIG[p];
              const d   = metrics[p];
              return (
                <tr key={p} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="p-3 font-medium text-gray-900 dark:text-white">
                    {cfg.icon} {cfg.name}
                  </td>
                  <td className="p-3 text-right text-gray-600 dark:text-gray-300">{d?.followers != null ? d.followers.toLocaleString() : '—'}</td>
                  <td className="p-3 text-right text-gray-600 dark:text-gray-300">{d?.views != null ? d.views.toLocaleString() : '—'}</td>
                  <td className="p-3 text-right text-gray-600 dark:text-gray-300">{d?.likes != null ? d.likes.toLocaleString() : '—'}</td>
                  <td className="p-3 text-right text-gray-600 dark:text-gray-300">{d?.engagement != null ? `${d.engagement.toFixed(1)}%` : '—'}</td>
                  <td className="p-3 text-right text-gray-600 dark:text-gray-300">{d?.reach != null ? d.reach.toLocaleString() : '—'}</td>
                  <td className="p-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      loading[p] ? 'bg-yellow-100 text-yellow-700' :
                      d ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {loading[p] ? '⏳ Loading' : d ? '✅ Connected' : '⚫ Disconnected'}
                    </span>
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
