/**
 * @file AnalyticsDashboard.jsx
 * @description Comprehensive social media analytics dashboard with real-time metrics,
 *   SVG charts, content performance tracking, and CSV export for TikTok, Instagram,
 *   Facebook, Twitch, Discord, Lemon8, Reddit, and RedGifs.
 * @date 2026-08-30
 * @module dashboards/AnalyticsDashboard
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @type {string} Primary accent colour matching the app theme. */
const ACCENT = '#6366f1';

/** @type {string} App background colour. */
const BG_BASE = '#0a0a0c';

/** @type {string} Card surface colour. */
const BG_CARD = '#111114';

/** @type {string} Subtle border colour. */
const BORDER = '#1e1e24';

/** @type {Array<{id:string, label:string, color:string, icon:string}>} Supported platforms. */
const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#ff0050', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: '#e1306c', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', icon: '📘' },
  { id: 'twitch',    label: 'Twitch',    color: '#9147ff', icon: '🎮' },
  { id: 'discord',   label: 'Discord',   color: '#5865f2', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#ffb800', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',    color: '#ff4500', icon: '🤖' },
  { id: 'redgifs',   label: 'RedGifs',   color: '#ff3c3c', icon: '🎬' },
];

/** @type {Array<{id:string, label:string}>} Available time ranges. */
const TIME_RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7d'  },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
];

// ---------------------------------------------------------------------------
// Seed data helpers
// ---------------------------------------------------------------------------

/**
 * Returns a pseudorandom integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Builds a time-series array of length `n` with values centred around `base`.
 * @param {number} n - Number of data points.
 * @param {number} base - Baseline value.
 * @param {number} variance - Allowed variance around base (fraction).
 * @returns {number[]}
 */
const buildSeries = (n, base, variance = 0.25) =>
  Array.from({ length: n }, () =>
    Math.round(base * (1 + (Math.random() * 2 - 1) * variance))
  );

/**
 * Generates mock analytics state for every platform and every time range.
 * No real API calls — data refreshes via Socket.IO when window.nexusSocket
 * is available; otherwise a polling interval simulates live updates.
 * @returns {Object.<string, Object>}
 */
const generateInitialData = () => {
  const data = {};

  PLATFORMS.forEach(({ id }) => {
    const baseFollowers = rand(5_000, 4_000_000);
    data[id] = {
      followers:  baseFollowers,
      views:      rand(10_000, 10_000_000),
      likes:      rand(1_000,  500_000),
      comments:   rand(100,    50_000),
      shares:     rand(200,    100_000),
      reach:      rand(5_000,  2_000_000),
      retention:  parseFloat((rand(20, 85) + Math.random()).toFixed(1)),
      // Trend series keyed by time range
      series: {
        '24h': { views: buildSeries(24, rand(2_000, 200_000)), likes: buildSeries(24, rand(500, 50_000)) },
        '7d':  { views: buildSeries(7,  rand(5_000, 500_000)), likes: buildSeries(7,  rand(1_000, 100_000)) },
        '30d': { views: buildSeries(30, rand(8_000, 800_000)), likes: buildSeries(30, rand(2_000, 150_000)) },
        '90d': { views: buildSeries(90, rand(10_000, 1_000_000)), likes: buildSeries(90, rand(3_000, 200_000)) },
      },
      content: Array.from({ length: 8 }, (_, i) => ({
        id:        `${id}-post-${i + 1}`,
        title:     `${id.charAt(0).toUpperCase() + id.slice(1)} Post ${i + 1}`,
        type:      ['Video', 'Image', 'Story', 'Reel', 'Live'][i % 5],
        views:     rand(500,    5_000_000),
        likes:     rand(50,     500_000),
        comments:  rand(5,      50_000),
        shares:    rand(10,     100_000),
        retention: parseFloat((rand(15, 90) + Math.random()).toFixed(1)),
        postedAt:  new Date(Date.now() - rand(1, 30) * 86_400_000).toLocaleDateString(),
      })),
    };
  });

  return data;
};

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

/**
 * Catches rendering errors so the rest of the app remains functional.
 */
class AnalyticsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, info) {
    console.error('[AnalyticsDashboard] Boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
          <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Analytics Dashboard Error
          </p>
          <p style={{ fontSize: 13, color: '#999' }}>{this.state.errorMessage}</p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            style={{
              marginTop: 16, padding: '8px 20px', background: ACCENT,
              color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Renders a single KPI stat card.
 * @param {{label:string, value:string|number, sub?:string, color?:string}} props
 */
const StatCard = ({ label, value, sub, color = '#fff' }) => (
  <div style={{
    background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
    padding: '16px 18px', flex: '1 1 140px', minWidth: 130,
  }}>
    <p style={{ margin: 0, fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </p>
    <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color }}>
      {value}
    </p>
    {sub && (
      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#555' }}>{sub}</p>
    )}
  </div>
);

/**
 * Formats large numbers as compact strings (e.g. 1500000 → "1.5M").
 * @param {number} n
 * @returns {string}
 */
const fmt = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

/**
 * Inline SVG line chart for a single numeric series.
 * @param {{data:number[], color?:string, label?:string, height?:number}} props
 */
const LineChart = ({ data, color = ACCENT, label = 'Views', height = 160 }) => {
  const W = 560, H = height, padX = 44, padY = 20;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;
  const n = data.length;
  if (n === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  /** @param {number} i @param {number} v @returns {{x:number, y:number}} */
  const pt = (i, v) => ({
    x: padX + (i / Math.max(n - 1, 1)) * plotW,
    y: padY + (1 - (v - min) / range) * plotH,
  });

  const points = data.map((v, i) => pt(i, v));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Area fill
  const areaD = `${pathD} L ${points[n - 1].x.toFixed(1)} ${H - padY} L ${points[0].x.toFixed(1)} ${H - padY} Z`;

  // Y-axis labels
  const yTicks = [0, 0.5, 1].map((t) => ({
    y: padY + t * plotH,
    label: fmt(Math.round(max - t * range)),
  }));

  // X-axis labels — show first, middle, last
  const xLabels = [0, Math.floor((n - 1) / 2), n - 1].map((i) => ({
    x: pt(i, data[i]).x,
    label: String(i + 1),
  }));

  const gradId = `grad-${label.replace(/\s/g, '')}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label={`${label} trend chart`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <line key={i} x1={padX} y1={t.y} x2={W - padX} y2={t.y}
          stroke="#1e1e24" strokeWidth="1" strokeDasharray="4 4" />
      ))}

      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradId})`} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.7" />
      ))}

      {/* Y labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={padX - 6} y={t.y + 4} textAnchor="end"
          fontSize="10" fill="#555">
          {t.label}
        </text>
      ))}

      {/* X labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 4} textAnchor="middle"
          fontSize="10" fill="#555">
          {l.label}
        </text>
      ))}
    </svg>
  );
};

/**
 * Inline SVG bar chart comparing a metric across all platforms.
 * @param {{platforms:Array, metricKey:string, data:Object}} props
 */
const BarChart = ({ platforms, metricKey, data }) => {
  const W = 560, H = 160, padX = 44, padY = 16;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2 - 20; // extra bottom for labels
  const n = platforms.length;
  const barW = (plotW / n) * 0.6;
  const gap   = plotW / n;

  const values = platforms.map(({ id }) => (data[id] ? data[id][metricKey] : 0));
  const maxVal = Math.max(...values) || 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label={`${metricKey} comparison bar chart`}>
      {/* Baseline */}
      <line x1={padX} y1={padY + plotH} x2={W - padX} y2={padY + plotH}
        stroke="#1e1e24" strokeWidth="1" />

      {platforms.map(({ id, color }, i) => {
        const val = values[i];
        const bh = (val / maxVal) * plotH;
        const bx = padX + i * gap + (gap - barW) / 2;
        const by = padY + plotH - bh;
        return (
          <g key={id}>
            <rect x={bx} y={by} width={barW} height={bh} fill={color}
              rx="3" opacity="0.85" />
            <text x={bx + barW / 2} y={padY + plotH + 14} textAnchor="middle"
              fontSize="9.5" fill="#555">
              {id.slice(0, 4)}
            </text>
            <text x={bx + barW / 2} y={by - 4} textAnchor="middle"
              fontSize="9" fill={color}>
              {fmt(val)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Converts an array of content rows to a CSV blob and triggers download.
 * @param {Array<Object>} rows
 * @param {string} platform
 * @param {string} timeRange
 */
const exportCSV = (rows, platform, timeRange) => {
  const headers = ['Title', 'Type', 'Views', 'Likes', 'Comments', 'Shares', 'Retention%', 'Posted'];
  const csvRows = [
    headers.join(','),
    ...rows.map((r) =>
      [r.title, r.type, r.views, r.likes, r.comments, r.shares, r.retention, r.postedAt]
        .map((v) => `"${v}"`)
        .join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics_${platform}_${timeRange}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * AnalyticsDashboard
 *
 * Renders a full social media analytics dashboard.  Real-time metric updates
 * are received via `window.nexusSocket` (Socket.IO) if present; otherwise a
 * 15-second interval simulates live deltas.  No API keys are embedded —
 * credentials are expected on the server side; the socket connection is
 * established by the app host before this component mounts.
 *
 * @returns {React.ReactElement}
 */
const AnalyticsDashboard = () => {
  const [activePlatform, setActivePlatform] = useState(PLATFORMS[0].id);
  const [timeRange,      setTimeRange]      = useState('7d');
  const [analyticsData,  setAnalyticsData]  = useState(() => generateInitialData());
  const [isLive,         setIsLive]         = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState(new Date());
  const [sortCol,        setSortCol]        = useState('views');
  const [sortAsc,        setSortAsc]        = useState(false);
  const [error,          setError]          = useState(null);
  const intervalRef = useRef(null);

  // -------------------------------------------------------------------------
  // Real-time update handler
  // -------------------------------------------------------------------------

  /**
   * Applies a partial metrics delta received from the server.
   * @param {{platform:string, delta:Object}} payload
   */
  const applyDelta = useCallback((payload) => {
    if (!payload || !payload.platform) return;
    setAnalyticsData((prev) => {
      const curr = prev[payload.platform];
      if (!curr) return prev;
      return {
        ...prev,
        [payload.platform]: {
          ...curr,
          ...payload.delta,
          views:  Math.max(0, (curr.views  || 0) + (payload.delta?.viewsDelta  || 0)),
          likes:  Math.max(0, (curr.likes  || 0) + (payload.delta?.likesDelta  || 0)),
          reach:  Math.max(0, (curr.reach  || 0) + (payload.delta?.reachDelta  || 0)),
        },
      };
    });
    setLastUpdated(new Date());
  }, []);

  /**
   * Simulates a small live metric tick for a random platform.
   */
  const simulateTick = useCallback(() => {
    const { id: platform } = PLATFORMS[rand(0, PLATFORMS.length - 1)];
    applyDelta({
      platform,
      delta: {
        viewsDelta: rand(-500, 5_000),
        likesDelta: rand(-50,  1_000),
        reachDelta: rand(-200, 2_000),
      },
    });
  }, [applyDelta]);

  // -------------------------------------------------------------------------
  // Socket.IO / polling setup
  // -------------------------------------------------------------------------

  useEffect(() => {
    let socketBound = false;

    try {
      if (typeof window !== 'undefined' && window.nexusSocket) {
        const sock = window.nexusSocket;
        sock.on('analytics:delta', applyDelta);
        sock.on('analytics:error', (err) => setError(err?.message || 'Socket error'));
        sock.emit('analytics:subscribe', { platforms: PLATFORMS.map((p) => p.id) });
        setIsLive(true);
        socketBound = true;
      }
    } catch (err) {
      console.warn('[AnalyticsDashboard] Socket binding failed:', err);
    }

    // Fall back to simulated polling when no socket is available.
    if (!socketBound) {
      intervalRef.current = setInterval(simulateTick, 15_000);
    }

    return () => {
      if (socketBound && window.nexusSocket) {
        try {
          window.nexusSocket.off('analytics:delta', applyDelta);
          window.nexusSocket.off('analytics:error');
          window.nexusSocket.emit('analytics:unsubscribe');
        } catch (_) { /* ignore cleanup errors */ }
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [applyDelta, simulateTick]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const platform   = PLATFORMS.find((p) => p.id === activePlatform) || PLATFORMS[0];
  const metrics    = analyticsData[activePlatform] || {};
  const seriesData = metrics.series?.[timeRange] || { views: [], likes: [] };

  const sortedContent = [...(metrics.content || [])].sort((a, b) =>
    sortAsc ? a[sortCol] - b[sortCol] : b[sortCol] - a[sortCol]
  );

  // -------------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------------

  const s = {
    root: {
      background: BG_BASE,
      minHeight: '100vh',
      color: '#e2e2ea',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '20px 16px 60px',
      boxSizing: 'border-box',
    },
    header: {
      display: 'flex', flexWrap: 'wrap', gap: 12,
      alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
    },
    title: { fontSize: 22, fontWeight: 700, margin: 0, color: '#fff' },
    liveIndicator: {
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: isLive ? '#22c55e' : '#555',
    },
    liveDot: {
      width: 8, height: 8, borderRadius: '50%',
      background: isLive ? '#22c55e' : '#333',
      boxShadow: isLive ? '0 0 0 3px rgba(34,197,94,0.25)' : 'none',
    },
    platformScroll: {
      display: 'flex', gap: 8, overflowX: 'auto',
      paddingBottom: 4, marginBottom: 20,
      scrollbarWidth: 'none',
    },
    platformTab: (isActive, color) => ({
      flexShrink: 0, padding: '7px 14px', borderRadius: 20,
      border: `1.5px solid ${isActive ? color : BORDER}`,
      background: isActive ? `${color}22` : 'transparent',
      color: isActive ? color : '#666',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    }),
    timeRow: {
      display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap',
    },
    timeBtn: (active) => ({
      padding: '5px 14px', borderRadius: 8,
      border: `1px solid ${active ? ACCENT : BORDER}`,
      background: active ? `${ACCENT}22` : 'transparent',
      color: active ? ACCENT : '#555',
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
    }),
    statsRow: {
      display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20,
    },
    card: {
      background: BG_CARD, border: `1px solid ${BORDER}`,
      borderRadius: 14, padding: '18px 20px', marginBottom: 16,
    },
    cardTitle: { fontSize: 13, fontWeight: 600, color: '#888', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    th: {
      padding: '9px 10px', borderBottom: `1px solid ${BORDER}`,
      textAlign: 'left', color: '#555', fontWeight: 600,
      cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    },
    td: { padding: '9px 10px', borderBottom: `1px solid #0f0f14`, color: '#bbb' },
    exportBtn: {
      padding: '8px 18px', background: `${ACCENT}22`,
      border: `1px solid ${ACCENT}`, color: ACCENT,
      borderRadius: 8, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', marginTop: 14,
    },
    errorBox: {
      background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444',
      borderRadius: 8, padding: '10px 14px', marginBottom: 16,
      color: '#fca5a5', fontSize: 12,
    },
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AnalyticsErrorBoundary>
      <div style={s.root}>

        {/* ---- Header ---- */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Analytics Dashboard</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555' }}>
              Social media performance across all platforms
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={s.liveIndicator}>
              <div style={s.liveDot} />
              {isLive ? 'Live' : 'Simulated'} · Updated {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* ---- Error banner ---- */}
        {error && (
          <div style={s.errorBox}>
            {error}{' '}
            <button onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 700 }}>
              ×
            </button>
          </div>
        )}

        {/* ---- Platform tabs ---- */}
        <div style={s.platformScroll}>
          {PLATFORMS.map(({ id, label, color, icon }) => (
            <button key={id} style={s.platformTab(activePlatform === id, color)}
              onClick={() => setActivePlatform(id)}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ---- Time range ---- */}
        <div style={s.timeRow}>
          {TIME_RANGES.map(({ id, label }) => (
            <button key={id} style={s.timeBtn(timeRange === id)}
              onClick={() => setTimeRange(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* ---- KPI stat cards ---- */}
        <div style={s.statsRow}>
          <StatCard label="Followers" value={fmt(metrics.followers || 0)} color="#fff" />
          <StatCard label="Views"     value={fmt(metrics.views    || 0)} color={ACCENT} />
          <StatCard label="Likes"     value={fmt(metrics.likes    || 0)} color={platform.color} />
          <StatCard label="Comments"  value={fmt(metrics.comments || 0)} color="#f59e0b" />
          <StatCard label="Shares"    value={fmt(metrics.shares   || 0)} color="#22c55e" />
          <StatCard label="Reach"     value={fmt(metrics.reach    || 0)} color="#38bdf8" />
          <StatCard label="Retention" value={`${metrics.retention || 0}%`}
            color={metrics.retention >= 60 ? '#22c55e' : metrics.retention >= 35 ? '#f59e0b' : '#ef4444'}
            sub="avg view duration %" />
        </div>

        {/* ---- Views trend chart ---- */}
        <div style={s.card}>
          <p style={s.cardTitle}>Views Trend — {platform.label} / {timeRange}</p>
          <LineChart data={seriesData.views} color={platform.color} label="Views" />
        </div>

        {/* ---- Likes trend chart ---- */}
        <div style={s.card}>
          <p style={s.cardTitle}>Likes Trend — {platform.label} / {timeRange}</p>
          <LineChart data={seriesData.likes} color={ACCENT} label="Likes" height={120} />
        </div>

        {/* ---- Cross-platform comparison ---- */}
        <div style={s.card}>
          <p style={s.cardTitle}>Cross-Platform Views Comparison</p>
          <BarChart platforms={PLATFORMS} metricKey="views" data={analyticsData} />
        </div>

        <div style={s.card}>
          <p style={s.cardTitle}>Cross-Platform Reach Comparison</p>
          <BarChart platforms={PLATFORMS} metricKey="reach" data={analyticsData} />
        </div>

        {/* ---- Content performance table ---- */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ ...s.cardTitle, margin: 0 }}>Content Performance</p>
            <button style={s.exportBtn}
              onClick={() => exportCSV(sortedContent, activePlatform, timeRange)}>
              ⬇ Export CSV
            </button>
          </div>

          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {[
                    { key: 'title',     label: 'Content'   },
                    { key: 'type',      label: 'Type'      },
                    { key: 'views',     label: 'Views'     },
                    { key: 'likes',     label: 'Likes'     },
                    { key: 'comments',  label: 'Comments'  },
                    { key: 'shares',    label: 'Shares'    },
                    { key: 'retention', label: 'Retention' },
                    { key: 'postedAt',  label: 'Posted'    },
                  ].map(({ key, label }) => (
                    <th key={key} style={s.th}
                      onClick={() => { setSortCol(key); setSortAsc(sortCol === key ? !sortAsc : false); }}>
                      {label}
                      {sortCol === key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedContent.map((row) => (
                  <tr key={row.id}
                    style={{ transition: 'background 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#14141a')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...s.td, color: '#ddd', fontWeight: 500 }}>{row.title}</td>
                    <td style={s.td}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11,
                        background: `${platform.color}22`, color: platform.color,
                      }}>
                        {row.type}
                      </span>
                    </td>
                    <td style={s.td}>{fmt(row.views)}</td>
                    <td style={s.td}>{fmt(row.likes)}</td>
                    <td style={s.td}>{fmt(row.comments)}</td>
                    <td style={s.td}>{fmt(row.shares)}</td>
                    <td style={{ ...s.td, color: row.retention >= 60 ? '#22c55e' : row.retention >= 35 ? '#f59e0b' : '#ef4444' }}>
                      {row.retention}%
                    </td>
                    <td style={s.td}>{row.postedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Retention overview per platform ---- */}
        <div style={s.card}>
          <p style={s.cardTitle}>Retention by Platform</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PLATFORMS.map(({ id, label, color }) => {
              const ret = analyticsData[id]?.retention || 0;
              return (
                <div key={id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>{label}</span>
                    <span style={{ fontSize: 12, color, fontWeight: 600 }}>{ret}%</span>
                  </div>
                  <div style={{ height: 6, background: '#1a1a20', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${ret}%`,
                      background: color, borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </AnalyticsErrorBoundary>
  );
};

export default AnalyticsDashboard;
