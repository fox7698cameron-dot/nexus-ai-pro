/**
 * AnalyticsDashboard.jsx
 * Social media + reach analytics with real-time metrics.
 * Supports: TikTok, Instagram, Facebook, Twitch, Discord,
 *           Lemon8, Reddit, Redgifs
 * Created: 2026-10-02
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Platform configuration ────────────────────────────────────
const PLATFORMS = {
  tiktok: {
    label: 'TikTok',
    color: '#010101',
    accent: '#fe2c55',
    emoji: '🎵',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'reach'],
  },
  instagram: {
    label: 'Instagram',
    color: '#c13584',
    accent: '#e1306c',
    emoji: '📸',
    metrics: ['impressions', 'reach', 'likes', 'saves', 'comments', 'followers'],
  },
  facebook: {
    label: 'Facebook',
    color: '#1877f2',
    accent: '#42b72a',
    emoji: '👥',
    metrics: ['reach', 'impressions', 'engagements', 'likes', 'shares', 'followers'],
  },
  twitch: {
    label: 'Twitch',
    color: '#9147ff',
    accent: '#772ce8',
    emoji: '🎮',
    metrics: ['viewers', 'followers', 'subscriptions', 'chatMessages', 'clips', 'watchTime'],
  },
  discord: {
    label: 'Discord',
    color: '#5865f2',
    accent: '#4752c4',
    emoji: '💬',
    metrics: ['members', 'activeMembers', 'messages', 'voiceMinutes', 'newJoins', 'boosts'],
  },
  lemon8: {
    label: 'Lemon8',
    color: '#f5c518',
    accent: '#e6b800',
    emoji: '🍋',
    metrics: ['views', 'likes', 'comments', 'shares', 'followers', 'reach'],
  },
  reddit: {
    label: 'Reddit',
    color: '#ff4500',
    accent: '#ff6534',
    emoji: '🔴',
    metrics: ['postViews', 'upvotes', 'comments', 'shares', 'subscribers', 'awardedPosts'],
  },
  redgifs: {
    label: 'Redgifs',
    color: '#e8123c',
    accent: '#c00f33',
    emoji: '🎞️',
    metrics: ['views', 'likes', 'downloads', 'comments', 'followers', 'gifViews'],
  },
};

// ── Retention time-range options ──────────────────────────────
const TIME_RANGES = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

// ── Mini sparkline SVG ─────────────────────────────────────────
function Sparkline({ data = [], color = '#3b82f6', width = 80, height = 30 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Format large numbers ───────────────────────────────────────
function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Single platform metric card ────────────────────────────────
function MetricCard({ label, value, trend, history, accent }) {
  const positive = trend >= 0;
  return (
    <div
      style={{
        background: 'var(--card-bg, rgba(255,255,255,0.05))',
        border: '1px solid var(--border, rgba(255,255,255,0.1))',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', textTransform: 'capitalize' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text, #f9fafb)' }}>
        {fmt(value)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: positive ? '#10b981' : '#ef4444',
          }}
        >
          {positive ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </span>
        <Sparkline data={history} color={accent} />
      </div>
    </div>
  );
}

// ── Retention funnel bar ───────────────────────────────────────
function RetentionBar({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <div style={{ width: 80, fontSize: 12, color: 'var(--text-muted, #9ca3af)', textAlign: 'right' }}>
        {label}
      </div>
      <div
        style={{
          flex: 1,
          background: 'var(--border, rgba(255,255,255,0.08))',
          borderRadius: 4,
          height: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div style={{ width: 38, fontSize: 12, color: 'var(--text, #f9fafb)', textAlign: 'right' }}>
        {pct.toFixed(0)}%
      </div>
    </div>
  );
}

// ── Generate simulated demo data ───────────────────────────────
function demoData(platform, range) {
  const buckets = { '24h': 24, '7d': 7, '30d': 30, '90d': 90 };
  const pts = buckets[range] ?? 24;
  const base = {
    tiktok: { views: 1_420_000, followers: 38_400 },
    instagram: { impressions: 890_000, followers: 24_100 },
    facebook: { reach: 320_000, followers: 61_200 },
    twitch: { viewers: 4_200, followers: 12_800 },
    discord: { members: 8_750, messages: 142_600 },
    lemon8: { views: 210_000, followers: 7_300 },
    reddit: { subscribers: 31_000, postViews: 480_000 },
    redgifs: { views: 3_600_000, followers: 19_200 },
  };
  const b = base[platform] ?? { views: 100_000 };

  const makeSeries = (seed) =>
    Array.from({ length: pts }, (_, i) => Math.round(seed * (0.7 + Math.random() * 0.6)));

  const metrics = {};
  PLATFORMS[platform].metrics.forEach((m) => {
    const seed = b[m] ?? Math.round(b[Object.keys(b)[0]] * 0.3);
    metrics[m] = {
      value: Math.round(seed * (0.9 + Math.random() * 0.2)),
      trend: (Math.random() - 0.35) * 20,
      history: makeSeries(seed / pts),
    };
  });

  const retention = [
    { label: 'View', pct: 100 },
    { label: '10s', pct: 68 + Math.random() * 10 },
    { label: '30s', pct: 42 + Math.random() * 10 },
    { label: '60s', pct: 27 + Math.random() * 8 },
    { label: 'Full', pct: 14 + Math.random() * 8 },
  ];

  return { metrics, retention };
}

// ── Connection status badge ────────────────────────────────────
function ConnBadge({ connected }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 99,
        background: connected ? 'rgba(16,185,129,0.2)' : 'rgba(156,163,175,0.2)',
        color: connected ? '#10b981' : '#9ca3af',
        border: `1px solid ${connected ? '#10b981' : '#9ca3af'}`,
      }}
    >
      {connected ? '● LIVE' : '○ DEMO'}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function AnalyticsDashboard({ apiTokens = {} }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [timeRange, setTimeRange] = useState('7d');
  const [platformData, setPlatformData] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const timerRef = useRef(null);

  const refresh = useCallback(() => {
    setLoading(true);
    // In production, swap demo data for real API calls using apiTokens[platform]
    setTimeout(() => {
      const next = {};
      Object.keys(PLATFORMS).forEach((p) => {
        next[p] = demoData(p, timeRange);
      });
      setPlatformData(next);
      setLastRefresh(Date.now());
      setLoading(false);
    }, 600);
  }, [timeRange]);

  // Initial load + periodic refresh (30s)
  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 30_000);
    return () => clearInterval(timerRef.current);
  }, [refresh]);

  const current = platformData[activePlatform];
  const platform = PLATFORMS[activePlatform];
  const isConnected = Boolean(apiTokens[activePlatform]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text, #f9fafb)' }}>
            📊 Analytics Dashboard
          </h2>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 2 }}>
            Last refreshed: {new Date(lastRefresh).toLocaleTimeString()} — auto every 30s
          </div>
        </div>

        {/* Time range */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                background:
                  timeRange === r.value
                    ? 'var(--accent, #3b82f6)'
                    : 'transparent',
                color: timeRange === r.value ? '#fff' : 'var(--text-muted, #9ca3af)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: timeRange === r.value ? 700 : 400,
              }}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh now"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--border, rgba(255,255,255,0.15))',
              background: 'transparent',
              color: 'var(--text-muted, #9ca3af)',
              fontSize: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(PLATFORMS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => setActivePlatform(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${activePlatform === key ? p.accent : 'var(--border, rgba(255,255,255,0.1))'}`,
              background:
                activePlatform === key
                  ? `${p.accent}22`
                  : 'transparent',
              color:
                activePlatform === key ? p.accent : 'var(--text-muted, #9ca3af)',
              fontSize: 12,
              fontWeight: activePlatform === key ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span>{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Platform header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          background: `${platform.accent}18`,
          border: `1px solid ${platform.accent}44`,
          borderRadius: 10,
        }}
      >
        <span style={{ fontSize: 24 }}>{platform.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--text, #f9fafb)', fontSize: 15 }}>
            {platform.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>
            Real-time performance metrics
          </div>
        </div>
        <ConnBadge connected={isConnected} />
      </div>

      {/* Metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        {current &&
          platform.metrics.map((m) => {
            const d = current.metrics[m];
            if (!d) return null;
            return (
              <MetricCard
                key={m}
                label={m.replace(/([A-Z])/g, ' $1').toLowerCase()}
                value={d.value}
                trend={d.trend}
                history={d.history}
                accent={platform.accent}
              />
            );
          })}
      </div>

      {/* Retention funnel */}
      {current && (
        <div
          style={{
            background: 'var(--card-bg, rgba(255,255,255,0.05))',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: 10,
            padding: '14px 18px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text, #f9fafb)',
              marginBottom: 10,
            }}
          >
            ⏱ View & Retention Tracking
          </div>
          {current.retention.map((r) => (
            <RetentionBar key={r.label} label={r.label} pct={r.pct} color={platform.accent} />
          ))}
        </div>
      )}

      {/* Connect banner shown when no token */}
      {!isConnected && (
        <div
          style={{
            background: 'rgba(245,197,24,0.08)',
            border: '1px solid rgba(245,197,24,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#fbbf24',
            flexShrink: 0,
          }}
        >
          ⚠️ Demo data shown. To connect real {platform.label} metrics, add your API token in{' '}
          <strong>Settings → Integrations → {platform.label}</strong>.
        </div>
      )}
    </div>
  );
}
