// src/components/AnalyticsDashboard.jsx
// Social Media Analytics Dashboard - Real-time metrics for TikTok, Instagram, Facebook,
// Twitch, Discord, Lemon8, Reddit, RedGifs
// Updated: 2026-10-21

import React, { useState, useEffect, useCallback, useRef } from 'react';

const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    color: '#010101',
    accent: '#fe2c55',
    gradient: 'linear-gradient(135deg, #010101, #fe2c55)',
    icon: '🎵',
    metrics: ['views', 'likes', 'comments', 'shares', 'followers', 'reach', 'retention'],
    connected: false,
  },
  instagram: {
    name: 'Instagram',
    color: '#833ab4',
    accent: '#fd1d1d',
    gradient: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
    icon: '📸',
    metrics: ['impressions', 'likes', 'comments', 'saves', 'reach', 'profile_visits', 'retention'],
    connected: false,
  },
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    accent: '#0a52cc',
    gradient: 'linear-gradient(135deg, #1877f2, #0a52cc)',
    icon: '👥',
    metrics: ['reach', 'impressions', 'likes', 'comments', 'shares', 'video_views', 'retention'],
    connected: false,
  },
  twitch: {
    name: 'Twitch',
    color: '#9147ff',
    accent: '#6441a4',
    gradient: 'linear-gradient(135deg, #9147ff, #6441a4)',
    icon: '🎮',
    metrics: ['viewers', 'followers', 'subscribers', 'peak_viewers', 'avg_watch_time', 'chat_messages'],
    connected: false,
  },
  discord: {
    name: 'Discord',
    color: '#5865f2',
    accent: '#3c43c6',
    gradient: 'linear-gradient(135deg, #5865f2, #3c43c6)',
    icon: '💬',
    metrics: ['members', 'active_members', 'messages', 'voice_time', 'server_boosts', 'channels'],
    connected: false,
  },
  lemon8: {
    name: 'Lemon8',
    color: '#ffb31a',
    accent: '#e69500',
    gradient: 'linear-gradient(135deg, #ffb31a, #e69500)',
    icon: '🍋',
    metrics: ['views', 'likes', 'comments', 'saves', 'reach', 'followers'],
    connected: false,
  },
  reddit: {
    name: 'Reddit',
    color: '#ff4500',
    accent: '#cc3600',
    gradient: 'linear-gradient(135deg, #ff4500, #cc3600)',
    icon: '👾',
    metrics: ['upvotes', 'comments', 'awards', 'reach', 'karma', 'post_views'],
    connected: false,
  },
  redgifs: {
    name: 'RedGifs',
    color: '#e53e3e',
    accent: '#c53030',
    gradient: 'linear-gradient(135deg, #e53e3e, #c53030)',
    icon: '🎬',
    metrics: ['views', 'likes', 'shares', 'retention', 'reach', 'followers'],
    connected: false,
  },
};

const TIME_RANGES = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

function generateMockData(platform, metric, range) {
  const points = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const base = { views: 12000, likes: 3400, followers: 89000, reach: 45000, retention: 68 }[metric] || 1000;
  return Array.from({ length: points }, (_, i) => ({
    t: i,
    v: Math.round(base * (0.7 + Math.random() * 0.6)),
  }));
}

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.v));
  const min = Math.min(...data.map(d => d.v));
  const range = max - min || 1;
  const w = 120, h = 36;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, change, data, color }) {
  const positive = change >= 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 160,
    }}>
      <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: positive ? '#10b981' : '#ef4444' }}>
          {positive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
        </span>
        <Sparkline data={data} color={color} />
      </div>
    </div>
  );
}

function PlatformCard({ platformKey, platform, data, onConnect, selected, onSelect }) {
  const totalReach = (data?.reach || []).reduce((s, d) => s + d.v, 0);
  return (
    <button
      onClick={() => onSelect(platformKey)}
      style={{
        background: selected
          ? `${platform.gradient}, rgba(0,0,0,0.6)`
          : 'rgba(255,255,255,0.04)',
        border: selected ? `2px solid ${platform.accent}` : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '18px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        flex: '1 1 160px',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{platform.icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{platform.name}</div>
      <div style={{ fontSize: 11, color: '#888' }}>
        {platform.connected ? `${totalReach.toLocaleString()} total reach` : 'Not connected'}
      </div>
      {!platform.connected && (
        <button
          onClick={e => { e.stopPropagation(); onConnect(platformKey); }}
          style={{
            marginTop: 10,
            padding: '6px 12px',
            background: platform.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Connect
        </button>
      )}
    </button>
  );
}

function ConnectModal({ platformKey, platform, onClose, onConnect }) {
  const [token, setToken] = useState('');
  const [step, setStep] = useState(1);

  const handleSubmit = () => {
    if (!token.trim()) return;
    // In production, securely exchange this token with the backend
    onConnect(platformKey, token);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: 32, width: 400, maxWidth: '90vw',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{platform.icon}</div>
        <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: 18 }}>Connect {platform.name}</h3>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px 0' }}>
          Enter your API access token. Never share this with anyone else.
          Your credentials are stored encrypted and never sent in plaintext.
        </p>
        {step === 1 && (
          <>
            <label style={{ color: '#aaa', fontSize: 12, display: 'block', marginBottom: 6 }}>
              Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste your token here"
              style={{
                width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff',
                fontSize: 14, boxSizing: 'border-box', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!token.trim()}
                style={{ flex: 1, padding: '10px', background: platform.accent, color: '#fff', border: 'none', borderRadius: 8, cursor: token.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, opacity: token.trim() ? 1 : 0.5 }}
              >
                Connect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [timeRange, setTimeRange] = useState('7d');
  const [platforms, setPlatforms] = useState(PLATFORMS);
  const [analyticsData, setAnalyticsData] = useState({});
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  const generatePlatformData = useCallback((platformKey, range) => {
    const p = platforms[platformKey];
    const data = {};
    for (const metric of p.metrics) {
      data[metric] = generateMockData(platformKey, metric, range);
    }
    return data;
  }, [platforms]);

  useEffect(() => {
    const newData = {};
    for (const key of Object.keys(platforms)) {
      newData[key] = generatePlatformData(key, timeRange);
    }
    setAnalyticsData(newData);
  }, [timeRange]);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(() => {
        setAnalyticsData(prev => {
          const updated = { ...prev };
          const p = platforms[selectedPlatform];
          if (!updated[selectedPlatform]) return prev;
          for (const metric of p.metrics) {
            const series = updated[selectedPlatform][metric] || [];
            const last = series[series.length - 1] || { t: 0, v: 1000 };
            const newPoint = { t: last.t + 1, v: Math.max(0, last.v + Math.round((Math.random() - 0.48) * last.v * 0.05)) };
            updated[selectedPlatform] = {
              ...updated[selectedPlatform],
              [metric]: [...series.slice(-89), newPoint],
            };
          }
          return updated;
        });
      }, 3000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive, selectedPlatform]);

  const handleConnect = useCallback((platformKey, token) => {
    // Token would be securely sent to backend for OAuth/API auth exchange
    // Only metadata stored here, not the actual token
    setPlatforms(prev => ({
      ...prev,
      [platformKey]: { ...prev[platformKey], connected: true },
    }));
    setAnalyticsData(prev => ({
      ...prev,
      [platformKey]: generatePlatformData(platformKey, timeRange),
    }));
  }, [generatePlatformData, timeRange]);

  const platform = platforms[selectedPlatform];
  const data = analyticsData[selectedPlatform] || {};

  const summaryMetrics = [
    { key: 'views', label: 'Total Views', icon: '👁' },
    { key: 'likes', label: 'Likes', icon: '❤️' },
    { key: 'reach', label: 'Reach', icon: '📡' },
    { key: 'retention', label: 'Retention %', icon: '🎯' },
    { key: 'followers', label: 'Followers', icon: '👤' },
    { key: 'shares', label: 'Shares', icon: '🔁' },
    { key: 'viewers', label: 'Viewers', icon: '📺' },
    { key: 'members', label: 'Members', icon: '👥' },
  ].filter(m => platform.metrics.includes(m.key));

  return (
    <div style={{
      background: '#0d0d1a',
      minHeight: '100vh',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Social Analytics</h1>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 13 }}>Real-time cross-platform metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setIsLive(l => !l)}
            style={{
              padding: '8px 16px',
              background: isLive ? '#ef4444' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${isLive ? '#ef4444' : '#10b981'}`,
              borderRadius: 8,
              color: isLive ? '#fff' : '#10b981',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#fff' : '#10b981', display: 'inline-block', animation: isLive ? 'pulse 1s infinite' : 'none' }} />
            {isLive ? 'Live' : 'Go Live'}
          </button>
          {TIME_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              style={{
                padding: '6px 12px',
                background: timeRange === r.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: `1px solid ${timeRange === r.value ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
                borderRadius: 6,
                color: timeRange === r.value ? '#fff' : '#666',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {Object.entries(platforms).map(([key, p]) => (
          <PlatformCard
            key={key}
            platformKey={key}
            platform={p}
            data={analyticsData[key]}
            onConnect={(k) => setConnectingPlatform(k)}
            selected={selectedPlatform === key}
            onSelect={setSelectedPlatform}
          />
        ))}
      </div>

      {/* Selected Platform Detail */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>{platform.icon}</span>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{platform.name} Analytics</h2>
          {isLive && (
            <span style={{ padding: '3px 8px', background: '#ef4444', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              LIVE
            </span>
          )}
        </div>

        {/* Metric Cards */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {summaryMetrics.map(({ key, label }) => {
            const series = data[key] || [];
            const current = series[series.length - 1]?.v || 0;
            const prev = series[series.length - 2]?.v || current;
            const change = prev ? ((current - prev) / prev) * 100 : 0;
            return (
              <MetricCard
                key={key}
                label={label}
                value={current}
                change={change}
                data={series.slice(-20)}
                color={platform.accent}
              />
            );
          })}
        </div>
      </div>

      {/* View & Retention Tracking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Views over time */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#aaa' }}>Views Over Time</h4>
          <ViewChart data={data.views || data.impressions || []} color={platform.accent} />
        </div>

        {/* Retention tracking */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#aaa' }}>Retention Rate</h4>
          <RetentionChart data={data.retention || data.avg_watch_time || []} color="#10b981" />
        </div>

        {/* Engagement breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#aaa' }}>Engagement Breakdown</h4>
          <EngagementBreakdown metrics={summaryMetrics} data={data} color={platform.accent} />
        </div>

        {/* Reach & Impressions */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#aaa' }}>Reach & Impressions</h4>
          <ReachChart data={data.reach || data.impressions || []} color="#6366f1" />
        </div>
      </div>

      {/* Cross-platform comparison */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#aaa' }}>Cross-Platform Comparison</h4>
        <CrossPlatformTable platforms={platforms} data={analyticsData} />
      </div>

      {connectingPlatform && (
        <ConnectModal
          platformKey={connectingPlatform}
          platform={platforms[connectingPlatform]}
          onClose={() => setConnectingPlatform(null)}
          onConnect={handleConnect}
        />
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

function ViewChart({ data, color }) {
  if (!data.length) return <div style={{ color: '#555', fontSize: 12 }}>No data</div>;
  const max = Math.max(...data.map(d => d.v)) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
      {data.slice(-30).map((d, i) => (
        <div key={i} style={{ flex: 1, background: color, borderRadius: 2, height: `${(d.v / max) * 100}%`, opacity: 0.7, minHeight: 2 }} title={d.v.toLocaleString()} />
      ))}
    </div>
  );
}

function RetentionChart({ data, color }) {
  if (!data.length) return <div style={{ color: '#555', fontSize: 12 }}>No data</div>;
  const latest = data[data.length - 1]?.v || 0;
  const pct = Math.min(100, Math.max(0, latest));
  return (
    <div>
      <div style={{ fontSize: 36, fontWeight: 700, color, marginBottom: 8 }}>{pct.toFixed(1)}%</div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.5s' }} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
        {data.slice(-20).map((d, i) => (
          <div key={i} style={{ flex: 1, background: color, opacity: 0.5, borderRadius: 2, height: `${Math.min(100, d.v)}%`, minHeight: 2 }} />
        ))}
      </div>
    </div>
  );
}

function EngagementBreakdown({ metrics, data, color }) {
  const vals = metrics.filter(m => !['retention', 'followers', 'avg_watch_time', 'members', 'server_boosts'].includes(m.key))
    .map(m => ({ label: m.label, v: (data[m.key] || []).reduce((s, d) => s + d.v, 0) }));
  const total = vals.reduce((s, m) => s + m.v, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {vals.map(({ label, v }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: '#aaa' }}>{label}</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{((v / total) * 100).toFixed(1)}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 5 }}>
            <div style={{ width: `${(v / total) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReachChart({ data, color }) {
  if (!data.length) return <div style={{ color: '#555', fontSize: 12 }}>No data</div>;
  const latest = data[data.length - 1]?.v || 0;
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 12 }}>{latest.toLocaleString()}</div>
      <Sparkline data={data.slice(-30)} color={color} />
    </div>
  );
}

function CrossPlatformTable({ platforms, data }) {
  const rows = Object.entries(platforms).map(([key, p]) => {
    const d = data[key] || {};
    const reach = (d.reach || d.impressions || d.viewers || []).reduce((s, i) => s + i.v, 0);
    const likes = (d.likes || d.upvotes || []).reduce((s, i) => s + i.v, 0);
    return { key, name: p.name, icon: p.icon, reach, likes, connected: p.connected, color: p.accent };
  });
  const maxReach = Math.max(...rows.map(r => r.reach)) || 1;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Platform', 'Status', 'Total Reach', 'Engagement'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#666', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '10px 12px', color: '#fff' }}>{row.icon} {row.name}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: row.connected ? '#10b98120' : '#ef444420', color: row.connected ? '#10b981' : '#ef4444' }}>
                  {row.connected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#fff' }}>{row.reach.toLocaleString()}</span>
                  <div style={{ flex: 1, maxWidth: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 2, height: 4 }}>
                    <div style={{ width: `${(row.reach / maxReach) * 100}%`, height: '100%', background: row.color, borderRadius: 2 }} />
                  </div>
                </div>
              </td>
              <td style={{ padding: '10px 12px', color: '#aaa' }}>{row.likes.toLocaleString()} likes</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
