/**
 * src/components/AnalyticsDashboard.jsx
 * Nexus AI Pro — Social Media & Content Analytics Dashboard
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Real-time metrics for: TikTok, Instagram, Facebook, Twitch, Discord,
 * Lemon8, Reddit, RedGIFs — views, likes, reach, retention, engagement.
 * Uses WebSocket for live data; falls back to REST polling.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { t, formatNumber } from '../i18n/index.js';
import AuthService from '../auth/AuthService.js';

// ─── Platform Registry ────────────────────────────────────────────────────────

const PLATFORMS = {
  tiktok: {
    id: 'tiktok', name: 'TikTok', icon: '🎵',
    color: '#010101', accent: '#fe2c55', bg: 'rgba(254,44,85,0.1)',
    metrics: ['views', 'likes', 'comments', 'shares', 'followers', 'reach', 'retention', 'forYouReach'],
    supportsLive: true,
  },
  instagram: {
    id: 'instagram', name: 'Instagram', icon: '📸',
    color: '#E4405F', accent: '#833AB4', bg: 'rgba(228,64,95,0.1)',
    metrics: ['views', 'likes', 'comments', 'saves', 'reach', 'impressions', 'storyViews', 'reelPlays'],
    supportsLive: true,
  },
  facebook: {
    id: 'facebook', name: 'Facebook', icon: '👥',
    color: '#1877F2', accent: '#1877F2', bg: 'rgba(24,119,242,0.1)',
    metrics: ['reach', 'impressions', 'likes', 'comments', 'shares', 'pageViews', 'followers'],
    supportsLive: true,
  },
  twitch: {
    id: 'twitch', name: 'Twitch', icon: '🎮',
    color: '#9146FF', accent: '#9146FF', bg: 'rgba(145,70,255,0.1)',
    metrics: ['viewers', 'followers', 'subscribers', 'chatMessages', 'hoursWatched', 'avgViewers', 'peakViewers'],
    supportsLive: true,
  },
  discord: {
    id: 'discord', name: 'Discord', icon: '💬',
    color: '#5865F2', accent: '#5865F2', bg: 'rgba(88,101,242,0.1)',
    metrics: ['members', 'onlineMembers', 'messages', 'boosts', 'serverPremium', 'joins', 'leaves'],
    supportsLive: false,
  },
  lemon8: {
    id: 'lemon8', name: 'Lemon8', icon: '🍋',
    color: '#FFD700', accent: '#FF8C00', bg: 'rgba(255,215,0,0.1)',
    metrics: ['views', 'likes', 'comments', 'saves', 'followers', 'reach'],
    supportsLive: false,
  },
  reddit: {
    id: 'reddit', name: 'Reddit', icon: '🔴',
    color: '#FF4500', accent: '#FF4500', bg: 'rgba(255,69,0,0.1)',
    metrics: ['upvotes', 'comments', 'awards', 'crossPosts', 'subredditMembers', 'postKarma'],
    supportsLive: false,
  },
  redgifs: {
    id: 'redgifs', name: 'RedGIFs', icon: '🎬',
    color: '#E53E3E', accent: '#C53030', bg: 'rgba(229,62,62,0.1)',
    metrics: ['views', 'likes', 'shares', 'downloads', 'retention'],
    supportsLive: false,
  },
};

const METRIC_LABELS = {
  views: 'Views', likes: 'Likes', comments: 'Comments', shares: 'Shares',
  followers: 'Followers', reach: 'Reach', impressions: 'Impressions',
  saves: 'Saves', storyViews: 'Story Views', reelPlays: 'Reel Plays',
  retention: 'Retention %', forYouReach: 'FYP Reach',
  pageViews: 'Page Views', viewers: 'Live Viewers',
  subscribers: 'Subscribers', chatMessages: 'Chat Messages',
  hoursWatched: 'Hours Watched', avgViewers: 'Avg Viewers',
  peakViewers: 'Peak Viewers', members: 'Members',
  onlineMembers: 'Online', messages: 'Messages', boosts: 'Boosts',
  serverPremium: 'Nitro Level', joins: 'Joins', leaves: 'Leaves',
  upvotes: 'Upvotes', awards: 'Awards', crossPosts: 'Crossposts',
  subredditMembers: 'Sub Members', postKarma: 'Post Karma',
  downloads: 'Downloads',
};

const TIME_RANGES = [
  { id: '1h',  label: '1H' },
  { id: '24h', label: '24H' },
  { id: '7d',  label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePlatformMetrics(platformId, timeRange) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(
        `/api/analytics/social?platform=${platformId}&range=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [platformId, timeRange]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, change, icon, accent }) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? '#10b981' : '#ef4444';
  const arrow = isPositive ? '▲' : '▼';

  return (
    <div style={{
      background: '#1a1a2e', border: '1px solid #2d2d44',
      borderRadius: 12, padding: '16px', display: 'flex',
      flexDirection: 'column', gap: 8, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      <div style={{ fontSize: 12, color: changeColor }}>
        {arrow} {Math.abs(change).toFixed(1)}%
        <span style={{ color: '#555', marginLeft: 4 }}>vs prev</span>
      </div>
    </div>
  );
}

function SparkBar({ values = [], accent }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, background: accent,
          opacity: 0.4 + 0.6 * (v / max),
          height: `${Math.max(4, (v / max) * 100)}%`,
          borderRadius: '2px 2px 0 0',
        }} />
      ))}
    </div>
  );
}

function PlatformPanel({ platform }) {
  const [range, setRange] = useState('24h');
  const { data, loading, error, refresh } = usePlatformMetrics(platform.id, range);

  const metrics = data?.metrics || {};
  const sparkData = data?.sparkline || [];
  const totalReach = metrics.reach ?? metrics.viewers ?? metrics.members ?? 0;
  const topMetrics = platform.metrics.slice(0, 6);

  return (
    <div style={{
      background: '#12121f', border: `1px solid ${platform.accent}40`,
      borderRadius: 16, padding: '20px', marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: platform.bg, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            {platform.icon}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{platform.name}</div>
            <div style={{ fontSize: 12, color: platform.accent }}>
              {platform.supportsLive ? '🔴 Live data' : '📊 Analytics'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {TIME_RANGES.map(r => (
            <button key={r.id} onClick={() => setRange(r.id)} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
              background: range === r.id ? platform.accent : '#2d2d44',
              color: range === r.id ? '#fff' : '#888', fontWeight: 600,
            }}>
              {r.label}
            </button>
          ))}
          <button onClick={refresh} style={{
            padding: '4px 8px', borderRadius: 6, border: 'none',
            cursor: 'pointer', background: '#2d2d44', color: '#888', fontSize: 12,
          }}>
            ⟳
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>Loading metrics…</div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
          borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Sparkline */}
          {sparkData.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Trend ({range})</div>
              <SparkBar values={sparkData} accent={platform.accent} />
            </div>
          )}

          {/* Metric cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
          }}>
            {topMetrics.map(key => (
              <MetricCard
                key={key}
                label={METRIC_LABELS[key] ?? key}
                value={metrics[key] ?? 0}
                change={data.changes?.[key] ?? 0}
                accent={platform.accent}
              />
            ))}
          </div>

          {/* Retention bar */}
          {metrics.retention !== undefined && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 6 }}>
                <span>Retention Rate</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{metrics.retention}%</span>
              </div>
              <div style={{ height: 6, background: '#2d2d44', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${metrics.retention}%`,
                  background: `linear-gradient(90deg, ${platform.accent}, #a855f7)`,
                  borderRadius: 3, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Overview bar ─────────────────────────────────────────────────────────────

function OverviewBar({ summary }) {
  const stats = [
    { label: 'Total Reach',      value: summary?.totalReach,       icon: '📡' },
    { label: 'Total Likes',      value: summary?.totalLikes,       icon: '❤️' },
    { label: 'Total Views',      value: summary?.totalViews,       icon: '👁' },
    { label: 'Avg Retention',    value: `${summary?.avgRetention ?? 0}%`, icon: '⏱' },
    { label: 'Active Platforms', value: summary?.activePlatforms,  icon: '🌐' },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 12, marginBottom: 24,
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          border: '1px solid #2d2d44', borderRadius: 14, padding: '16px',
        }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
          <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {s.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 4 }}>
            {typeof s.value === 'number' ? formatNumber(s.value) : (s.value ?? '—')}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [activePlatforms, setActivePlatforms] = useState(Object.keys(PLATFORMS));
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const token = AuthService.getToken();
    fetch('/api/analytics/summary', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSummary(d))
      .catch(() => null);
  }, []);

  function togglePlatform(id) {
    setActivePlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Analytics Dashboard
        </h1>
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: 14 }}>
          Real-time social media metrics across all connected platforms
        </p>
      </div>

      {/* Overview */}
      <OverviewBar summary={summary} />

      {/* Platform toggles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.values(PLATFORMS).map(p => (
          <button key={p.id} onClick={() => togglePlatform(p.id)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            background: activePlatforms.includes(p.id) ? p.accent : '#2d2d44',
            color: activePlatforms.includes(p.id) ? '#fff' : '#888',
            transition: 'all 0.2s',
          }}>
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      {/* Platform panels */}
      {activePlatforms.map(id => (
        <PlatformPanel key={id} platform={PLATFORMS[id]} />
      ))}

      {activePlatforms.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: '#555',
          border: '2px dashed #2d2d44', borderRadius: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div>Select platforms above to view analytics</div>
        </div>
      )}
    </div>
  );
}
