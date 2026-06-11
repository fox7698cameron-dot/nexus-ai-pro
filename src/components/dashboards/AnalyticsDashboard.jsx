// src/components/dashboards/AnalyticsDashboard.jsx
// Real-time social media analytics — views, likes, reach, retention, watch time
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, Users,
  RefreshCw, Link, Activity, Clock, Zap,
} from 'lucide-react';

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'youtube', 'twitter'];
const PLATFORM_COLORS = {
  tiktok: '#69C9D0', instagram: '#E1306C', facebook: '#1877F2',
  twitch: '#9146FF', discord: '#5865F2', lemon8: '#FFD700',
  reddit: '#FF4500', youtube: '#FF0000', twitter: '#1DA1F2',
};

function MetricCard({ label, value, delta, icon: Icon, color = '#6366F1' }) {
  const positive = delta >= 0;
  return (
    <div style={styles.metricCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={styles.metricLabel}>{label}</p>
          <p style={styles.metricValue}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {delta !== undefined && (
            <p style={{ ...styles.metricDelta, color: positive ? '#10B981' : '#EF4444' }}>
              {positive ? <TrendingUp size={12} style={{ display: 'inline', marginRight: 3 }} /> : <TrendingDown size={12} style={{ display: 'inline', marginRight: 3 }} />}
              {Math.abs(delta).toLocaleString()} {positive ? '↑' : '↓'}
            </p>
          )}
        </div>
        <div style={{ ...styles.iconBadge, background: `${color}22`, color }}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function PlatformRow({ platform, metrics }) {
  const color = PLATFORM_COLORS[platform] ?? '#6366F1';
  return (
    <div style={styles.platformRow}>
      <div style={{ ...styles.platformDot, background: color }} />
      <span style={styles.platformName}>{platform}</span>
      <span style={styles.platformStat}>{(metrics?.followers ?? 0).toLocaleString()} followers</span>
      <span style={styles.platformStat}>{(metrics?.engagementRate ?? 0).toFixed(2)}% ER</span>
      <span style={styles.platformStat}>{(metrics?.reach ?? 0).toLocaleString()} reach</span>
    </div>
  );
}

export default function AnalyticsDashboard({ socket }) {
  const [summary, setSummary] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
        setLastUpdated(new Date());
      }
    } catch {
      // silently handle network error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeSeries = useCallback(async (platform) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/analytics/timeseries/${platform}?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTimeSeries(await res.json());
    } catch {
      // silently handle
    }
  }, []);

  const seedDemo = async () => {
    const token = localStorage.getItem('accessToken');
    await fetch('/api/analytics/demo', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    await fetchSummary();
    await fetchTimeSeries(selectedPlatform);
  };

  useEffect(() => {
    fetchSummary();
    fetchTimeSeries(selectedPlatform);
  }, [fetchSummary, fetchTimeSeries, selectedPlatform]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handler = ({ platform }) => {
      fetchSummary();
      if (platform === selectedPlatform) fetchTimeSeries(platform);
    };
    socket.on('metrics:updated', handler);
    return () => socket.off('metrics:updated', handler);
  }, [socket, selectedPlatform, fetchSummary, fetchTimeSeries]);

  if (loading) return <div style={styles.loading}><RefreshCw size={24} className="spin" /> Loading analytics…</div>;

  const platformMetrics = summary?.platforms ?? {};

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><Activity size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Analytics Dashboard</h1>
        <div style={styles.headerRight}>
          {lastUpdated && <span style={styles.updated}>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button style={styles.btn} onClick={fetchSummary}><RefreshCw size={14} /> Refresh</button>
          {process.env.NODE_ENV !== 'production' && (
            <button style={{ ...styles.btn, background: '#6366F1' }} onClick={seedDemo}><Zap size={14} /> Seed Demo</button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={styles.grid4}>
        <MetricCard label="Total Followers" value={summary?.totalFollowers ?? 0} icon={Users} color="#6366F1" />
        <MetricCard label="Total Views" value={summary?.totalViews ?? 0} icon={Eye} color="#06B6D4" />
        <MetricCard label="Total Likes" value={summary?.totalLikes ?? 0} icon={Heart} color="#EF4444" />
        <MetricCard label="Avg Engagement" value={`${(summary?.avgEngagementRate ?? 0).toFixed(2)}%`} icon={TrendingUp} color="#10B981" />
        <MetricCard label="Total Reach" value={summary?.totalReach ?? 0} icon={Share2} color="#F59E0B" />
        <MetricCard label="Total Comments" value={summary?.totalComments ?? 0} icon={Activity} color="#8B5CF6" />
        <MetricCard label="Total Shares" value={summary?.totalShares ?? 0} icon={Link} color="#EC4899" />
        <MetricCard label="Platforms" value={Object.keys(platformMetrics).length} icon={Zap} color="#14B8A6" />
      </div>

      {/* Platform selector */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Platform Breakdown</h2>
        <div style={styles.platformTabs}>
          {PLATFORMS.map(p => (
            <button
              key={p}
              style={{ ...styles.platformTab, ...(selectedPlatform === p ? { ...styles.platformTabActive, borderColor: PLATFORM_COLORS[p], color: PLATFORM_COLORS[p] } : {}) }}
              onClick={() => { setSelectedPlatform(p); fetchTimeSeries(p); }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Platform chart */}
      {timeSeries.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{selectedPlatform} — Followers Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PLATFORM_COLORS[selectedPlatform]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PLATFORM_COLORS[selectedPlatform]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
              <XAxis dataKey="recordedAt" tickFormatter={v => new Date(v).toLocaleDateString()} stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} labelFormatter={v => new Date(v).toLocaleString()} />
              <Area type="monotone" dataKey="followers" stroke={PLATFORM_COLORS[selectedPlatform]} fill="url(#colorFollowers)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Engagement Rate chart */}
      {timeSeries.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{selectedPlatform} — Engagement Rate & Reach</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
              <XAxis dataKey="recordedAt" tickFormatter={v => new Date(v).toLocaleDateString()} stroke="#888" fontSize={11} />
              <YAxis yAxisId="left" stroke="#888" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={11} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="engagementRate" stroke="#10B981" strokeWidth={2} dot={false} name="Engagement %" />
              <Line yAxisId="right" type="monotone" dataKey="reach" stroke="#6366F1" strokeWidth={2} dot={false} name="Reach" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Platform list */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>All Platforms</h2>
        <div style={styles.platformList}>
          {PLATFORMS.map(p => (
            <PlatformRow key={p} platform={p} metrics={platformMetrics[p]} />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 24, color: '#E2E8F0', minHeight: '100vh', background: '#0F0F23' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center' },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  updated: { fontSize: 12, color: '#64748B' },
  btn: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#1E293B', border: '1px solid #334155', borderRadius: 6, color: '#E2E8F0', cursor: 'pointer', fontSize: 13 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  metricCard: { background: '#1E293B', borderRadius: 12, padding: 16, border: '1px solid #334155' },
  metricLabel: { fontSize: 12, color: '#64748B', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  metricValue: { fontSize: 24, fontWeight: 700, margin: '0 0 4px' },
  metricDelta: { fontSize: 12, margin: 0, display: 'flex', alignItems: 'center' },
  iconBadge: { padding: 8, borderRadius: 8 },
  section: { background: '#1E293B', borderRadius: 12, padding: 20, border: '1px solid #334155', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: '#94A3B8' },
  platformTabs: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  platformTab: { padding: '6px 14px', borderRadius: 20, border: '1px solid #334155', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: 13 },
  platformTabActive: { background: '#0F172A' },
  platformList: { display: 'flex', flexDirection: 'column', gap: 8 },
  platformRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1E293B' },
  platformDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  platformName: { width: 100, fontSize: 13, fontWeight: 500, textTransform: 'capitalize' },
  platformStat: { flex: 1, fontSize: 12, color: '#64748B' },
  loading: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 48, color: '#64748B' },
};
