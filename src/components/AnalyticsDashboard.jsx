// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File created: 2026-08-06

import React, { useState, useEffect, useRef, useCallback } from 'react';

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',     icon: '🎵', color: '#010101', accent: '#fe2c55' },
  { id: 'instagram', name: 'Instagram',  icon: '📸', color: '#833ab4', accent: '#fd1d1d' },
  { id: 'facebook',  name: 'Facebook',   icon: '👥', color: '#1877f2', accent: '#166fe5' },
  { id: 'twitch',    name: 'Twitch',     icon: '🎮', color: '#9146ff', accent: '#6441a5' },
  { id: 'discord',   name: 'Discord',    icon: '💬', color: '#5865f2', accent: '#4752c4' },
  { id: 'lemon8',    name: 'Lemon8',     icon: '🍋', color: '#f7c31e', accent: '#e6b800' },
  { id: 'reddit',    name: 'Reddit',     icon: '🤖', color: '#ff4500', accent: '#e03d00' },
  { id: 'redgifs',   name: 'RedGIFs',    icon: '🔴', color: '#c0392b', accent: '#a93226' },
];

const EMPTY_METRICS = () => ({
  views: 0, likes: 0, reach: 0, retention: 0,
  followers: 0, engagementRate: 0, comments: 0, shares: 0,
  trend: Array.from({ length: 7 }, () => 0),
});

function generateMock(seed = 1) {
  const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  return Object.fromEntries(
    PLATFORMS.map(p => [p.id, {
      views:          r(1_000, 5_000_000) * seed,
      likes:          r(500,   500_000)   * seed,
      reach:          r(2_000, 8_000_000) * seed,
      retention:      r(20, 85),
      followers:      r(100,  2_000_000)  * seed,
      engagementRate: parseFloat((Math.random() * 12 + 0.5).toFixed(2)),
      comments:       r(50,   100_000)    * seed,
      shares:         r(10,    50_000)    * seed,
      trend:          Array.from({ length: 7 }, () => r(5_000, 500_000) * seed),
    }])
  );
}

const STYLE = `
:root { --an-bg: #0f172a; --an-card: #1e293b; --an-text: #e2e8f0; --an-muted: #94a3b8; --an-border: #334155; }
@media (prefers-color-scheme: light) {
  :root { --an-bg: #f8fafc; --an-card: #ffffff; --an-text: #1e293b; --an-muted: #64748b; --an-border: #e2e8f0; }
}
:root[data-theme="light"] { --an-bg: #f8fafc; --an-card: #ffffff; --an-text: #1e293b; --an-muted: #64748b; --an-border: #e2e8f0; }
:root[data-theme="dark"]  { --an-bg: #0f172a; --an-card: #1e293b; --an-text: #e2e8f0; --an-muted: #94a3b8; --an-border: #334155; }
.an-wrap { background: var(--an-bg); color: var(--an-text); min-height: 100vh; font-family: system-ui,sans-serif; padding: 1rem; }
.an-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:.5rem; }
.an-title { font-size:1.5rem; font-weight:700; }
.an-badge { background:#3b82f6; color:#fff; padding:.2rem .6rem; border-radius:9999px; font-size:.7rem; font-weight:600; }
.an-tabs { display:flex; gap:.5rem; margin-bottom:1.5rem; flex-wrap:wrap; }
.an-tab { padding:.4rem .9rem; border-radius:.5rem; cursor:pointer; border:1px solid var(--an-border); background:var(--an-card); color:var(--an-text); font-size:.85rem; transition:background .2s; }
.an-tab.active { background:#3b82f6; color:#fff; border-color:#3b82f6; }
.an-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:1rem; margin-bottom:1.5rem; }
.an-card { background:var(--an-card); border:1px solid var(--an-border); border-radius:.75rem; padding:1rem; }
.an-card-label { font-size:.7rem; color:var(--an-muted); text-transform:uppercase; letter-spacing:.05em; }
.an-card-value { font-size:1.6rem; font-weight:700; margin:.2rem 0; }
.an-card-sub { font-size:.75rem; color:var(--an-muted); }
.an-table { width:100%; border-collapse:collapse; }
.an-table th { text-align:left; padding:.5rem; font-size:.75rem; color:var(--an-muted); border-bottom:1px solid var(--an-border); }
.an-table td { padding:.6rem .5rem; font-size:.85rem; border-bottom:1px solid var(--an-border); }
.an-badge-green { background:#22c55e22; color:#22c55e; padding:.1rem .4rem; border-radius:9999px; font-size:.7rem; }
.an-badge-blue  { background:#3b82f622; color:#3b82f6; padding:.1rem .4rem; border-radius:9999px; font-size:.7rem; }
.an-bar-wrap { height:.4rem; background:var(--an-border); border-radius:9999px; overflow:hidden; width:80px; display:inline-block; }
.an-bar-fill { height:100%; border-radius:9999px; background:#3b82f6; }
.an-sparkline { display:block; }
.an-retention-row { display:flex; align-items:center; gap:.5rem; margin:.3rem 0; font-size:.8rem; }
.an-ret-bar { height:1rem; border-radius:.25rem; min-width:4px; }
.an-dot-live { width:.5rem; height:.5rem; background:#22c55e; border-radius:50%; display:inline-block; animation:blink 1s infinite; margin-right:.3rem; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
`;

function fmt(n) { return Number(n).toLocaleString(); }
function fmtPct(n) { return `${Number(n).toFixed(1)}%`; }

function Sparkline({ values, color = '#3b82f6', width = 80, height = 28 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="an-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryCards({ metrics }) {
  const totals = PLATFORMS.reduce((acc, p) => {
    const m = metrics[p.id] || EMPTY_METRICS();
    acc.views     += m.views;
    acc.reach     += m.reach;
    acc.likes     += m.likes;
    acc.followers += m.followers;
    return acc;
  }, { views: 0, reach: 0, likes: 0, followers: 0 });
  const avgEng = (PLATFORMS.reduce((a, p) => a + (metrics[p.id]?.engagementRate || 0), 0) / PLATFORMS.length).toFixed(2);

  const cards = [
    { label: 'Total Views',      value: fmt(totals.views),     sub: 'All platforms',   color: '#3b82f6' },
    { label: 'Total Reach',      value: fmt(totals.reach),     sub: 'Unique accounts',  color: '#8b5cf6' },
    { label: 'Total Likes',      value: fmt(totals.likes),     sub: 'Across platforms', color: '#ec4899' },
    { label: 'Total Followers',  value: fmt(totals.followers), sub: 'Combined audience',color: '#22c55e' },
    { label: 'Avg Engagement',   value: `${avgEng}%`,          sub: 'Platform average', color: '#f59e0b' },
  ];
  return (
    <div className="an-grid">
      {cards.map(c => (
        <div key={c.label} className="an-card">
          <div className="an-card-label">{c.label}</div>
          <div className="an-card-value" style={{ color: c.color }}>{c.value}</div>
          <div className="an-card-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

function OverviewTable({ metrics }) {
  return (
    <div className="an-card">
      <table className="an-table">
        <thead>
          <tr>
            <th>Platform</th><th>Views</th><th>Reach</th><th>Likes</th>
            <th>Engagement</th><th>7d Trend</th>
          </tr>
        </thead>
        <tbody>
          {PLATFORMS.map(p => {
            const m = metrics[p.id] || EMPTY_METRICS();
            return (
              <tr key={p.id}>
                <td><span style={{ marginRight: '.4rem' }}>{p.icon}</span><strong>{p.name}</strong></td>
                <td>{fmt(m.views)}</td>
                <td>{fmt(m.reach)}</td>
                <td>{fmt(m.likes)}</td>
                <td>
                  <span className="an-badge-blue">{fmtPct(m.engagementRate)}</span>
                  <div className="an-bar-wrap" style={{ marginLeft: '.4rem' }}>
                    <div className="an-bar-fill" style={{ width: `${Math.min(m.engagementRate * 8, 100)}%`, background: p.accent }} />
                  </div>
                </td>
                <td><Sparkline values={m.trend} color={p.accent} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RetentionPanel({ metrics }) {
  return (
    <div className="an-card">
      <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Audience Retention by Platform</div>
      {PLATFORMS.map(p => {
        const ret = metrics[p.id]?.retention || 0;
        return (
          <div key={p.id} className="an-retention-row">
            <span style={{ width: 90, fontSize: '.8rem' }}>{p.icon} {p.name}</span>
            <div style={{ flex: 1, background: 'var(--an-border)', borderRadius: 9999, height: '1rem', overflow: 'hidden' }}>
              <div className="an-ret-bar" style={{ width: `${ret}%`, background: p.accent }} />
            </div>
            <span style={{ width: 36, textAlign: 'right', fontWeight: 600 }}>{ret}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(() => generateMock(1));
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const intervalRef = useRef(null);
  const styleRef = useRef(false);

  if (!styleRef.current) {
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
    styleRef.current = true;
  }

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/metrics');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setMetrics(data);
    } catch {
      setMetrics(generateMock(1));
    }
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMetrics().finally(() => setLoading(false));
    intervalRef.current = setInterval(fetchMetrics, 3000);
    return () => clearInterval(intervalRef.current);
  }, [fetchMetrics]);

  const tabs = ['overview', 'platform', 'retention'];

  return (
    <div className="an-wrap">
      <div className="an-header">
        <div>
          <div className="an-title">📊 Analytics Dashboard</div>
          <div style={{ fontSize: '.8rem', color: 'var(--an-muted)' }}>
            <span className="an-dot-live" />
            Live · Updated {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <span className="an-badge">{loading ? 'Refreshing…' : `${PLATFORMS.length} Platforms`}</span>
      </div>

      <div className="an-tabs">
        {tabs.map(t => (
          <button key={t} className={`an-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <SummaryCards metrics={metrics} />
          <OverviewTable metrics={metrics} />
        </>
      )}

      {activeTab === 'platform' && (
        <div className="an-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
          {PLATFORMS.map(p => {
            const m = metrics[p.id] || EMPTY_METRICS();
            return (
              <div key={p.id} className="an-card" style={{ borderTop: `3px solid ${p.accent}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
                  <strong>{p.name}</strong>
                  <span className="an-badge-green">{fmtPct(m.engagementRate)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                  {[['Views', m.views], ['Reach', m.reach], ['Likes', m.likes], ['Followers', m.followers],
                    ['Comments', m.comments], ['Shares', m.shares]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: '.68rem', color: 'var(--an-muted)', textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontWeight: 700 }}>{fmt(v)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '.75rem' }}>
                  <div style={{ fontSize: '.68rem', color: 'var(--an-muted)', marginBottom: '.2rem' }}>7-DAY TREND</div>
                  <Sparkline values={m.trend} color={p.accent} width={200} height={40} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'retention' && <RetentionPanel metrics={metrics} />}
    </div>
  );
}

export default AnalyticsDashboard;
