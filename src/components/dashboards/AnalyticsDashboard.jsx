// src/components/dashboards/AnalyticsDashboard.jsx
// Created: 2026-10-18
// Social media analytics with real-time metrics: TikTok, Instagram, Facebook,
// Twitch, Discord, Lemon8, Reddit, RedGifs

import React, { useState, useEffect, useCallback } from 'react';

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#ff0050', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: '#c13584', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', icon: '👍' },
  { id: 'twitch',    label: 'Twitch',    color: '#9146ff', icon: '🎮' },
  { id: 'discord',   label: 'Discord',   color: '#5865f2', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#ffdc00', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',    color: '#ff4500', icon: '🤖' },
  { id: 'redgifs',   label: 'RedGifs',   color: '#e04040', icon: '📹' },
];

function MetricCard({ label, value, icon, suffix = '', change }) {
  const formatted = typeof value === 'number'
    ? value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K`
    : value.toLocaleString()
    : '—';

  return (
    <div style={styles.metricCard}>
      <div style={styles.metricIcon}>{icon}</div>
      <div>
        <div style={styles.metricValue}>{formatted}{suffix}</div>
        <div style={styles.metricLabel}>{label}</div>
        {change != null && (
          <div style={{ color: change >= 0 ? '#22c55e' : '#ef4444', fontSize: 12 }}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformPanel({ platform, data, loading }) {
  if (loading) return <div style={styles.loadingBox}>Loading {platform.label}…</div>;
  if (!data) return <div style={styles.loadingBox}>Not connected</div>;

  const m = data.latest || data;
  return (
    <div style={{ ...styles.platformPanel, borderTop: `3px solid ${platform.color}` }}>
      <div style={styles.platformHeader}>
        <span style={styles.platformIcon}>{platform.icon}</span>
        <span style={styles.platformName}>{platform.label}</span>
        <span style={styles.liveIndicator}>● LIVE</span>
      </div>
      <div style={styles.metricsGrid}>
        {m.followers     != null && <MetricCard label="Followers"   value={m.followers}     icon="👥" change={m.followersChange} />}
        {m.members       != null && <MetricCard label="Members"     value={m.members}       icon="👥" />}
        {m.views         != null && <MetricCard label="Views"       value={m.views}         icon="👁️" />}
        {m.likes         != null && <MetricCard label="Likes"       value={m.likes}         icon="❤️" />}
        {m.reach         != null && <MetricCard label="Reach"       value={m.reach}         icon="📡" />}
        {m.retention     != null && <MetricCard label="Retention"   value={Math.round(m.retention * 100)} icon="📊" suffix="%" />}
        {m.karma         != null && <MetricCard label="Karma"       value={m.karma}         icon="⬆️" />}
        {m.viewers       != null && <MetricCard label="Live Viewers" value={m.viewers}      icon="🔴" />}
        {m.peakViewers   != null && <MetricCard label="Peak"        value={m.peakViewers}   icon="📈" />}
        {m.onlineNow     != null && <MetricCard label="Online Now"  value={m.onlineNow}     icon="🟢" />}
        {m.impressions   != null && <MetricCard label="Impressions" value={m.impressions}   icon="🔍" />}
        {m.shares        != null && <MetricCard label="Shares"      value={m.shares}        icon="🔗" />}
      </div>
    </div>
  );
}

function RetentionChart({ data }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.views || 0), 1);
  return (
    <div style={styles.chartContainer}>
      <div style={styles.chartTitle}>View & Retention Trend (last 30 days)</div>
      <div style={styles.chartBars}>
        {data.slice(-30).map((d, i) => (
          <div key={i} style={styles.chartBarWrapper}>
            <div
              style={{
                ...styles.chartBar,
                height: `${((d.views || 0) / max) * 100}%`,
                background: `rgba(99, 102, 241, ${0.5 + (d.retention || 0) * 0.5})`,
              }}
              title={`Views: ${d.views?.toLocaleString() || 0}\nRetention: ${Math.round((d.retention || 0) * 100)}%`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ token }) {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchPlatform = useCallback(async (platformId) => {
    setLoading(prev => ({ ...prev, [platformId]: true }));
    try {
      const resp = await fetch(`/api/analytics/social/${platformId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setMetrics(prev => ({ ...prev, [platformId]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch ${platformId}:`, err.message);
    } finally {
      setLoading(prev => ({ ...prev, [platformId]: false }));
    }
  }, [token]);

  const fetchAll = useCallback(() => {
    PLATFORMS.forEach(p => fetchPlatform(p.id));
    setLastRefresh(new Date());
  }, [fetchPlatform]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(fetchAll, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [fetchAll, refreshInterval]);

  const totalFollowers = PLATFORMS.reduce((sum, p) => {
    const m = metrics[p.id]?.latest || metrics[p.id] || {};
    return sum + (m.followers || m.members || 0);
  }, 0);

  const totalViews = PLATFORMS.reduce((sum, p) => {
    const m = metrics[p.id]?.latest || metrics[p.id] || {};
    return sum + (m.views || 0);
  }, 0);

  const platform = PLATFORMS.find(p => p.id === activePlatform);
  const platformData = metrics[activePlatform];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Analytics Dashboard</h1>
          <p style={styles.subtitle}>
            Real-time social media metrics · Updated: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'never'}
          </p>
        </div>
        <div style={styles.headerActions}>
          <select
            style={styles.select}
            value={refreshInterval}
            onChange={e => setRefreshInterval(Number(e.target.value))}
          >
            <option value={10}>Refresh: 10s</option>
            <option value={30}>Refresh: 30s</option>
            <option value={60}>Refresh: 1m</option>
            <option value={300}>Refresh: 5m</option>
          </select>
          <button style={styles.refreshBtn} onClick={fetchAll}>⟳ Refresh</button>
        </div>
      </div>

      {/* Summary row */}
      <div style={styles.summaryRow}>
        <MetricCard label="Total Followers / Members" value={totalFollowers} icon="👥" />
        <MetricCard label="Total Views" value={totalViews} icon="👁️" />
        <MetricCard label="Platforms Connected" value={PLATFORMS.length} icon="🌐" />
        <MetricCard label="Active Now" value={metrics.twitch?.latest?.viewers || 0} icon="🔴" />
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview', 'platform', 'retention'].map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div style={styles.grid}>
          {PLATFORMS.map(p => (
            <PlatformPanel
              key={p.id}
              platform={p}
              data={metrics[p.id]}
              loading={loading[p.id]}
            />
          ))}
        </div>
      )}

      {/* Tab: Platform detail */}
      {activeTab === 'platform' && (
        <div>
          <div style={styles.platformTabs}>
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                style={{
                  ...styles.platformTabBtn,
                  background: activePlatform === p.id ? p.color : 'transparent',
                  color: activePlatform === p.id ? '#fff' : '#aaa',
                }}
                onClick={() => setActivePlatform(p.id)}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
          {platform && (
            <PlatformPanel
              platform={platform}
              data={platformData}
              loading={loading[platform.id]}
            />
          )}
          <RetentionChart data={platformData?.history} />
        </div>
      )}

      {/* Tab: Retention */}
      {activeTab === 'retention' && (
        <div>
          {PLATFORMS.map(p => (
            <div key={p.id} style={{ marginBottom: 24 }}>
              <div style={{ ...styles.platformName, marginBottom: 8, color: p.color }}>
                {p.icon} {p.label}
              </div>
              <RetentionChart data={metrics[p.id]?.history} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#94a3b8' },
  headerActions: { display: 'flex', gap: 12, alignItems: 'center' },
  select: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
  refreshBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 500 },
  tabActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  platformPanel: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  platformHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  platformIcon: { fontSize: 22 },
  platformName: { fontWeight: 700, fontSize: 18, color: '#f1f5f9', flex: 1 },
  liveIndicator: { fontSize: 11, color: '#22c55e', fontWeight: 700, letterSpacing: 1 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 },
  metricCard: { background: '#0f172a', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' },
  metricIcon: { fontSize: 20 },
  metricValue: { fontWeight: 700, fontSize: 20, color: '#f8fafc' },
  metricLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  loadingBox: { padding: 20, color: '#64748b', textAlign: 'center' },
  platformTabs: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  platformTabBtn: { border: '1px solid #334155', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 500, fontSize: 13, transition: 'background 0.2s' },
  chartContainer: { background: '#1e293b', borderRadius: 12, padding: 20, marginTop: 20 },
  chartTitle: { fontWeight: 600, color: '#e2e8f0', marginBottom: 16 },
  chartBars: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 },
  chartBarWrapper: { flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' },
  chartBar: { width: '100%', borderRadius: '3px 3px 0 0', minHeight: 2, transition: 'height 0.3s' },
};
