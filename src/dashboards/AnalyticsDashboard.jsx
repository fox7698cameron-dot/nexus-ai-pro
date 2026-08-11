/**
 * src/dashboards/AnalyticsDashboard.jsx
 * Nexus AI Pro — Social Media Analytics Dashboard
 * Real-time metrics: TikTok, Instagram, Facebook, Twitch, Discord,
 * Lemon8, Reddit, RedGifs — views, likes, reach, retention tracking.
 * Date: 2026-08-11
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Platform Configs ─────────────────────────────────────────────────────────
const PLATFORMS = {
  tiktok:    { name: 'TikTok',     icon: '🎵', color: '#69C9D0', bg: '#010101' },
  instagram: { name: 'Instagram',  icon: '📸', color: '#E1306C', bg: '#FCAF45' },
  facebook:  { name: 'Facebook',   icon: '👍', color: '#1877F2', bg: '#0866FF' },
  twitch:    { name: 'Twitch',     icon: '🎮', color: '#9146FF', bg: '#6441A4' },
  discord:   { name: 'Discord',    icon: '💬', color: '#5865F2', bg: '#36393F' },
  lemon8:    { name: 'Lemon8',     icon: '🍋', color: '#FFD700', bg: '#FFC300' },
  reddit:    { name: 'Reddit',     icon: '🤖', color: '#FF4500', bg: '#FF6314' },
  redgifs:   { name: 'RedGifs',    icon: '🎬', color: '#FF3D00', bg: '#CC0000' },
  youtube:   { name: 'YouTube',    icon: '▶️', color: '#FF0000', bg: '#282828' },
  twitter:   { name: 'X (Twitter)',icon: '𝕏',  color: '#1DA1F2', bg: '#000000' },
};

const METRIC_TYPES = [
  { key: 'views',      label: 'Views',        icon: '👁',  format: 'compact' },
  { key: 'likes',      label: 'Likes',        icon: '❤️',  format: 'compact' },
  { key: 'reach',      label: 'Reach',        icon: '📡',  format: 'compact' },
  { key: 'retention',  label: 'Retention %',  icon: '🔄',  format: 'percent' },
  { key: 'shares',     label: 'Shares',       icon: '↗️',  format: 'compact' },
  { key: 'comments',   label: 'Comments',     icon: '💬',  format: 'compact' },
  { key: 'followers',  label: 'Followers',    icon: '👥',  format: 'compact' },
  { key: 'growth',     label: 'Growth',       icon: '📈',  format: 'percent' },
  { key: 'impressions',label: 'Impressions',  icon: '📊',  format: 'compact' },
  { key: 'ctr',        label: 'CTR %',        icon: '🖱️',  format: 'percent' },
];

// ─── Analytics API ────────────────────────────────────────────────────────────
const AnalyticsAPI = {
  async getOverview(platformIds, period = '30d') {
    const params = new URLSearchParams({ platforms: platformIds.join(','), period });
    const res = await fetch(`/api/analytics/overview?${params}`, { credentials: 'include' });
    return _handle(res);
  },
  async getPlatformMetrics(platform, period = '30d') {
    const res = await fetch(`/api/analytics/platform/${platform}?period=${period}`, { credentials: 'include' });
    return _handle(res);
  },
  async getTimeSeries(platform, metric, period = '30d') {
    const res = await fetch(`/api/analytics/timeseries?platform=${platform}&metric=${metric}&period=${period}`, { credentials: 'include' });
    return _handle(res);
  },
  async getTopContent(platform, limit = 10) {
    const res = await fetch(`/api/analytics/top-content?platform=${platform}&limit=${limit}`, { credentials: 'include' });
    return _handle(res);
  },
  async getAudienceDemographics(platform) {
    const res = await fetch(`/api/analytics/demographics/${platform}`, { credentials: 'include' });
    return _handle(res);
  },
  async getRealTimeMetrics(platform) {
    const res = await fetch(`/api/analytics/realtime/${platform}`, { credentials: 'include' });
    return _handle(res);
  },
  async exportReport(platformIds, period, format = 'csv') {
    const params = new URLSearchParams({ platforms: platformIds.join(','), period, format });
    const res = await fetch(`/api/analytics/export?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    return res.blob();
  },
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [selectedPlatforms, setSP] = useState(Object.keys(PLATFORMS));
  const [activePlatform, setAP]    = useState(null);
  const [period, setPeriod]        = useState('30d');
  const [overview, setOverview]    = useState(null);
  const [rtMetrics, setRT]         = useState({});
  const [topContent, setContent]   = useState([]);
  const [loading, setLoading]      = useState(true);
  const [error, setError]          = useState('');
  const [lastUpdate, setLast]      = useState(null);
  const rtIntervalRef              = useRef(null);

  // ── Load overview ───────────────────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await AnalyticsAPI.getOverview(selectedPlatforms, period);
      setOverview(data);
      setLast(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPlatforms, period]);

  // ── Real-time refresh ───────────────────────────────────────────────────────
  const refreshRealTime = useCallback(async () => {
    if (!activePlatform) return;
    try {
      const metrics = await AnalyticsAPI.getRealTimeMetrics(activePlatform);
      setRT(prev => ({ ...prev, [activePlatform]: metrics }));
      setLast(new Date());
    } catch { /* silent */ }
  }, [activePlatform]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (rtIntervalRef.current) clearInterval(rtIntervalRef.current);
    if (activePlatform) {
      refreshRealTime();
      rtIntervalRef.current = setInterval(refreshRealTime, 30000);
    }
    return () => { if (rtIntervalRef.current) clearInterval(rtIntervalRef.current); };
  }, [activePlatform, refreshRealTime]);

  useEffect(() => {
    if (activePlatform) {
      AnalyticsAPI.getTopContent(activePlatform).then(setContent).catch(() => {});
    }
  }, [activePlatform]);

  const togglePlatform = (id) => {
    setSP(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  // ── Demo data fallback ──────────────────────────────────────────────────────
  const demoOverview = selectedPlatforms.reduce((acc, id) => {
    acc[id] = {
      views: Math.floor(Math.random() * 900000) + 100000,
      likes: Math.floor(Math.random() * 50000) + 5000,
      reach: Math.floor(Math.random() * 400000) + 50000,
      retention: (Math.random() * 60 + 30).toFixed(1),
      followers: Math.floor(Math.random() * 90000) + 10000,
      growth: (Math.random() * 15 - 2).toFixed(2),
      shares: Math.floor(Math.random() * 8000) + 500,
    };
    return acc;
  }, {});

  const displayData = overview ?? demoOverview;

  return (
    <div className="analytics-dashboard">
      {/* ── Header ── */}
      <div className="analytics-header">
        <div>
          <h1 className="dash-title">📊 Analytics Dashboard</h1>
          {lastUpdate && <p className="dash-subtitle">Last updated: {lastUpdate.toLocaleTimeString()}</p>}
        </div>
        <div className="dash-controls">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button className="btn-secondary" onClick={loadOverview} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button className="btn-secondary" onClick={async () => {
            const blob = await AnalyticsAPI.exportReport(selectedPlatforms, period, 'csv');
            const url  = URL.createObjectURL(blob);
            Object.assign(document.createElement('a'), { href: url, download: `analytics-${period}.csv` }).click();
            URL.revokeObjectURL(url);
          }}>⬇️ Export</button>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">⚠️ {error}</div>}

      {/* ── Platform Toggles ── */}
      <div className="platform-toggles">
        {Object.entries(PLATFORMS).map(([id, p]) => (
          <button key={id}
            className={`platform-chip ${selectedPlatforms.includes(id) ? 'active' : ''} ${activePlatform === id ? 'focused' : ''}`}
            style={{ '--p-color': p.color }}
            onClick={() => { togglePlatform(id); setAP(activePlatform === id ? null : id); }}>
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>

      {/* ── Summary Tiles ── */}
      <div className="summary-tiles">
        {METRIC_TYPES.slice(0, 6).map(m => {
          const total = selectedPlatforms.reduce((sum, id) => {
            const val = displayData[id]?.[m.key];
            return sum + (parseFloat(val) || 0);
          }, 0);
          return (
            <div key={m.key} className="metric-tile">
              <span className="metric-icon">{m.icon}</span>
              <span className="metric-label">{m.label}</span>
              <span className="metric-value">
                {m.format === 'percent' ? `${(total / selectedPlatforms.length).toFixed(1)}%` : fmtCompact(total)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Platform Breakdown Table ── */}
      <div className="platform-breakdown">
        <h2>Platform Breakdown</h2>
        <div className="table-scroll">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Platform</th>
                {METRIC_TYPES.slice(0, 7).map(m => <th key={m.key}>{m.icon} {m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {selectedPlatforms.map(id => {
                const p    = PLATFORMS[id];
                const data = displayData[id] ?? {};
                return (
                  <tr key={id} className={activePlatform === id ? 'row-active' : ''}
                    onClick={() => setAP(activePlatform === id ? null : id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className="platform-label" style={{ color: p.color }}>
                        {p.icon} {p.name}
                      </span>
                    </td>
                    {METRIC_TYPES.slice(0, 7).map(m => (
                      <td key={m.key} className="metric-cell">
                        {m.format === 'percent' ? `${parseFloat(data[m.key] ?? 0).toFixed(1)}%` : fmtCompact(data[m.key] ?? 0)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Real-time & Top Content Panel ── */}
      {activePlatform && (
        <div className="platform-detail">
          <h2 style={{ color: PLATFORMS[activePlatform]?.color }}>
            {PLATFORMS[activePlatform]?.icon} {PLATFORMS[activePlatform]?.name} — Detail
          </h2>
          <div className="detail-grid">
            <RealTimePanel platform={activePlatform} metrics={rtMetrics[activePlatform]} />
            <TopContentPanel content={topContent} platform={activePlatform} />
          </div>
          <RetentionPanel platform={activePlatform} period={period} />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PeriodSelector({ value, onChange }) {
  const periods = [
    { value: '1d', label: '24h' }, { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' },
    { value: '1y', label: '1 year' },
  ];
  return (
    <div className="period-selector">
      {periods.map(p => (
        <button key={p.value} className={`period-btn ${value === p.value ? 'active' : ''}`}
          onClick={() => onChange(p.value)}>{p.label}</button>
      ))}
    </div>
  );
}

function RealTimePanel({ platform, metrics }) {
  const demo = {
    currentViewers: Math.floor(Math.random() * 2000) + 100,
    viewsPerMinute:  Math.floor(Math.random() * 500) + 10,
    likesPerMinute:  Math.floor(Math.random() * 50) + 1,
    activeStreams:   Math.floor(Math.random() * 5) + 1,
    engagement: (Math.random() * 10 + 2).toFixed(2),
  };
  const data = metrics ?? demo;
  return (
    <div className="realtime-panel">
      <h3>⚡ Real-time</h3>
      <div className="rt-grid">
        <RtStat icon="👁" label="Live viewers" value={fmtCompact(data.currentViewers ?? 0)} />
        <RtStat icon="📈" label="Views/min"   value={fmtCompact(data.viewsPerMinute ?? 0)} />
        <RtStat icon="❤️" label="Likes/min"   value={fmtCompact(data.likesPerMinute ?? 0)} />
        <RtStat icon="💬" label="Engagement"  value={`${data.engagement ?? '0'}%`} />
      </div>
    </div>
  );
}

function RtStat({ icon, label, value }) {
  return (
    <div className="rt-stat">
      <span className="rt-icon">{icon}</span>
      <span className="rt-value">{value}</span>
      <span className="rt-label">{label}</span>
    </div>
  );
}

function TopContentPanel({ content, platform }) {
  const demo = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    title:    `Top post ${i + 1} on ${PLATFORMS[platform]?.name}`,
    views:    Math.floor(Math.random() * 500000) + 50000,
    likes:    Math.floor(Math.random() * 30000) + 1000,
    retention:`${(Math.random() * 50 + 30).toFixed(1)}%`,
    date:     new Date(Date.now() - i * 86400000).toLocaleDateString(),
  }));
  const items = content.length ? content : demo;
  return (
    <div className="top-content-panel">
      <h3>🏆 Top Content</h3>
      <ul className="content-list">
        {items.slice(0, 5).map((item, i) => (
          <li key={item.id ?? i} className="content-item">
            <span className="content-rank">#{i + 1}</span>
            <div className="content-info">
              <span className="content-title">{item.title}</span>
              <span className="content-stats">
                👁 {fmtCompact(item.views)} · ❤️ {fmtCompact(item.likes)} · 🔄 {item.retention}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RetentionPanel({ platform, period }) {
  // Simulated retention curve data (replace with real API data in production)
  const points = Array.from({ length: 10 }, (_, i) => ({
    pct: i * 10,
    retention: Math.max(0, 100 - i * i * 1.2 - Math.random() * 5),
  }));
  const maxH = 80;
  return (
    <div className="retention-panel">
      <h3>🔄 Audience Retention ({period})</h3>
      <div className="retention-chart" aria-label="Retention chart">
        <div className="retention-bars">
          {points.map((p, i) => (
            <div key={i} className="ret-col">
              <div className="ret-bar" style={{ height: `${(p.retention / 100) * maxH}px` }}
                title={`${p.pct}% through: ${p.retention.toFixed(1)}% retained`} />
              <span className="ret-label">{p.pct}%</span>
            </div>
          ))}
        </div>
        <div className="retention-avg">
          Avg. retention: <strong>{(points.reduce((s, p) => s + p.retention, 0) / points.length).toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCompact(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

async function _handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
