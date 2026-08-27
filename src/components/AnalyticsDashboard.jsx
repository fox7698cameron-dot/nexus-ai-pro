/**
 * AnalyticsDashboard.jsx
 * Nexus AI Pro — Social & Creator Analytics Dashboard
 * Date: 2026-08-27
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
 * Real-time metrics: views, likes, reach, retention, engagement rate
 * Multi-platform, multi-OS: Linux, Windows, macOS, iOS, Android, Electron
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Types / constants ──────────────────────────────────────────────────────────
const PLATFORMS = {
  tiktok:    { label: 'TikTok',    color: '#010101', accent: '#fe2c55', emoji: '🎵' },
  instagram: { label: 'Instagram', color: '#833ab4', accent: '#fd1d1d', emoji: '📸' },
  facebook:  { label: 'Facebook',  color: '#1877f2', accent: '#1877f2', emoji: '👤' },
  twitch:    { label: 'Twitch',    color: '#9146ff', accent: '#9146ff', emoji: '🎮' },
  discord:   { label: 'Discord',   color: '#5865f2', accent: '#5865f2', emoji: '💬' },
  lemon8:    { label: 'Lemon8',    color: '#fec700', accent: '#ff6b35', emoji: '🍋' },
  reddit:    { label: 'Reddit',    color: '#ff4500', accent: '#ff4500', emoji: '🤖' },
  redgifs:   { label: 'RedGIFs',   color: '#ff1a1a', accent: '#cc0000', emoji: '🎬' },
};

const METRIC_KEYS = ['views', 'likes', 'reach', 'retention', 'shares', 'comments', 'followers'];

const TIME_RANGES = [
  { key: '1h',  label: 'Last Hour' },
  { key: '24h', label: '24 Hours'  },
  { key: '7d',  label: '7 Days'   },
  { key: '30d', label: '30 Days'  },
  { key: '90d', label: '90 Days'  },
];

// ── Utility helpers (flat, no nesting > 2) ────────────────────────────────────
function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatPercent(n) {
  return `${n.toFixed(1)}%`;
}

function trend(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function trendLabel(pct) {
  if (pct > 0) return `▲ ${pct.toFixed(1)}%`;
  if (pct < 0) return `▼ ${Math.abs(pct).toFixed(1)}%`;
  return '─ 0%';
}

function trendColor(pct) {
  if (pct > 0) return '#22c55e';
  if (pct < 0) return '#ef4444';
  return '#94a3b8';
}

// ── Mock data generator (replace with real API calls) ─────────────────────────
function buildMockPlatformData(platformKey) {
  const base = {
    tiktok:    { views: 2_450_000, likes: 189_000, reach: 1_900_000, retention: 62.4, shares: 45_000, comments: 12_300, followers: 340_000 },
    instagram: { views: 980_000,   likes: 87_500,  reach: 750_000,  retention: 54.1, shares: 18_200, comments: 9_100,  followers: 215_000 },
    facebook:  { views: 620_000,   likes: 43_000,  reach: 490_000,  retention: 38.7, shares: 22_100, comments: 7_800,  followers: 98_000  },
    twitch:    { views: 310_000,   likes: 28_000,  reach: 280_000,  retention: 71.2, shares: 5_400,  comments: 34_500, followers: 62_000  },
    discord:   { views: 0,         likes: 12_100,  reach: 45_000,   retention: 0,    shares: 3_200,  comments: 67_800, followers: 28_900  },
    lemon8:    { views: 145_000,   likes: 21_000,  reach: 130_000,  retention: 48.3, shares: 8_700,  comments: 4_200,  followers: 18_500  },
    reddit:    { views: 880_000,   likes: 54_000,  reach: 820_000,  retention: 0,    shares: 31_000, comments: 15_600, followers: 42_000  },
    redgifs:   { views: 1_200_000, likes: 98_000,  reach: 1_100_000, retention: 44.8, shares: 27_000, comments: 6_900, followers: 55_000  },
  };
  const prev = { ...base[platformKey] };
  const current = Object.fromEntries(
    Object.entries(prev).map(([k, v]) => [k, Math.round(v * (0.85 + Math.random() * 0.3))])
  );
  return { current, previous: prev };
}

function buildChartPoints(count = 24) {
  let val = 1000 + Math.random() * 5000;
  return Array.from({ length: count }, (_, i) => {
    val = Math.max(100, val + (Math.random() - 0.45) * val * 0.2);
    return { x: i, y: Math.round(val) };
  });
}

// ── Mini SVG Sparkline ────────────────────────────────────────────────────────
function Sparkline({ points, color = '#6366f1', width = 120, height = 36 }) {
  if (!points || points.length < 2) return null;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scaleX = w => ((w - minX) / (maxX - minX || 1)) * width;
  const scaleY = h => height - ((h - minY) / (maxY - minY || 1)) * height;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.x).toFixed(1)},${scaleY(p.y).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={points.map(p => `${scaleX(p.x)},${scaleY(p.y)}`).join(' ')}
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, current, previous, format = 'number', color, chartData }) {
  const pct = trend(current, previous);
  const display = format === 'percent' ? formatPercent(current) : formatNumber(current);
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color }}>{display}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 12, color: trendColor(pct), fontWeight: 600 }}>{trendLabel(pct)}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>vs prev</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <Sparkline points={chartData} color={color} />
      </div>
    </div>
  );
}

// ── Platform Panel ────────────────────────────────────────────────────────────
function PlatformPanel({ platformKey, data, chartCache }) {
  const meta = PLATFORMS[platformKey];
  const { current, previous } = data;
  const engagementRate = current.views
    ? ((current.likes + current.comments + current.shares) / current.views) * 100
    : 0;

  const metricList = [
    { key: 'views',     label: 'Views',        format: 'number'  },
    { key: 'likes',     label: 'Likes',        format: 'number'  },
    { key: 'reach',     label: 'Reach',        format: 'number'  },
    { key: 'retention', label: 'Retention',    format: 'percent' },
    { key: 'shares',    label: 'Shares',       format: 'number'  },
    { key: 'comments',  label: 'Comments',     format: 'number'  },
    { key: 'followers', label: 'Followers',    format: 'number'  },
  ];

  return (
    <div style={styles.platformPanel}>
      <div style={{ ...styles.platformHeader, background: `linear-gradient(135deg, ${meta.color}22, ${meta.accent}11)` }}>
        <span style={{ fontSize: 28 }}>{meta.emoji}</span>
        <div>
          <div style={{ ...styles.platformName, color: meta.accent }}>{meta.label}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Engagement: <strong style={{ color: '#e2e8f0' }}>{formatPercent(engagementRate)}</strong>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Followers</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: meta.accent }}>
            {formatNumber(current.followers)}
          </div>
        </div>
      </div>
      <div style={styles.metricGrid}>
        {metricList.map(m => (
          <MetricCard
            key={m.key}
            label={m.label}
            current={current[m.key]}
            previous={previous[m.key]}
            format={m.format}
            color={meta.accent}
            chartData={chartCache[`${platformKey}_${m.key}`]}
          />
        ))}
      </div>
    </div>
  );
}

// ── Aggregated Overview ───────────────────────────────────────────────────────
function OverviewRow({ allData }) {
  const totals = { views: 0, likes: 0, reach: 0, followers: 0 };
  Object.values(allData).forEach(({ current }) => {
    Object.keys(totals).forEach(k => { totals[k] += current[k] || 0; });
  });
  const tiles = [
    { label: 'Total Views',     value: totals.views,     color: '#6366f1' },
    { label: 'Total Likes',     value: totals.likes,     color: '#ec4899' },
    { label: 'Total Reach',     value: totals.reach,     color: '#06b6d4' },
    { label: 'Total Followers', value: totals.followers, color: '#22c55e' },
  ];
  return (
    <div style={styles.overviewRow}>
      {tiles.map(t => (
        <div key={t.label} style={styles.overviewTile}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{t.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.color }}>{formatNumber(t.value)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ lang = 'en' }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState(Object.keys(PLATFORMS));
  const [timeRange, setTimeRange]   = useState('24h');
  const [allData, setAllData]       = useState({});
  const [chartCache, setChartCache] = useState({});
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const loadData = useCallback(() => {
    const data = {};
    const charts = {};
    Object.keys(PLATFORMS).forEach(pk => {
      data[pk] = buildMockPlatformData(pk);
      METRIC_KEYS.forEach(mk => {
        charts[`${pk}_${mk}`] = buildChartPoints(24);
      });
    });
    setAllData(data);
    setChartCache(charts);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 30_000); // real-time refresh every 30 s
    return () => clearInterval(intervalRef.current);
  }, [loadData, timeRange]);

  const togglePlatform = pk => {
    setSelectedPlatforms(prev =>
      prev.includes(pk) ? prev.filter(p => p !== pk) : [...prev, pk]
    );
  };

  if (loading) {
    return <div style={styles.loading}>⏳ Loading analytics…</div>;
  }

  const visibleData = Object.fromEntries(
    Object.entries(allData).filter(([k]) => selectedPlatforms.includes(k))
  );

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Analytics Dashboard</h1>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Real-time · Updated: {lastUpdated} · Auto-refresh every 30 s
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIME_RANGES.map(tr => (
            <button key={tr.key} onClick={() => setTimeRange(tr.key)}
              style={{ ...styles.timeBtn, ...(timeRange === tr.key ? styles.timeBtnActive : {}) }}>
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform filter */}
      <div style={styles.filterRow}>
        {Object.entries(PLATFORMS).map(([pk, meta]) => (
          <button key={pk} onClick={() => togglePlatform(pk)}
            style={{
              ...styles.platformBtn,
              opacity: selectedPlatforms.includes(pk) ? 1 : 0.35,
              borderColor: meta.accent,
              color: selectedPlatforms.includes(pk) ? meta.accent : '#64748b',
            }}>
            {meta.emoji} {meta.label}
          </button>
        ))}
      </div>

      {/* Overview row */}
      {Object.keys(visibleData).length > 0 && <OverviewRow allData={visibleData} />}

      {/* Per-platform panels */}
      <div style={styles.panelsContainer}>
        {Object.keys(visibleData).map(pk => (
          <PlatformPanel
            key={pk}
            platformKey={pk}
            data={visibleData[pk]}
            chartCache={chartCache}
          />
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    background: '#0f172a',
    minHeight: '100vh',
    color: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '20px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
  timeBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'all 0.15s',
  },
  timeBtnActive: {
    background: '#6366f1',
    borderColor: '#6366f1',
    color: '#fff',
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  platformBtn: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  overviewRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  overviewTile: {
    background: '#1e293b',
    borderRadius: 12,
    padding: '16px 20px',
    border: '1px solid #334155',
  },
  panelsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 20,
  },
  platformPanel: {
    background: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid #334155',
  },
  platformHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    borderBottom: '1px solid #334155',
  },
  platformName: {
    fontSize: 18,
    fontWeight: 700,
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 1,
    background: '#334155',
    padding: 1,
  },
  metricCard: {
    background: '#1e293b',
    padding: '12px 14px',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    fontSize: 18,
    color: '#94a3b8',
  },
};
