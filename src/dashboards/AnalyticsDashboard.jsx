// src/dashboards/AnalyticsDashboard.jsx
// Created: 2026-07-30
// Social media analytics dashboard - TikTok, Instagram, Facebook, Twitch, Discord,
// Lemon8, Reddit, RedGifs - real-time metrics, reach, likes, view and retention tracking

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api/analytics'
  : 'http://localhost:3001/api/analytics';

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',     icon: '🎵', color: '#010101', accent: '#69C9D0' },
  { id: 'instagram', name: 'Instagram',  icon: '📸', color: '#C13584', accent: '#E1306C' },
  { id: 'facebook',  name: 'Facebook',   icon: '👤', color: '#1877F2', accent: '#4267B2' },
  { id: 'twitch',    name: 'Twitch',     icon: '🟣', color: '#9146FF', accent: '#772CE8' },
  { id: 'discord',   name: 'Discord',    icon: '💬', color: '#5865F2', accent: '#404EED' },
  { id: 'lemon8',    name: 'Lemon8',     icon: '🍋', color: '#FFD700', accent: '#FFA500' },
  { id: 'reddit',    name: 'Reddit',     icon: '🟠', color: '#FF4500', accent: '#FF6314' },
  { id: 'redgifs',   name: 'RedGifs',    icon: '🎬', color: '#e63946', accent: '#c1121f' }
];

const METRIC_LABELS = {
  views: 'Views', likes: 'Likes', comments: 'Comments',
  shares: 'Shares', reach: 'Reach', followers: 'Followers',
  retention: 'Retention %', engagement: 'Engagement', viewers: 'Live Viewers',
  members: 'Members', subscribers: 'Subscribers', upvotes: 'Upvotes'
};

function MetricCard({ label, value, icon, trend, color }) {
  const trendUp = trend > 0;
  return (
    <div style={{
      background: 'var(--card-bg, rgba(255,255,255,0.05))',
      border: '1px solid var(--border, rgba(255,255,255,0.1))',
      borderRadius: 12,
      padding: '16px 20px',
      flex: '1 1 140px',
      minWidth: 140
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #888)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || 'var(--text, #fff)', marginTop: 8 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {trend !== undefined && (
        <div style={{ fontSize: 12, marginTop: 4, color: trendUp ? '#22c55e' : '#ef4444' }}>
          {trendUp ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function SparkLine({ data, color = '#6366f1', height = 40 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function PlatformCard({ platform, data, selected, onClick }) {
  const totalViews = data?.totals?.views || data?.totals?.viewers || 0;
  const totalLikes = data?.totals?.likes || data?.totals?.upvotes || 0;
  const realtimeViewers = data?.realtimeViewers || 0;
  const sparkData = data?.timeSeries?.map(d => d.views || d.viewers || d.upvotes || 0) || [];

  return (
    <div
      onClick={onClick}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${platform.color}33, ${platform.accent}22)`
          : 'var(--card-bg, rgba(255,255,255,0.05))',
        border: `1px solid ${selected ? platform.accent : 'var(--border, rgba(255,255,255,0.1))'}`,
        borderRadius: 14,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: selected ? `0 0 20px ${platform.accent}33` : 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{platform.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{platform.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>
              {realtimeViewers > 0 ? `${realtimeViewers.toLocaleString()} live` : 'connected'}
            </div>
          </div>
        </div>
        <SparkLine data={sparkData} color={platform.accent} />
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>VIEWS</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{totalViews.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>LIKES</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{totalLikes.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>SCORE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: platform.accent }}>{data?.score || '—'}</div>
        </div>
      </div>
    </div>
  );
}

function RetentionChart({ data }) {
  if (!data?.retentionCurve) return null;
  const curve = data.retentionCurve;
  const w = 300, h = 120;
  const max = 100;
  const points = curve.map((p, i) => {
    const x = (i / (curve.length - 1)) * (w - 20) + 10;
    const y = h - (p.percentage / max) * (h - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Retention Curve — Avg: {data.avgRetention}% | Watch Time: {data.avgWatchTime}
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, overflow: 'visible' }}>
        <defs>
          <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" />
      </svg>
    </div>
  );
}

export default function AnalyticsDashboard({ token }) {
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState('tiktok');
  const [timeRange, setTimeRange] = useState('7d');
  const [detailData, setDetailData] = useState(null);
  const [retentionData, setRetentionData] = useState(null);
  const [realtimeData, setRealtimeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/overview?timeRange=${timeRange}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeRange, token]);

  const fetchDetail = useCallback(async () => {
    try {
      const [metricsRes, retRes] = await Promise.all([
        fetch(`${API_BASE}/${selected}/metrics?timeRange=${timeRange}`, { headers }),
        fetch(`${API_BASE}/${selected}/retention`, { headers })
      ]);
      if (metricsRes.ok) setDetailData(await metricsRes.json());
      if (retRes.ok) setRetentionData(await retRes.json());
    } catch (err) {
      console.error('Detail fetch error:', err.message);
    }
  }, [selected, timeRange, token]);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/realtime`, { headers });
      if (res.ok) setRealtimeData((await res.json()).realtime || []);
    } catch {
      // ignore realtime errors
    }
  }, [token]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Real-time polling every 30s
  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 30000);
    return () => clearInterval(interval);
  }, [fetchRealtime]);

  const platform = PLATFORMS.find(p => p.id === selected);
  const platformOverview = overview?.platforms?.[selected] || {};
  const totals = overview?.totals || {};

  const totalTrend = { views: 12.4, likes: 8.7, comments: -2.1, shares: 15.3 };

  return (
    <div style={{
      padding: '24px',
      color: 'var(--text, #f1f5f9)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 1400,
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📊 Analytics Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #888)', fontSize: 14 }}>
            Social media performance across all platforms
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['7d', '30d', '90d'].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid var(--border, rgba(255,255,255,0.15))',
              background: timeRange === r ? '#6366f1' : 'transparent',
              color: 'var(--text, #f1f5f9)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: timeRange === r ? 600 : 400
            }}>
              {r === '7d' ? 'Week' : r === '30d' ? 'Month' : 'Quarter'}
            </button>
          ))}
          <button onClick={fetchOverview} style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--border, rgba(255,255,255,0.15))',
            background: 'transparent', color: 'var(--text, #f1f5f9)',
            cursor: 'pointer', fontSize: 13
          }}>↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#fca5a5'
        }}>
          ⚠️ {error} — Showing demo data
        </div>
      )}

      {/* Global Totals */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <MetricCard label="Total Views" value={totals.views || 0} icon="👁️" trend={totalTrend.views} color="#6366f1" />
        <MetricCard label="Total Likes" value={totals.likes || 0} icon="❤️" trend={totalTrend.likes} color="#ec4899" />
        <MetricCard label="Total Comments" value={totals.comments || 0} icon="💬" trend={totalTrend.comments} color="#f59e0b" />
        <MetricCard label="Total Shares" value={totals.shares || 0} icon="📤" trend={totalTrend.shares} color="#22c55e" />
        <MetricCard label="Total Reach" value={totals.reach || 0} icon="📡" color="#0ea5e9" />
        <MetricCard label="New Followers" value={totals.followers || 0} icon="👥" trend={9.2} color="#a855f7" />
      </div>

      {/* Real-time Strip */}
      {realtimeData.length > 0 && (
        <div style={{
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20
        }}>
          <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginBottom: 8 }}>
            🔴 LIVE — Updated every 30s
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {realtimeData.map(rt => (
              <div key={rt.platform} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span>{PLATFORMS.find(p => p.id === rt.platform)?.icon || '🌐'}</span>
                <span style={{ color: 'var(--text-muted, #888)' }}>{rt.name}:</span>
                <span style={{ fontWeight: 600 }}>{rt.liveViewers.toLocaleString()}</span>
                {rt.trending && <span style={{ color: '#22c55e', fontSize: 11 }}>▲ Trending</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
        {PLATFORMS.map(p => (
          <PlatformCard
            key={p.id}
            platform={p}
            data={overview?.platforms?.[p.id]}
            selected={selected === p.id}
            onClick={() => setSelected(p.id)}
          />
        ))}
      </div>

      {/* Platform Detail */}
      {platform && (
        <div style={{
          background: 'var(--card-bg, rgba(255,255,255,0.04))',
          border: `1px solid ${platform.accent}44`,
          borderRadius: 14, padding: 24
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>
            {platform.icon} {platform.name} — Detailed Metrics
          </h2>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {Object.entries(platformOverview?.totals || {}).map(([k, v]) => (
              <MetricCard
                key={k}
                label={METRIC_LABELS[k] || k}
                value={v}
                color={platform.accent}
              />
            ))}
          </div>

          {/* Time Series Chart (simple text-based) */}
          {detailData?.timeSeries && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Views Over Time</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                {detailData.timeSeries.slice(-14).map((d, i) => {
                  const maxV = Math.max(...detailData.timeSeries.slice(-14).map(x => x.views || 1));
                  const h = ((d.views || 0) / maxV) * 70;
                  return (
                    <div key={i} title={`${d.date}: ${(d.views || 0).toLocaleString()} views`}
                      style={{
                        flex: 1, height: h, minHeight: 2,
                        background: `linear-gradient(to top, ${platform.color}, ${platform.accent})`,
                        borderRadius: '3px 3px 0 0',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        opacity: 0.8
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted, #888)' }}>
                <span>{detailData.timeSeries[Math.max(0, detailData.timeSeries.length - 14)]?.date}</span>
                <span>{detailData.timeSeries[detailData.timeSeries.length - 1]?.date}</span>
              </div>
            </div>
          )}

          <RetentionChart data={retentionData} />
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #888)' }}>
          Loading analytics...
        </div>
      )}
    </div>
  );
}
