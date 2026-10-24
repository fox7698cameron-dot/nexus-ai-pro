/**
 * AnalyticsDashboard.jsx
 * Created: 2026-10-24
 * Real-time social media analytics: TikTok, Instagram, Facebook, Twitch,
 * Discord, Lemon8, Reddit, RedGIFs — views, likes, reach, retention.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',     color: '#010101', accent: '#fe2c55', icon: '🎵' },
  { id: 'instagram', name: 'Instagram',  color: '#833ab4', accent: '#fd1d1d', icon: '📸' },
  { id: 'facebook',  name: 'Facebook',   color: '#1877f2', accent: '#42b72a', icon: '👥' },
  { id: 'twitch',    name: 'Twitch',     color: '#9146ff', accent: '#bf94ff', icon: '🎮' },
  { id: 'discord',   name: 'Discord',    color: '#5865f2', accent: '#57f287', icon: '💬' },
  { id: 'lemon8',    name: 'Lemon8',     color: '#ffd000', accent: '#ff5c00', icon: '🍋' },
  { id: 'reddit',    name: 'Reddit',     color: '#ff4500', accent: '#ff6534', icon: '🤖' },
  { id: 'redgifs',   name: 'RedGIFs',    color: '#e00000', accent: '#ff6666', icon: '🔴' },
];

// Mock real-time data generator — replace with live API calls per platform
function generateMockMetrics(platformId, prev = null) {
  const base = prev || {
    views: Math.floor(Math.random() * 500000) + 50000,
    likes: Math.floor(Math.random() * 50000) + 5000,
    shares: Math.floor(Math.random() * 10000) + 500,
    comments: Math.floor(Math.random() * 5000) + 200,
    followers: Math.floor(Math.random() * 1000000) + 10000,
    reach: Math.floor(Math.random() * 800000) + 100000,
    retention: Math.random() * 40 + 40,
    liveViewers: platformId === 'twitch' ? Math.floor(Math.random() * 50000) : 0,
    watchTimeMins: Math.floor(Math.random() * 200000) + 10000,
  };

  // Simulate small real-time changes
  const delta = (v, pct = 0.005) => Math.max(0, Math.round(v * (1 + (Math.random() - 0.48) * pct)));
  return {
    views: delta(base.views, 0.008),
    likes: delta(base.likes, 0.006),
    shares: delta(base.shares, 0.004),
    comments: delta(base.comments, 0.005),
    followers: delta(base.followers, 0.001),
    reach: delta(base.reach, 0.007),
    retention: Math.min(100, Math.max(0, base.retention + (Math.random() - 0.5) * 0.5)),
    liveViewers: platformId === 'twitch' ? delta(base.liveViewers, 0.03) : 0,
    watchTimeMins: delta(base.watchTimeMins, 0.003),
  };
}

function formatNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null;
  const w = 80, h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, prev, color, spark }) {
  const up = prev != null ? value >= prev : null;
  const pct = prev != null && prev !== 0 ? (((value - prev) / prev) * 100).toFixed(2) : null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', minWidth: 120 }}>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{typeof value === 'number' && !isNaN(value) ? (value < 1 ? value.toFixed(1) + '%' : formatNum(Math.round(value))) : '—'}</div>
      {pct !== null && (
        <div style={{ fontSize: 11, color: up ? '#4ade80' : '#f87171', marginTop: 2 }}>
          {up ? '▲' : '▼'} {Math.abs(pct)}%
        </div>
      )}
      {spark && <div style={{ marginTop: 4 }}><Sparkline values={spark} color={color} /></div>}
    </div>
  );
}

function PlatformPanel({ platform, metrics, history }) {
  const m = metrics || {};
  const h = history || {};
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${platform.accent}44`,
      borderRadius: 14,
      padding: '16px 20px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 24 }}>{platform.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: platform.accent }}>{platform.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#666', background: '#111', padding: '2px 8px', borderRadius: 8 }}>LIVE</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <MetricCard label="Views" value={m.views} prev={h.views} color={platform.accent} spark={h.viewsHistory} />
        <MetricCard label="Likes" value={m.likes} prev={h.likes} color={platform.accent} />
        <MetricCard label="Reach" value={m.reach} prev={h.reach} color={platform.accent} spark={h.reachHistory} />
        <MetricCard label="Followers" value={m.followers} prev={h.followers} color={platform.accent} />
        <MetricCard label="Retention" value={m.retention} prev={h.retention} color={platform.accent} />
        <MetricCard label="Shares" value={m.shares} prev={h.shares} color={platform.accent} />
        <MetricCard label="Comments" value={m.comments} prev={h.comments} color={platform.accent} />
        {platform.id === 'twitch' && (
          <MetricCard label="Live Viewers" value={m.liveViewers} prev={h.liveViewers} color={platform.accent} spark={h.liveHistory} />
        )}
        <MetricCard label="Watch Time" value={m.watchTimeMins} prev={h.watchTimeMins} color={platform.accent} />
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState({});
  const [history, setHistory] = useState({});
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const intervalRef = useRef(null);

  const tick = useCallback(() => {
    setMetrics(prev => {
      const next = { ...prev };
      PLATFORMS.forEach(p => {
        next[p.id] = generateMockMetrics(p.id, prev[p.id]);
      });
      return next;
    });
    setHistory(prev => {
      const next = { ...prev };
      PLATFORMS.forEach(p => {
        const m = metrics[p.id];
        if (!m) return;
        next[p.id] = {
          ...prev[p.id],
          views: m.views,
          likes: m.likes,
          reach: m.reach,
          followers: m.followers,
          retention: m.retention,
          shares: m.shares,
          comments: m.comments,
          liveViewers: m.liveViewers,
          watchTimeMins: m.watchTimeMins,
          viewsHistory: [...((prev[p.id]?.viewsHistory) || []).slice(-19), m.views],
          reachHistory: [...((prev[p.id]?.reachHistory) || []).slice(-19), m.reach],
          liveHistory: [...((prev[p.id]?.liveHistory) || []).slice(-19), m.liveViewers],
        };
      });
      return next;
    });
    setLastUpdated(Date.now());
  }, [metrics]);

  useEffect(() => {
    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(tick, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive, tick]);

  const visiblePlatforms = selectedPlatform
    ? PLATFORMS.filter(p => p.id === selectedPlatform)
    : PLATFORMS;

  // Aggregate totals across all platforms
  const totals = PLATFORMS.reduce((acc, p) => {
    const m = metrics[p.id] || {};
    return {
      views: acc.views + (m.views || 0),
      likes: acc.likes + (m.likes || 0),
      reach: acc.reach + (m.reach || 0),
      followers: acc.followers + (m.followers || 0),
    };
  }, { views: 0, likes: 0, reach: 0, followers: 0 });

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '0 4px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📊 Analytics Dashboard</h2>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        </div>
        <button
          onClick={() => setIsLive(v => !v)}
          style={{
            background: isLive ? '#4ade8022' : '#f8717122',
            border: `1px solid ${isLive ? '#4ade80' : '#f87171'}`,
            color: isLive ? '#4ade80' : '#f87171',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {isLive ? '● LIVE' : '○ PAUSED'}
        </button>
      </div>

      {/* Aggregated totals */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Total Views', value: totals.views, icon: '👁' },
          { label: 'Total Likes', value: totals.likes, icon: '❤️' },
          { label: 'Total Reach', value: totals.reach, icon: '📡' },
          { label: 'Total Followers', value: totals.followers, icon: '👥' },
        ].map(t => (
          <div key={t.label} style={{
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '12px 18px',
            minWidth: 140,
          }}>
            <div style={{ fontSize: 18 }}>{t.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{formatNum(t.value)}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* Platform filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => setSelectedPlatform(null)}
          style={{
            background: !selectedPlatform ? '#ffffff22' : 'transparent',
            border: '1px solid #444',
            color: '#ccc',
            borderRadius: 8,
            padding: '4px 12px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          All
        </button>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlatform(prev => prev === p.id ? null : p.id)}
            style={{
              background: selectedPlatform === p.id ? `${p.accent}33` : 'transparent',
              border: `1px solid ${selectedPlatform === p.id ? p.accent : '#444'}`,
              color: selectedPlatform === p.id ? p.accent : '#ccc',
              borderRadius: 8,
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      {/* Platform panels */}
      {visiblePlatforms.map(p => (
        <PlatformPanel
          key={p.id}
          platform={p}
          metrics={metrics[p.id]}
          history={history[p.id]}
        />
      ))}
    </div>
  );
}
