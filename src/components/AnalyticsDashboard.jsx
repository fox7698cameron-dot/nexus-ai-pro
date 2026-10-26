// src/components/AnalyticsDashboard.jsx
// Updated: 2026-10-26 — social media analytics dashboard with real-time Socket.io updates
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Users, Activity,
  Download, RefreshCw, BarChart3, Globe, Wifi, WifiOff
} from 'lucide-react';

const t = (key, fallback) =>
  typeof window !== 'undefined' && window.i18n?.t ? window.i18n.t(key) : fallback;

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#69C9D0', icon: '🎵' },
  { id: 'instagram', label: 'Instagram',  color: '#E1306C', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',   color: '#1877F2', icon: '👍' },
  { id: 'twitch',    label: 'Twitch',     color: '#9147FF', icon: '🎮' },
  { id: 'discord',   label: 'Discord',    color: '#5865F2', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',     color: '#FFD700', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',     color: '#FF4500', icon: '🔺' },
  { id: 'redgifs',   label: 'RedGIFs',    color: '#FF6B6B', icon: '🎞️' },
];

const MOCK_DATA = {
  tiktok:    { views: 1234567, likes: 89432, reach: 234567, retention: 67.3, followers: 45678, engagement: 8.2,  trending: true  },
  instagram: { views: 987654,  likes: 76543, reach: 198765, retention: 72.1, followers: 89012, engagement: 9.5,  trending: true  },
  facebook:  { views: 543210,  likes: 23456, reach: 112345, retention: 45.8, followers: 123456,engagement: 4.3,  trending: false },
  twitch:    { views: 234567,  likes: 18765, reach: 78901,  retention: 81.2, followers: 34567, engagement: 11.7, trending: true  },
  discord:   { views: 123456,  likes: 9876,  reach: 56789,  retention: 55.6, followers: 12345, engagement: 6.8,  trending: false },
  lemon8:    { views: 67890,   likes: 5432,  reach: 23456,  retention: 63.4, followers: 7890,  engagement: 7.9,  trending: false },
  reddit:    { views: 345678,  likes: 34567, reach: 145678, retention: 38.9, followers: 56789, engagement: 5.2,  trending: true  },
  redgifs:   { views: 876543,  likes: 67890, reach: 187654, retention: 58.7, followers: 23456, engagement: 7.7,  trending: false },
};

const DATE_RANGES = ['7d', '30d', '90d'];

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function BarChart({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: '100%', height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function SparklineSVG({ points, color }) {
  if (!points || points.length < 2) return null;
  const w = 80, h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points) || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(v => h - ((v - min) / (max - min)) * h);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, icon: Icon, color, trend }) {
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {Icon && <Icon size={16} color={color} />}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: trend >= 0 ? '#10b981' : '#ef4444' }}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend).toFixed(1)}% vs prev period
        </div>
      )}
    </div>
  );
}

function PlatformRow({ data, platform, color }) {
  const maxViews = 2_000_000;
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px',
      display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 80px', alignItems: 'center', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.2rem' }}>{platform.icon}</span>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '0.9rem' }}>{platform.label}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{formatNumber(data.followers)} {t('followers', 'followers')}</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>
          <Eye size={10} style={{ display: 'inline', marginRight: 3 }} />{t('views', 'Views')} {formatNumber(data.views)}
        </div>
        <BarChart value={data.views} max={maxViews} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>
          <Heart size={10} style={{ display: 'inline', marginRight: 3 }} />{formatNumber(data.likes)}
          &nbsp;·&nbsp;{t('engagement', 'Eng')} {data.engagement}%
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
          {t('retention', 'Retention')}: {data.retention}%
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>
          {t('reach', 'Reach')}: {formatNumber(data.reach)}
        </div>
        <SparklineSVG points={Array.from({ length: 7 }, () => Math.random() * data.views * 0.4 + data.views * 0.6)} color={color} />
      </div>
      <div style={{ textAlign: 'right' }}>
        {data.trending ? (
          <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.7rem', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
            🔥 {t('trending', 'Trending')}
          </span>
        ) : (
          <span style={{ background: 'rgba(156,163,175,0.15)', color: 'var(--text-3)', fontSize: '0.7rem', padding: '3px 8px', borderRadius: 20 }}>
            {t('stable', 'Stable')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ onClose }) {
  const [activeTab, setActiveTab]   = useState('all');
  const [dateRange, setDateRange]   = useState('30d');
  const [analytics, setAnalytics]   = useState(MOCK_DATA);
  const [loading, setLoading]       = useState(false);
  const [connected, setConnected]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const socketRef = useRef(null);

  const fetchAnalytics = useCallback(async (range = dateRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/social?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data || MOCK_DATA);
        setLastUpdated(new Date());
      }
    } catch {
      // Use mock data on failure
      setAnalytics(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Socket.io real-time updates
  useEffect(() => {
    let sock = null;
    try {
      if (typeof window !== 'undefined' && window.io) {
        sock = window.io(window.location.origin, { transports: ['websocket', 'polling'] });
        socketRef.current = sock;
        sock.on('connect', () => setConnected(true));
        sock.on('disconnect', () => setConnected(false));
        sock.on('analytics:update', (data) => {
          setAnalytics(prev => ({ ...prev, ...data }));
          setLastUpdated(new Date());
        });
      }
    } catch {}
    return () => { if (sock) sock.disconnect(); };
  }, []);

  useEffect(() => { fetchAnalytics(dateRange); }, [dateRange]);

  const visiblePlatforms = activeTab === 'all'
    ? PLATFORMS
    : PLATFORMS.filter(p => p.id === activeTab);

  const aggregates = PLATFORMS.reduce(
    (acc, p) => {
      const d = analytics[p.id] || {};
      acc.totalViews   += d.views      || 0;
      acc.totalReach   += d.reach      || 0;
      acc.totalLikes   += d.likes      || 0;
      acc.avgEngagement = ((acc.avgEngagement * acc.count + (d.engagement || 0)) / (acc.count + 1));
      acc.count++;
      return acc;
    },
    { totalViews: 0, totalReach: 0, totalLikes: 0, avgEngagement: 0, count: 0 }
  );

  const topPlatform = PLATFORMS.reduce((top, p) => {
    const d = analytics[p.id] || {};
    return (d.engagement || 0) > (analytics[top?.id]?.engagement || 0) ? p : top;
  }, PLATFORMS[0]);

  const exportCSV = () => {
    const headers = ['Platform', 'Views', 'Likes', 'Reach', 'Retention%', 'Followers', 'Engagement%', 'Trending'];
    const rows = PLATFORMS.map(p => {
      const d = analytics[p.id] || {};
      return [p.label, d.views, d.likes, d.reach, d.retention, d.followers, d.engagement, d.trending ? 'Yes' : 'No'].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      background: 'var(--bg-1)', color: 'var(--text-1)', minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '0 0 40px',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={22} color="var(--accent, #6366f1)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {t('analytics.title', 'Social Media Analytics')}
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {connected
                ? <><Wifi size={11} color="#10b981" /> {t('live', 'Live')}</>
                : <><WifiOff size={11} color="var(--text-3)" /> {t('offline', 'Offline')}</>}
              &nbsp;· {t('updated', 'Updated')} {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {DATE_RANGES.map(r => (
              <button key={r} onClick={() => setDateRange(r)} style={{
                padding: '6px 14px', background: dateRange === r ? 'var(--accent, #6366f1)' : 'transparent',
                color: dateRange === r ? '#fff' : 'var(--text-2)', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              }}>{r}</button>
            ))}
          </div>
          <button onClick={() => fetchAnalytics(dateRange)} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.82rem',
          }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {t('refresh', 'Refresh')}
          </button>
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: 'var(--accent, #6366f1)', border: 'none', borderRadius: 8,
            color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
          }}>
            <Download size={14} /> {t('export', 'Export CSV')}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Aggregate Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <StatCard label={t('total_views', 'Total Views')} value={formatNumber(aggregates.totalViews)} icon={Eye} color="#6366f1" trend={12.4} />
          <StatCard label={t('total_reach', 'Total Reach')} value={formatNumber(aggregates.totalReach)} icon={Globe} color="#10b981" trend={8.7} />
          <StatCard label={t('total_likes', 'Total Likes')} value={formatNumber(aggregates.totalLikes)} icon={Heart} color="#ef4444" trend={-2.1} />
          <StatCard label={t('avg_engagement', 'Avg Engagement')} value={aggregates.avgEngagement.toFixed(1) + '%'} icon={Activity} color="#f59e0b" trend={3.2} />
          <StatCard label={t('top_platform', 'Top Platform')} value={topPlatform?.icon + ' ' + topPlatform?.label} icon={TrendingUp} color="#ec4899" />
        </div>

        {/* Platform Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <button onClick={() => setActiveTab('all')} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            background: activeTab === 'all' ? 'var(--accent, #6366f1)' : 'var(--bg-2)',
            color: activeTab === 'all' ? '#fff' : 'var(--text-2)',
          }}>{t('all', 'All')}</button>
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setActiveTab(p.id)} style={{
              padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.82rem',
              background: activeTab === p.id ? p.color + '33' : 'var(--bg-2)',
              color: activeTab === p.id ? p.color : 'var(--text-2)',
              fontWeight: activeTab === p.id ? 700 : 400,
            }}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Responsive platform header for wide screens */}
        <div style={{
          display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 80px',
          gap: 16, padding: '0 16px', fontSize: '0.72rem',
          color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span>{t('platform', 'Platform')}</span>
          <span>{t('views', 'Views')}</span>
          <span>{t('engagement', 'Likes / Engagement')}</span>
          <span>{t('reach', 'Reach')}</span>
          <span style={{ textAlign: 'right' }}>{t('status', 'Status')}</span>
        </div>

        {/* Platform Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visiblePlatforms.map(p => (
            <PlatformRow key={p.id} platform={p} data={analytics[p.id] || {}} color={p.color} />
          ))}
        </div>

        {/* Mobile: Cards grid fallback */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 700px) {
            .ad-platform-header { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
