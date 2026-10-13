// src/components/AnalyticsDashboard.jsx
// Social Media Analytics Dashboard - Real-Time Metrics
// Updated: 2026-10-13

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Users, Share2,
  BarChart3, Activity, RefreshCw, Clock, Globe, ChevronDown,
  Video, MessageSquare, Play, Repeat2, Star
} from 'lucide-react';

const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    color: '#010101',
    accent: '#ff0050',
    icon: '🎵',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'reach', 'retention']
  },
  instagram: {
    name: 'Instagram',
    color: '#833ab4',
    accent: '#fd1d1d',
    icon: '📸',
    metrics: ['impressions', 'reach', 'likes', 'comments', 'saves', 'follows', 'story_views']
  },
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    accent: '#42b72a',
    icon: '👥',
    metrics: ['reach', 'impressions', 'reactions', 'comments', 'shares', 'page_views', 'followers']
  },
  twitch: {
    name: 'Twitch',
    color: '#9146ff',
    accent: '#bf94ff',
    icon: '🎮',
    metrics: ['avg_viewers', 'peak_viewers', 'followers', 'subscribers', 'watch_time', 'clips', 'raids']
  },
  discord: {
    name: 'Discord',
    color: '#5865f2',
    accent: '#57f287',
    icon: '💬',
    metrics: ['members', 'active_members', 'messages', 'voice_hours', 'boosts', 'channels', 'growth']
  },
  lemon8: {
    name: 'Lemon8',
    color: '#ffcc00',
    accent: '#ff6600',
    icon: '🍋',
    metrics: ['views', 'likes', 'comments', 'saves', 'followers', 'reach', 'engagement']
  },
  reddit: {
    name: 'Reddit',
    color: '#ff4500',
    accent: '#ff6534',
    icon: '🤖',
    metrics: ['karma', 'post_views', 'upvotes', 'comments', 'shares', 'followers', 'awards']
  },
  redgifs: {
    name: 'RedGIFs',
    color: '#ff1744',
    accent: '#ff6090',
    icon: '🎞️',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'watch_time', 'completion_rate']
  }
};

function generateMetricValue(base, variance = 0.15) {
  return Math.floor(base * (1 + (Math.random() - 0.5) * variance));
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function generatePlatformData(platformKey) {
  const seeds = {
    tiktok: { views: 2400000, likes: 180000, shares: 45000, comments: 12000, followers: 890000, reach: 3100000, retention: 62 },
    instagram: { impressions: 1800000, reach: 1200000, likes: 95000, comments: 8500, saves: 22000, follows: 4200, story_views: 380000 },
    facebook: { reach: 950000, impressions: 1400000, reactions: 42000, comments: 5800, shares: 18000, page_views: 290000, followers: 670000 },
    twitch: { avg_viewers: 8400, peak_viewers: 24000, followers: 145000, subscribers: 3200, watch_time: 890000, clips: 4700, raids: 89 },
    discord: { members: 42000, active_members: 8900, messages: 185000, voice_hours: 22000, boosts: 48, channels: 127, growth: 1240 },
    lemon8: { views: 680000, likes: 48000, comments: 6200, saves: 18000, followers: 124000, reach: 890000, engagement: 71 },
    reddit: { karma: 284000, post_views: 1900000, upvotes: 148000, comments: 24000, shares: 12000, followers: 67000, awards: 340 },
    redgifs: { views: 4200000, likes: 320000, shares: 89000, comments: 18000, followers: 248000, watch_time: 2800000, completion_rate: 58 }
  };

  const base = seeds[platformKey] || {};
  const data = {};
  for (const [key, val] of Object.entries(base)) {
    data[key] = generateMetricValue(val);
  }
  return data;
}

function SparkLine({ data, color }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

function MetricCard({ label, value, trend, sparkData, color }) {
  const isUp = trend >= 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 8,
      padding: '10px 12px',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'capitalize', marginBottom: 4 }}>
        {label.replace(/_/g, ' ')}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{formatNumber(value)}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: isUp ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: 2 }}>
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(trend).toFixed(1)}%
        </span>
        {sparkData && <SparkLine data={sparkData} color={color} />}
      </div>
    </div>
  );
}

function PlatformCard({ platformKey, data, selected, onSelect }) {
  const platform = PLATFORMS[platformKey];
  const firstMetric = platform.metrics[0];
  const val = data[firstMetric] || 0;

  return (
    <button
      onClick={() => onSelect(platformKey)}
      style={{
        background: selected ? `${platform.color}33` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? platform.accent : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10,
        padding: '12px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        color: '#fff',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{platform.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{platform.name}</div>
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
        {formatNumber(val)} {firstMetric.replace(/_/g, ' ')}
      </div>
    </button>
  );
}

function RetentionBar({ value, color }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 4 }}>
        <span>Avg Retention</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [allData, setAllData] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isLive, setIsLive] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const intervalRef = useRef(null);

  const refreshData = useCallback(() => {
    const newData = {};
    const newSparks = {};
    for (const key of Object.keys(PLATFORMS)) {
      newData[key] = generatePlatformData(key);
      const metrics = PLATFORMS[key].metrics;
      newSparks[key] = {};
      for (const m of metrics) {
        const base = newData[key][m] || 1000;
        newSparks[key][m] = Array.from({ length: 12 }, () => generateMetricValue(base, 0.3));
      }
    }
    setAllData(newData);
    setSparklines(newSparks);
    setLastUpdate(Date.now());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(refreshData, 15000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive, refreshData]);

  const platform = PLATFORMS[selectedPlatform];
  const data = allData[selectedPlatform] || {};
  const sparks = sparklines[selectedPlatform] || {};

  const getTrend = (key) => {
    const hist = sparks[key];
    if (!hist || hist.length < 2) return 0;
    const recent = hist.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = hist.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    return older > 0 ? ((recent - older) / older) * 100 : 0;
  };

  const totalReach = Object.values(allData).reduce((acc, d) => {
    return acc + (d.reach || d.impressions || d.views || d.post_views || 0);
  }, 0);

  const totalFollowers = Object.values(allData).reduce((acc, d) => {
    return acc + (d.followers || d.members || d.subscribers || 0);
  }, 0);

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 14, padding: 16, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Social Analytics</h2>
          <p style={{ margin: '2px 0 0', color: '#888', fontSize: 12 }}>
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '4px 8px', fontSize: 12 }}
          >
            <option value="24h">24h</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
          <button
            onClick={() => setIsLive(v => !v)}
            style={{
              background: isLive ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${isLive ? '#4ade80' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 6, color: isLive ? '#4ade80' : '#888',
              padding: '4px 10px', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <Activity size={12} />
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={refreshData}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '4px 8px', cursor: 'pointer' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: 12 }}>
          <Eye size={16} style={{ color: '#818cf8', marginBottom: 4 }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatNumber(totalReach)}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Total Reach</div>
        </div>
        <div style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: 10, padding: 12 }}>
          <Users size={16} style={{ color: '#f472b6', marginBottom: 4 }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatNumber(totalFollowers)}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Total Audience</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 12 }}>
          <Play size={16} style={{ color: '#fbbf24', marginBottom: 4 }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>{Object.keys(PLATFORMS).length}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Platforms</div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 12 }}>
          <TrendingUp size={16} style={{ color: '#34d399', marginBottom: 4 }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>+14.2%</div>
          <div style={{ fontSize: 11, color: '#888' }}>Avg Growth</div>
        </div>
      </div>

      {/* Platform Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 16 }}>
        {Object.keys(PLATFORMS).map(key => (
          <PlatformCard
            key={key}
            platformKey={key}
            data={allData[key] || {}}
            selected={selectedPlatform === key}
            onSelect={setSelectedPlatform}
          />
        ))}
      </div>

      {/* Selected Platform Detail */}
      <div style={{ background: `${platform.color}22`, border: `1px solid ${platform.accent}44`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 28 }}>{platform.icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>{platform.name}</h3>
            <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Detailed metrics — {timeRange}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
          {platform.metrics.map(metric => (
            <MetricCard
              key={metric}
              label={metric}
              value={data[metric] || 0}
              trend={getTrend(metric)}
              sparkData={sparks[metric]}
              color={platform.accent}
            />
          ))}
        </div>

        {(data.retention !== undefined || data.completion_rate !== undefined) && (
          <RetentionBar
            value={data.retention || data.completion_rate || 0}
            color={platform.accent}
          />
        )}
      </div>

      {/* Top Content Performance */}
      <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#ccc' }}>Content Performance Overview</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(PLATFORMS).slice(0, 4).map(([key, p]) => {
            const d = allData[key] || {};
            const primary = d[p.metrics[0]] || 0;
            const maxVal = Math.max(...Object.keys(PLATFORMS).map(k => allData[k]?.[PLATFORMS[k].metrics[0]] || 0));
            const pct = maxVal > 0 ? (primary / maxVal) * 100 : 0;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, width: 24 }}>{p.icon}</span>
                <span style={{ width: 80, fontSize: 12 }}>{p.name}</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: p.accent, borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: 12, color: '#aaa', width: 60, textAlign: 'right' }}>{formatNumber(primary)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
