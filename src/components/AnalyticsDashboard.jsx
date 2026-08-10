// ================================================
// NEXUS AI PRO - Analytics Dashboard
// Social Media & Creator Analytics
// 2026-08-10 | Version 2.1.0
// ================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Platform config ──────────────────────────────
const PLATFORMS = [
  { key: 'tiktok',    label: 'TikTok',     color: '#69C9D0', icon: '🎵', metrics: ['followers','views','likes','comments','shares','reach','retention'] },
  { key: 'instagram', label: 'Instagram',  color: '#E1306C', icon: '📸', metrics: ['followers','views','likes','comments','shares','reach','retention'] },
  { key: 'facebook',  label: 'Facebook',   color: '#1877F2', icon: '👍', metrics: ['followers','views','likes','comments','shares','reach','retention'] },
  { key: 'twitch',    label: 'Twitch',     color: '#9146FF', icon: '🎮', metrics: ['followers','views','likes','comments','shares','reach','retention'] },
  { key: 'discord',   label: 'Discord',    color: '#5865F2', icon: '💬', metrics: ['members','messages','activeUsers'] },
  { key: 'lemon8',    label: 'Lemon8',     color: '#FFD200', icon: '🍋', metrics: ['followers','views','likes','comments','shares'] },
  { key: 'reddit',    label: 'Reddit',     color: '#FF4500', icon: '🤖', metrics: ['karma','posts','comments','upvoteRatio'] },
  { key: 'redgifs',   label: 'RedGifs',    color: '#E53935', icon: '🔴', metrics: ['views','likes','shares'] }
];

// ── Utility ──────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pct(n) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function sparkValue(history, key) {
  if (!history?.length) return [];
  return history.map(h => h.metrics?.[key] ?? 0).slice(-12);
}

// ── Mini sparkline (pure SVG) ─────────────────────
function Sparkline({ data = [], color = '#4ade80' }) {
  if (!data.length) return <span style={{ color: '#555', fontSize: 10 }}>no data</span>;
  const max = Math.max(...data, 1);
  const W = 80, H = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Stat tile ────────────────────────────────────
function StatTile({ label, value, sub, color, history, histKey }) {
  const spark = sparkValue(history, histKey);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '12px 16px', display: 'flex',
      flexDirection: 'column', gap: 4, minWidth: 120
    }}>
      <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: color || '#fff' }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: '#666' }}>{sub}</span>}
      <Sparkline data={spark} color={color || '#4ade80'} />
    </div>
  );
}

// ── Platform card ────────────────────────────────
function PlatformCard({ platform, data, history }) {
  const { key, label, color, icon } = platform;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`,
      borderRadius: 14, padding: '20px', marginBottom: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h3 style={{ margin: 0, color: color, fontSize: 16, fontWeight: 700 }}>{label}</h3>
        <span style={{
          marginLeft: 'auto', fontSize: 10, color: data?.updatedAt ? '#4ade80' : '#666',
          background: data?.updatedAt ? 'rgba(74,222,128,0.1)' : 'rgba(100,100,100,0.1)',
          padding: '2px 8px', borderRadius: 4
        }}>
          {data?.updatedAt ? '● LIVE' : '○ Awaiting data'}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {platform.metrics.map(m => (
          <StatTile
            key={m}
            label={m}
            value={
              m === 'retention' ? pct(data?.[m]) :
              m === 'upvoteRatio' ? pct(data?.[m]) :
              fmt(data?.[m])
            }
            color={color}
            history={history?.filter(h => h.platform === key)}
            histKey={m}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Analytics Dashboard ─────────────────────
export default function AnalyticsDashboard({ authToken }) {
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [activePlatform, setActivePlatform] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const socketRef = useRef(null);

  const headers = { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, historyRes] = await Promise.all([
        fetch('/api/analytics/overview', { headers }),
        fetch('/api/analytics/history?limit=200', { headers })
      ]);
      if (!overviewRes.ok) throw new Error(`Analytics API error ${overviewRes.status}`);
      const [ov, hist] = await Promise.all([overviewRes.json(), historyRes.json()]);
      setOverview(ov);
      setHistory(hist);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  // Initial load + polling fallback every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Dynamically import socket.io-client to avoid SSR issues
      import('socket.io-client').then(({ io }) => {
        const socket = io(window.location.origin, { auth: authToken ? { token: authToken } : {} });
        socketRef.current = socket;
        socket.on('analytics:update', ({ platform, metrics }) => {
          setOverview(prev => prev ? {
            ...prev,
            platforms: { ...prev.platforms, [platform]: { ...prev.platforms[platform], ...metrics, updatedAt: Date.now() } }
          } : prev);
          setHistory(prev => [...prev, { platform, metrics, ts: Date.now() }].slice(-200));
          setLastUpdated(new Date().toLocaleTimeString());
        });
        return () => socket.disconnect();
      }).catch(() => {/* socket.io-client not installed — polling only */});
    } catch { /* fallback to polling */ }
  }, [authToken]);

  const visiblePlatforms = activePlatform === 'all'
    ? PLATFORMS
    : PLATFORMS.filter(p => p.key === activePlatform);

  const totalReach  = overview?.summary?.totalReach  ?? 0;
  const totalViews  = overview?.summary?.totalViews  ?? 0;
  const totalLikes  = overview?.summary?.totalLikes  ?? 0;

  const s = {
    wrap: { background: '#0a0a0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '24px' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    summary: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
    summaryCard: { flex: '1 1 160px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' },
    tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
    tab: (active) => ({
      padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
      background: active ? '#4f46e5' : 'rgba(255,255,255,0.06)',
      color: active ? '#fff' : '#aaa', fontWeight: active ? 600 : 400, transition: 'all .15s'
    })
  };

  if (loading) return (
    <div style={{ ...s.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div>Loading analytics…</div>
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <h2 style={s.title}>📊 Analytics Dashboard</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {lastUpdated && <span style={{ fontSize: 11, color: '#555' }}>Updated {lastUpdated}</span>}
          <button
            onClick={fetchData}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
          >⟳ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Summary row */}
      <div style={s.summary}>
        {[
          { label: 'Total Reach', value: fmt(totalReach), icon: '📡', color: '#60a5fa' },
          { label: 'Total Views',  value: fmt(totalViews),  icon: '👁',  color: '#34d399' },
          { label: 'Total Likes',  value: fmt(totalLikes),  icon: '❤️',  color: '#f87171' },
          { label: 'Platforms',    value: PLATFORMS.length, icon: '🌐', color: '#a78bfa' }
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={s.summaryCard}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{icon} {label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Platform tabs */}
      <div style={s.tabs}>
        <button style={s.tab(activePlatform === 'all')} onClick={() => setActivePlatform('all')}>All Platforms</button>
        {PLATFORMS.map(p => (
          <button key={p.key} style={s.tab(activePlatform === p.key)} onClick={() => setActivePlatform(p.key)}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Platform cards */}
      {visiblePlatforms.map(platform => (
        <PlatformCard
          key={platform.key}
          platform={platform}
          data={overview?.platforms?.[platform.key]}
          history={history}
        />
      ))}
    </div>
  );
}
