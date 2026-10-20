// File: src/components/AnalyticsDashboard.jsx
// Updated: 2026-10-20
// Social media analytics dashboard: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs

import React, { useState, useEffect, useCallback, useMemo } from 'react';

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', color: '#010101', accent: '#fe2c55' },
  { id: 'instagram', name: 'Instagram', color: '#c13584', accent: '#e1306c' },
  { id: 'facebook', name: 'Facebook', color: '#1877f2', accent: '#42b72a' },
  { id: 'twitch', name: 'Twitch', color: '#9146ff', accent: '#bf94ff' },
  { id: 'discord', name: 'Discord', color: '#5865f2', accent: '#57f287' },
  { id: 'lemon8', name: 'Lemon8', color: '#f7c948', accent: '#ff6b35' },
  { id: 'reddit', name: 'Reddit', color: '#ff4500', accent: '#ff6534' },
  { id: 'redgifs', name: 'RedGifs', color: '#e40000', accent: '#ff6b6b' },
];

const DATE_RANGES = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
];

function formatNum(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function MetricCard({ label, value, trend, color }) {
  const trendUp = typeof trend === 'number' ? trend >= 0 : null;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-1)' }}>{formatNum(value)}</div>
      {trend !== undefined && trend !== null && (
        <div style={{ fontSize: 12, color: trendUp ? '#22c55e' : '#ef4444', marginTop: 2 }}>
          {trendUp ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function MiniBarChart({ data, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.views), 1);
  const bars = data.slice(-14);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40, padding: '4px 0' }}>
      {bars.map((d, i) => (
        <div
          key={i}
          title={`${d.date}: ${formatNum(d.views)} views`}
          style={{
            flex: 1,
            background: color,
            opacity: 0.7 + (i / bars.length) * 0.3,
            borderRadius: 2,
            height: `${Math.max(4, (d.views / max) * 100)}%`,
          }}
        />
      ))}
    </div>
  );
}

function RetentionChart({ data }) {
  if (!data || data.length === 0) return null;
  const width = 280;
  const height = 80;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (d.retention / 100) * height,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#retentionGrad)" />
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />
      ))}
      <text x={0} y={height + 14} fontSize={10} fill="var(--text-3)">0s</text>
      <text x={width - 20} y={height + 14} fontSize={10} fill="var(--text-3)">
        {data[data.length - 1]?.second || 90}s
      </text>
    </svg>
  );
}

function PlatformCard({ platform, data, onConnect }) {
  const connected = data?.connected;
  const metrics = data?.metrics || {};
  const timeSeries = data?.timeSeries || [];

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: `1px solid ${connected ? platform.color : 'var(--border)'}`,
      borderRadius: 12,
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: platform.color }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: platform.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            {platform.name[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{platform.name}</div>
            <div style={{ fontSize: 11, color: connected ? '#22c55e' : 'var(--text-3)' }}>
              {connected ? '● Connected' : '○ Disconnected'}
            </div>
          </div>
        </div>
        {!connected && (
          <button
            onClick={() => onConnect(platform.id)}
            style={{
              padding: '4px 12px', borderRadius: 6, border: `1px solid ${platform.color}`,
              color: platform.color, background: 'transparent', cursor: 'pointer', fontSize: 12,
            }}
          >
            Connect
          </button>
        )}
      </div>

      <MiniBarChart data={timeSeries} color={platform.color} />

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Views', value: metrics.views || 0 },
          { label: 'Likes', value: metrics.likes || 0 },
          { label: 'Reach', value: metrics.reach || 0 },
        ].map(m => (
          <div key={m.label} style={{ flex: 1, minWidth: 60 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{formatNum(m.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState([]);
  const [platformData, setPlatformData] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/overview?range=${dateRange}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOverview(data.overview || []);
      setLastUpdated(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchPlatformData = useCallback(async (platform) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/platform/${platform}?range=${dateRange}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlatformData(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'platform') fetchPlatformData(selectedPlatform);
  }, [activeTab, selectedPlatform, fetchPlatformData]);

  const handleConnect = async (platformId) => {
    try {
      const res = await fetch(`/api/analytics/connect/${platformId}`, { method: 'POST' });
      const data = await res.json();
      if (data.oauthUrl) window.open(data.oauthUrl, '_blank');
      else alert(data.message);
      fetchOverview();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleExport = async () => {
    setExportStatus('exporting');
    try {
      const res = await fetch(`/api/analytics/export?range=${dateRange}&format=csv`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('done');
      setTimeout(() => setExportStatus(null), 2000);
    } catch (e) {
      setExportStatus('error');
    }
  };

  const totals = useMemo(() => overview.reduce((acc, p) => ({
    views: acc.views + (p.metrics?.views || 0),
    likes: acc.likes + (p.metrics?.likes || 0),
    reach: acc.reach + (p.metrics?.reach || 0),
    followers: acc.followers + (p.metrics?.followers || 0),
    connected: acc.connected + (p.connected ? 1 : 0),
  }), { views: 0, likes: 0, reach: 0, followers: 0, connected: 0 }), [overview]);

  const overviewMap = useMemo(() => {
    const m = {};
    for (const p of overview) m[p.platform] = p;
    return m;
  }, [overview]);

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: 'var(--text-1)' }}>
      <style>{`
        .analytics-tab { padding: 8px 18px; border: none; background: transparent; cursor: pointer; color: var(--text-2); font-size: 14px; border-bottom: 2px solid transparent; transition: color 0.2s, border-color 0.2s; }
        .analytics-tab.active { color: #6366f1; border-bottom-color: #6366f1; font-weight: 600; }
        .analytics-tab:hover { color: var(--text-1); }
        .platform-chip { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: var(--bg-2); cursor: pointer; font-size: 13px; color: var(--text-2); transition: all 0.15s; }
        .platform-chip.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .range-btn { padding: 5px 14px; border-radius: 6px; border: 1px solid var(--border); background: transparent; cursor: pointer; font-size: 12px; color: var(--text-2); }
        .range-btn.active { background: var(--bg-3, #374151); color: var(--text-1); }
        @media (max-width: 640px) {
          .analytics-grid { grid-template-columns: 1fr !important; }
          .metrics-row { flex-direction: column !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Analytics Dashboard</h1>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {totals.connected} of {PLATFORMS.length} platforms connected
            {lastUpdated && ` · Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {DATE_RANGES.map(r => (
              <button key={r.id} className={`range-btn${dateRange === r.id ? ' active' : ''}`} onClick={() => setDateRange(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={exportStatus === 'exporting'}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', cursor: 'pointer', fontSize: 13, color: 'var(--text-1)' }}
          >
            {exportStatus === 'exporting' ? 'Exporting...' : exportStatus === 'done' ? '✓ Exported' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="metrics-row" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <MetricCard label="Total Views" value={totals.views} trend={12} color="#6366f1" />
        <MetricCard label="Total Likes" value={totals.likes} trend={8} color="#ec4899" />
        <MetricCard label="Total Reach" value={totals.reach} trend={-3} color="#f59e0b" />
        <MetricCard label="Followers" value={totals.followers} trend={5} color="#22c55e" />
        <MetricCard label="Platforms" value={`${totals.connected}/${PLATFORMS.length}`} color="#8b5cf6" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button className={`analytics-tab${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`analytics-tab${activeTab === 'platform' ? ' active' : ''}`} onClick={() => setActiveTab('platform')}>
          Platform Detail
        </button>
        <button className={`analytics-tab${activeTab === 'content' ? ' active' : ''}`} onClick={() => setActiveTab('content')}>
          Top Content
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>Loading analytics...</div>
      )}

      {/* Overview Grid */}
      {!loading && activeTab === 'overview' && (
        <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {PLATFORMS.map(p => (
            <PlatformCard
              key={p.id}
              platform={p}
              data={overviewMap[p.id]}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}

      {/* Platform Detail */}
      {!loading && activeTab === 'platform' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                className={`platform-chip${selectedPlatform === p.id ? ' active' : ''}`}
                onClick={() => setSelectedPlatform(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>

          {platformData && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Views', value: platformData.totals?.views },
                  { label: 'Likes', value: platformData.totals?.likes },
                  { label: 'Shares', value: platformData.totals?.shares },
                  { label: 'Comments', value: platformData.totals?.comments },
                  { label: 'Reach', value: platformData.totals?.reach },
                  { label: 'Engagement', value: `${platformData.engagementRate}%` },
                ].map(m => (
                  <MetricCard key={m.label} label={m.label} value={m.value || 0} />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-2)' }}>Views Over Time</h3>
                  <MiniBarChart
                    data={platformData.timeSeries || []}
                    color={PLATFORMS.find(p => p.id === selectedPlatform)?.color || '#6366f1'}
                  />
                </div>
                <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-2)' }}>Retention Curve</h3>
                  <RetentionChart data={platformData.retention || []} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Content */}
      {!loading && activeTab === 'content' && platformData?.topContent && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                className={`platform-chip${selectedPlatform === p.id ? ' active' : ''}`}
                onClick={() => { setSelectedPlatform(p.id); fetchPlatformData(p.id); }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {platformData.topContent.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-2)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                  <span style={{ fontSize: 13 }}>👁 {formatNum(item.views)}</span>
                  <span style={{ fontSize: 13 }}>❤️ {formatNum(item.likes)}</span>
                  <span style={{ fontSize: 13, color: '#22c55e' }}>{item.engagementRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
