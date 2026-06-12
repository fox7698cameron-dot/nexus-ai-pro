// src/analytics/AnalyticsDashboard.jsx
// 2026-06-12 | Nexus AI Pro — Social Media Analytics Dashboard
// TikTok · Instagram · Facebook · Twitch · Discord · Lemon8 · Reddit · RedGIFs
// Real-time via Socket.io · Recharts · Responsive (mobile / tablet / desktop)

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ---- platform meta --------------------------------------------------

const PLATFORMS = {
  tiktok:    { name: 'TikTok',    color: '#010101', bg: '#1a1a2e' },
  instagram: { name: 'Instagram', color: '#E1306C', bg: '#2d0a1a' },
  facebook:  { name: 'Facebook',  color: '#1877F2', bg: '#0a1a2d' },
  twitch:    { name: 'Twitch',    color: '#9146FF', bg: '#1a0a2d' },
  discord:   { name: 'Discord',   color: '#5865F2', bg: '#0a0d2d' },
  lemon8:    { name: 'Lemon8',    color: '#FFD700', bg: '#2d2a00' },
  reddit:    { name: 'Reddit',    color: '#FF4500', bg: '#2d0f00' },
  redgifs:   { name: 'RedGIFs',   color: '#FF1744', bg: '#2d000a' }
};

const PERIODS = ['7d', '30d', '90d'];

// ---- helper: format large numbers -----------------------------------

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ---- StatCard -------------------------------------------------------

function StatCard({ label, value, delta, color }) {
  const isPos = delta >= 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}40`, borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{fmt(value)}</div>
      {delta !== undefined && (
        <div style={{ fontSize: 12, color: isPos ? '#4caf50' : '#f44336', marginTop: 4 }}>
          {isPos ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// ---- PlatformBadge --------------------------------------------------

function PlatformBadge({ platform, selected, onClick }) {
  const cfg = PLATFORMS[platform];
  return (
    <button
      onClick={() => onClick(platform)}
      style={{
        background: selected ? cfg.color : 'rgba(255,255,255,0.06)',
        color: selected ? '#fff' : '#ccc',
        border: `1px solid ${cfg.color}`,
        borderRadius: 20,
        padding: '6px 14px',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: selected ? 700 : 400,
        transition: 'all .2s'
      }}
    >
      {cfg.name}
    </button>
  );
}

// ---- RetentionBar ---------------------------------------------------

function RetentionBar({ value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: 10, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${Math.min(value, 100)}%`, background: color, height: '100%', borderRadius: 8, transition: 'width .5s ease' }} />
    </div>
  );
}

// ---- main component -------------------------------------------------

export default function AnalyticsDashboard({ socket }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState({});
  const [aggregated, setAggregated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);

  const fetchData = useCallback(async (plat, per) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/analytics/platform/${plat}?period=${per}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` }
      });
      if (resp.ok) {
        const json = await resp.json();
        setData(prev => ({ ...prev, [`${plat}_${per}`]: json }));
      }
    } catch { /* network error — keep stale data */ }
    setLoading(false);
  }, []);

  const fetchAggregated = useCallback(async () => {
    try {
      const resp = await fetch(`/api/analytics/aggregated?period=${period}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` }
      });
      if (resp.ok) setAggregated(await resp.json());
    } catch { /* ignore */ }
  }, [period]);

  useEffect(() => { fetchData(activePlatform, period); }, [activePlatform, period, fetchData]);
  useEffect(() => { fetchAggregated(); }, [fetchAggregated]);

  // Real-time Socket.io updates
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      setLiveIndicator(true);
      setTimeout(() => setLiveIndicator(false), 2000);
      if (payload?.summary?.platforms?.[activePlatform]) {
        setData(prev => ({ ...prev, [`${activePlatform}_${period}`]: payload.summary.platforms[activePlatform] }));
      }
      if (payload?.summary) setAggregated(payload.summary);
    };
    socket.on('analytics:update', handler);
    return () => socket.off('analytics:update', handler);
  }, [socket, activePlatform, period]);

  const current = data[`${activePlatform}_${period}`];
  const cfg = PLATFORMS[activePlatform];

  // Pie chart data for aggregated follower breakdown
  const pieData = aggregated
    ? Object.entries(aggregated.platforms || {}).map(([k, v]) => ({
        name: PLATFORMS[k]?.name || k,
        value: v.followerCount || 0,
        color: PLATFORMS[k]?.color || '#888'
      }))
    : [];

  return (
    <div style={{ background: '#0d1117', color: '#e6edf3', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Social Analytics</h1>
          <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>
            Real-time metrics across all connected platforms
            {liveIndicator && <span style={{ marginLeft: 8, color: '#4caf50', fontWeight: 700 }}>● LIVE</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              background: period === p ? '#1f6feb' : 'rgba(255,255,255,0.06)',
              color: '#e6edf3', border: '1px solid #30363d', borderRadius: 8,
              padding: '6px 14px', cursor: 'pointer', fontSize: 13
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.keys(PLATFORMS).map(p => (
          <PlatformBadge key={p} platform={p} selected={p === activePlatform} onClick={setActivePlatform} />
        ))}
      </div>

      {/* Aggregated summary strip */}
      {aggregated && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total Followers" value={aggregated.totals?.followers || 0} color="#1f6feb" />
          <StatCard label="Total Views" value={aggregated.totals?.views || 0} color="#e3b341" />
          <StatCard label="Total Likes" value={aggregated.totals?.likes || 0} color={cfg.color} />
          <StatCard label="Total Reach" value={aggregated.totals?.reach || 0} color="#8957e5" />
          <StatCard label="Total Shares" value={aggregated.totals?.shares || 0} color="#3fb950" />
        </div>
      )}

      {/* Per-platform stats */}
      {current && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Followers" value={current.followerCount || 0} color={cfg.color} />
            <StatCard label={`Views (${period})`} value={current.totals?.views || 0} color="#e3b341" />
            <StatCard label={`Likes (${period})`} value={current.totals?.likes || 0} color="#f87171" />
            <StatCard label="Engagement" value={parseFloat(current.engagementRate || 0)} color="#4ade80" />
            <StatCard label="Avg Retention" value={current.avgRetention || 0} color="#a78bfa" />
            {current.live && <span style={{ alignSelf: 'center', background: '#166534', color: '#4ade80', borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>Live API</span>}
          </div>

          {/* Retention bar */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>Avg Watch / View Retention</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <RetentionBar value={current.avgRetention || 0} color={cfg.color} />
              <span style={{ fontWeight: 700, color: cfg.color, minWidth: 44 }}>{current.avgRetention}%</span>
            </div>
          </div>

          {/* Timeline chart */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, marginBottom: 16, fontWeight: 600 }}>Views & Likes Over Time</div>
            {loading
              ? <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>Loading…</div>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={current.timeline || []}>
                    <defs>
                      <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="date" tick={{ fill: '#8b949e', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={fmt} />
                    <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} formatter={fmt} />
                    <Legend />
                    <Area type="monotone" dataKey="views" stroke={cfg.color} fill="url(#gViews)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="likes" stroke="#f87171" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="shares" stroke="#4ade80" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* Top posts */}
          {current.topPosts?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>Top Posts</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#8b949e', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Post</th>
                      <th style={{ padding: '8px 12px' }}>Views</th>
                      <th style={{ padding: '8px 12px' }}>Likes</th>
                      <th style={{ padding: '8px 12px' }}>Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.topPosts.map(p => (
                      <tr key={p.id} style={{ borderTop: '1px solid #21262d' }}>
                        <td style={{ padding: '8px 12px' }}>{p.title}</td>
                        <td style={{ padding: '8px 12px' }}>{fmt(p.views)}</td>
                        <td style={{ padding: '8px 12px' }}>{fmt(p.likes)}</td>
                        <td style={{ padding: '8px 12px', color: '#8b949e' }}>{p.postedAt?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Follower distribution pie */}
      {pieData.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>Follower Distribution</div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                  <span style={{ color: '#e6edf3' }}>{d.name}</span>
                  <span style={{ color: '#8b949e', marginLeft: 'auto', paddingLeft: 16 }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
