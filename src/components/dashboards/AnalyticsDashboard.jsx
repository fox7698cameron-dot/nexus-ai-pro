// src/components/dashboards/AnalyticsDashboard.jsx
// 2026-07-22 | Social media analytics — real-time metrics, reach, retention

import { useState, useEffect, useCallback } from 'react';

const PLATFORM_ICONS = {
  tiktok: '🎵', instagram: '📸', facebook: '👥', twitch: '🎮',
  discord: '💬', lemon8: '🍋', reddit: '🔴', redgifs: '🎬',
  youtube: '▶️', x: '✗', linkedin: '💼', snapchat: '👻',
};

const PLATFORM_COLORS = {
  tiktok: '#69C9D0', instagram: '#E1306C', facebook: '#1877F2', twitch: '#9146FF',
  discord: '#5865F2', lemon8: '#FFD700', reddit: '#FF4500', redgifs: '#FF6B6B',
  youtube: '#FF0000', x: '#1DA1F2', linkedin: '#0A66C2', snapchat: '#FFFC00',
};

function MetricCard({ label, value, delta, format = 'number' }) {
  const fmt = (v) => {
    if (v == null) return '—';
    if (format === 'percent') return `${Number(v).toFixed(1)}%`;
    if (format === 'time') return `${Math.round(v)}s`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return String(Math.round(v));
  };

  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#9ca3af';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '14px 18px',
      minWidth: 120,
    }}>
      <div style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {fmt(value)}
      </div>
      {delta !== undefined && (
        <div style={{ color, fontSize: 11, marginTop: 4 }}>
          {sign}{fmt(Math.abs(delta))} {delta > 0 ? '↑' : delta < 0 ? '↓' : ''}
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, data, onSelect, selected }) {
  const icon = PLATFORM_ICONS[platform] || '📊';
  const color = PLATFORM_COLORS[platform] || '#6b7280';
  const engagement = data.followers > 0
    ? (((data.likes || 0) + (data.comments || 0) + (data.shares || 0)) / data.followers * 100).toFixed(2)
    : '0.00';

  return (
    <div
      onClick={() => onSelect(platform)}
      style={{
        background: selected ? `${color}18` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        padding: 18,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ color: '#f1f5f9', fontWeight: 600, textTransform: 'capitalize', fontSize: 14 }}>
            {platform}
          </div>
          {data.lastUpdated && (
            <div style={{ color: '#6b7280', fontSize: 10 }}>
              Updated {new Date(data.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ color: '#9ca3af', fontSize: 11 }}>Followers</div>
        <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
          {formatNum(data.followers)}
        </div>
        <div style={{ color: '#9ca3af', fontSize: 11 }}>Views</div>
        <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
          {formatNum(data.views || data.impressions)}
        </div>
        <div style={{ color: '#9ca3af', fontSize: 11 }}>Engagement</div>
        <div style={{ color: color, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
          {engagement}%
        </div>
      </div>
    </div>
  );
}

function formatNum(v) {
  if (v == null) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

export default function AnalyticsDashboard({ token }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [retention, setRetention] = useState(null);
  const [reach, setReach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState('connecting');
  const [addPlatform, setAddPlatform] = useState('');
  const [addMetrics, setAddMetrics] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = useCallback(async () => {
    try {
      const [dash, ret, rch] = await Promise.all([
        fetch('/api/analytics/dashboard', { headers }).then(r => r.json()),
        fetch('/api/analytics/retention', { headers }).then(r => r.json()),
        fetch('/api/analytics/reach', { headers }).then(r => r.json()),
      ]);
      setData(dash);
      setRetention(ret);
      setReach(rch);
    } catch {
      // will retry via SSE reconnect
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();

    // Server-Sent Events for real-time updates
    const es = new EventSource(`/api/analytics/stream`, {});
    // SSE auth workaround: pass token as query param since EventSource doesn't support headers
    const sse = new EventSource(`/api/analytics/stream?token=${token}`);
    sse.onopen = () => setLiveStatus('live');
    sse.onerror = () => setLiveStatus('reconnecting');
    sse.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'metrics') {
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              platforms: { ...prev.platforms, [msg.platform]: msg.data },
            };
          });
        }
      } catch {}
    };

    return () => sse.close();
  }, [token]);

  const submitMetrics = async () => {
    if (!addPlatform || !addMetrics) return;
    try {
      const metrics = JSON.parse(addMetrics);
      const res = await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers,
        body: JSON.stringify({ platform: addPlatform, metrics }),
      });
      const result = await res.json();
      if (res.ok) {
        setSubmitStatus('Metrics saved!');
        await fetchAll();
        setTimeout(() => setSubmitStatus(''), 3000);
      } else {
        setSubmitStatus(result.error || 'Failed');
      }
    } catch {
      setSubmitStatus('Invalid JSON for metrics');
    }
  };

  const aggregated = data?.aggregated || {};
  const platforms = data?.platforms || {};
  const platformList = Object.keys(platforms);
  const selectedData = selected ? platforms[selected] : null;
  const selectedRetention = retention?.retention?.[selected];
  const selectedReach = reach?.reach?.[selected];

  const style = {
    panel: {
      background: '#0f0f13',
      minHeight: '100vh',
      padding: 24,
      color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
    title: { fontSize: 24, fontWeight: 700, color: '#f1f5f9' },
    live: {
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
      borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: liveStatus === 'live' ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
      color: liveStatus === 'live' ? '#4ade80' : '#fbbf24',
      border: `1px solid ${liveStatus === 'live' ? '#4ade8040' : '#fbbf2440'}`,
    },
    section: { marginBottom: 28 },
    sectionTitle: { color: '#6b7280', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
    row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
    input: {
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none',
    },
    btn: {
      background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
      padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    },
  };

  if (loading) return <div style={style.panel}>Loading analytics...</div>;

  return (
    <div style={style.panel}>
      <div style={style.header}>
        <div style={style.title}>Analytics Dashboard</div>
        <div style={style.live}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {liveStatus === 'live' ? 'Live' : 'Reconnecting...'}
        </div>
      </div>

      {/* Aggregated totals */}
      <div style={style.section}>
        <div style={style.sectionTitle}>Totals across all platforms</div>
        <div style={style.row}>
          <MetricCard label="Total Followers" value={aggregated.totalFollowers} />
          <MetricCard label="Total Views" value={aggregated.totalViews} />
          <MetricCard label="Total Likes" value={aggregated.totalLikes} />
          <MetricCard label="Total Shares" value={aggregated.totalShares} />
          <MetricCard label="Total Reach" value={reach?.totalReach} />
        </div>
      </div>

      {/* Platform grid */}
      <div style={style.section}>
        <div style={style.sectionTitle}>Platforms ({platformList.length})</div>
        {platformList.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            No platform data yet. Add metrics below to get started.
          </div>
        ) : (
          <div style={style.grid2}>
            {platformList.map(p => (
              <PlatformCard
                key={p} platform={p} data={platforms[p]}
                onSelect={setSelected} selected={selected === p}
              />
            ))}
          </div>
        )}
      </div>

      {/* Platform detail */}
      {selectedData && (
        <div style={style.section}>
          <div style={style.sectionTitle}>
            {PLATFORM_ICONS[selected]} {selected} — Detail
          </div>
          <div style={style.row}>
            <MetricCard label="Followers" value={selectedData.followers} />
            <MetricCard label="Posts" value={selectedData.posts} />
            <MetricCard label="Likes" value={selectedData.likes} />
            <MetricCard label="Comments" value={selectedData.comments} />
            <MetricCard label="Shares" value={selectedData.shares} />
            <MetricCard label="Views" value={selectedData.views} />
            <MetricCard label="Saves" value={selectedData.saves} />
            <MetricCard label="Profile Visits" value={selectedData.profileVisits} />
          </div>
          {selectedRetention && (
            <>
              <div style={{ ...style.sectionTitle, marginTop: 20 }}>Retention</div>
              <div style={style.row}>
                <MetricCard label="Avg Watch Time" value={selectedRetention.averageWatchTime} format="time" />
                <MetricCard label="Retention Rate" value={selectedRetention.retentionRate} format="percent" />
                <MetricCard label="Completion Rate" value={selectedRetention.completionRate} format="percent" />
                <MetricCard label="Replays" value={selectedRetention.replays} />
              </div>
            </>
          )}
          {selectedReach && (
            <>
              <div style={{ ...style.sectionTitle, marginTop: 20 }}>Reach</div>
              <div style={style.row}>
                <MetricCard label="Impressions" value={selectedReach.impressions} />
                <MetricCard label="Reach" value={selectedReach.reach} />
                <MetricCard label="Unique Viewers" value={selectedReach.uniqueViewers} />
                <MetricCard label="Shares" value={selectedReach.shareCount} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Add metrics */}
      <div style={style.section}>
        <div style={style.sectionTitle}>Push Metrics</div>
        <div style={style.row}>
          <select
            style={{ ...style.input, width: 160 }}
            value={addPlatform}
            onChange={e => setAddPlatform(e.target.value)}
          >
            <option value="">Select platform</option>
            {['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs', 'youtube', 'x', 'linkedin', 'snapchat'].map(p => (
              <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>
            ))}
          </select>
          <input
            style={{ ...style.input, flex: 1, minWidth: 200 }}
            placeholder='{"followers": 10000, "likes": 500, "views": 25000}'
            value={addMetrics}
            onChange={e => setAddMetrics(e.target.value)}
          />
          <button style={style.btn} onClick={submitMetrics}>Submit</button>
        </div>
        {submitStatus && (
          <div style={{ marginTop: 8, color: submitStatus.includes('!') ? '#4ade80' : '#f87171', fontSize: 12 }}>
            {submitStatus}
          </div>
        )}
      </div>
    </div>
  );
}
