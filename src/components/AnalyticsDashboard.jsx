/**
 * AnalyticsDashboard.jsx
 * Nexus AI Pro — Social Media Analytics Dashboard
 * Real-time multi-platform analytics: views, likes, reach, retention
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Platform config ───────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#010101', accent: '#fe2c55' },
  { id: 'instagram', label: 'Instagram', color: '#833ab4', accent: '#fd1d1d' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', accent: '#42b72a' },
  { id: 'twitch',    label: 'Twitch',    color: '#9146ff', accent: '#00d4aa' },
  { id: 'discord',   label: 'Discord',   color: '#5865f2', accent: '#57f287' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#f5a623', accent: '#f5a623' },
  { id: 'reddit',    label: 'Reddit',    color: '#ff4500', accent: '#0dd3bb' },
  { id: 'redgifs',   label: 'RedGifs',   color: '#ff2b2b', accent: '#ff6b6b' },
];

const TIME_RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7d'  },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
];

const METRIC_KEYS = ['views','likes','shares','comments','reach','retention','followers'];

// ── Helpers ───────────────────────────────────────────────────────────────────
/** @param {number} n */
function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

/**
 * Minimal SVG line chart
 * @param {{ data: number[], color: string, height?: number }} props
 */
function LineChart({ data, color, height = 60 }) {
  if (!data || data.length < 2) return null;
  const w = 200, h = height;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Bar chart for comparing metrics across time buckets
 * @param {{ data: number[], color: string }} props
 */
function BarChart({ data, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
      {data.map((v, i) => (
        <div
          key={i}
          title={String(v)}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: color,
            borderRadius: '2px 2px 0 0',
            minHeight: 2,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

// ── MetricCard ────────────────────────────────────────────────────────────────
/**
 * @param {{ label: string, value: number|string, trend: number, sparkline: number[], color: string, suffix?: string }} props
 */
function MetricCard({ label, value, trend, sparkline, color, suffix = '' }) {
  const trendUp = trend >= 0;
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{typeof value === 'number' ? fmt(value) : value}{suffix}</div>
      <div className={`metric-trend ${trendUp ? 'up' : 'down'}`}>
        {trendUp ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
      </div>
      <LineChart data={sparkline} color={color} />
    </div>
  );
}

// ── ConnectionBadge ───────────────────────────────────────────────────────────
/** @param {{ connected: boolean }} props */
function ConnectionBadge({ connected }) {
  return (
    <span className={`conn-badge ${connected ? 'conn-ok' : 'conn-off'}`}>
      {connected ? '● Connected' : '○ Disconnected'}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
/**
 * AnalyticsDashboard
 * @param {{ authToken: string }} props
 */
export default function AnalyticsDashboard({ authToken }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [timeRange, setTimeRange]           = useState('7d');
  const [metrics, setMetrics]               = useState({});
  const [connected, setConnected]           = useState({});
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [liveEvents, setLiveEvents]         = useState([]);
  const socketRef = useRef(null);

  // ── Fetch analytics from API ────────────────────────────────────────────────
  const fetchMetrics = useCallback(async (platform, range) => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/${platform}?range=${range}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(prev => ({ ...prev, [platform]: data }));
      setConnected(prev => ({ ...prev, [platform]: true }));
    } catch (e) {
      setError(e.message);
      setConnected(prev => ({ ...prev, [platform]: false }));
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchMetrics(activePlatform, timeRange); }, [activePlatform, timeRange, fetchMetrics]);

  // ── WebSocket real-time feed ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Dynamically import socket.io-client to avoid SSR issues
    let socket;
    import('socket.io-client').then(({ io }) => {
      socket = io({ auth: { token: authToken }, transports: ['websocket'] });
      socket.on('analytics:update', (event) => {
        if (event.platform === activePlatform) {
          setMetrics(prev => ({
            ...prev,
            [activePlatform]: { ...prev[activePlatform], ...event.metrics },
          }));
          setLiveEvents(prev => [event, ...prev].slice(0, 20));
        }
      });
      socketRef.current = socket;
    }).catch(() => { /* socket.io not available — graceful degradation */ });
    return () => { socket?.disconnect(); };
  }, [authToken, activePlatform]);

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = metrics[activePlatform] || {};
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `analytics-${activePlatform}-${timeRange}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const platform = PLATFORMS.find(p => p.id === activePlatform);
  const m        = metrics[activePlatform] || {};
  const spark    = (key) => m.sparklines?.[key] ?? Array.from({ length: 10 }, () => Math.random() * 100);

  return (
    <div className="analytics-root">
      <style>{ANALYTICS_CSS}</style>

      {/* Header */}
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <div className="header-actions">
          <div className="time-range-tabs">
            {TIME_RANGES.map(r => (
              <button key={r.id} className={`range-btn${timeRange === r.id ? ' active' : ''}`}
                onClick={() => setTimeRange(r.id)}>{r.label}</button>
            ))}
          </div>
          <button className="export-btn" onClick={handleExport}>⬇ Export</button>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="platform-tabs" role="tablist">
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            role="tab"
            aria-selected={activePlatform === p.id}
            className={`platform-tab${activePlatform === p.id ? ' active' : ''}`}
            style={activePlatform === p.id ? { borderBottomColor: p.accent, color: p.accent } : {}}
            onClick={() => setActivePlatform(p.id)}
          >
            {p.label}
            <ConnectionBadge connected={!!connected[p.id]} />
          </button>
        ))}
      </div>

      {/* Error / Loading */}
      {error   && <div className="analytics-error">⚠ {error}</div>}
      {loading && <div className="analytics-loading">Loading…</div>}

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <MetricCard label="Views"          value={m.views      ?? 0} trend={m.trends?.views      ?? 0} sparkline={spark('views')}     color={platform.accent} />
        <MetricCard label="Likes"          value={m.likes      ?? 0} trend={m.trends?.likes      ?? 0} sparkline={spark('likes')}     color={platform.accent} />
        <MetricCard label="Shares"         value={m.shares     ?? 0} trend={m.trends?.shares     ?? 0} sparkline={spark('shares')}    color={platform.accent} />
        <MetricCard label="Comments"       value={m.comments   ?? 0} trend={m.trends?.comments   ?? 0} sparkline={spark('comments')}  color={platform.accent} />
        <MetricCard label="Reach"          value={m.reach      ?? 0} trend={m.trends?.reach      ?? 0} sparkline={spark('reach')}     color={platform.accent} />
        <MetricCard label="Retention"      value={m.retention  ?? 0} trend={m.trends?.retention  ?? 0} sparkline={spark('retention')} color={platform.accent} suffix="%" />
        <MetricCard label="Followers +"    value={m.followers  ?? 0} trend={m.trends?.followers  ?? 0} sparkline={spark('followers')} color={platform.accent} />
      </div>

      {/* Bar Chart for time-bucketed views */}
      <div className="chart-panel">
        <h3>Views Over Time ({timeRange})</h3>
        <BarChart data={m.timeSeries ?? Array.from({ length: 14 }, () => Math.floor(Math.random() * 10000))} color={platform.accent} />
      </div>

      {/* Live events feed */}
      {liveEvents.length > 0 && (
        <div className="live-feed">
          <h4>🔴 Live Updates</h4>
          {liveEvents.slice(0, 5).map((e, i) => (
            <div key={i} className="live-event">
              <span className="live-ts">{new Date(e.timestamp).toLocaleTimeString()}</span>
              <span>{e.metric}: {fmt(e.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ANALYTICS_CSS = `
:root {
  --bg: #0f1117;
  --surface: #1a1d27;
  --border: #2a2d3a;
  --text: #e2e8f0;
  --muted: #718096;
  --radius: 10px;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg: #f7f8fc;
    --surface: #ffffff;
    --border: #e2e8f0;
    --text: #1a202c;
    --muted: #4a5568;
  }
}
.analytics-root { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 16px; min-height: 100vh; }
.analytics-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.analytics-header h2 { margin: 0; font-size: 1.4rem; }
.header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.time-range-tabs { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 4px; }
.range-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px 12px; border-radius: 6px; font-size: .85rem; }
.range-btn.active { background: var(--border); color: var(--text); }
.export-btn { background: #3182ce; color: #fff; border: none; border-radius: var(--radius); padding: 6px 16px; cursor: pointer; font-size: .85rem; }
.export-btn:hover { background: #2b6cb0; }
.platform-tabs { display: flex; overflow-x: auto; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.platform-tab { background: none; border: none; border-bottom: 2px solid transparent; color: var(--muted); cursor: pointer; padding: 10px 16px; white-space: nowrap; font-size: .9rem; display: flex; align-items: center; gap: 8px; transition: color .2s; }
.platform-tab.active { color: var(--text); }
.conn-badge { font-size: .7rem; padding: 1px 6px; border-radius: 9999px; }
.conn-ok  { background: rgba(72,187,120,.2); color: #48bb78; }
.conn-off { background: rgba(245,101,101,.2); color: #f56565; }
.analytics-error   { background: rgba(245,101,101,.15); color: #fc8181; border: 1px solid #fc8181; border-radius: var(--radius); padding: 10px 14px; margin-bottom: 16px; }
.analytics-loading { color: var(--muted); margin-bottom: 16px; font-style: italic; }
.metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.metric-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.metric-label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
.metric-value { font-size: 1.6rem; font-weight: 700; margin-bottom: 4px; }
.metric-trend { font-size: .8rem; margin-bottom: 8px; }
.metric-trend.up   { color: #48bb78; }
.metric-trend.down { color: #f56565; }
.chart-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 20px; }
.chart-panel h3 { margin: 0 0 12px; font-size: 1rem; color: var(--muted); }
.live-feed { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.live-feed h4 { margin: 0 0 10px; font-size: .9rem; }
.live-event { display: flex; gap: 12px; font-size: .8rem; padding: 4px 0; border-bottom: 1px solid var(--border); }
.live-ts { color: var(--muted); }
@media (max-width: 640px) {
  .analytics-header { flex-direction: column; align-items: flex-start; }
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
}
`;
