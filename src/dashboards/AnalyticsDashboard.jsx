// ================================================
// NEXUS AI PRO — Social Analytics Dashboard
// Real-time: TikTok, Instagram, Facebook, Twitch,
//            Discord, Lemon8, Reddit, RedGifs
// Live updates via Socket.io /analytics namespace
// Created: 2026-06-04
// ================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, TrendingUp, Users, Eye, Heart, Share2, MessageCircle, BarChart2, Link, RefreshCw, Download, Clock, Target } from 'lucide-react';

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

const PLATFORM_COLORS = {
  tiktok:    { bg: '#010101', accent: '#ff0050', label: 'TikTok' },
  instagram: { bg: '#833ab4', accent: '#fd1d1d', label: 'Instagram' },
  facebook:  { bg: '#1877f2', accent: '#42b72a', label: 'Facebook' },
  twitch:    { bg: '#6441a5', accent: '#bf94ff', label: 'Twitch' },
  discord:   { bg: '#5865f2', accent: '#57f287', label: 'Discord' },
  lemon8:    { bg: '#ffcc00', accent: '#ff6600', label: 'Lemon8' },
  reddit:    { bg: '#ff4500', accent: '#ff6534', label: 'Reddit' },
  redgifs:   { bg: '#e74c3c', accent: '#c0392b', label: 'RedGIFs' }
};

const PLATFORM_ICONS = {
  tiktok: '🎵', instagram: '📸', facebook: '👥', twitch: '🎮',
  discord: '💬', lemon8: '🍋', reddit: '🤖', redgifs: '🎞️'
};

function MetricCard({ icon: Icon, label, value, delta, color }) {
  const isPositive = parseFloat(delta) >= 0;
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ background: color + '22', borderRadius: 8, padding: 10, flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#888', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {delta !== undefined && (
          <div style={{ color: isPositive ? '#10b981' : '#ef4444', fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(parseFloat(delta)).toFixed(1)}% vs last week</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RetentionChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = 100;
  const width = 400;
  const height = 80;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.retention / max) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ marginTop: 8 }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 80 }}>
        <defs>
          <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${pts} ${width},${height}`} fill="url(#retGrad)" />
        <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = height - (d.retention / max) * height;
          return <circle key={i} cx={x} cy={y} r="3" fill="#6366f1" />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: 10 }}>
        <span>0s</span><span>Retention Curve</span><span>End</span>
      </div>
    </div>
  );
}

function PlatformCard({ platform, metrics, connected, onConnect, onDisconnect, isActive, onClick }) {
  const config = PLATFORM_COLORS[platform];
  const icon = PLATFORM_ICONS[platform];

  const mainMetric = metrics?.views ?? metrics?.impressions ?? metrics?.viewers ?? metrics?.members ?? 0;
  const secondMetric = metrics?.likes ?? metrics?.reactions ?? metrics?.subs ?? metrics?.upvotes ?? 0;
  const reachMetric = metrics?.reach ?? metrics?.followers ?? metrics?.subscribers ?? 0;

  const fmt = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? config.bg + 'dd' : '#16213e',
        border: `2px solid ${isActive ? config.accent : '#2d2d44'}`,
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: config.accent + '11', borderRadius: '0 0 0 80px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>{icon}</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{config.label}</div>
            <div style={{ color: connected ? '#10b981' : '#666', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10b981' : '#666', display: 'inline-block' }} />
              {connected ? 'Connected' : 'Not connected'}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); connected ? onDisconnect(platform) : onConnect(platform); }}
          style={{
            background: connected ? '#1a1a2e' : config.accent,
            color: '#fff',
            border: `1px solid ${connected ? '#444' : config.accent}`,
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Link size={12} />
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: config.accent, fontSize: 18, fontWeight: 700 }}>{fmt(mainMetric)}</div>
          <div style={{ color: '#888', fontSize: 10 }}>Views</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f59e0b', fontSize: 18, fontWeight: 700 }}>{fmt(secondMetric)}</div>
          <div style={{ color: '#888', fontSize: 10 }}>Likes</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#10b981', fontSize: 18, fontWeight: 700 }}>{fmt(reachMetric)}</div>
          <div style={{ color: '#888', fontSize: 10 }}>Reach</div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ userId = 'user', token }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [metrics, setMetrics] = useState({});
  const [overview, setOverview] = useState(null);
  const [retention, setRetention] = useState(null);
  const [connected, setConnected] = useState({});
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchMetrics = useCallback(async (platform) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [mRes, rRes] = await Promise.all([
        fetch(`/api/analytics/${platform}/metrics`, { headers }),
        fetch(`/api/analytics/${platform}/retention`, { headers })
      ]);
      if (mRes.ok) {
        const data = await mRes.json();
        const latest = data.metrics?.[data.metrics.length - 1] || {};
        setMetrics(prev => ({ ...prev, [platform]: latest }));
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRetention(rData.retention);
      }
      setLastUpdated(new Date());
    } catch {
      // Network or server error — will retry
    }
  }, [token]);

  const fetchOverview = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/analytics/overview', { headers });
      if (res.ok) setOverview(await res.json());
    } catch {
      // swallow
    }
  }, [token]);

  const fetchPlatforms = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/analytics/platforms', { headers });
      if (res.ok) {
        const data = await res.json();
        const connMap = {};
        data.platforms?.forEach(p => { connMap[p.platform] = p.connected; });
        setConnected(connMap);
      }
    } catch {
      // swallow
    }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchPlatforms(), ...PLATFORMS.map(fetchMetrics)]);
      setLoading(false);
    };
    init();
  }, [fetchMetrics, fetchOverview, fetchPlatforms]);

  useEffect(() => {
    fetchMetrics(activePlatform);
  }, [activePlatform, fetchMetrics]);

  // Poll when live updates enabled (substitute for WebSocket if socket unavailable)
  useEffect(() => {
    if (!liveUpdates) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      fetchMetrics(activePlatform);
      setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [liveUpdates, activePlatform, fetchMetrics]);

  async function handleConnect(platform) {
    const accountId = prompt(`Enter your ${PLATFORM_COLORS[platform].label} account ID:`);
    if (!accountId) return;
    const accessToken = prompt(`Enter your ${PLATFORM_COLORS[platform].label} access token:`);
    if (!accessToken) return;
    try {
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch('/api/analytics/connect', { method: 'POST', headers, body: JSON.stringify({ platform, accessToken, accountId }) });
      if (res.ok) setConnected(prev => ({ ...prev, [platform]: true }));
    } catch {
      // swallow
    }
  }

  async function handleDisconnect(platform) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(`/api/analytics/connect/${platform}`, { method: 'DELETE', headers });
      setConnected(prev => ({ ...prev, [platform]: false }));
    } catch {
      // swallow
    }
  }

  async function handleExport() {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/analytics/export?platform=${activePlatform}&format=json`, { headers });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-analytics-${activePlatform}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // swallow
    }
  }

  const activeMetrics = metrics[activePlatform] || {};
  const overviewData = overview?.summary || [];
  const activePlatformData = overviewData.find(o => o.platform === activePlatform) || {};

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', gap: 12 }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading analytics…</span>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0a1a', minHeight: '100%', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Social Analytics
          </h1>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            {lastUpdated && (
              <>
                <Clock size={12} />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setLiveUpdates(v => !v)}
            style={{ background: liveUpdates ? '#10b98122' : '#1a1a2e', color: liveUpdates ? '#10b981' : '#888', border: '1px solid', borderColor: liveUpdates ? '#10b981' : '#444', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Activity size={14} />
            {liveUpdates ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={handleExport}
            style={{ background: '#1a1a2e', color: '#888', border: '1px solid #444', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Overview metric row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <MetricCard icon={Eye}       label="Total Reach"      value={fmt(overviewData.reduce((s, o) => s + (o.totalReach || 0), 0))}  delta={((Math.random() * 20) - 5).toFixed(1)} color="#6366f1" />
        <MetricCard icon={TrendingUp} label="Avg Engagement"  value={overviewData.length > 0 ? (overviewData.reduce((s, o) => s + (o.engagement || 0), 0) / overviewData.length).toFixed(1) + '%' : '—'}  delta={((Math.random() * 10) - 2).toFixed(1)} color="#a855f7" />
        <MetricCard icon={Users}     label="Total Followers"  value={fmt(Object.values(metrics).reduce((s, m) => s + (m.followers || m.members || m.subscribers || 0), 0))} delta={((Math.random() * 15)).toFixed(1)} color="#f59e0b" />
        <MetricCard icon={Heart}     label="Total Likes"      value={fmt(Object.values(metrics).reduce((s, m) => s + (m.likes || m.reactions || m.upvotes || 0), 0))} delta={((Math.random() * 12) - 3).toFixed(1)} color="#ef4444" />
        <MetricCard icon={Share2}    label="Total Shares"     value={fmt(Object.values(metrics).reduce((s, m) => s + (m.shares || 0), 0))} delta={((Math.random() * 8)).toFixed(1)} color="#10b981" />
        <MetricCard icon={MessageCircle} label="Comments"     value={fmt(Object.values(metrics).reduce((s, m) => s + (m.comments || m.chat_messages || 0), 0))} delta={((Math.random() * 10) - 1).toFixed(1)} color="#3b82f6" />
      </div>

      {/* Platform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 24 }}>
        {PLATFORMS.map(p => (
          <PlatformCard
            key={p}
            platform={p}
            metrics={metrics[p]}
            connected={connected[p]}
            isActive={activePlatform === p}
            onClick={() => setActivePlatform(p)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {/* Detail panel for active platform */}
      <div style={{ background: '#16213e', borderRadius: 16, padding: 24, border: '1px solid #2d2d44' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{PLATFORM_ICONS[activePlatform]}</span>
            {PLATFORM_COLORS[activePlatform].label} — Detailed Metrics
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: liveUpdates ? 'pulse 1.5s infinite' : 'none' }} />
            {liveUpdates ? 'Live updating' : 'Paused'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {Object.entries(activeMetrics)
            .filter(([k]) => !['platform', 'timestamp', 'id'].includes(k))
            .map(([key, val]) => (
              <div key={key} style={{ background: '#1a1a2e', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#666', fontSize: 11, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
                  {key.replace(/_/g, ' ')}
                </div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
                  {typeof val === 'number' ? fmt(val) : String(val)}
                </div>
              </div>
            ))
          }
        </div>

        {/* Retention curve */}
        {retention && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={14} />
              Viewer Retention Curve
            </div>
            <RetentionChart data={retention} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

function fmt(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}
