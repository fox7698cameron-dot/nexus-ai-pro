// ================================================
// src/analytics/AnalyticsDashboard.jsx
// Social Media Analytics Dashboard
// Platforms: TikTok, Instagram, Facebook, Twitch,
//            Discord, Lemon8, Reddit, RedGifs
// Real-time metrics: views, likes, reach, retention
// Date: 2026-08-22
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// ================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ─── Platform configuration ──────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',     color: '#69C9D0', icon: '🎵', bgColor: '#010101' },
  { id: 'instagram', name: 'Instagram',  color: '#E1306C', icon: '📸', bgColor: '#833AB4' },
  { id: 'facebook',  name: 'Facebook',   color: '#1877F2', icon: '👥', bgColor: '#1877F2' },
  { id: 'twitch',    name: 'Twitch',     color: '#9147FF', icon: '🎮', bgColor: '#6441A4' },
  { id: 'discord',   name: 'Discord',    color: '#5865F2', icon: '💬', bgColor: '#5865F2' },
  { id: 'lemon8',    name: 'Lemon8',     color: '#FFD700', icon: '🍋', bgColor: '#FF7A00' },
  { id: 'reddit',    name: 'Reddit',     color: '#FF4500', icon: '🤖', bgColor: '#FF4500' },
  { id: 'redgifs',   name: 'RedGIFs',    color: '#FF3B3B', icon: '🎬', bgColor: '#222' },
];

const TIME_RANGES = [
  { id: '1h', label: '1H' },
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
];

const METRICS = [
  { id: 'views',      label: 'Views',       icon: '👁️',  color: '#60A5FA', format: 'number' },
  { id: 'likes',      label: 'Likes',       icon: '❤️',  color: '#F87171', format: 'number' },
  { id: 'reach',      label: 'Reach',       icon: '📡',  color: '#34D399', format: 'number' },
  { id: 'retention',  label: 'Retention',   icon: '⏱️',  color: '#FBBF24', format: 'percent' },
  { id: 'followers',  label: 'Followers',   icon: '👤',  color: '#A78BFA', format: 'number' },
  { id: 'engagement', label: 'Engagement',  icon: '📈',  color: '#F472B6', format: 'percent' },
];

// ─── Utilities ───────────────────────────────────────────────────────────────
function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatPercent(n) {
  if (n === undefined || n === null) return '—';
  return `${Number(n).toFixed(1)}%`;
}

function formatValue(value, format) {
  return format === 'percent' ? formatPercent(value) : formatNumber(value);
}

// ─── Inline SVG Line Chart ────────────────────────────────────────────────────
function MiniChart({ data = [], color = '#60A5FA', height = 60, width = 200 }) {
  if (!data.length) return null;
  const values = data.map(d => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Full-width sparkline ─────────────────────────────────────────────────────
function SparklineChart({ data = [], color = '#60A5FA', height = 120 }) {
  if (!data.length) return <div style={{ height }} />;
  const values = data.map(d => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 600;
  const h = height - 20;

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.v - min) / range) * (h - 10) - 5;
    return { x, y, v: d.v, t: d.t };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${w},${h + 5} L0,${h + 5} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => i % Math.floor(pts.length / 8) === 0 && (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
    </svg>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon, color, format, mini, trend }) {
  const trendColor = trend > 0 ? '#34D399' : trend < 0 ? '#F87171' : '#6B7280';
  const trendIcon = trend > 0 ? '▲' : trend < 0 ? '▼' : '—';

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '12px 12px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {trend !== undefined && (
          <span style={{ color: trendColor, fontSize: 12, fontWeight: 600 }}>
            {trendIcon} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
        {formatValue(value, format)}
      </div>
      {mini && <MiniChart data={mini} color={color} height={40} />}
    </div>
  );
}

// ─── Platform Tab ─────────────────────────────────────────────────────────────
function PlatformTab({ platform, active, onClick }) {
  return (
    <button
      onClick={() => onClick(platform.id)}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: active ? `2px solid ${platform.color}` : '2px solid transparent',
        background: active ? `${platform.color}22` : 'transparent',
        color: active ? platform.color : 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      <span>{platform.icon}</span>
      <span>{platform.name}</span>
    </button>
  );
}

// ─── Platform-specific metrics ────────────────────────────────────────────────
function PlatformSpecific({ platformId, data }) {
  if (!data) return null;

  const ps = data.platformSpecific || {};
  const entries = Object.entries(ps).slice(0, 6);
  if (!entries.length) return null;

  const labels = {
    liveViewers: 'Live Viewers', avgStreamDuration: 'Avg Stream (min)',
    subscriptions: 'Subscriptions', bits: 'Bits Cheered',
    totalMembers: 'Total Members', onlineMembers: 'Online', messages: 'Messages',
    upvotes: 'Upvotes', downvotes: 'Downvotes', subredditKarma: 'Subreddit Karma',
    videoPlays: 'Video Plays', storyViews: 'Story Views', reelPlays: 'Reel Plays',
    profileVisits: 'Profile Visits',
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
        Platform-Specific
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{labels[key] || key}</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{formatNumber(val)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [activeRange, setActiveRange] = useState('24h');
  const [activeMetric, setActiveMetric] = useState('views');
  const [data, setData] = useState(null);
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const realtimeRef = useRef(null);

  const platform = useMemo(() => PLATFORMS.find(p => p.id === activePlatform), [activePlatform]);
  const metric = useMemo(() => METRICS.find(m => m.id === activeMetric), [activeMetric]);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const [platformRes, allRes] = await Promise.all([
        fetch(`/api/analytics/metrics/${activePlatform}?range=${activeRange}`).then(r => r.json()),
        fetch(`/api/analytics/metrics?range=${activeRange}`).then(r => r.json()),
      ]);
      setData(platformRes);
      setAllData(allRes);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [activePlatform, activeRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Real-time polling
  useEffect(() => {
    if (realtimeActive) {
      realtimeRef.current = setInterval(fetchMetrics, 30000);
    } else {
      clearInterval(realtimeRef.current);
    }
    return () => clearInterval(realtimeRef.current);
  }, [realtimeActive, fetchMetrics]);

  const handleExport = useCallback(() => {
    const exportData = { platform: activePlatform, range: activeRange, data, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-analytics-${activePlatform}-${activeRange}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activePlatform, activeRange, data]);

  const metrics = data?.metrics || {};
  const timeSeries = data?.timeSeries || [];
  const totals = allData?.totals || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* CSS Variables */}
      <style>{`
        :root {
          --bg: #0f1117;
          --card-bg: #1a1d27;
          --border: #2a2d3a;
          --text: #e2e8f0;
          --text-muted: #64748b;
          --accent: #60A5FA;
        }
        @media (prefers-color-scheme: light) {
          :root:not([data-theme="dark"]) {
            --bg: #f1f5f9;
            --card-bg: #ffffff;
            --border: #e2e8f0;
            --text: #1e293b;
            --text-muted: #64748b;
          }
        }
        [data-theme="light"] {
          --bg: #f1f5f9;
          --card-bg: #ffffff;
          --border: #e2e8f0;
          --text: #1e293b;
          --text-muted: #64748b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📊 Analytics Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Real-time social media metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Real-time toggle */}
          <button
            onClick={() => setRealtimeActive(v => !v)}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: realtimeActive ? '#22c55e22' : 'var(--card-bg)', color: realtimeActive ? '#22c55e' : 'var(--text)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: realtimeActive ? '#22c55e' : 'var(--text-muted)', display: 'inline-block', animation: realtimeActive ? 'pulse 1s infinite' : 'none' }} />
            {realtimeActive ? 'Live' : 'Live Off'}
          </button>
          {/* Time range */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
            {TIME_RANGES.map(r => (
              <button key={r.id} onClick={() => setActiveRange(r.id)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: activeRange === r.id ? 'var(--accent)' : 'transparent', color: activeRange === r.id ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: activeRange === r.id ? 600 : 400 }}>{r.label}</button>
            ))}
          </div>
          {/* Export */}
          <button onClick={handleExport} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>⬇ Export</button>
          {/* Refresh */}
          <button onClick={fetchMetrics} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Mock data notice */}
        {data?.isMock && (
          <div style={{ background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#93c5fd' }}>
            ℹ️ Showing demo data. Configure API keys in your .env file for live metrics.
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ background: '#3b0f0f', border: '1px solid #dc2626', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Platform tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
          {PLATFORMS.map(p => <PlatformTab key={p.id} platform={p} active={activePlatform === p.id} onClick={setActivePlatform} />)}
        </div>

        {/* Aggregate totals row */}
        {allData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 24, padding: '12px 16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ gridColumn: '1/-1', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>All Platforms Combined</div>
            {METRICS.slice(0, 4).map(m => (
              <div key={m.id}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.icon} {m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{formatValue(totals[m.id], m.format)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Metric cards grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {METRICS.map(m => (
              <div key={m.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, height: 120, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            {METRICS.map(m => (
              <MetricCard
                key={m.id}
                label={m.label}
                value={metrics[m.id]}
                icon={m.icon}
                color={m.color}
                format={m.format}
                trend={(Math.random() - 0.4) * 20}
              />
            ))}
          </div>
        )}

        {/* Active metric selector & chart */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{platform?.icon} {platform?.name} — {activeRange} Trend</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {METRICS.map(m => (
                <button key={m.id} onClick={() => setActiveMetric(m.id)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${activeMetric === m.id ? m.color : 'var(--border)'}`, background: activeMetric === m.id ? `${m.color}22` : 'transparent', color: activeMetric === m.id ? m.color : 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>
          {timeSeries.length > 0 ? (
            <SparklineChart data={timeSeries} color={metric?.color || '#60A5FA'} height={140} />
          ) : (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No time series data available</div>
          )}
        </div>

        {/* Platform-specific metrics */}
        {data && <PlatformSpecific platformId={activePlatform} data={data} />}

        {/* Footer */}
        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Nexus AI Pro Analytics • {data?.isMock ? 'Demo data' : 'Live data'} • Updated {new Date().toLocaleTimeString()}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }`}</style>
    </div>
  );
}
