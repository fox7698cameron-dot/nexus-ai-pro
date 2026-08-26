/**
 * NEXUS AI PRO - Analytics Dashboard Component
 * File: src/dashboards/AnalyticsDashboard.jsx
 * Date: 2026-08-26
 *
 * Real-time social media analytics dashboard:
 * TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs.
 * Supports views, likes, reach, retention tracking.
 * Responsive: desktop, mobile, tablet.
 */

import { useState, useEffect, useCallback } from 'react';

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

const PLATFORM_CONFIG = {
  tiktok: { icon: '🎵', color: '#69C9D0', label: 'TikTok' },
  instagram: { icon: '📸', color: '#E1306C', label: 'Instagram' },
  facebook: { icon: '📘', color: '#1877F2', label: 'Facebook' },
  twitch: { icon: '💜', color: '#9146FF', label: 'Twitch' },
  discord: { icon: '🎮', color: '#5865F2', label: 'Discord' },
  lemon8: { icon: '🍋', color: '#FFD700', label: 'Lemon8' },
  reddit: { icon: '🟠', color: '#FF4500', label: 'Reddit' },
  redgifs: { icon: '🎬', color: '#FF0000', label: 'RedGIFs' },
};

function MetricCard({ label, value, change, icon, color }) {
  const formatted = typeof value === 'number'
    ? value >= 1000000 ? `${(value / 1000000).toFixed(1)}M`
    : value >= 1000 ? `${(value / 1000).toFixed(1)}K`
    : String(value)
    : '—';

  const changeColor = change > 0 ? '#4ade80' : change < 0 ? '#f87171' : '#94a3b8';

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{formatted}</div>
      {change !== undefined && (
        <div style={{ fontSize: 12, color: changeColor, marginTop: 4 }}>
          {change > 0 ? '▲' : change < 0 ? '▼' : '→'} {Math.abs(change)}% vs last period
        </div>
      )}
    </div>
  );
}

function MiniChart({ data = [], color = '#6366f1', height = 60 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => [
    (i / (data.length - 1)) * 200,
    height - (v / max) * height,
  ]);
  const polyline = points.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg viewBox={`0 0 200 ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <polygon points={`0,${height} ${polyline} 200,${height}`} fill={color} opacity={0.15} />
    </svg>
  );
}

function PlatformCard({ platform, data, onClick, selected }) {
  const cfg = PLATFORM_CONFIG[platform] || { icon: '📊', color: '#6366f1', label: platform };
  const recent = data?.metrics?.slice(-7) || [];
  const totalViews = recent.reduce((s, m) => s + (m.views || 0), 0);
  const totalLikes = recent.reduce((s, m) => s + (m.likes || 0), 0);
  const chartData = recent.map(m => m.views || m.viewers || m.members || 0);

  return (
    <button
      onClick={() => onClick(platform)}
      style={{
        background: selected ? `${cfg.color}22` : 'var(--card-bg)',
        border: `2px solid ${selected ? cfg.color : 'var(--border)'}`,
        borderRadius: 14,
        padding: '1rem',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>{cfg.icon}</span>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{cfg.label}</div>
          {!data?.configured && <div style={{ fontSize: 11, color: '#f59e0b' }}>⚠ Not configured</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>7d Views</div>
          <div style={{ fontWeight: 600, color: cfg.color }}>{totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>7d Likes</div>
          <div style={{ fontWeight: 600, color: cfg.color }}>{totalLikes >= 1000 ? `${(totalLikes / 1000).toFixed(1)}K` : totalLikes}</div>
        </div>
      </div>
      <MiniChart data={chartData} color={cfg.color} height={48} />
    </button>
  );
}

export default function AnalyticsDashboard({ socket }) {
  const [summary, setSummary] = useState(null);
  const [platformData, setPlatformData] = useState({});
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState([]);

  const fetchSummary = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const resp = await fetch('/api/analytics/summary', { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        setSummary(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch analytics summary', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlatform = useCallback(async (platform) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const resp = await fetch(`/api/analytics/${platform}?days=30`, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        setPlatformData(prev => ({ ...prev, [platform]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch ${platform} data`, err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    PLATFORMS.forEach(p => fetchPlatform(p));
    const interval = setInterval(() => { fetchSummary(); fetchPlatform(selectedPlatform); }, 60000);
    return () => clearInterval(interval);
  }, [fetchSummary, fetchPlatform]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join', 'analytics');
    socket.on('analytics:update', (data) => {
      setLiveUpdates(prev => [data, ...prev].slice(0, 20));
      if (data.platform) {
        setPlatformData(prev => ({
          ...prev,
          [data.platform]: { ...prev[data.platform], latest: data.latest, lastUpdated: data.timestamp },
        }));
      }
    });
    return () => socket.off('analytics:update');
  }, [socket]);

  const cfg = PLATFORM_CONFIG[selectedPlatform] || { color: '#6366f1', label: selectedPlatform };
  const current = platformData[selectedPlatform];
  const currentMetrics = current?.items || [];
  const last7 = currentMetrics.slice(-7);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--text)', padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📊 Analytics Dashboard</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Real-time social media metrics · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </div>
        </div>
        <button
          onClick={fetchSummary}
          style={{ padding: '0.5rem 1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Aggregate Metrics */}
      {summary?.aggregate && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <MetricCard label="Total Views (7d)" value={summary.aggregate.totalViews} icon="👁" color="#6366f1" />
          <MetricCard label="Total Likes (7d)" value={summary.aggregate.totalLikes} icon="❤️" color="#f43f5e" />
          <MetricCard label="Total Reach (7d)" value={summary.aggregate.totalReach} icon="📡" color="#10b981" />
          <MetricCard label="Platforms" value={PLATFORMS.length} icon="🌐" color="#f59e0b" />
        </div>
      )}

      {/* Platform Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: '2rem' }}>
        {PLATFORMS.map(p => (
          <PlatformCard
            key={p}
            platform={p}
            data={platformData[p]}
            selected={selectedPlatform === p}
            onClick={setSelectedPlatform}
          />
        ))}
      </div>

      {/* Detail View */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
          <span style={{ fontSize: 28 }}>{PLATFORM_CONFIG[selectedPlatform]?.icon}</span>
          <h2 style={{ margin: 0, color: cfg.color }}>{cfg.label} — 30-Day Detail</h2>
          {current?.configured === false && (
            <span style={{ fontSize: 12, background: '#f59e0b22', color: '#f59e0b', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              Mock Data (API not configured)
            </span>
          )}
        </div>

        {/* Metric row */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[
            { key: 'views', label: 'Views', icon: '👁' },
            { key: 'reach', label: 'Reach', icon: '📡' },
            { key: 'likes', label: 'Likes', icon: '❤️' },
            { key: 'comments', label: 'Comments', icon: '💬' },
            { key: 'shares', label: 'Shares', icon: '🔁' },
          ].map(({ key, label, icon }) => {
            const total = last7.reduce((s, m) => s + (m[key] || 0), 0);
            return <MetricCard key={key} label={label} value={total} icon={icon} color={cfg.color} />;
          })}
        </div>

        {/* Data table */}
        {currentMetrics.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Date', 'Views', 'Reach', 'Likes', 'Comments', 'Shares', 'Retention %'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentMetrics.slice(-30).reverse().map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--stripe)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{m.date || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{(m.views || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>{(m.reach || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>{(m.likes || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>{(m.comments || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>{(m.shares || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>{m.retention ? `${m.retention}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading data...</div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data available for this platform</div>
        )}
      </div>

      {/* Live updates feed */}
      {liveUpdates.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: 14, fontWeight: 700 }}>🔴 Live Updates</h3>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {liveUpdates.map((u, i) => (
              <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <span style={{ color: PLATFORM_CONFIG[u.platform]?.color }}>{PLATFORM_CONFIG[u.platform]?.icon} {u.platform}</span>
                {' · '}
                {u.latest ? `Views: ${(u.latest.views || 0).toLocaleString()}` : 'updated'}
                {' · '}
                {new Date(u.timestamp).toLocaleTimeString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
