/**
 * src/dashboards/AnalyticsDashboard.jsx
 * Real-time social media analytics — TikTok, Instagram, Facebook, Twitch, Discord,
 * Lemon8, Reddit, RedGifs — with views, likes, reach, and retention tracking.
 * Created: 2026-08-23
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Platform registry ─────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',     color: '#010101', accent: '#ff0050', emoji: '🎵' },
  { id: 'instagram', name: 'Instagram',  color: '#833ab4', accent: '#fd1d1d', emoji: '📸' },
  { id: 'facebook',  name: 'Facebook',   color: '#1877f2', accent: '#42b72a', emoji: '👤' },
  { id: 'twitch',    name: 'Twitch',     color: '#9146ff', accent: '#bf94ff', emoji: '🎮' },
  { id: 'discord',   name: 'Discord',    color: '#5865f2', accent: '#99aab5', emoji: '💬' },
  { id: 'lemon8',    name: 'Lemon8',     color: '#ffcc00', accent: '#ff9900', emoji: '🍋' },
  { id: 'reddit',    name: 'Reddit',     color: '#ff4500', accent: '#ff6534', emoji: '🤖' },
  { id: 'redgifs',   name: 'RedGifs',    color: '#ff3366', accent: '#ff6699', emoji: '🎬' },
];

// ── Metric types ──────────────────────────────────────────────────────────────
const METRIC_KEYS = ['views', 'likes', 'reach', 'retention', 'comments', 'shares', 'followers'];

// ── Simulated real-time data source (replace with live API adapter) ───────────
function generatePlatformMetrics(platformId) {
  const seed = platformId.charCodeAt(0);
  const base = { tiktok: 4.2, instagram: 3.1, facebook: 2.8, twitch: 1.9, discord: 0.8, lemon8: 0.5, reddit: 1.4, redgifs: 0.6 };
  const mult = (base[platformId] || 1) * 1_000_000;

  return {
    views:     Math.floor(mult * (0.8 + Math.random() * 0.4)),
    likes:     Math.floor(mult * 0.04 * (0.9 + Math.random() * 0.2)),
    reach:     Math.floor(mult * 1.2  * (0.9 + Math.random() * 0.2)),
    retention: parseFloat((40 + Math.random() * 45).toFixed(1)),   // percent
    comments:  Math.floor(mult * 0.01 * Math.random()),
    shares:    Math.floor(mult * 0.02 * Math.random()),
    followers: Math.floor(mult * 0.3  * (0.95 + Math.random() * 0.1)),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function delta(current, previous) {
  if (!previous) return null;
  const pct = ((current - previous) / (previous || 1)) * 100;
  return pct;
}

// ── Sparkline mini-chart ──────────────────────────────────────────────────────
function Sparkline({ data = [], color = '#3b82f6', height = 40, width = 100 }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle
        cx={parseFloat(pts.split(' ').pop().split(',')[0])}
        cy={parseFloat(pts.split(' ').pop().split(',')[1])}
        r={3} fill={color}
      />
    </svg>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({ platform, metrics, history, selected, onClick }) {
  const prev = history.at(-2);
  const viewDelta = prev ? delta(metrics.views, prev.views) : null;

  return (
    <div
      onClick={onClick}
      style={{
        background:    selected ? `${platform.color}22` : '#1e293b',
        border:        `2px solid ${selected ? platform.accent : '#334155'}`,
        borderRadius:  12, padding: 20, cursor: 'pointer',
        transition:    'all 0.2s', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{platform.emoji}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc' }}>{platform.name}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>@nexusaipro</div>
        </div>
        {viewDelta !== null && (
          <div style={{
            marginLeft: 'auto', fontSize: 12, fontWeight: 600,
            color: viewDelta >= 0 ? '#22c55e' : '#ef4444',
          }}>
            {viewDelta >= 0 ? '▲' : '▼'} {Math.abs(viewDelta).toFixed(1)}%
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[['👁 Views', metrics.views], ['❤️ Likes', metrics.likes],
          ['📡 Reach', metrics.reach], ['⏱ Retention', `${metrics.retention}%`]].map(([label, val]) => (
          <div key={label} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
              {typeof val === 'number' ? fmt(val) : val}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <Sparkline
          data={history.map((h) => h.views)}
          color={platform.accent}
          width={200} height={36}
        />
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ platform, metrics, history }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
      <h3 style={{ color: '#f8fafc', marginBottom: 20, fontSize: 18 }}>
        {platform.emoji} {platform.name} — Detailed Analytics
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        {METRIC_KEYS.map((key) => (
          <div key={key} style={{ background: '#0f172a', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{key}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: platform.accent, marginTop: 4 }}>
              {key === 'retention' ? `${metrics[key]}%` : fmt(metrics[key] || 0)}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Views over time (last 20 ticks)</div>
        <svg width="100%" height={80} viewBox="0 0 400 80" preserveAspectRatio="none">
          {history.length > 1 && (() => {
            const min = Math.min(...history.map((h) => h.views));
            const max = Math.max(...history.map((h) => h.views));
            const range = max - min || 1;
            const pts = history.map((h, i) => {
              const x = (i / (history.length - 1)) * 400;
              const y = 80 - ((h.views - min) / range) * 70;
              return `${x},${y}`;
            }).join(' ');
            return (
              <>
                <polyline points={pts} fill="none" stroke={platform.accent} strokeWidth={2.5} strokeLinejoin="round" />
                <polyline
                  points={`0,80 ${pts} 400,80`}
                  fill={`${platform.accent}20`} stroke="none"
                />
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

// ── Main Analytics Dashboard ──────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [metrics, setMetrics]     = useState({});
  const [history, setHistory]     = useState({});
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState('all');
  const [autoRefresh, setAuto]    = useState(true);
  const [lastUpdate, setLast]     = useState(null);
  const intervalRef               = useRef(null);

  const refresh = useCallback(() => {
    const next = {};
    PLATFORMS.forEach((p) => { next[p.id] = generatePlatformMetrics(p.id); });
    setMetrics(next);
    setHistory((prev) => {
      const updated = { ...prev };
      PLATFORMS.forEach((p) => {
        const arr = [...(prev[p.id] || []), next[p.id]];
        updated[p.id] = arr.slice(-20);        // keep last 20 data points
      });
      return updated;
    });
    setLast(new Date());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 5_000);   // update every 5 s
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, refresh]);

  const visiblePlatforms = filter === 'all'
    ? PLATFORMS
    : PLATFORMS.filter((p) => p.id === filter);

  const selPlatform  = PLATFORMS.find((p) => p.id === selected);
  const selMetrics   = metrics[selected] || {};
  const selHistory   = history[selected] || [];

  // Aggregate totals
  const totals = PLATFORMS.reduce((acc, p) => {
    const m = metrics[p.id] || {};
    acc.views    += m.views    || 0;
    acc.likes    += m.likes    || 0;
    acc.reach    += m.reach    || 0;
    acc.followers += m.followers || 0;
    return acc;
  }, { views: 0, likes: 0, reach: 0, followers: 0 });

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: 24, fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', margin: 0 }}>📊 Analytics Dashboard</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            Real-time cross-platform metrics
            {lastUpdate && ` · Updated ${lastUpdate.toLocaleTimeString()}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setAuto((v) => !v)}
            style={{ background: autoRefresh ? '#22c55e22' : '#334155', color: autoRefresh ? '#22c55e' : '#94a3b8', border: `1px solid ${autoRefresh ? '#22c55e' : '#475569'}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {autoRefresh ? '🔴 Live' : '⚡ Start Live'}
          </button>
          <button onClick={refresh} style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Aggregate KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[['Total Views', totals.views, '👁'], ['Total Likes', totals.likes, '❤️'], ['Total Reach', totals.reach, '📡'], ['Total Followers', totals.followers, '👥']].map(([label, val, icon]) => (
          <div key={label} style={{ background: '#1e293b', borderRadius: 12, padding: '20px 22px', border: '1px solid #334155' }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 8 }}>{fmt(val)}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Platform filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setFilter('all')} style={filterBtnStyle(filter === 'all')}>All Platforms</button>
        {PLATFORMS.map((p) => (
          <button key={p.id} onClick={() => setFilter(p.id)} style={filterBtnStyle(filter === p.id)}>
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      {/* Platform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
        {visiblePlatforms.map((p) => (
          <PlatformCard
            key={p.id}
            platform={p}
            metrics={metrics[p.id] || {}}
            history={history[p.id] || []}
            selected={selected === p.id}
            onClick={() => setSelected((s) => s === p.id ? null : p.id)}
          />
        ))}
      </div>

      {/* Detail panel */}
      {selPlatform && (
        <div style={{ marginTop: 28 }}>
          <DetailPanel platform={selPlatform} metrics={selMetrics} history={selHistory} />
        </div>
      )}
    </div>
  );
}

function filterBtnStyle(active) {
  return {
    background: active ? '#3b82f622' : '#1e293b',
    color: active ? '#60a5fa' : '#94a3b8',
    border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
    borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  };
}
