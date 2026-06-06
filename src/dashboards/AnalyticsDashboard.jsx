// src/dashboards/AnalyticsDashboard.jsx
// 2026-06-06 | Social media analytics: TikTok, Instagram, Facebook, Twitch, Discord,
// Lemon8, Reddit, RedGIFs — real-time metrics, reach, views, retention

import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../auth/AuthService.js';

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', color: '#010101', accent: '#69C9D0', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', accent: '#F77737', icon: '📸' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', accent: '#42B72A', icon: '📘' },
  { id: 'twitch', label: 'Twitch', color: '#9147FF', accent: '#BF94FF', icon: '🎮' },
  { id: 'discord', label: 'Discord', color: '#5865F2', accent: '#EB459E', icon: '💬' },
  { id: 'lemon8', label: 'Lemon8', color: '#FFD700', accent: '#FFA500', icon: '🍋' },
  { id: 'reddit', label: 'Reddit', color: '#FF4500', accent: '#FF6534', icon: '🤖' },
  { id: 'redgifs', label: 'RedGIFs', color: '#E53935', accent: '#EF9A9A', icon: '🎞️' }
];

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
}

function MetricCard({ label, value, delta, unit = '' }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '16px' }}>
      <p style={{ margin: '0 0 4px', color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: '0', color: '#fff', fontSize: '22px', fontWeight: '700' }}>
        {unit}{typeof value === 'number' ? fmt(value) : value}
      </p>
      {delta !== undefined && (
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: delta >= 0 ? '#22c55e' : '#ef4444' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </p>
      )}
    </div>
  );
}

function RetentionBar({ rate }) {
  const color = rate >= 60 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: '#666' }}>Retention</span>
        <span style={{ fontSize: '11px', color }}>{rate?.toFixed(1)}%</span>
      </div>
      <div style={{ height: '6px', background: '#222', borderRadius: '3px' }}>
        <div style={{ height: '100%', width: `${Math.min(rate, 100)}%`, background: color, borderRadius: '3px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function ConnectModal({ platform, onConnect, onClose }) {
  const [accountId, setAccountId] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '340px' }}>
        <h3 style={{ color: '#fff', margin: '0 0 16px' }}>{platform.icon} Connect {platform.label}</h3>
        <p style={{ color: '#888', fontSize: '13px', margin: '0 0 16px' }}>
          Enter your {platform.label} account ID or handle to link your analytics.
        </p>
        <input style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px' }}
          type="text" placeholder={`@your${platform.label.toLowerCase()}handle`} value={accountId} onChange={e => setAccountId(e.target.value)} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onConnect(accountId)} disabled={!accountId}
            style={{ flex: 1, padding: '10px', background: platform.color, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ socket }) {
  const [overview, setOverview] = useState(null);
  const [activePlatform, setActivePlatform] = useState(null);
  const [trends, setTrends] = useState(null);
  const [posts, setPosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectTarget, setConnectTarget] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await authFetch('/api/analytics/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setLastRefresh(new Date());
      }
    } catch (_) { /* non-fatal */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Real-time Socket.io updates
  useEffect(() => {
    if (!socket) return;
    const roomId = 'analytics:' + getCurrentUserId();
    socket.emit('join', roomId);

    socket.on('analytics:update', ({ platform, metrics }) => {
      setOverview(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          platforms: {
            ...prev.platforms,
            [platform]: { ...prev.platforms[platform], metrics }
          }
        };
      });
    });

    return () => {
      socket.off('analytics:update');
      socket.emit('leave', roomId);
    };
  }, [socket]);

  const loadPlatformDetail = async (platformId) => {
    setActivePlatform(platformId);
    const [trendRes, postRes] = await Promise.all([
      authFetch(`/api/analytics/${platformId}/trends?days=30`),
      authFetch(`/api/analytics/${platformId}/posts`)
    ]);
    if (trendRes.ok) setTrends(await trendRes.json());
    if (postRes.ok) setPosts(await postRes.json());
  };

  const handleConnect = async (platform, accountId) => {
    try {
      const res = await authFetch(`/api/analytics/${platform}/connect`, {
        method: 'POST',
        body: JSON.stringify({ accountId })
      });
      if (res.ok) {
        setConnectTarget(null);
        loadOverview();
      }
    } catch (_) { /* non-fatal */ }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await authFetch('/api/analytics/refresh', { method: 'POST' });
    await loadOverview();
  };

  const activePlatformObj = PLATFORMS.find(p => p.id === activePlatform);
  const activePlatformData = overview?.platforms?.[activePlatform];

  if (loading) {
    return (
      <div style={{ padding: '24px', color: '#fff', textAlign: 'center' }}>
        <p style={{ color: '#666' }}>Loading analytics…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'system-ui, -apple-system', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>📊 Analytics Dashboard</h2>
          {lastRefresh && <p style={{ margin: '4px 0 0', color: '#555', fontSize: '12px' }}>Last updated: {lastRefresh.toLocaleTimeString()}</p>}
        </div>
        <button onClick={handleRefresh} style={{ padding: '8px 18px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {PLATFORMS.map(p => {
          const connected = overview?.platforms?.[p.id]?.connected;
          return (
            <button key={p.id} onClick={() => loadPlatformDetail(p.id)}
              style={{
                padding: '8px 14px', borderRadius: '20px', border: '1px solid',
                borderColor: activePlatform === p.id ? p.accent : '#333',
                background: activePlatform === p.id ? `${p.color}33` : '#111',
                color: activePlatform === p.id ? p.accent : '#aaa',
                cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
              {p.icon} {p.label}
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#22c55e' : '#444' }} />
            </button>
          );
        })}
      </div>

      {/* Active platform detail */}
      {activePlatform && activePlatformData && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, color: activePlatformObj?.accent }}>
              {activePlatformObj?.icon} {activePlatformObj?.label}
            </h3>
            {!activePlatformData.connected ? (
              <button onClick={() => setConnectTarget(activePlatformObj)}
                style={{ padding: '8px 16px', background: activePlatformObj?.color, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                + Connect Account
              </button>
            ) : (
              <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ Connected · {activePlatformData.accountId}</span>
            )}
          </div>

          {activePlatformData.connected ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <MetricCard label="Total Views" value={activePlatformData.metrics?.totalViews} />
                <MetricCard label="Total Likes" value={activePlatformData.metrics?.totalLikes} />
                <MetricCard label="Reach" value={activePlatformData.metrics?.totalReach} />
                <MetricCard label="Comments" value={activePlatformData.metrics?.totalComments} />
                <MetricCard label="Shares" value={activePlatformData.metrics?.totalShares} />
                <MetricCard label="Followers" value={activePlatformData.metrics?.followers} />
              </div>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <RetentionBar rate={activePlatformData.metrics?.avgRetentionRate || 0} />
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                  <span>Avg Watch Time: <b style={{ color: '#fff' }}>{activePlatformData.metrics?.avgWatchTime?.toFixed(0)}s</b></span>
                  <span style={{ color: '#555' }}>Updated: {activePlatformData.lastUpdated ? new Date(activePlatformData.lastUpdated).toLocaleTimeString() : '—'}</span>
                </div>
              </div>

              {/* 30-day trend chart (bar visualization) */}
              {trends?.trend && (
                <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 12px', color: '#888', fontSize: '12px' }}>30-Day Views Trend</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px', overflowX: 'auto' }}>
                    {trends.trend.slice(-30).map((d, i) => {
                      const maxV = Math.max(...trends.trend.map(x => x.views));
                      const h = maxV > 0 ? Math.round((d.views / maxV) * 80) : 4;
                      return (
                        <div key={i} title={`${d.date}: ${fmt(d.views)} views`}
                          style={{ flex: '1', minWidth: '6px', height: `${h}px`, background: activePlatformObj?.accent || '#818cf8', borderRadius: '2px 2px 0 0', cursor: 'pointer' }} />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent posts */}
              {posts?.posts && (
                <div>
                  <p style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>Recent Posts</p>
                  {posts.posts.map(post => (
                    <div key={post.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <p style={{ margin: 0, color: '#fff', fontSize: '13px' }}>{post.title}</p>
                        <p style={{ margin: '3px 0 0', color: '#555', fontSize: '11px' }}>{new Date(post.publishedAt).toLocaleDateString()}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#888' }}>
                        <span>👁 {fmt(post.metrics.views)}</span>
                        <span>❤️ {fmt(post.metrics.likes)}</span>
                        <span>💬 {fmt(post.metrics.comments)}</span>
                        <span style={{ color: post.metrics.retentionRate >= 60 ? '#22c55e' : '#f59e0b' }}>⏱ {post.metrics.retentionRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ background: '#111', border: '1px dashed #333', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
              <p style={{ color: '#555', margin: 0 }}>Connect your {activePlatformObj?.label} account to see analytics</p>
            </div>
          )}
        </div>
      )}

      {/* Overview grid */}
      {!activePlatform && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {PLATFORMS.map(p => {
            const pData = overview?.platforms?.[p.id];
            const connected = pData?.connected;
            return (
              <div key={p.id} onClick={() => loadPlatformDetail(p.id)}
                style={{ background: '#111', border: `1px solid ${connected ? p.color + '66' : '#222'}`, borderRadius: '12px', padding: '18px', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{p.icon}</span>
                  <span style={{ fontSize: '10px', color: connected ? '#22c55e' : '#555', background: connected ? '#22c55e22' : '#1a1a1a', padding: '2px 8px', borderRadius: '10px' }}>
                    {connected ? 'LIVE' : 'OFF'}
                  </span>
                </div>
                <p style={{ margin: '0 0 2px', color: '#fff', fontSize: '14px', fontWeight: '600' }}>{p.label}</p>
                {connected ? (
                  <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
                    {fmt(pData?.metrics?.totalViews)} views · {fmt(pData?.metrics?.followers)} followers
                  </p>
                ) : (
                  <p style={{ margin: 0, color: '#444', fontSize: '12px' }}>Not connected</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {connectTarget && (
        <ConnectModal platform={connectTarget} onConnect={(id) => handleConnect(connectTarget.id, id)} onClose={() => setConnectTarget(null)} />
      )}
    </div>
  );
}

function getCurrentUserId() {
  try { return JSON.parse(localStorage.getItem('nexus:user'))?.id || 'anon'; } catch { return 'anon'; }
}
