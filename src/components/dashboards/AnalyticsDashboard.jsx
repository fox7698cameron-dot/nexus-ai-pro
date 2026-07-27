// src/components/dashboards/AnalyticsDashboard.jsx
// 2026-07-27 | Nexus AI Pro — Social Media Analytics Dashboard
// TikTok · Instagram · Facebook · Twitch · Discord · Lemon8 · Reddit · Redgifs
// Real-time SSE updates, views/likes/reach/retention tracking

import React, { useState, useEffect, useRef, useCallback } from 'react';

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#ff0050', icon: '📱' },
  { id: 'instagram', label: 'Instagram',  color: '#e1306c', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',   color: '#1877f2', icon: '👤' },
  { id: 'twitch',    label: 'Twitch',     color: '#9147ff', icon: '🎮' },
  { id: 'discord',   label: 'Discord',    color: '#5865f2', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',     color: '#ffe135', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',     color: '#ff4500', icon: '🤖' },
  { id: 'redgifs',   label: 'Redgifs',    color: '#ff3d3d', icon: '🎬' },
];

const fmt = n => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
const pct = n => `${(n * 100).toFixed(1)}%`;

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', flex: '1 1 160px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function RetentionBar({ curve = [] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
      {curve.map((v, i) => (
        <div key={i} title={`${(v * 100).toFixed(0)}%`}
          style={{ flex: 1, height: `${Math.max(2, v * 60)}px`, background: `hsl(${120 * v}, 60%, 50%)`, borderRadius: 2 }} />
      ))}
    </div>
  );
}

function PlatformCard({ data, selected, onSelect }) {
  const platform = PLATFORMS.find(p => p.id === data.platform);
  return (
    <div onClick={() => onSelect(data.platform)}
      style={{
        background: selected ? platform.color + '22' : 'var(--card-bg)',
        border: `2px solid ${selected ? platform.color : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
        transition: 'all 0.2s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{platform.icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{platform.label}</div>
          <div style={{ fontSize: 11, color: data.connected ? '#22c55e' : '#ef4444' }}>
            {data.connected ? 'Connected' : 'Not connected'}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Views</div><div style={{ fontWeight: 600 }}>{fmt(data.views.total)}</div></div>
        <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Likes</div><div style={{ fontWeight: 600 }}>{fmt(data.engagement.likes)}</div></div>
        <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Reach</div><div style={{ fontWeight: 600 }}>{fmt(data.reach.total)}</div></div>
        <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Followers</div><div style={{ fontWeight: 600 }}>{fmt(data.followers.total)}</div></div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ token }) {
  const [dashboard, setDashboard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const esRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/analytics/dashboard', { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setDashboard(data);
      if (!selected) setSelected(PLATFORMS[0].id);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Real-time SSE stream
  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/analytics/realtime/stream?token=${token}`);
    esRef.current = es;
    es.onmessage = e => {
      try {
        const update = JSON.parse(e.data);
        setLiveUpdates(prev => [{ ...update, id: Date.now() }, ...prev].slice(0, 20));
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [token]);

  const selectedData = dashboard?.platforms?.find(p => p.platform === selected);
  const platform = PLATFORMS.find(p => p.id === selected);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Social Analytics</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Real-time metrics across all platforms</div>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {/* Summary row */}
      {dashboard && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <MetricCard label="Total Reach" value={fmt(dashboard.summary.totalReach)} color="#3b82f6" />
          <MetricCard label="Total Views" value={fmt(dashboard.summary.totalViews)} color="#8b5cf6" />
          <MetricCard label="Total Engagement" value={fmt(dashboard.summary.totalEngagement)} color="#ec4899" />
          <MetricCard label="Total Followers" value={fmt(dashboard.summary.totalFollowers)} color="#22c55e" />
        </div>
      )}

      {/* Platform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {dashboard?.platforms?.map(d => (
          <PlatformCard key={d.platform} data={d} selected={selected === d.platform} onSelect={setSelected} />
        ))}
      </div>

      {/* Selected platform detail */}
      {selectedData && platform && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{platform.icon}</span> {platform.label} — Detailed Metrics
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <MetricCard label="Views" value={fmt(selectedData.views.total)} sub={`Unique: ${fmt(selectedData.views.unique)}`} />
            <MetricCard label="Avg Watch Time" value={`${selectedData.views.avgDuration}s`} sub={`Completion: ${pct(selectedData.views.completionRate)}`} />
            <MetricCard label="Organic Reach" value={fmt(selectedData.reach.organic)} sub={`Paid: ${fmt(selectedData.reach.paid)}`} />
            <MetricCard label="Engagement Rate" value={`${selectedData.engagement.rate}%`} />
            <MetricCard label="Comments" value={fmt(selectedData.engagement.comments)} />
            <MetricCard label="Shares" value={fmt(selectedData.engagement.shares)} />
            <MetricCard label="Net Followers" value={`+${fmt(selectedData.followers.net)}`} color="#22c55e" sub={`Lost: ${selectedData.followers.lost}`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Retention Curve (10-segment)</div>
              <RetentionBar curve={selectedData.retention.curve} />
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                <span>Day 1: {pct(selectedData.retention.day1)}</span>
                <span>Day 7: {pct(selectedData.retention.day7)}</span>
                <span>Day 30: {pct(selectedData.retention.day30)}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Top Content</div>
              {selectedData.topContent.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13 }}>#{i + 1} {c.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(c.views)} views</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live updates ticker */}
      {liveUpdates.length > 0 && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#22c55e' }}>Live Updates</div>
          {liveUpdates.slice(0, 5).map(u => (
            <div key={u.id} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <span style={{ color: PLATFORMS.find(p => p.id === u.platform)?.color }}>{u.platform}</span>
              <span>+{u.delta} {u.metric}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(u.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
