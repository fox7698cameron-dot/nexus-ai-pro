/**
 * src/components/AnalyticsDashboard.jsx
 * Real-time social media analytics — TikTok, Instagram, Facebook,
 * Twitch, Discord, Lemon8, Reddit, RedGIFs
 * Updated: 2026-10-04
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const PLATFORMS = {
  tiktok:    { name: 'TikTok',    color: '#69C9D0', accent: '#EE1D52', icon: '🎵' },
  instagram: { name: 'Instagram', color: '#E1306C', accent: '#833AB4', icon: '📸' },
  facebook:  { name: 'Facebook',  color: '#1877F2', accent: '#42B72A', icon: '📘' },
  twitch:    { name: 'Twitch',    color: '#9146FF', accent: '#F0F', icon: '🎮' },
  discord:   { name: 'Discord',   color: '#5865F2', accent: '#EB459E', icon: '💬' },
  lemon8:    { name: 'Lemon8',    color: '#FFB347', accent: '#FF6B35', icon: '🍋' },
  reddit:    { name: 'Reddit',    color: '#FF4500', accent: '#FF6314', icon: '🔴' },
  redgifs:   { name: 'RedGIFs',   color: '#FF2252', accent: '#FF6B6B', icon: '🎞️' },
};

const fmtNum = n => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n ?? 0);
const fmtPct = n => `${(n ?? 0).toFixed(1)}%`;

function MetricCard({ label, value, delta, color }) {
  const up = delta >= 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '14px 16px', border: `1px solid ${color}30` }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{value}</div>
      {delta != null && (
        <div style={{ fontSize: 11, color: up ? '#4ade80' : '#f87171', marginTop: 2 }}>
          {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function RetentionBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 3 }}>
        <span>{label}</span><span>{fmtPct(pct)}</span>
      </div>
      <div style={{ height: 6, background: '#333', borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function PlatformPanel({ id, data, expanded, onToggle }) {
  const p = PLATFORMS[id];
  if (!data) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${p.color}40`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <button
        onClick={() => onToggle(id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}
      >
        <span style={{ fontSize: 22 }}>{p.icon}</span>
        <span style={{ fontWeight: 600, fontSize: 15, flex: 1, textAlign: 'left' }}>{p.name}</span>
        {data.live && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#ef444430', color: '#f87171', marginRight: 8 }}>● LIVE</span>
        )}
        <span style={{ color: '#888', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 18px' }}>
          {/* Core metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
            {data.metrics && Object.entries(data.metrics).map(([k, v]) => (
              <MetricCard key={k} label={k} value={fmtNum(v.value)} delta={v.delta} color={p.color} />
            ))}
          </div>

          {/* Retention */}
          {data.retention && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Retention / Watch Time</div>
              {data.retention.map((r, i) => (
                <RetentionBar key={i} label={r.label} pct={r.pct} color={p.color} />
              ))}
            </div>
          )}

          {/* Live stream (Twitch / TikTok) */}
          {data.stream && (
            <div style={{ background: `${p.color}15`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Live Stream</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#fff' }}>👁️ {fmtNum(data.stream.viewers)} viewers</span>
                <span style={{ fontSize: 13, color: '#fff' }}>⏱️ {data.stream.duration}</span>
                <span style={{ fontSize: 13, color: '#4ade80' }}>💰 ${data.stream.revenue?.toFixed(2) ?? '0.00'}</span>
              </div>
            </div>
          )}

          {/* Recent activity */}
          {data.recentActivity && (
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Activity</div>
              {data.recentActivity.slice(0, 4).map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #ffffff10', fontSize: 12 }}>
                  <span style={{ color: '#ccc' }}>{a.label}</span>
                  <span style={{ color: p.color, fontWeight: 600 }}>{fmtNum(a.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function generateMockData(id) {
  const rand = (min, max) => Math.floor(Math.random() * (max - min) + min);
  const delta = () => (Math.random() * 20 - 5);

  const base = {
    tiktok: {
      live: Math.random() > 0.7,
      metrics: {
        Views:     { value: rand(50000, 5000000), delta: delta() },
        Likes:     { value: rand(2000, 500000),   delta: delta() },
        Followers: { value: rand(10000, 2000000), delta: delta() },
        Shares:    { value: rand(500, 50000),     delta: delta() },
        Comments:  { value: rand(200, 20000),     delta: delta() },
      },
      retention: [
        { label: 'Avg Watch %', pct: rand(35, 80) },
        { label: '3s View Rate', pct: rand(60, 95) },
        { label: 'Full Play',    pct: rand(20, 55) },
      ],
      stream: Math.random() > 0.5 ? { viewers: rand(200, 50000), duration: `${rand(0,8)}h ${rand(0,59)}m`, revenue: rand(0, 2000) } : null,
      recentActivity: [
        { label: 'Top video today',      value: rand(10000, 500000) },
        { label: 'FYP impressions',      value: rand(100000, 5000000) },
        { label: 'Profile visits',       value: rand(1000, 50000) },
        { label: 'New followers today',  value: rand(50, 5000) },
      ],
    },
    instagram: {
      metrics: {
        Reach:       { value: rand(5000, 1000000), delta: delta() },
        Impressions: { value: rand(10000, 2000000), delta: delta() },
        Likes:       { value: rand(500, 100000), delta: delta() },
        Followers:   { value: rand(5000, 500000), delta: delta() },
        Saves:       { value: rand(200, 20000), delta: delta() },
      },
      retention: [
        { label: 'Story completion', pct: rand(30, 75) },
        { label: 'Reel avg watch %', pct: rand(40, 85) },
      ],
      recentActivity: [
        { label: 'Top Reel reach',   value: rand(5000, 200000) },
        { label: 'Story views',      value: rand(1000, 30000) },
        { label: 'Profile visits',   value: rand(500, 20000) },
        { label: 'New follows',      value: rand(20, 2000) },
      ],
    },
    facebook: {
      metrics: {
        Reach:     { value: rand(1000, 500000), delta: delta() },
        'Page Likes': { value: rand(500, 100000), delta: delta() },
        Engagement: { value: rand(100, 20000), delta: delta() },
        Shares:     { value: rand(50, 5000), delta: delta() },
      },
      recentActivity: [
        { label: 'Top post reach',  value: rand(1000, 100000) },
        { label: 'Video views',     value: rand(500, 50000) },
        { label: 'Link clicks',     value: rand(100, 10000) },
        { label: 'New page likes',  value: rand(10, 500) },
      ],
    },
    twitch: {
      live: Math.random() > 0.5,
      metrics: {
        Followers:    { value: rand(500, 200000), delta: delta() },
        Subscribers:  { value: rand(50, 5000), delta: delta() },
        'Peak Viewers': { value: rand(10, 10000), delta: delta() },
        'Hours Watched': { value: rand(100, 50000), delta: delta() },
      },
      stream: Math.random() > 0.4 ? { viewers: rand(10, 5000), duration: `${rand(0,12)}h ${rand(0,59)}m`, revenue: rand(0, 500) } : null,
      retention: [
        { label: 'Avg concurrent %', pct: rand(40, 85) },
        { label: 'Clip share rate',  pct: rand(5, 30) },
      ],
      recentActivity: [
        { label: 'New subs today',   value: rand(0, 100) },
        { label: 'Bits received',    value: rand(0, 10000) },
        { label: 'Clips created',    value: rand(0, 50) },
        { label: 'Raid participants', value: rand(0, 500) },
      ],
    },
    discord: {
      metrics: {
        Members:     { value: rand(100, 100000), delta: delta() },
        Online:      { value: rand(10, 10000), delta: delta() },
        'Msg/Day':   { value: rand(50, 20000), delta: delta() },
        Boosts:      { value: rand(0, 30), delta: delta() },
      },
      recentActivity: [
        { label: 'New members today',  value: rand(0, 200) },
        { label: 'Voice hours today',  value: rand(0, 500) },
        { label: 'Reactions today',    value: rand(0, 2000) },
        { label: 'Commands used',      value: rand(0, 1000) },
      ],
    },
    lemon8: {
      metrics: {
        Views:    { value: rand(500, 100000), delta: delta() },
        Likes:    { value: rand(100, 20000),  delta: delta() },
        Followers:{ value: rand(100, 50000),  delta: delta() },
        Saves:    { value: rand(50, 5000),    delta: delta() },
      },
      recentActivity: [
        { label: 'Top post views',   value: rand(500, 50000) },
        { label: 'Profile visits',   value: rand(100, 5000) },
        { label: 'New followers',    value: rand(5, 500) },
        { label: 'Comments today',   value: rand(10, 500) },
      ],
    },
    reddit: {
      metrics: {
        'Post Karma':    { value: rand(100, 500000), delta: delta() },
        'Comment Karma': { value: rand(100, 200000), delta: delta() },
        Upvotes:         { value: rand(50, 50000),   delta: delta() },
        Awards:          { value: rand(0, 100),      delta: delta() },
      },
      recentActivity: [
        { label: 'Top post upvotes', value: rand(100, 20000) },
        { label: 'New subscribers',  value: rand(0, 1000) },
        { label: 'Comments today',   value: rand(10, 2000) },
        { label: 'Cross posts',      value: rand(0, 50) },
      ],
    },
    redgifs: {
      metrics: {
        Views:    { value: rand(1000, 5000000), delta: delta() },
        Likes:    { value: rand(100, 100000),   delta: delta() },
        Followers:{ value: rand(100, 200000),   delta: delta() },
        Shares:   { value: rand(50, 20000),     delta: delta() },
      },
      retention: [
        { label: 'Avg view %',   pct: rand(30, 70) },
        { label: 'Full plays',   pct: rand(20, 60) },
        { label: 'Loop rate',    pct: rand(40, 80) },
      ],
      recentActivity: [
        { label: 'Top GIF views',    value: rand(5000, 500000) },
        { label: 'New followers',    value: rand(10, 2000) },
        { label: 'Downloads today',  value: rand(50, 5000) },
        { label: 'Trending rank',    value: rand(1, 500) },
      ],
    },
  };
  return base[id];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState({});
  const [expanded, setExpanded] = useState({ tiktok: true, twitch: true });
  const [activeOnly, setActiveOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(() => {
    setRefreshing(true);
    // Simulate API call — replace with real platform API calls via /api/analytics/:platform
    const fresh = {};
    Object.keys(PLATFORMS).forEach(id => { fresh[id] = generateMockData(id); });
    setData(fresh);
    setLastUpdated(new Date().toLocaleTimeString());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const totalReach = Object.values(data).reduce((acc, d) => {
    if (!d?.metrics) return acc;
    const v = d.metrics.Views || d.metrics.Reach || d.metrics.Impressions;
    return acc + (v?.value ?? 0);
  }, 0);

  const liveCount = Object.values(data).filter(d => d?.live).length;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', padding: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>📊 Analytics Dashboard</h1>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            Real-time social metrics · Updated {lastUpdated ?? '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {liveCount > 0 && (
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#ef444430', color: '#f87171' }}>
              ● {liveCount} LIVE
            </span>
          )}
          <button
            onClick={() => setActiveOnly(p => !p)}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #333', background: activeOnly ? '#5865F2' : 'transparent', color: '#fff', cursor: 'pointer' }}
          >
            Active only
          </button>
          <button
            onClick={fetchData}
            disabled={refreshing}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #333', background: 'transparent', color: refreshing ? '#666' : '#fff', cursor: 'pointer' }}
          >
            {refreshing ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 24 }}>
        <MetricCard label="Total Reach" value={fmtNum(totalReach)} color="#5865F2" />
        <MetricCard label="Platforms" value={Object.keys(PLATFORMS).length} color="#9146FF" />
        <MetricCard label="Live Now" value={liveCount} color="#ef4444" />
        <MetricCard label="Tracked Since" value="Today" color="#4ade80" />
      </div>

      {/* Platform panels */}
      {Object.keys(PLATFORMS).map(id => (
        <PlatformPanel
          key={id}
          id={id}
          data={data[id]}
          expanded={!!expanded[id]}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}

export default AnalyticsDashboard;
