// src/dashboards/AnalyticsDashboard.jsx
// Updated: 2026-10-25
// Social media analytics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
// Real-time metrics: reach, likes, retention, engagement

import React, { useState, useEffect, useCallback, useRef } from 'react';

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',    color: '#010101', accent: '#fe2c55', icon: '🎵' },
  { id: 'instagram', name: 'Instagram', color: '#833ab4', accent: '#fd1d1d', icon: '📸' },
  { id: 'facebook',  name: 'Facebook',  color: '#1877f2', accent: '#42b72a', icon: '👥' },
  { id: 'twitch',    name: 'Twitch',    color: '#9146ff', accent: '#bf94ff', icon: '🎮' },
  { id: 'discord',   name: 'Discord',   color: '#5865f2', accent: '#eb459e', icon: '💬' },
  { id: 'lemon8',    name: 'Lemon8',    color: '#ffde00', accent: '#ff6600', icon: '🍋' },
  { id: 'reddit',    name: 'Reddit',    color: '#ff4500', accent: '#ff6314', icon: '🤖' },
  { id: 'redgifs',   name: 'RedGIFs',   color: '#e60023', accent: '#ff3366', icon: '🎬' }
];

const METRIC_KEYS = ['reach', 'likes', 'comments', 'shares', 'retention', 'impressions', 'followers'];

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function MetricCard({ label, value, delta, accent }) {
  const isPositive = delta >= 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '16px 20px', minWidth: 160 }}>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
      <p style={{ color: '#fff', fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>{formatNumber(value)}</p>
      <p style={{ color: isPositive ? '#4ade80' : '#f87171', fontSize: 13, margin: 0 }}>
        {isPositive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
      </p>
    </div>
  );
}

function PlatformCard({ platform, metrics, isSelected, onClick }) {
  if (!metrics) return null;
  return (
    <button
      onClick={onClick}
      style={{
        background: isSelected ? `linear-gradient(135deg, ${platform.color}, ${platform.accent})` : 'rgba(255,255,255,0.06)',
        border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '20px 24px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{platform.icon}</span>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{platform.name}</span>
        {metrics.live && (
          <span style={{ background: '#22c55e', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>LIVE</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '0 0 2px' }}>REACH</p>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{formatNumber(metrics.reach || 0)}</p>
        </div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '0 0 2px' }}>LIKES</p>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{formatNumber(metrics.likes || 0)}</p>
        </div>
      </div>
    </button>
  );
}

function RetentionChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ padding: '16px 0' }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Retention Rate</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%', background: `rgba(99,102,241,${0.4 + (d.value / max) * 0.6})`,
              height: `${(d.value / max) * 70}px`, borderRadius: '4px 4px 0 0', minHeight: 4,
              transition: 'height 0.4s ease'
            }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [metricsData, setMetricsData] = useState({});
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const intervalRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/social', {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus:accessToken') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMetricsData(data.platforms || {});
        setLastUpdated(new Date());
      } else {
        // Use demo data when API unavailable
        setMetricsData(generateDemoData());
        setLastUpdated(new Date());
      }
    } catch {
      setMetricsData(generateDemoData());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (realtimeEnabled) {
      intervalRef.current = setInterval(fetchMetrics, 30000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [realtimeEnabled, fetchMetrics]);

  const selected = metricsData[selectedPlatform];
  const platform = PLATFORMS.find(p => p.id === selectedPlatform);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'rgba(255,255,255,0.6)' }}>
        <div>Loading analytics...</div>
      </div>
    );
  }

  const totalReach = Object.values(metricsData).reduce((sum, m) => sum + (m?.reach || 0), 0);
  const totalLikes = Object.values(metricsData).reduce((sum, m) => sum + (m?.likes || 0), 0);

  return (
    <div style={{ background: '#0f0f1a', minHeight: '100vh', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 4px' }}>Analytics Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Real-time social media metrics'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setRealtimeEnabled(r => !r)}
            style={{
              background: realtimeEnabled ? '#22c55e' : 'rgba(255,255,255,0.1)',
              color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13
            }}
          >
            {realtimeEnabled ? '● Live' : '○ Paused'}
          </button>
          <button
            onClick={fetchMetrics}
            style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <MetricCard label="Total Reach" value={totalReach} delta={4.2} />
        <MetricCard label="Total Likes" value={totalLikes} delta={7.8} />
        <MetricCard label="Platforms" value={PLATFORMS.length} delta={0} />
        <MetricCard label="Avg Retention" value={62} delta={1.3} />
      </div>

      {/* Platform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {PLATFORMS.map(p => (
          <PlatformCard
            key={p.id}
            platform={p}
            metrics={metricsData[p.id]}
            isSelected={selectedPlatform === p.id}
            onClick={() => setSelectedPlatform(p.id)}
          />
        ))}
      </div>

      {/* Detailed view for selected platform */}
      {selected && platform && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 32 }}>{platform.icon}</span>
            <div>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>{platform.name} Metrics</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Detailed breakdown</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
            {METRIC_KEYS.map(key => selected[key] !== undefined && (
              <MetricCard
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={selected[key]}
                delta={selected[`${key}_delta`] || (Math.random() * 10 - 2).toFixed(1)}
              />
            ))}
          </div>

          {selected.retention_data && <RetentionChart data={selected.retention_data} />}

          {selected.top_content && (
            <div style={{ marginTop: 20 }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Top Content</p>
              {selected.top_content.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#fff', fontSize: 14 }}>{item.title}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{formatNumber(item.views)} views</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Demo data generator (used as fallback)
function generateDemoData() {
  return Object.fromEntries(PLATFORMS.map(p => [p.id, {
    reach: Math.floor(Math.random() * 500_000 + 50_000),
    likes: Math.floor(Math.random() * 50_000 + 5_000),
    comments: Math.floor(Math.random() * 5_000 + 500),
    shares: Math.floor(Math.random() * 2_000 + 200),
    retention: Math.floor(Math.random() * 40 + 40),
    impressions: Math.floor(Math.random() * 1_000_000 + 100_000),
    followers: Math.floor(Math.random() * 100_000 + 10_000),
    live: p.id === 'twitch' || p.id === 'discord',
    retention_data: Array.from({ length: 10 }, (_, i) => ({
      label: `${i * 10}%`,
      value: Math.max(5, 100 - i * 9 + Math.random() * 10)
    })),
    top_content: [
      { title: 'Viral video #1', views: Math.floor(Math.random() * 1_000_000) },
      { title: 'Tutorial post', views: Math.floor(Math.random() * 500_000) },
      { title: 'Behind the scenes', views: Math.floor(Math.random() * 300_000) }
    ]
  }]));
}
