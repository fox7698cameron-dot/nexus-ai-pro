// src/components/AnalyticsDashboard.jsx
// Created: 2026-10-19
// Analytics dashboard with real-time social media metrics

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, TrendingUp, Users, Eye, Heart, MessageCircle,
  Share2, Download, Wifi, WifiOff, RefreshCw, BarChart3,
  Clock, Percent, Globe, Zap
} from 'lucide-react';

const PLATFORMS = [
  { key: 'tiktok',    label: 'TikTok',     color: '#010101', accent: '#fe2c55' },
  { key: 'instagram', label: 'Instagram',  color: '#833ab4', accent: '#fd1d1d' },
  { key: 'facebook',  label: 'Facebook',   color: '#1877f2', accent: '#42b72a' },
  { key: 'twitch',    label: 'Twitch',     color: '#6441a5', accent: '#9147ff' },
  { key: 'discord',   label: 'Discord',    color: '#5865f2', accent: '#7289da' },
  { key: 'lemon8',    label: 'Lemon8',     color: '#f7c324', accent: '#f7a020' },
  { key: 'reddit',    label: 'Reddit',     color: '#ff4500', accent: '#ff6314' },
  { key: 'redgifs',   label: 'RedGIFs',    color: '#e5003b', accent: '#ff4d6d' },
];

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
  return String(n);
}

function MetricBadge({ label, value, color = '#3b82f6', icon: Icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '12px 16px',
      minWidth: 120,
      flex: '1 1 120px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{fmt(value)}</div>
    </div>
  );
}

function PlatformTab({ p, active, liveData, onClick }) {
  const rt = liveData?.[p.key];
  return (
    <button
      onClick={() => onClick(p.key)}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: 'none',
        background: active ? p.accent : 'rgba(255,255,255,0.07)',
        color: '#fff',
        fontWeight: active ? 700 : 400,
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        opacity: active ? 1 : 0.7,
      }}
    >
      <span>{p.label}</span>
      {rt?.liveViewers > 0 && (
        <span style={{
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 4,
          padding: '1px 5px',
          fontSize: 10,
        }}>{fmt(rt.liveViewers)} live</span>
      )}
    </button>
  );
}

function ConnectionStatus({ platform, connected }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12,
      color: connected ? '#22c55e' : '#ef4444',
    }}>
      {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
      {connected ? 'Connected' : 'Not connected'}
    </div>
  );
}

export default function AnalyticsDashboard({ socket }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [overview, setOverview]   = useState(null);
  const [liveData, setLiveData]   = useState({});
  const [connected, setConnected] = useState({});
  const [retention, setRetention] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ovRes, retRes, engRes] = await Promise.all([
        fetch('/api/analytics/social/overview').then(r => r.json()).catch(() => null),
        fetch('/api/analytics/retention').then(r => r.json()).catch(() => null),
        fetch('/api/analytics/engagement').then(r => r.json()).catch(() => null),
      ]);
      if (ovRes?.ok)  setOverview(ovRes.data);
      if (retRes?.ok) setRetention(retRes.data);
      if (engRes?.ok) {
        const map = {};
        for (const d of engRes.data ?? []) map[d.platform] = d;
        setConnected(map);
      }
      setLastUpdate(Date.now());
    } catch (_) {
      // silent — rely on socket updates
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      if (payload.overview) setOverview(payload.overview);
      if (payload.realtime) {
        const map = {};
        for (const rt of payload.realtime) map[rt.platform] = rt;
        setLiveData(map);
      }
      setLastUpdate(Date.now());
    };
    socket.on('analytics:update', handler);
    return () => socket.off('analytics:update', handler);
  }, [socket]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ overview, liveData, retention, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePlatformData = overview?.platforms?.find(p => p.platform === activePlatform);
  const platformMeta       = PLATFORMS.find(p => p.key === activePlatform);
  const activeRetention    = retention?.find(r => r.platform === activePlatform);
  const activeLive         = liveData[activePlatform];

  const containerStyle = {
    background: 'var(--bg-primary, #0f1117)',
    color: 'var(--text-primary, #f1f5f9)',
    minHeight: '100vh',
    padding: 24,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={22} color="#6366f1" /> Analytics Dashboard
          </h2>
          {lastUpdate && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Last updated {new Date(lastUpdate).toLocaleTimeString()}
          </p>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchAll} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportData} style={{ background: '#6366f1', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Overview KPIs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>Loading metrics…</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <MetricBadge label="Total Followers"   value={overview?.totalFollowers}    color="#6366f1" icon={Users}     />
          <MetricBadge label="Total Views"        value={overview?.totalViews}        color="#22d3ee" icon={Eye}       />
          <MetricBadge label="Total Likes"        value={overview?.totalLikes}        color="#f43f5e" icon={Heart}     />
          <MetricBadge label="Total Impressions"  value={overview?.totalImpressions}  color="#a78bfa" icon={Globe}     />
          <MetricBadge label="Total Reach"        value={overview?.totalReach}        color="#34d399" icon={TrendingUp} />
          <MetricBadge label="Avg Engagement"     value={overview?.avgEngagementRate != null ? `${overview.avgEngagementRate}%` : null} color="#fbbf24" icon={Percent} />
        </div>
      )}

      {/* Platform tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {PLATFORMS.map(p => (
          <PlatformTab
            key={p.key}
            p={p}
            active={activePlatform === p.key}
            liveData={liveData}
            onClick={setActivePlatform}
          />
        ))}
      </div>

      {/* Active platform detail */}
      {activePlatformData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Platform metrics */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${platformMeta?.accent}44`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: platformMeta?.accent }}>
                {platformMeta?.label} Metrics
              </h3>
              <ConnectionStatus platform={activePlatform} connected={!!connected[activePlatform]} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <MetricBadge label="Followers"    value={activePlatformData.followers}    color="#6366f1" icon={Users}          />
              <MetricBadge label="Views"         value={activePlatformData.views}        color="#22d3ee" icon={Eye}            />
              <MetricBadge label="Likes"         value={activePlatformData.likes}        color="#f43f5e" icon={Heart}          />
              <MetricBadge label="Comments"      value={activePlatformData.comments}     color="#a78bfa" icon={MessageCircle}  />
              <MetricBadge label="Shares"        value={activePlatformData.shares}       color="#34d399" icon={Share2}         />
              <MetricBadge label="Engagement"    value={`${activePlatformData.engagementRate}%`} color="#fbbf24" icon={Percent} />
            </div>
          </div>

          {/* Reach & Retention */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Reach & Retention</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Impressions',        value: fmt(activePlatformData.impressions),  icon: Globe,    color: '#a78bfa' },
                { label: 'Unique Reach',        value: fmt(activePlatformData.reach),        icon: Users,    color: '#34d399' },
                { label: 'Viral Coefficient',   value: activePlatformData.viralCoefficient, icon: Zap,      color: '#fbbf24' },
                { label: 'Avg Watch Time',      value: activeRetention ? `${activeRetention.avgWatchTimeSec}s` : '—', icon: Clock, color: '#22d3ee' },
                { label: 'Retention Rate',      value: activeRetention ? `${activeRetention.retentionRate}%` : '—',   icon: Percent, color: '#f43f5e' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                    <Icon size={13} color={color} />
                    {label}
                  </div>
                  <div style={{ fontWeight: 700, color, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live activity */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={15} color="#22c55e" /> Live Activity
              <span style={{ marginLeft: 'auto', fontSize: 11, background: '#22c55e22', color: '#22c55e', borderRadius: 4, padding: '2px 8px' }}>LIVE</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Live Viewers',    value: fmt(activeLive?.liveViewers ?? 0),     color: '#22c55e' },
                { label: 'Recent Likes',    value: `+${fmt(activeLive?.recentLikes ?? 0)}`, color: '#f43f5e' },
                { label: 'Trending Score',  value: activeLive?.trendingScore ?? '—',       color: '#fbbf24' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color, fontSize: 14 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All platforms table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 600, fontSize: 14 }}>All Platforms Overview</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>
                {['Platform', 'Followers', 'Views', 'Likes', 'Engagement', 'Reach', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(overview?.platforms ?? []).map(m => {
                const meta = PLATFORMS.find(p => p.key === m.platform);
                return (
                  <tr
                    key={m.platform}
                    onClick={() => setActivePlatform(m.platform)}
                    style={{ cursor: 'pointer', background: activePlatform === m.platform ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'background 0.1s' }}
                  >
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: meta?.accent }}>{meta?.label}</td>
                    <td style={{ padding: '10px 16px' }}>{fmt(m.followers)}</td>
                    <td style={{ padding: '10px 16px' }}>{fmt(m.views)}</td>
                    <td style={{ padding: '10px 16px' }}>{fmt(m.likes)}</td>
                    <td style={{ padding: '10px 16px' }}>{m.engagementRate}%</td>
                    <td style={{ padding: '10px 16px' }}>{fmt(m.reach)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#22c55e22', color: '#22c55e' }}>Active</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
