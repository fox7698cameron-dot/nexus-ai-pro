/**
 * AnalyticsDashboard.jsx
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Real-time Social Media & Content Analytics Dashboard
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs, YouTube, X/Twitter
 * Updated: 2026-08-14
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, TrendingUp, Users, Eye, Heart, Share2, MessageCircle,
  RefreshCw, Filter, Calendar, ChevronDown, AlertCircle, Wifi,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Zap, Globe,
  Star, Clock, Video, Radio, Download, ExternalLink, Settings
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const PLATFORMS = {
  tiktok:    { name: 'TikTok',     icon: '🎵', color: '#ff0050', bgClass: 'bg-rose-600' },
  instagram: { name: 'Instagram',  icon: '📸', color: '#e4405f', bgClass: 'bg-pink-600' },
  facebook:  { name: 'Facebook',   icon: '👥', color: '#1877f2', bgClass: 'bg-blue-600' },
  twitch:    { name: 'Twitch',     icon: '🎮', color: '#9146ff', bgClass: 'bg-purple-600' },
  discord:   { name: 'Discord',    icon: '💬', color: '#5865f2', bgClass: 'bg-indigo-600' },
  lemon8:    { name: 'Lemon8',     icon: '🍋', color: '#ffcc00', bgClass: 'bg-yellow-500' },
  reddit:    { name: 'Reddit',     icon: '🤖', color: '#ff4500', bgClass: 'bg-orange-600' },
  redgifs:   { name: 'RedGifs',    icon: '🎬', color: '#ff6b6b', bgClass: 'bg-red-500' },
  youtube:   { name: 'YouTube',    icon: '▶️', color: '#ff0000', bgClass: 'bg-red-600' },
  twitter:   { name: 'X/Twitter', icon: '🐦', color: '#1da1f2', bgClass: 'bg-sky-500' },
};

const TIME_RANGES = ['24h', '7d', '30d', '90d'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M'
  : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(n);

const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

function genMetrics(seed) {
  const r = (min, max) => Math.floor(min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min));
  return {
    followers: r(5000, 500000),
    views:     r(10000, 2000000),
    reach:     r(8000, 1500000),
    likes:     r(500, 100000),
    comments:  r(50, 20000),
    shares:    r(100, 50000),
    engagement: +(1 + Math.random() * 12).toFixed(2),
    change:     +((Math.random() - 0.35) * 30).toFixed(1),
    retention:  +(20 + Math.random() * 60).toFixed(1),
  };
}

function genTimeSeries(days) {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    views:     Math.floor(5000 + Math.random() * 50000),
    reach:     Math.floor(3000 + Math.random() * 30000),
    likes:     Math.floor(100 + Math.random() * 5000),
    retention: +(30 + Math.random() * 55).toFixed(1),
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend, icon: Icon, color }) {
  const up = trend >= 0;
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7, fontSize: 13 }}>
        {Icon && <Icon size={14} />}
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
      {(sub || trend !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          {trend !== undefined && (
            <span style={{ color: up ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {fmtPct(trend)}
            </span>
          )}
          {sub && <span style={{ opacity: 0.5 }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, data, selected, onClick }) {
  const p = PLATFORMS[platform];
  const up = data.change >= 0;
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? `${p.color}22` : 'var(--card-bg)',
        border: `1px solid ${selected ? p.color : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left',
        transition: 'all 0.15s', width: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{p.icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.name}</span>
        </div>
        <span style={{ fontSize: 11, color: up ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
          {fmtPct(data.change)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>Followers</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: p.color }}>{fmtNum(data.followers)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>Reach</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtNum(data.reach)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>Engagement</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{data.engagement}%</div>
        </div>
      </div>
    </button>
  );
}

function SimpleBarChart({ data, dataKey, color, height = 120 }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[dataKey]));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, paddingBottom: 20, position: 'relative' }}>
      {data.map((d, i) => {
        const h = max ? (d[dataKey] / max) * (height - 20) : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', height: h, background: `${color}cc`, borderRadius: '3px 3px 0 0', minHeight: 2 }} />
            {data.length <= 14 && (
              <div style={{ fontSize: 9, opacity: 0.5, transform: 'rotate(-45deg)', marginTop: 2 }}>{d.date}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RetentionChart({ data }) {
  if (!data?.length) return null;
  const h = 120;
  const w = 100;
  const max = 100;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.retention / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 120 }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="#6366f120" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [timeRange, setTimeRange] = useState('7d');
  const [metricsData, setMetricsData] = useState({});
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const intervalRef = useRef(null);

  // Generate platform metrics
  const loadData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const metrics = {};
      Object.keys(PLATFORMS).forEach((p, i) => {
        metrics[p] = genMetrics(i * 100 + Date.now() % 1000);
      });
      setMetricsData(metrics);
      const days = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      setTimeSeries(genTimeSeries(days));
      setLastUpdated(new Date());
      setLoading(false);
    }, 500);
  }, [timeRange]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time mode
  useEffect(() => {
    if (realtimeActive) {
      intervalRef.current = setInterval(() => {
        setMetricsData(prev => {
          const updated = { ...prev };
          const plat = selectedPlatform;
          if (updated[plat]) {
            updated[plat] = {
              ...updated[plat],
              views: updated[plat].views + Math.floor(Math.random() * 500),
              reach: updated[plat].reach + Math.floor(Math.random() * 200),
              likes: updated[plat].likes + Math.floor(Math.random() * 50),
            };
          }
          return updated;
        });
        setLastUpdated(new Date());
      }, 3000);
    }
    return () => clearInterval(intervalRef.current);
  }, [realtimeActive, selectedPlatform]);

  const pd = metricsData[selectedPlatform] || {};
  const plat = PLATFORMS[selectedPlatform];

  const aggregates = Object.values(metricsData).reduce(
    (acc, m) => ({ followers: acc.followers + (m.followers || 0), reach: acc.reach + (m.reach || 0), views: acc.views + (m.views || 0) }),
    { followers: 0, reach: 0, views: 0 }
  );

  const styles = {
    container: { padding: 24, color: 'var(--text)', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    title: { fontSize: 24, fontWeight: 700, margin: 0 },
    controls: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
    btn: (active) => ({
      padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
      background: active ? 'var(--accent)' : 'var(--card-bg)', color: 'var(--text)',
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400
    }),
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 20 },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 },
    card: { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 14, fontWeight: 600, opacity: 0.7, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
    badge: (color) => ({ background: `${color}22`, color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }),
    realtimeDot: { width: 8, height: 8, borderRadius: '50%', background: realtimeActive ? '#22c55e' : '#888', animation: realtimeActive ? 'pulse 1.5s infinite' : 'none' },
  };

  return (
    <div style={styles.container}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Analytics Dashboard</h1>
          <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </div>
        </div>
        <div style={styles.controls}>
          {/* Real-time toggle */}
          <button
            onClick={() => setRealtimeActive(v => !v)}
            style={{ ...styles.btn(realtimeActive), display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <div style={styles.realtimeDot} />
            {realtimeActive ? 'Live' : 'Real-time'}
          </button>
          {/* Time range */}
          {TIME_RANGES.map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={styles.btn(timeRange === r)}>{r}</button>
          ))}
          <button onClick={loadData} style={styles.btn(false)}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Aggregate KPIs */}
      <div style={styles.grid4}>
        <MetricCard label="Total Followers" value={fmtNum(aggregates.followers)} icon={Users} trend={4.2} />
        <MetricCard label="Total Reach" value={fmtNum(aggregates.reach)} icon={Globe} trend={12.1} />
        <MetricCard label="Total Views" value={fmtNum(aggregates.views)} icon={Eye} trend={8.7} />
        <MetricCard label="Platforms Connected" value={Object.keys(PLATFORMS).length} icon={Zap} color="#6366f1" />
      </div>

      {/* Platform Cards Grid */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}><BarChart3 size={14} /> Platform Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {Object.entries(PLATFORMS).map(([key]) => (
            <PlatformCard
              key={key}
              platform={key}
              data={metricsData[key] || {}}
              selected={selectedPlatform === key}
              onClick={() => setSelectedPlatform(key)}
            />
          ))}
        </div>
      </div>

      {/* Selected Platform Detail */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>{plat?.icon}</span>
          {plat?.name} — Detailed Metrics
          <span style={styles.badge(plat?.color || '#6366f1')}>Live</span>
        </div>
        <div style={styles.grid4}>
          <MetricCard label="Views"       value={fmtNum(pd.views || 0)}     icon={Eye}          trend={pd.change} color={plat?.color} />
          <MetricCard label="Reach"       value={fmtNum(pd.reach || 0)}     icon={Globe}        trend={pd.change * 0.8} />
          <MetricCard label="Likes"       value={fmtNum(pd.likes || 0)}     icon={Heart}        trend={pd.change * 1.1} />
          <MetricCard label="Comments"    value={fmtNum(pd.comments || 0)}  icon={MessageCircle} trend={pd.change * 0.9} />
          <MetricCard label="Shares"      value={fmtNum(pd.shares || 0)}    icon={Share2}       trend={pd.change * 0.7} />
          <MetricCard label="Followers"   value={fmtNum(pd.followers || 0)} icon={Users}        trend={pd.change * 0.5} />
          <MetricCard label="Engagement"  value={`${pd.engagement || 0}%`}  icon={TrendingUp}   trend={pd.change * 0.3} />
          <MetricCard label="Retention"   value={`${pd.retention || 0}%`}   icon={Clock}        trend={pd.change * 0.6} />
        </div>

        {/* Charts Row */}
        <div style={styles.grid2}>
          {/* Views over time */}
          <div style={styles.card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>
              <Eye size={13} style={{ marginRight: 6 }} />Views & Reach ({timeRange})
            </div>
            <SimpleBarChart data={timeSeries} dataKey="views" color={plat?.color || '#6366f1'} />
          </div>
          {/* Retention curve */}
          <div style={styles.card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>
              <Clock size={13} style={{ marginRight: 6 }} />Audience Retention
            </div>
            <RetentionChart data={timeSeries} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.5, marginTop: 4 }}>
              <span>0%</span><span>Avg: {pd.retention || 0}%</span><span>100%</span>
            </div>
          </div>
        </div>

        {/* Engagement breakdown */}
        <div style={styles.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>
            <Activity size={13} style={{ marginRight: 6 }} />Engagement Breakdown
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Likes', value: pd.likes || 0, color: '#ec4899', pct: 45 },
              { label: 'Comments', value: pd.comments || 0, color: '#3b82f6', pct: 15 },
              { label: 'Shares', value: pd.shares || 0, color: '#22c55e', pct: 25 },
              { label: 'Saves', value: Math.floor((pd.likes || 0) * 0.3), color: '#f59e0b', pct: 15 },
            ].map(item => (
              <div key={item.label} style={{ flex: '1 1 120px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ opacity: 0.7 }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: item.color }}>{fmtNum(item.value)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Content */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}><Star size={14} /> Top Content ({plat?.name})</div>
        <div style={styles.card}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, background: `${plat?.color}22`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : plat?.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Content post #{i + 1} — {plat?.name}</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>{new Date(Date.now() - i * 86400000 * 3).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: plat?.color }}>{fmtNum(Math.floor(pd.views * (1 - i * 0.15) || 10000))}</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>views</div>
              </div>
              <ExternalLink size={13} style={{ opacity: 0.4 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
