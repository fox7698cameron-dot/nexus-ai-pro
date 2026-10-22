// Nexus AI Pro - Analytics Dashboard | Date: 2026-10-22

import React, { useState, useEffect, useCallback } from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',     color: '#69C9D0', icon: '🎵', accent: '#EE1D52' },
  { id: 'instagram', name: 'Instagram',  color: '#E1306C', icon: '📸', accent: '#833AB4' },
  { id: 'facebook',  name: 'Facebook',   color: '#1877F2', icon: '👥', accent: '#0D65D9' },
  { id: 'twitch',    name: 'Twitch',     color: '#9146FF', icon: '🎮', accent: '#772CE8' },
  { id: 'discord',   name: 'Discord',    color: '#5865F2', icon: '💬', accent: '#4752C4' },
  { id: 'lemon8',    name: 'Lemon8',     color: '#FFD700', icon: '🍋', accent: '#FFA500' },
  { id: 'reddit',    name: 'Reddit',     color: '#FF4500', icon: '🔴', accent: '#CC3600' },
  { id: 'redgifs',   name: 'RedGifs',    color: '#FF6B6B', icon: '🎬', accent: '#E63535' },
];

const CONNECTION_STATES = ['connected', 'disconnected', 'needs_auth'];

const CONTENT_TYPES = ['Video', 'Post', 'Stream', 'Reel', 'Story', 'GIF', 'Thread'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const pct = (n) => `${n.toFixed(1)}%`;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => Math.random() * (max - min) + min;

function generateMockMetrics(platform) {
  const isStreaming = platform.id === 'twitch';
  const isVideo    = ['tiktok', 'redgifs'].includes(platform.id);
  const base       = rand(50_000, 5_000_000);

  return {
    views:         base,
    likes:         Math.floor(base * randF(0.03, 0.18)),
    reach:         Math.floor(base * randF(1.1, 2.5)),
    retention:     randF(isVideo ? 45 : 30, isVideo ? 85 : 70),
    followers:     rand(1_000, 2_500_000),
    engagement:    randF(1.5, 12.0),
    impressions:   Math.floor(base * randF(1.5, 4.0)),
    shares:        Math.floor(base * randF(0.01, 0.06)),
    comments:      Math.floor(base * randF(0.005, 0.03)),
    liveViewers:   isStreaming ? rand(0, 80_000) : 0,
    weeklyGrowth:  randF(-3, 15),
    connectionState: CONNECTION_STATES[rand(0, 2)],
  };
}

function generateRetentionTimeline(platform) {
  const points = 8;
  return Array.from({ length: points }, (_, i) => ({
    label: `${(i + 1) * 15}s`,
    value: Math.max(5, 100 - i * rand(8, 18) + rand(-5, 5)),
  }));
}

function generateTopContent(platform) {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    title: `${CONTENT_TYPES[rand(0, CONTENT_TYPES.length - 1)]} #${rand(100, 999)}`,
    views: rand(10_000, 3_000_000),
    likes: rand(500, 250_000),
    engagement: randF(2, 15),
    date: new Date(Date.now() - rand(1, 30) * 86_400_000).toLocaleDateString(),
  }));
}

function generateActivityEvent(platforms) {
  const p = platforms[rand(0, platforms.length - 1)];
  const events = ['New follower', 'Comment spike', 'View spike', 'Like surge', 'Share milestone', 'Live peak'];
  return {
    id: Date.now() + Math.random(),
    platform: p.name,
    color: p.color,
    icon: p.icon,
    event: events[rand(0, events.length - 1)],
    value: fmt(rand(1, 50_000)),
    ts: new Date().toLocaleTimeString(),
  };
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  root: {
    background: '#0a0a0f',
    color: '#e2e8f0',
    minHeight: '100vh',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: 14,
    padding: '24px 20px 60px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 0 0 rgba(16,185,129,0.7)',
    animation: 'pulse 2s infinite',
    flexShrink: 0,
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'background 0.2s',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '32px 0 14px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#13131f',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  platformName: {
    fontWeight: 600,
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  metricRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 14px',
    marginTop: 8,
  },
  metric: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  badge: (state) => ({
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 20,
    fontWeight: 600,
    background:
      state === 'connected'    ? 'rgba(16,185,129,0.15)' :
      state === 'needs_auth'   ? 'rgba(245,158,11,0.15)' :
                                 'rgba(239,68,68,0.15)',
    color:
      state === 'connected'    ? '#10b981' :
      state === 'needs_auth'   ? '#f59e0b' :
                                 '#ef4444',
  }),
  connectBtn: (color) => ({
    marginTop: 12,
    width: '100%',
    padding: '7px 0',
    borderRadius: 7,
    border: `1px solid ${color}44`,
    background: `${color}18`,
    color: color,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.03em',
  }),
  // Bar chart bar
  barWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  barLabel: {
    width: 70,
    fontSize: 12,
    color: '#94a3b8',
    flexShrink: 0,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 10,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: (pct, color) => ({
    height: '100%',
    width: `${Math.min(100, pct)}%`,
    background: color,
    borderRadius: 5,
    transition: 'width 0.6s ease',
  }),
  barValue: {
    width: 52,
    fontSize: 12,
    color: '#e2e8f0',
    flexShrink: 0,
    textAlign: 'right',
  },
  // Retention mini bar chart
  retentionGrid: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 4,
    height: 60,
    padding: '0 2px',
  },
  retentionBar: (v, color) => ({
    flex: 1,
    height: `${v}%`,
    background: color,
    borderRadius: '3px 3px 0 0',
    transition: 'height 0.6s ease',
    opacity: 0.85,
  }),
  retentionLabel: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    marginTop: 3,
  },
  // Feed
  feedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  feedIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  // Top content row
  contentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 14px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.03)',
    marginBottom: 6,
  },
  rank: {
    fontSize: 13,
    fontWeight: 700,
    color: '#475569',
    width: 20,
    flexShrink: 0,
    textAlign: 'center',
  },
  engBadge: (v) => ({
    marginLeft: 'auto',
    padding: '2px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: v > 8 ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
    color:      v > 8 ? '#10b981'               : '#818cf8',
  }),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlatformCard({ platform, metrics, onConnect }) {
  const growthColor = metrics.weeklyGrowth >= 0 ? '#10b981' : '#ef4444';

  return (
    <div style={{ ...S.card, borderTop: `2px solid ${platform.color}` }}>
      {/* glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 60,
        background: `radial-gradient(ellipse at 50% -20%, ${platform.color}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={S.cardHeader}>
        <span style={{ ...S.platformName, color: platform.color }}>
          <span>{platform.icon}</span>{platform.name}
        </span>
        <span style={S.badge(metrics.connectionState)}>
          {metrics.connectionState === 'connected'  ? '● Live' :
           metrics.connectionState === 'needs_auth' ? '⚠ Auth' : '○ Off'}
        </span>
      </div>

      <div style={S.metricRow}>
        <div style={S.metric}>
          <span style={S.metricLabel}>Views</span>
          <span style={{ ...S.metricValue, color: platform.color }}>{fmt(metrics.views)}</span>
        </div>
        <div style={S.metric}>
          <span style={S.metricLabel}>Likes</span>
          <span style={S.metricValue}>{fmt(metrics.likes)}</span>
        </div>
        <div style={S.metric}>
          <span style={S.metricLabel}>Reach</span>
          <span style={S.metricValue}>{fmt(metrics.reach)}</span>
        </div>
        <div style={S.metric}>
          <span style={S.metricLabel}>Retention</span>
          <span style={S.metricValue}>{pct(metrics.retention)}</span>
        </div>
        <div style={S.metric}>
          <span style={S.metricLabel}>Followers</span>
          <span style={S.metricValue}>{fmt(metrics.followers)}</span>
        </div>
        <div style={S.metric}>
          <span style={S.metricLabel}>Engagement</span>
          <span style={{ ...S.metricValue, color: '#818cf8' }}>{pct(metrics.engagement)}</span>
        </div>
      </div>

      {metrics.liveViewers > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
          🔴 LIVE — {fmt(metrics.liveViewers)} viewers
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: growthColor }}>
        {metrics.weeklyGrowth >= 0 ? '▲' : '▼'} {Math.abs(metrics.weeklyGrowth).toFixed(1)}% this week
      </div>

      <button
        style={S.connectBtn(platform.color)}
        onClick={() => onConnect(platform)}
      >
        {metrics.connectionState === 'connected' ? '✓ Connected — Manage' :
         metrics.connectionState === 'needs_auth' ? '⚠ Re-authenticate' : '+ Connect Platform'}
      </button>
    </div>
  );
}

function HorizontalBarChart({ title, data, colorFn }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={S.card}>
      <div style={{ fontWeight: 600, marginBottom: 14, color: '#cbd5e1' }}>{title}</div>
      {data.map(({ label, value, color }) => (
        <div key={label} style={S.barWrap}>
          <span style={S.barLabel}>{label}</span>
          <div style={S.barTrack}>
            <div style={S.barFill((value / max) * 100, color || colorFn?.(label) || '#6366f1')} />
          </div>
          <span style={S.barValue}>{fmt(value)}</span>
        </div>
      ))}
    </div>
  );
}

function RetentionCard({ platform, timeline }) {
  const maxV = Math.max(...timeline.map(p => p.value), 1);
  return (
    <div style={{ ...S.card }}>
      <div style={{ fontWeight: 600, marginBottom: 10, color: '#cbd5e1', fontSize: 13 }}>
        {platform.icon} {platform.name}
      </div>
      <div style={S.retentionGrid}>
        {timeline.map((p, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={S.retentionBar((p.value / maxV) * 100, platform.color)} title={`${p.value.toFixed(0)}%`} />
            <div style={S.retentionLabel}>{p.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
        Avg retention: {(timeline.reduce((a, b) => a + b.value, 0) / timeline.length).toFixed(1)}%
      </div>
    </div>
  );
}

function ActivityFeed({ events }) {
  return (
    <div style={S.card}>
      <div style={{ fontWeight: 600, marginBottom: 10, color: '#cbd5e1' }}>Real-time Activity</div>
      {events.length === 0 && (
        <div style={{ color: '#475569', fontSize: 12 }}>Waiting for events…</div>
      )}
      {events.map(ev => (
        <div key={ev.id} style={S.feedItem}>
          <span style={S.feedIcon}>{ev.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: ev.color }}>{ev.platform}</span>
            <span style={{ color: '#94a3b8', marginLeft: 6 }}>{ev.event}</span>
          </div>
          <span style={{ color: '#475569', fontSize: 11, marginLeft: 6, flexShrink: 0 }}>
            +{ev.value}
          </span>
          <span style={{ color: '#334155', fontSize: 10, marginLeft: 8, flexShrink: 0 }}>
            {ev.ts}
          </span>
        </div>
      ))}
    </div>
  );
}

function TopContent({ platform, items }) {
  return (
    <div style={S.card}>
      <div style={{ fontWeight: 600, marginBottom: 10, color: '#cbd5e1', fontSize: 13 }}>
        {platform.icon} {platform.name} — Top Content
      </div>
      {items.map((item, i) => (
        <div key={item.id} style={S.contentRow}>
          <span style={S.rank}>#{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              {fmt(item.views)} views · {fmt(item.likes)} likes · {item.date}
            </div>
          </div>
          <span style={S.engBadge(item.engagement)}>{pct(item.engagement)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(() =>
    Object.fromEntries(PLATFORMS.map(p => [p.id, generateMockMetrics(p)]))
  );
  const [retentionData, setRetentionData] = useState(() =>
    Object.fromEntries(PLATFORMS.map(p => [p.id, generateRetentionTimeline(p)]))
  );
  const [topContent] = useState(() =>
    Object.fromEntries(PLATFORMS.map(p => [p.id, generateTopContent(p)]))
  );
  const [activityFeed, setActivityFeed] = useState(() =>
    Array.from({ length: 6 }, () => generateActivityEvent(PLATFORMS))
  );
  const [tick, setTick] = useState(0);
  const [oauthModal, setOauthModal] = useState(null);

  // Real-time simulation — update metrics every 5 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setMetrics(prev => {
        const next = { ...prev };
        PLATFORMS.forEach(p => {
          const m = prev[p.id];
          next[p.id] = {
            ...m,
            views:      Math.max(0, m.views      + rand(-200, 2000)),
            likes:      Math.max(0, m.likes      + rand(-10, 150)),
            reach:      Math.max(0, m.reach      + rand(-100, 800)),
            retention:  Math.min(100, Math.max(5, m.retention + randF(-1, 1))),
            engagement: Math.min(100, Math.max(0, m.engagement + randF(-0.3, 0.3))),
            liveViewers: m.liveViewers > 0 ? Math.max(0, m.liveViewers + rand(-500, 1000)) : 0,
          };
        });
        return next;
      });
      // Add new activity event
      setActivityFeed(prev => [generateActivityEvent(PLATFORMS), ...prev].slice(0, 10));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleConnect = useCallback((platform) => {
    setOauthModal(platform);
  }, []);

  const handleExport = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      metrics,
      activityFeed,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `nexus-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, activityFeed]);

  // Derived data for charts
  const reachData = PLATFORMS.map(p => ({
    label: p.name,
    value: metrics[p.id].reach,
    color: p.color,
  })).sort((a, b) => b.value - a.value);

  const engagementData = PLATFORMS.map(p => ({
    label: p.name,
    value: metrics[p.id].engagement,
    color: p.color,
  })).sort((a, b) => b.value - a.value);

  return (
    <div style={S.root}>
      {/* Pulse animation keyframes injected via style tag */}
      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
          70%  { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <h1 style={S.title}>
          <div style={S.pulseDot} />
          Social Analytics
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 400, marginLeft: 4 }}>
            — tick #{tick}
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btn} onClick={handleExport}>⬇ Export JSON</button>
        </div>
      </div>

      {/* Platform Overview Grid */}
      <div style={S.sectionTitle}>Platform Overview</div>
      <div style={S.grid3}>
        {PLATFORMS.map(p => (
          <PlatformCard
            key={p.id}
            platform={p}
            metrics={metrics[p.id]}
            onConnect={handleConnect}
          />
        ))}
      </div>

      {/* Activity Feed + Reach Chart side-by-side */}
      <div style={S.sectionTitle}>Real-time Activity &amp; Reach</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        <ActivityFeed events={activityFeed} />
        <HorizontalBarChart
          title="Reach by Platform"
          data={reachData}
        />
      </div>

      {/* Engagement Comparison */}
      <div style={S.sectionTitle}>Engagement Rate Comparison</div>
      <HorizontalBarChart
        title="Engagement Rate (%)"
        data={engagementData.map(d => ({ ...d, value: parseFloat(d.value.toFixed(2)) }))}
      />

      {/* Retention Charts */}
      <div style={S.sectionTitle}>Viewer Retention by Platform</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {PLATFORMS.map(p => (
          <RetentionCard key={p.id} platform={p} timeline={retentionData[p.id]} />
        ))}
      </div>

      {/* Top Performing Content */}
      <div style={S.sectionTitle}>Top Performing Content</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {PLATFORMS.map(p => (
          <TopContent key={p.id} platform={p} items={topContent[p.id]} />
        ))}
      </div>

      {/* OAuth Modal */}
      {oauthModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setOauthModal(null)}>
          <div style={{
            background: '#13131f', border: `1px solid ${oauthModal.color}44`,
            borderRadius: 16, padding: 32, maxWidth: 400, width: '90%',
            boxShadow: `0 0 40px ${oauthModal.color}22`,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{oauthModal.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: oauthModal.color, marginBottom: 8 }}>
              Connect {oauthModal.name}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Authorise Nexus AI Pro to read your analytics data from {oauthModal.name}.
              Your credentials are never stored — only an OAuth token is kept securely.
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>
              Permissions requested: read:analytics, read:audience, read:content
            </div>
            <button
              style={{ ...S.connectBtn(oauthModal.color), fontSize: 14, padding: '10px 0' }}
              onClick={() => {
                // OAuth flow would redirect to platform's auth URL in production
                alert(`OAuth flow for ${oauthModal.name} — configure OAUTH_CLIENT_ID_${oauthModal.id.toUpperCase()} in .env`);
                setOauthModal(null);
              }}
            >
              Authorise with {oauthModal.name}
            </button>
            <button
              style={{ ...S.btn, width: '100%', marginTop: 8, textAlign: 'center' }}
              onClick={() => setOauthModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
