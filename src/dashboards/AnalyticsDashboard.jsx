/**
 * @file AnalyticsDashboard.jsx
 * @description Real-Time Social Media Analytics Dashboard
 *   Platforms: TikTok · Instagram · Facebook · Twitch · Discord
 *              Lemon8 · Reddit · RedGifs
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Platform Registry ─────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',    icon: '🎵', color: '#69C9D0', bg: 'rgba(105,201,208,.12)' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E1306C', bg: 'rgba(225,48,108,.12)' },
  { id: 'facebook',  name: 'Facebook',  icon: '👥', color: '#1877F2', bg: 'rgba(24,119,242,.12)' },
  { id: 'twitch',    name: 'Twitch',    icon: '🎮', color: '#9146FF', bg: 'rgba(145,70,255,.12)' },
  { id: 'discord',   name: 'Discord',   icon: '💬', color: '#5865F2', bg: 'rgba(88,101,242,.12)' },
  { id: 'lemon8',    name: 'Lemon8',    icon: '🍋', color: '#FFCC00', bg: 'rgba(255,204,0,.12)' },
  { id: 'reddit',    name: 'Reddit',    icon: '🤖', color: '#FF4500', bg: 'rgba(255,69,0,.12)' },
  { id: 'redgifs',   name: 'RedGIFs',   icon: '🎬', color: '#E94040', bg: 'rgba(233,64,64,.12)' }
];

// ─── Metrics Config ────────────────────────────────────────────────────────────

const METRICS_CONFIG = {
  tiktok:    ['views', 'likes', 'shares', 'comments', 'followers', 'reach', 'retention'],
  instagram: ['impressions', 'reach', 'likes', 'saves', 'shares', 'profile_visits', 'followers'],
  facebook:  ['reach', 'impressions', 'likes', 'shares', 'comments', 'page_views', 'followers'],
  twitch:    ['live_viewers', 'peak_viewers', 'stream_hours', 'followers', 'subscribers', 'bits', 'chat_messages'],
  discord:   ['members', 'online', 'messages', 'voice_users', 'new_members', 'boosts', 'channels'],
  lemon8:    ['views', 'likes', 'saves', 'comments', 'followers', 'reach'],
  reddit:    ['upvotes', 'comments', 'shares', 'subscribers', 'post_karma', 'comment_karma'],
  redgifs:   ['views', 'likes', 'shares', 'followers', 'reach']
};

// ─── Seed deterministic demo data ─────────────────────────────────────────────

function seedMetric(platformId, metric, base) {
  // Deterministic seeding using platform + metric string
  let seed = 0;
  for (const c of `${platformId}${metric}`) seed = (seed * 31 + c.charCodeAt(0)) & 0xffffffff;
  const variance = ((seed >>> 0) % 200) / 100; // 0–2
  return Math.floor(base * variance + base * 0.5);
}

const BASE_VALUES = {
  views: 45000, likes: 3200, shares: 800, comments: 450, followers: 12500,
  reach: 28000, retention: 68, impressions: 55000, saves: 1200, profile_visits: 4500,
  page_views: 8900, live_viewers: 340, peak_viewers: 980, stream_hours: 12,
  subscribers: 88, bits: 1250, chat_messages: 4300, members: 2800, online: 420,
  messages: 18000, voice_users: 65, new_members: 38, boosts: 7, channels: 24,
  upvotes: 5600, post_karma: 34000, comment_karma: 8900, subscribers_rr: 9400
};

function generatePlatformData(platformId) {
  const metricKeys = METRICS_CONFIG[platformId] || [];
  return metricKeys.reduce((acc, key) => {
    const base = BASE_VALUES[key] || BASE_VALUES[key.replace('_rr', '')] || 1000;
    const current = seedMetric(platformId, key, base);
    const prev = Math.floor(current * (0.85 + Math.random() * 0.25));
    acc[key] = { current, prev, delta: current - prev, pct: +(((current - prev) / Math.max(1, prev)) * 100).toFixed(1) };
    return acc;
  }, {});
}

// ─── Spark-line mini chart ─────────────────────────────────────────────────────

function Sparkline({ color, positive }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const rand = 30 + Math.abs(Math.sin(i * 1.3) * 40) + (positive ? i * 2 : -i * 1.5);
    return Math.max(5, Math.min(70, rand));
  });
  const maxP = Math.max(...points);
  const minP = Math.min(...points);
  const H = 40, W = 80;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - minP) / (maxP - minP + 1)) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ─── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ label, data, color }) {
  const positive = data.delta >= 0;
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>
      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label.replace(/_/g, ' ')}
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
        {data.current.toLocaleString()}
      </span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: positive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          {positive ? '▲' : '▼'} {Math.abs(data.pct)}%
        </span>
        <Sparkline color={color} positive={positive} />
      </div>
    </div>
  );
}

// ─── Platform Panel ────────────────────────────────────────────────────────────

function PlatformPanel({ platform, data }) {
  const metrics = Object.entries(data);
  return (
    <div style={{
      background: '#050e1d',
      border: `1px solid ${platform.color}33`,
      borderRadius: 16,
      padding: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: platform.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>
          {platform.icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            {platform.name}
          </h3>
          <span style={{ fontSize: 11, color: '#64748b' }}>Live · Updated just now</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <LiveIndicator />
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 10
      }}>
        {metrics.map(([key, val]) => (
          <MetricCard key={key} label={key} data={val} color={platform.color} />
        ))}
      </div>
    </div>
  );
}

// ─── Live indicator dot ───────────────────────────────────────────────────────

function LiveIndicator() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10b981' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: on ? '#10b981' : 'transparent',
        border: '1px solid #10b981',
        display: 'inline-block', transition: 'background 0.2s'
      }} />
      LIVE
    </span>
  );
}

// ─── Retention Gauge ──────────────────────────────────────────────────────────

function RetentionGauge({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? '#10b981' : pct >= 45 ? '#f59e0b' : '#ef4444';
  const r = 54, cx = 60, cy = 60;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy + 6} textAnchor="middle" fill={color} fontSize={20} fontWeight={700}>
          {pct}%
        </text>
      </svg>
      <div style={{ color: '#64748b', fontSize: 12 }}>Avg. Retention</div>
    </div>
  );
}

// ─── Summary Totals Bar ───────────────────────────────────────────────────────

function SummaryBar({ allData }) {
  const totalReach = PLATFORMS.reduce((sum, p) => {
    const d = allData[p.id] || {};
    const reach = d.reach?.current || d.impressions?.current || d.live_viewers?.current || d.members?.current || 0;
    return sum + reach;
  }, 0);

  const totalFollowers = PLATFORMS.reduce((sum, p) => {
    const d = allData[p.id] || {};
    const f = d.followers?.current || d.subscribers?.current || d.members?.current || 0;
    return sum + f;
  }, 0);

  const totalEngagement = PLATFORMS.reduce((sum, p) => {
    const d = allData[p.id] || {};
    const e = (d.likes?.current || 0) + (d.comments?.current || 0) + (d.shares?.current || 0);
    return sum + e;
  }, 0);

  const stats = [
    { label: 'Total Cross-Platform Reach', value: totalReach.toLocaleString(), icon: '📡' },
    { label: 'Total Followers / Members', value: totalFollowers.toLocaleString(), icon: '👥' },
    { label: 'Total Engagements', value: totalEngagement.toLocaleString(), icon: '❤️' },
    { label: 'Active Platforms', value: PLATFORMS.length, icon: '🌐' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 12,
      marginBottom: 24
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 14,
          padding: '16px 20px'
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{s.value}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Analytics Dashboard ─────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [allData, setAllData] = useState({});
  const [selectedPlatforms, setSelectedPlatforms] = useState(PLATFORMS.map(p => p.id));
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef(null);
  const retentionValue = 68;

  const refreshData = useCallback(() => {
    const fresh = {};
    for (const p of PLATFORMS) {
      if (selectedPlatforms.includes(p.id)) {
        fresh[p.id] = generatePlatformData(p.id);
      }
    }
    setAllData(fresh);
    setLastRefresh(new Date());
  }, [selectedPlatforms]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(refreshData, 30000); // 30s auto-refresh
    }
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, refreshData]);

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const activePlatforms = PLATFORMS.filter(p => selectedPlatforms.includes(p.id));

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020817',
      color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px 24px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>📊 Analytics Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Cross-platform social media metrics · Real-time
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#64748b', fontSize: 12 }}>
            Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : '—'}
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={refreshData}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Platform Filter Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {PLATFORMS.map(p => {
          const active = selectedPlatforms.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => togglePlatform(p.id)}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${active ? p.color : '#1e293b'}`,
                background: active ? p.bg : 'transparent',
                color: active ? p.color : '#64748b',
                transition: 'all 0.15s'
              }}
            >
              {p.icon} {p.name}
            </button>
          );
        })}
      </div>

      {/* Summary Totals */}
      <SummaryBar allData={allData} />

      {/* Retention Gauge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <RetentionGauge value={retentionValue} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Audience Retention</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
            Average across TikTok & Instagram video content.
            Aim for ≥70% to maximize algorithmic reach.
            Retention above 80% qualifies for viral distribution.
          </p>
        </div>
      </div>

      {/* Platform Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {activePlatforms.map(platform => (
          <PlatformPanel
            key={platform.id}
            platform={platform}
            data={allData[platform.id] || {}}
          />
        ))}
        {activePlatforms.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            Select at least one platform above to view analytics.
          </div>
        )}
      </div>
    </div>
  );
}
