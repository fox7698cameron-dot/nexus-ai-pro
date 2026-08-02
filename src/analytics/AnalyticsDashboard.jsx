// src/analytics/AnalyticsDashboard.jsx
// 2026-08-02 — Social Media Analytics Dashboard
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
// Real-time metrics: views, likes, reach, retention, follower growth

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Users, Share2,
  RefreshCw, Activity, BarChart3, Play, Clock, Star,
  Globe, Zap, Radio, Monitor, Wifi, Bell
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',    color: '#010101', accent: '#ff0050', bg: '#1a0010', icon: '🎵' },
  { id: 'instagram', name: 'Instagram', color: '#833ab4', accent: '#fd1d1d', bg: '#1a0a1a', icon: '📸' },
  { id: 'facebook',  name: 'Facebook',  color: '#1877f2', accent: '#42b72a', bg: '#0a101a', icon: '👥' },
  { id: 'twitch',    name: 'Twitch',    color: '#9146ff', accent: '#00d4ff', bg: '#130a1a', icon: '🎮' },
  { id: 'discord',   name: 'Discord',   color: '#5865f2', accent: '#57f287', bg: '#0a0c1a', icon: '💬' },
  { id: 'lemon8',    name: 'Lemon8',    color: '#ffd700', accent: '#ff8c00', bg: '#1a1400', icon: '🍋' },
  { id: 'reddit',    name: 'Reddit',    color: '#ff4500', accent: '#ff6534', bg: '#1a0a00', icon: '🔴' },
  { id: 'redgifs',   name: 'RedGIFs',   color: '#e00', accent: '#ff6666', bg: '#1a0000', icon: '🎬' },
];

// Mock real-time metrics generator (replace with actual API calls)
function generateMetrics(platformId, prev) {
  const variance = (base, pct) => Math.max(0, Math.round(base * (1 + (Math.random() - 0.5) * pct)));
  const base = {
    tiktok:    { views: 1420000, likes: 89000, reach: 2100000, followers: 420000, engagement: 6.3, retention: 72 },
    instagram: { views: 890000,  likes: 67000, reach: 1200000, followers: 310000, engagement: 7.5, retention: 65 },
    facebook:  { views: 560000,  likes: 32000, reach: 980000,  followers: 820000, engagement: 3.7, retention: 55 },
    twitch:    { views: 48000,   likes: 12000, reach: 75000,   followers: 95000,  engagement: 25,  retention: 82 },
    discord:   { views: 22000,   likes: 5400,  reach: 31000,   followers: 150000, engagement: 24,  retention: 78 },
    lemon8:    { views: 180000,  likes: 21000, reach: 240000,  followers: 68000,  engagement: 11,  retention: 68 },
    reddit:    { views: 320000,  likes: 18000, reach: 450000,  followers: 42000,  engagement: 5.6, retention: 61 },
    redgifs:   { views: 760000,  likes: 43000, reach: 990000,  followers: 28000,  engagement: 5.7, retention: 58 },
  }[platformId] || { views: 0, likes: 0, reach: 0, followers: 0, engagement: 0, retention: 0 };

  const current = prev || base;
  return {
    views:       variance(current.views, 0.02),
    likes:       variance(current.likes, 0.03),
    reach:       variance(current.reach, 0.015),
    followers:   current.followers + Math.floor(Math.random() * 10 - 2),
    engagement:  parseFloat((current.engagement * (1 + (Math.random() - 0.5) * 0.05)).toFixed(2)),
    retention:   parseFloat((current.retention * (1 + (Math.random() - 0.5) * 0.03)).toFixed(1)),
    liveViewers: platformId === 'twitch' ? variance(800, 0.15) : 0,
    trending:    Math.random() > 0.7,
    timestamp:   Date.now(),
  };
}

function generateHistory(platformId, count = 24) {
  const points = [];
  let current = generateMetrics(platformId, null);
  for (let i = count - 1; i >= 0; i--) {
    points.push({ ...current, hour: i, label: `${i}h ago` });
    current = generateMetrics(platformId, current);
  }
  return points.reverse();
}

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function SparkLine({ data, width = 100, height = 32, color = '#00ff88' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r="2.5" fill={color} />
    </svg>
  );
}

function MiniBar({ data, width = 80, height = 24, color = '#00ff88' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data) || 1;
  const barW = width / data.length - 1;
  return (
    <svg width={width} height={height}>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * (barW + 1)}
            y={height - h}
            width={barW}
            height={h}
            fill={color}
            opacity={0.7 + 0.3 * (i / data.length)}
            rx="1"
          />
        );
      })}
    </svg>
  );
}

function MetricCard({ label, value, prev, unit = '', icon: Icon, color, sparkData }) {
  const delta = prev ? value - prev : 0;
  const up = delta >= 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '12px 14px',
      flex: '1 1 140px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
        {fmt(typeof value === 'number' ? value : 0)}{unit}
      </div>
      {prev !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {up ? <TrendingUp size={11} color="#00ff88" /> : <TrendingDown size={11} color="#ff4466" />}
          <span style={{ fontSize: 10, color: up ? '#00ff88' : '#ff4466' }}>
            {up ? '+' : ''}{fmt(Math.abs(delta))}{unit}
          </span>
          {sparkData && <SparkLine data={sparkData} color={color} />}
        </div>
      )}
    </div>
  );
}

function PlatformPanel({ platform, metrics, history, onRefresh }) {
  const p = PLATFORMS.find(x => x.id === platform);
  if (!p || !metrics) return null;

  const histViews = history.map(h => h.views);
  const histLikes = history.map(h => h.likes);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${p.bg} 0%, rgba(0,0,0,0.8) 100%)`,
      border: `1px solid ${p.color}33`,
      borderRadius: 16,
      padding: 20,
      boxShadow: `0 0 20px ${p.color}11`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{p.icon}</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{p.name}</div>
            {metrics.liveViewers > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Radio size={10} color="#ff4444" style={{ animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: 10, color: '#ff4444', fontWeight: 600 }}>LIVE · {fmt(metrics.liveViewers)} watching</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {metrics.trending && (
            <span style={{ fontSize: 10, padding: '2px 8px', background: `${p.accent}22`, border: `1px solid ${p.accent}44`, borderRadius: 20, color: p.accent, fontWeight: 600 }}>
              🔥 TRENDING
            </span>
          )}
          <button
            onClick={onRefresh}
            style={{ background: 'none', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
          >
            <RefreshCw size={10} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <MetricCard label="Views" value={metrics.views} icon={Eye} color={p.accent} sparkData={histViews.slice(-8)} />
        <MetricCard label="Likes" value={metrics.likes} icon={Heart} color="#ff6688" sparkData={histLikes.slice(-8)} />
        <MetricCard label="Reach" value={metrics.reach} icon={Globe} color="#00aaff" />
        <MetricCard label="Followers" value={metrics.followers} icon={Users} color={p.color} />
        <MetricCard label="Engagement" value={metrics.engagement} unit="%" icon={Activity} color="#ffaa00" />
        <MetricCard label="Retention" value={metrics.retention} unit="%" icon={Clock} color="#aa44ff" />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>24h views</span>
        <MiniBar data={histViews} width={120} height={20} color={p.accent} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>Likes</span>
        <MiniBar data={histLikes} width={80} height={20} color="#ff6688" />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
          Updated {new Date(metrics.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ userRole = 'user', language = 'en' }) {
  const [activePlatforms, setActivePlatforms] = useState(PLATFORMS.map(p => p.id));
  const [metrics, setMetrics] = useState({});
  const [history, setHistory] = useState({});
  const [isLive, setIsLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [totalStats, setTotalStats] = useState({ views: 0, likes: 0, reach: 0, followers: 0 });
  const intervalRef = useRef(null);

  const initMetrics = useCallback(() => {
    const m = {};
    const h = {};
    for (const p of PLATFORMS) {
      m[p.id] = generateMetrics(p.id, null);
      h[p.id] = generateHistory(p.id);
    }
    setMetrics(m);
    setHistory(h);
  }, []);

  const updateMetrics = useCallback(() => {
    setMetrics(prev => {
      const next = { ...prev };
      for (const id of activePlatforms) {
        next[id] = generateMetrics(id, prev[id]);
      }
      return next;
    });
    setHistory(prev => {
      const next = { ...prev };
      for (const id of activePlatforms) {
        const arr = [...(prev[id] || []), generateMetrics(id, null)].slice(-48);
        next[id] = arr;
      }
      return next;
    });
  }, [activePlatforms]);

  useEffect(() => { initMetrics(); }, [initMetrics]);

  useEffect(() => {
    if (metrics) {
      const totals = PLATFORMS.reduce((acc, p) => {
        const m = metrics[p.id] || {};
        return {
          views: acc.views + (m.views || 0),
          likes: acc.likes + (m.likes || 0),
          reach: acc.reach + (m.reach || 0),
          followers: acc.followers + (m.followers || 0),
        };
      }, { views: 0, likes: 0, reach: 0, followers: 0 });
      setTotalStats(totals);
    }
  }, [metrics]);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(updateMetrics, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive, updateMetrics]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    initMetrics();
    setTimeout(() => setRefreshing(false), 800);
  }, [initMetrics]);

  const togglePlatform = useCallback((id) => {
    setActivePlatforms(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <div style={{ background: '#080b10', minHeight: '100vh', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={22} color="#00ff88" />
            Social Analytics
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Real-time across {PLATFORMS.length} platforms
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live toggle */}
          <button
            onClick={() => setIsLive(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              background: isLive ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isLive ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 20, cursor: 'pointer', color: isLive ? '#00ff88' : 'rgba(255,255,255,0.5)',
              fontSize: 12, fontWeight: 600,
            }}
          >
            {isLive ? <Wifi size={12} /> : <Wifi size={12} style={{ opacity: 0.4 }} />}
            {isLive ? 'LIVE' : 'Paused'}
          </button>

          <button
            onClick={handleRefresh}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 12,
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Aggregate totals */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Views', value: totalStats.views, icon: Eye, color: '#00ff88' },
          { label: 'Total Likes', value: totalStats.likes, icon: Heart, color: '#ff6688' },
          { label: 'Total Reach', value: totalStats.reach, icon: Globe, color: '#00aaff' },
          { label: 'Total Followers', value: totalStats.followers, icon: Users, color: '#aa44ff' },
        ].map(s => (
          <div key={s.label} style={{
            flex: '1 1 160px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${s.color}15`,
              border: `1px solid ${s.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{fmt(s.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform filter pills */}
      <div style={{ padding: '0 24px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => togglePlatform(p.id)}
            style={{
              padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: activePlatforms.includes(p.id) ? `${p.color}22` : 'transparent',
              border: `1px solid ${activePlatforms.includes(p.id) ? p.color : 'rgba(255,255,255,0.1)'}`,
              color: activePlatforms.includes(p.id) ? p.color : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      {/* Platform panels */}
      <div style={{
        padding: '0 24px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))',
        gap: 16,
      }}>
        {PLATFORMS.filter(p => activePlatforms.includes(p.id)).map(p => (
          <PlatformPanel
            key={p.id}
            platform={p.id}
            metrics={metrics[p.id]}
            history={history[p.id] || []}
            onRefresh={() => {
              setMetrics(prev => ({ ...prev, [p.id]: generateMetrics(p.id, prev[p.id]) }));
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </div>
  );
}
