/**
 * src/dashboards/AnalyticsDashboard.jsx
 * Nexus AI Pro — Social Media Analytics Dashboard
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
 * Features: real-time metrics, reach, views, likes, retention, engagement
 * Multi-platform: desktop, mobile, tablet, Electron, iOS, Android, web
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ── Platform config ────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#010101', accent: '#ff0050', icon: '🎵' },
  { id: 'instagram', label: 'Instagram',  color: '#e1306c', accent: '#fd1d1d', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',   color: '#1877f2', accent: '#0a66c2', icon: '📘' },
  { id: 'twitch',    label: 'Twitch',     color: '#6441a5', accent: '#9147ff', icon: '🟣' },
  { id: 'discord',   label: 'Discord',    color: '#5865f2', accent: '#3b40c4', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',     color: '#ffcc00', accent: '#ff8800', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',     color: '#ff4500', accent: '#ff6314', icon: '🤖' },
  { id: 'redgifs',   label: 'RedGifs',    color: '#e74c3c', accent: '#c0392b', icon: '🎬' },
];

// ── Mini sparkline component ───────────────────────────────────────────────

function Sparkline({ data = [], color = '#3b82f6', height = 40, width = 120 }) {
  if (!data.length) return <div style={{ width, height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────

function MetricCard({ label, value, change, icon, color, sparkData, loading }) {
  const formatted = typeof value === 'number'
    ? value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K`
    : value.toLocaleString()
    : '—';

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 0,
      flex: '1 1 180px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {change !== undefined && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
            background: change >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: change >= 0 ? '#22c55e' : '#ef4444',
          }}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ height: 28, background: 'var(--skeleton)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{formatted}</div>
      )}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
      {sparkData && <Sparkline data={sparkData} color={color || '#3b82f6'} />}
    </div>
  );
}

// ── Platform row ──────────────────────────────────────────────────────────

function PlatformRow({ platform, metrics, loading, selected, onToggle }) {
  const m = metrics || {};
  return (
    <div
      onClick={() => onToggle(platform.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderRadius: 10, cursor: 'pointer',
        background: selected ? `${platform.color}22` : 'transparent',
        border: `1px solid ${selected ? platform.accent : 'var(--border)'}`,
        transition: 'all 0.15s',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 20 }}>{platform.icon}</span>
      <span style={{ fontWeight: 700, minWidth: 90, color: 'var(--text-primary)' }}>{platform.label}</span>
      {loading ? (
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading…</span>
      ) : (
        <>
          <StatPill label="Followers" value={m.followers} color={platform.accent} />
          <StatPill label="Views" value={m.views} color={platform.accent} />
          <StatPill label="Likes" value={m.likes} color={platform.accent} />
          <StatPill label="Reach" value={m.reach} color={platform.accent} />
          {m.retentionRate !== null && m.retentionRate !== undefined && (
            <StatPill label="Retention" value={`${m.retentionRate?.toFixed(1)}%`} color={platform.accent} raw />
          )}
        </>
      )}
      {m.error && <span style={{ color: '#ef4444', fontSize: 12 }}>⚠ {m.error}</span>}
    </div>
  );
}

function StatPill({ label, value, color, raw }) {
  const display = raw ? value
    : typeof value === 'number'
      ? value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K`
      : (value || 0).toLocaleString()
    : '—';
  return (
    <span style={{
      background: 'var(--bg-secondary)', borderRadius: 99, padding: '2px 10px',
      fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 60,
    }}>
      <span style={{ color }}>{display}</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{label}</span>
    </span>
  );
}

// ── Aggregate summary row ──────────────────────────────────────────────────

function AggregateSummary({ totals, loading }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <MetricCard label="Total Followers" value={totals?.totalFollowers ?? 0} icon="👥" loading={loading} color="#3b82f6" />
      <MetricCard label="Total Views" value={totals?.totalViews ?? 0} icon="👁️" loading={loading} color="#8b5cf6" />
      <MetricCard label="Total Reach" value={totals?.totalReach ?? 0} icon="📡" loading={loading} color="#ec4899" />
      <MetricCard label="Total Likes" value={totals?.totalLikes ?? 0} icon="❤️" loading={loading} color="#ef4444" />
      <MetricCard label="Total Shares" value={totals?.totalShares ?? 0} icon="↗️" loading={loading} color="#f59e0b" />
    </div>
  );
}

// ── Last updated badge ────────────────────────────────────────────────────

function LastUpdated({ ts }) {
  if (!ts) return null;
  const d = new Date(ts);
  return (
    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
      Last updated: {d.toLocaleTimeString()}
    </span>
  );
}

// ── Main AnalyticsDashboard ───────────────────────────────────────────────

export function AnalyticsDashboard({ authToken, userId, socket }) {
  const [metricsMap, setMetricsMap] = useState({});
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set(PLATFORMS.map((p) => p.id)));
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [historyMap, setHistoryMap] = useState({}); // platform → last-N view counts

  const fetchAnalytics = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/social', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const map = {};
      for (const m of data.platforms || []) map[m.platform] = m;
      setMetricsMap(map);
      setTotals(data.totals);
      setLastUpdated(new Date().toISOString());
      // Track view history for sparklines
      setHistoryMap((prev) => {
        const next = { ...prev };
        for (const m of data.platforms || []) {
          const hist = prev[m.platform] || [];
          next[m.platform] = [...hist, m.views || 0].slice(-20);
        }
        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchAnalytics, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshInterval, fetchAnalytics]);

  // Real-time via WebSocket
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      if (payload.userId !== userId) return;
      const map = {};
      for (const m of payload.data || []) map[m.platform] = m;
      setMetricsMap(map);
      setLastUpdated(new Date().toISOString());
    };
    socket.on('analytics:update', handler);
    return () => socket.off('analytics:update', handler);
  }, [socket, userId]);

  const togglePlatform = useCallback((id) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const visiblePlatforms = useMemo(
    () => PLATFORMS.filter((p) => selectedPlatforms.has(p.id)),
    [selectedPlatforms]
  );

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'var(--text-primary, #1a1a2e)',
      maxWidth: 1100,
      margin: '0 auto',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📊 Social Analytics</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Real-time metrics across all platforms
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <LastUpdated ts={lastUpdated} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card-bg)', fontSize: 13 }}
          >
            {[10, 30, 60, 300].map((s) => <option key={s} value={s}>{s}s</option>)}
          </select>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13,
            }}
          >
            {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Aggregate totals */}
      <section>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📈 Aggregate Summary</h2>
        <AggregateSummary totals={totals} loading={loading} />
      </section>

      {/* Platform filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => togglePlatform(p.id)}
            style={{
              padding: '4px 12px', borderRadius: 99, border: `1px solid ${selectedPlatforms.has(p.id) ? p.accent : 'var(--border)'}`,
              background: selectedPlatforms.has(p.id) ? `${p.color}22` : 'transparent',
              color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Per-platform cards */}
      <section>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📱 Platform Breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visiblePlatforms.map((p) => (
            <PlatformRow
              key={p.id}
              platform={p}
              metrics={metricsMap[p.id]}
              loading={loading && !metricsMap[p.id]}
              selected={selectedPlatforms.has(p.id)}
              onToggle={() => {}}
            />
          ))}
          {visiblePlatforms.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No platforms selected. Toggle chips above.</p>
          )}
        </div>
      </section>

      {/* Sparkline view trend cards */}
      <section>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📊 View Trends (last 20 datapoints)</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {visiblePlatforms.map((p) => (
            <div key={p.id} style={{
              background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12,
              padding: 16, minWidth: 160, flex: '1 1 160px',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{p.icon} {p.label}</div>
              <Sparkline data={historyMap[p.id] || []} color={p.accent} width={140} height={50} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Views</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AnalyticsDashboard;
