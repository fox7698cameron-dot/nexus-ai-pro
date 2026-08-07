/**
 * AnalyticsDashboard.jsx
 * Nexus AI Pro — Social Media Analytics Dashboard
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under Apache License 2.0
 *
 * Real-time metrics: TikTok, Instagram, Facebook, Twitch,
 * Discord, Lemon8, Reddit, RedGIFs
 * View count, likes, reach, retention, engagement tracking.
 *
 * Updated: 2026-08-07
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Eye, Heart, Share2, Users, Activity,
  RefreshCw, BarChart3, Zap, Clock, Globe, Filter,
  ArrowUp, ArrowDown, Minus, ChevronDown, ChevronRight,
  Play, Pause, AlertCircle, CheckCircle, Info,
} from 'lucide-react';

/* ─── Platform Config ────────────────────────────────────────────────── */
const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',     color: '#010101', accent: '#ff0050', icon: '🎵', live: true },
  { id: 'instagram', name: 'Instagram',  color: '#E1306C', accent: '#F77737', icon: '📸', live: true },
  { id: 'facebook',  name: 'Facebook',   color: '#1877F2', accent: '#42B72A', icon: '📘', live: true },
  { id: 'twitch',    name: 'Twitch',     color: '#9147FF', accent: '#00D9FF', icon: '🎮', live: true },
  { id: 'discord',   name: 'Discord',    color: '#5865F2', accent: '#57F287', icon: '💬', live: false },
  { id: 'lemon8',    name: 'Lemon8',     color: '#FFD600', accent: '#FF4F18', icon: '🍋', live: false },
  { id: 'reddit',    name: 'Reddit',     color: '#FF4500', accent: '#FF6534', icon: '🤖', live: false },
  { id: 'redgifs',   name: 'RedGIFs',    color: '#C0392B', accent: '#E74C3C', icon: '🔴', live: false },
];

/* ─── Metric Card ────────────────────────────────────────────────────── */
function MetricCard({ label, value, delta, icon: Icon, color, unit = '' }) {
  const positive = delta > 0;
  const neutral  = delta === 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 140,
      flex: '1 1 140px',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{
          width:32, height:32, borderRadius:8,
          background: color + '22',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>{label}</span>
      </div>
      <div style={{ fontSize:24, fontWeight:700, color:'#f9fafb', letterSpacing:'-0.5px' }}>
        {formatNum(value)}{unit}
      </div>
      {delta !== undefined && (
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
          {neutral ? <Minus size={12} color="#6b7280" /> :
           positive ? <ArrowUp size={12} color="#22c55e" /> :
                      <ArrowDown size={12} color="#ef4444" />}
          <span style={{ color: neutral ? '#6b7280' : positive ? '#22c55e' : '#ef4444' }}>
            {Math.abs(delta).toFixed(1)}% vs last period
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Mini Sparkline ─────────────────────────────────────────────────── */
function Sparkline({ data, color = '#6366f1', height = 40, width = 120 }) {
  if (!data?.length) return null;
  const max  = Math.max(...data);
  const min  = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow:'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${height} ${pts} ${width},${height}`}
        fill={color + '22'} stroke="none" />
    </svg>
  );
}

/* ─── Platform Row ───────────────────────────────────────────────────── */
function PlatformRow({ platform, data, expanded, onToggle }) {
  const p = PLATFORMS.find(p => p.id === platform) ?? {};
  const metrics = data ?? generateMockMetrics(platform);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign:'left', background:'transparent',
          border:'none', cursor:'pointer', padding:'14px 20px',
          display:'flex', alignItems:'center', gap:12,
        }}
      >
        <span style={{ fontSize:22 }}>{p.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'#f9fafb', fontWeight:600, fontSize:15 }}>{p.name}</span>
            {p.live && (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:4, fontSize:10,
                padding:'2px 7px', borderRadius:99, fontWeight:600,
                background:'#22c55e22', color:'#22c55e',
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e',
                               animation:'pulse 2s infinite', display:'inline-block' }} />
                LIVE
              </span>
            )}
          </div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>
            {formatNum(metrics.followers)} followers · {formatNum(metrics.reach)} reach today
          </div>
        </div>
        {/* Mini sparkline */}
        <Sparkline data={metrics.viewHistory} color={p.accent} />
        <ChevronRight size={16} style={{
          color:'#6b7280',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition:'transform 0.2s',
        }} />
      </button>

      {/* Expanded metrics */}
      {expanded && (
        <div style={{ padding:'0 20px 20px', display:'flex', flexWrap:'wrap', gap:10 }}>
          <MetricCard label="Views"       value={metrics.views}       delta={metrics.viewsDelta}   icon={Eye}      color={p.accent} />
          <MetricCard label="Likes"       value={metrics.likes}       delta={metrics.likesDelta}   icon={Heart}    color="#e879f9" />
          <MetricCard label="Reach"       value={metrics.reach}       delta={metrics.reachDelta}   icon={Globe}    color="#38bdf8" />
          <MetricCard label="Shares"      value={metrics.shares}      delta={metrics.sharesDelta}  icon={Share2}   color="#fb923c" />
          <MetricCard label="Engagement" value={metrics.engagement}  delta={metrics.engDelta}     icon={Activity} color="#a78bfa" unit="%" />
          <MetricCard label="Retention"  value={metrics.retention}   delta={metrics.retDelta}     icon={Clock}    color="#34d399" unit="%" />
          <MetricCard label="Followers"  value={metrics.followers}   delta={metrics.followersDelta} icon={Users} color="#60a5fa" />
          <MetricCard label="New Subs"   value={metrics.newSubs}     delta={metrics.subsDelta}    icon={TrendingUp} color="#f472b6" />
        </div>
      )}
    </div>
  );
}

/* ─── Real-time Status Bar ────────────────────────────────────────────── */
function RealtimeBar({ lastUpdate, streaming, onToggle }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
      background:'rgba(99,102,241,0.1)', borderRadius:10,
      border:'1px solid rgba(99,102,241,0.2)', marginBottom:20,
      flexWrap:'wrap', gap:10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <div style={{
          width:8, height:8, borderRadius:'50%',
          background: streaming ? '#22c55e' : '#6b7280',
          boxShadow: streaming ? '0 0 8px #22c55e' : 'none',
        }} />
        <span style={{ fontSize:13, color:'#d1d5db' }}>
          {streaming ? 'Live — updating every 5s' : 'Paused'}
        </span>
      </div>
      <span style={{ fontSize:12, color:'#6b7280' }}>
        Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}
      </span>
      <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
        <button onClick={onToggle} style={btnStyle('#6366f1')}>
          {streaming ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Dashboard Component ───────────────────────────────────────── */
export default function AnalyticsDashboard({ className = '' }) {
  const [platformData, setPlatformData]   = useState({});
  const [expandedPlatform, setExpanded]  = useState('tiktok');
  const [streaming, setStreaming]        = useState(true);
  const [lastUpdate, setLastUpdate]      = useState(null);
  const [loading, setLoading]            = useState(false);
  const [filter, setFilter]             = useState('all');
  const intervalRef = useRef(null);

  /* ── Fetch metrics from API ── */
  const fetchMetrics = useCallback(async () => {
    try {
      const resp = await fetch('/api/analytics/social');
      if (!resp.ok) throw new Error('API unavailable');
      const data = await resp.json();
      setPlatformData(data);
    } catch {
      // Fallback to simulated data for demo
      const mock = {};
      PLATFORMS.forEach(p => { mock[p.id] = generateMockMetrics(p.id); });
      setPlatformData(mock);
    }
    setLastUpdate(Date.now());
  }, []);

  /* ── Start / stop real-time streaming ── */
  useEffect(() => {
    fetchMetrics();
    if (streaming) {
      intervalRef.current = setInterval(fetchMetrics, 5000);
    }
    return () => clearInterval(intervalRef.current);
  }, [streaming, fetchMetrics]);

  const toggleStream = () => setStreaming(s => !s);

  const filteredPlatforms = filter === 'live'
    ? PLATFORMS.filter(p => p.live)
    : PLATFORMS;

  /* ── Aggregated totals ── */
  const totals = React.useMemo(() => {
    let views = 0, likes = 0, reach = 0, followers = 0;
    Object.values(platformData).forEach(d => {
      if (!d) return;
      views     += d.views     ?? 0;
      likes     += d.likes     ?? 0;
      reach     += d.reach     ?? 0;
      followers += d.followers ?? 0;
    });
    return { views, likes, reach, followers };
  }, [platformData]);

  return (
    <div className={className} style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#f9fafb',
      maxWidth: 960,
      margin: '0 auto',
      padding: '0 0 40px',
    }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:700, margin:0, display:'flex', alignItems:'center', gap:10 }}>
          <BarChart3 size={22} color="#6366f1" />
          Social Analytics
        </h2>
        <p style={{ margin:'4px 0 0', color:'#9ca3af', fontSize:14 }}>
          Real-time metrics across all connected platforms
        </p>
      </div>

      {/* Real-time bar */}
      <RealtimeBar lastUpdate={lastUpdate} streaming={streaming} onToggle={toggleStream} />

      {/* Aggregate totals */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <MetricCard label="Total Views"     value={totals.views}     icon={Eye}      color="#6366f1" />
        <MetricCard label="Total Likes"     value={totals.likes}     icon={Heart}    color="#e879f9" />
        <MetricCard label="Total Reach"     value={totals.reach}     icon={Globe}    color="#38bdf8" />
        <MetricCard label="Total Followers" value={totals.followers} icon={Users}    color="#34d399" />
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['all','live'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              ...btnStyle(filter === f ? '#6366f1' : 'transparent'),
              border: filter === f ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
              color: filter === f ? '#fff' : '#9ca3af',
            }}>
            {f === 'all' ? '🌐 All Platforms' : '🔴 Live Only'}
          </button>
        ))}
      </div>

      {/* Platform rows */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filteredPlatforms.map(p => (
          <PlatformRow
            key={p.id}
            platform={p.id}
            data={platformData[p.id]}
            expanded={expandedPlatform === p.id}
            onToggle={() => setExpanded(ev => ev === p.id ? null : p.id)}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1 } 50% { opacity:0.4 }
        }
      `}</style>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
function formatNum(n = 0) {
  if (n >= 1e9)  return (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3)  return (n/1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function btnStyle(bg) {
  return {
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'7px 14px', borderRadius:8, border:'none',
    background: bg, color:'#fff', fontSize:13, fontWeight:500,
    cursor:'pointer', transition:'opacity 0.2s',
  };
}

function generateMockMetrics(platform) {
  const seed = [...platform].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (min, max) => min + ((seed * 1103515245 + 12345) & 0x7fffffff) % (max - min);
  const delta = () => (Math.random() * 20 - 10);
  const hist  = Array.from({ length: 20 }, (_, i) => rand(1000, 50000) + i * 200);
  return {
    views:     rand(10000, 5000000),
    viewsDelta: delta(),
    viewHistory: hist,
    likes:     rand(500, 200000),
    likesDelta: delta(),
    reach:     rand(5000, 3000000),
    reachDelta: delta(),
    shares:    rand(100, 50000),
    sharesDelta: delta(),
    engagement: +(Math.random() * 8 + 1).toFixed(1),
    engDelta:   delta(),
    retention:  +(Math.random() * 40 + 40).toFixed(1),
    retDelta:   delta(),
    followers:  rand(1000, 1000000),
    followersDelta: delta(),
    newSubs:   rand(10, 10000),
    subsDelta:  delta(),
  };
}
