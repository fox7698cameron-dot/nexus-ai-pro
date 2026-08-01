// src/analytics/AnalyticsDashboard.jsx
// Nexus AI Pro - Social Media Analytics Dashboard
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
// Real-time metrics via WebSocket; responsive (desktop/mobile/tablet)
// Date: 2026-08-01

import React, { useState, useEffect, useCallback } from 'react';

const API = '/api/analytics';

const PLATFORM_META = {
  tiktok:    { name: 'TikTok',    icon: '🎵', color: '#010101', bg: '#1a1a1a', accent: '#69C9D0' },
  instagram: { name: 'Instagram', icon: '📸', color: '#E1306C', bg: '#2d1020', accent: '#F77737' },
  facebook:  { name: 'Facebook',  icon: '👥', color: '#1877F2', bg: '#101f3d', accent: '#4267B2' },
  twitch:    { name: 'Twitch',    icon: '🎮', color: '#9146FF', bg: '#1a0f2e', accent: '#BF94FF' },
  discord:   { name: 'Discord',   icon: '💬', color: '#5865F2', bg: '#0e1128', accent: '#99AAB5' },
  lemon8:    { name: 'Lemon8',    icon: '🍋', color: '#FFD700', bg: '#2a2200', accent: '#FFF176' },
  reddit:    { name: 'Reddit',    icon: '🤖', color: '#FF4500', bg: '#2a1000', accent: '#FF6534' },
  redgifs:   { name: 'RedGIFs',   icon: '🎞️', color: '#FF2D55', bg: '#2d0012', accent: '#FF6B81' }
};

const METRICS_LABELS = {
  views: 'Views', viewers: 'Viewers', likes: 'Likes', comments: 'Comments',
  shares: 'Shares', reach: 'Reach', followers: 'Followers', members: 'Members',
  subscribers: 'Subscribers', saves: 'Saves', upvotes: 'Upvotes', downloads: 'Downloads',
  chat_rate: 'Chat Rate', messages: 'Messages', active_users: 'Active Users',
  voice_minutes: 'Voice Min', boosts: 'Boosts', reactions: 'Reactions',
  karma: 'Karma', awards: 'Awards', reels: 'Reels', stories: 'Stories'
};

function fmtNum(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function TrendBadge({ pct }) {
  if (pct === undefined || pct === null) return null;
  const num = parseFloat(pct);
  const up = num >= 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
      background: up ? '#0d2e1a' : '#2e0d0d',
      color: up ? '#4ade80' : '#f87171'
    }}>
      {up ? '▲' : '▼'} {Math.abs(num)}%
    </span>
  );
}

function MetricCard({ label, value, pct, accent }) {
  return (
    <div style={{
      background: '#1a1a2e', borderRadius: 10, padding: '12px 14px',
      border: `1px solid ${accent}22`, minWidth: 100, flex: '1 1 100px'
    }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{fmtNum(value)}</div>
      <TrendBadge pct={pct} />
    </div>
  );
}

function RetentionBar({ buckets }) {
  if (!buckets?.length) return null;
  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>Retention Curve</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 48 }}>
        {buckets.map((b, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: '100%', background: `hsl(${140 - i * 25},70%,45%)`,
              height: `${b.pct * 0.48}px`, borderRadius: '3px 3px 0 0',
              transition: 'height 0.3s'
            }} />
            <span style={{ fontSize: 9, color: '#666' }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniSparkline({ data, metric, color }) {
  if (!data?.length) return null;
  const vals = data.map(d => d[metric] || 0);
  const max = Math.max(...vals, 1);
  const W = 100, H = 30;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - (v / max) * H}`).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function PlatformCard({ platform, data, accent, onSelect, selected }) {
  const meta = PLATFORM_META[platform];
  const today = data?.today || {};
  const primaryMetric = today.views ?? today.viewers ?? today.upvotes ?? today.messages ?? 0;
  const primaryLabel = today.views !== undefined ? 'Views'
    : today.viewers !== undefined ? 'Viewers'
    : today.upvotes !== undefined ? 'Upvotes'
    : 'Messages';

  return (
    <div
      onClick={() => onSelect(platform)}
      style={{
        background: selected ? `${meta.bg}` : '#111827',
        border: `2px solid ${selected ? meta.color : '#2d2d2d'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer',
        transition: 'all 0.2s', minWidth: 140,
        boxShadow: selected ? `0 0 16px ${meta.color}44` : 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{meta.icon}</span>
        <span style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 6,
          background: data?.connected ? '#0d2e1a' : '#2a2a2a',
          color: data?.connected ? '#4ade80' : '#666'
        }}>
          {data?.connected ? 'Live' : 'Demo'}
        </span>
      </div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{meta.name}</div>
      <div style={{ color: meta.color, fontSize: 22, fontWeight: 800, margin: '4px 0' }}>
        {fmtNum(primaryMetric)}
      </div>
      <div style={{ color: '#666', fontSize: 11 }}>{primaryLabel} today</div>
      {data?.trend_7d && (
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          <MiniSparkline data={data.trend_7d} metric={Object.keys(today)[0] || 'views'} color={meta.color} />
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard({ token }) {
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState('tiktok');
  const [detail, setDetail] = useState(null);
  const [retention, setRetention] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/summary`, { headers });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      setSummary(data);
      setLastUpdated(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchDetail = useCallback(async (platform) => {
    try {
      const [detailRes, retRes] = await Promise.all([
        fetch(`${API}/platform/${platform}?range=30`, { headers }),
        fetch(`${API}/retention/${platform}`, { headers })
      ]);
      if (detailRes.ok) setDetail(await detailRes.json());
      if (retRes.ok) setRetention(await retRes.json());
    } catch (e) { /* non-critical */ }
  }, [token]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (selected) fetchDetail(selected);
  }, [selected, fetchDetail]);

  // Poll every 30s for near-real-time
  useEffect(() => {
    const id = setInterval(fetchSummary, 30000);
    return () => clearInterval(id);
  }, [fetchSummary]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888' }}>
        Loading analytics…
      </div>
    );
  }

  const platforms = summary?.platforms || {};
  const agg = summary?.aggregate || {};
  const selData = platforms[selected];
  const selMeta = PLATFORM_META[selected];

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: 20
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📊 Analytics Dashboard</h1>
          <p style={{ margin: 0, color: '#555', fontSize: 13 }}>
            Cross-platform social media metrics
            {lastUpdated && ` · Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={fetchSummary}
          style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
            color: '#94a3b8', padding: '8px 16px', cursor: 'pointer', fontSize: 13
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: '#2d0d0d', border: '1px solid #f87171', borderRadius: 8, padding: 12, marginBottom: 16, color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Aggregate KPI Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Views Today', value: agg.totalViews, icon: '👁️' },
          { label: 'Engagement Today', value: agg.totalEngagement, icon: '💬' },
          { label: 'Total Reach Today', value: agg.totalReach, icon: '📡' },
          { label: 'New Followers', value: agg.totalFollowers, icon: '👥' }
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            flex: '1 1 160px', background: '#111827', borderRadius: 12,
            padding: '16px 20px', border: '1px solid #1e293b'
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ color: '#4ade80', fontSize: 28, fontWeight: 800 }}>{fmtNum(value)}</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Platform Cards Grid */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {Object.entries(platforms).map(([key, data]) => (
          <PlatformCard
            key={key}
            platform={key}
            data={data}
            accent={PLATFORM_META[key]?.color}
            onSelect={setSelected}
            selected={selected === key}
          />
        ))}
      </div>

      {/* Detail Panel */}
      {selData && selMeta && (
        <div style={{
          background: `${selMeta.bg}`,
          border: `1px solid ${selMeta.color}44`,
          borderRadius: 16, padding: 20, marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>{selMeta.icon}</span>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selMeta.name} — Detailed View</h2>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {Object.entries(selData.today || {}).filter(([k]) => METRICS_LABELS[k]).map(([key, val]) => (
              <MetricCard
                key={key}
                label={METRICS_LABELS[key] || key}
                value={val}
                pct={selData.totals?.[`${key}_change_pct`]}
                accent={selMeta.color}
              />
            ))}
          </div>

          {/* Retention Curve */}
          {retention?.retentionCurve && (
            <RetentionBar buckets={retention.retentionCurve} />
          )}
          {retention?.avgWatchTime && (
            <div style={{ color: '#888', fontSize: 12 }}>
              Avg watch time: <strong style={{ color: selMeta.accent }}>{retention.avgWatchTime}</strong>
            </div>
          )}

          {/* 30-day Sparkline */}
          {detail?.history && detail.history.length > 1 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>30-Day Trend</div>
              <div style={{ overflowX: 'auto' }}>
                <MiniSparkline
                  data={detail.history}
                  metric={Object.keys(selData.today || {})[0] || 'views'}
                  color={selMeta.color}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Best Practices Row */}
      <div style={{
        background: '#111827', borderRadius: 12, padding: 16,
        border: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', gap: 20
      }}>
        <div>
          <div style={{ color: '#64748b', fontSize: 11 }}>Best Day to Post</div>
          <div style={{ color: '#4ade80', fontWeight: 700 }}>Wednesday</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 11 }}>Best Time (UTC)</div>
          <div style={{ color: '#4ade80', fontWeight: 700 }}>18:00–20:00</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 11 }}>Avg Engagement Rate</div>
          <div style={{ color: '#f59e0b', fontWeight: 700 }}>4.2%</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: 11 }}>Top Platform</div>
          <div style={{ color: '#a78bfa', fontWeight: 700 }}>
            {Object.entries(platforms).sort((a, b) =>
              (b[1].today?.views || b[1].today?.viewers || 0) -
              (a[1].today?.views || a[1].today?.viewers || 0)
            )[0]?.[0] || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
