// SocialAnalyticsDashboard - 2026-10-07
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  TrendingUp, TrendingDown, Users, Eye, Heart, Share2,
  Activity, Download, RefreshCw, AlertCircle, Wifi, WifiOff,
  BarChart2, Globe, ChevronDown
} from 'lucide-react';

const PLATFORMS = [
  { id: 'all', label: 'All Platforms', color: '#6366f1' },
  { id: 'tiktok', label: 'TikTok', color: '#010101' },
  { id: 'instagram', label: 'Instagram', color: '#e1306c' },
  { id: 'facebook', label: 'Facebook', color: '#1877f2' },
  { id: 'twitch', label: 'Twitch', color: '#9146ff' },
  { id: 'discord', label: 'Discord', color: '#5865f2' },
  { id: 'lemon8', label: 'Lemon8', color: '#ffcf00' },
  { id: 'reddit', label: 'Reddit', color: '#ff4500' },
  { id: 'redgifs', label: 'RedGIFs', color: '#e53935' },
];

const TIME_RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
];

const generateMockTimeSeries = (points, base, variance) =>
  Array.from({ length: points }, (_, i) => ({
    t: i,
    v: Math.max(0, base + (Math.random() - 0.5) * variance * 2),
  }));

const generateMockPlatformData = (platformId) => {
  const seeds = {
    tiktok:    { views: 2400000, likes: 180000, reach: 3100000, retention: 68, followers: 92000, engagement: 7.5 },
    instagram: { views: 980000,  likes: 74000,  reach: 1200000, retention: 54, followers: 41000, engagement: 7.6 },
    facebook:  { views: 620000,  likes: 28000,  reach: 890000,  retention: 41, followers: 73000, engagement: 4.5 },
    twitch:    { views: 310000,  likes: 22000,  reach: 410000,  retention: 78, followers: 18500, engagement: 7.1 },
    discord:   { views: 85000,   likes: 9200,   reach: 120000,  retention: 83, followers: 14200, engagement: 10.8 },
    lemon8:    { views: 440000,  likes: 38000,  reach: 590000,  retention: 61, followers: 22000, engagement: 8.6 },
    reddit:    { views: 1100000, likes: 67000,  reach: 1450000, retention: 49, followers: 35000, engagement: 6.1 },
    redgifs:   { views: 890000,  likes: 51000,  reach: 1020000, retention: 55, followers: 12000, engagement: 5.7 },
  };

  if (platformId === 'all') {
    return Object.values(seeds).reduce(
      (acc, p) => ({
        views:       acc.views       + p.views,
        likes:       acc.likes       + p.likes,
        reach:       acc.reach       + p.reach,
        retention:   acc.retention   + p.retention / Object.keys(seeds).length,
        followers:   acc.followers   + p.followers,
        engagement:  acc.engagement  + p.engagement / Object.keys(seeds).length,
        viewsSeries: generateMockTimeSeries(24, 280000, 60000),
        likesSeries: generateMockTimeSeries(24, 22000, 5000),
      }),
      { views: 0, likes: 0, reach: 0, retention: 0, followers: 0, engagement: 0, viewsSeries: [], likesSeries: [] }
    );
  }

  const s = seeds[platformId] || seeds.tiktok;
  return {
    ...s,
    viewsSeries: generateMockTimeSeries(24, s.views / 24, s.views / 48),
    likesSeries: generateMockTimeSeries(24, s.likes / 24, s.likes / 48),
  };
};

const formatNumber = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const SparklineSVG = ({ series, color, width = 120, height = 40 }) => {
  if (!series || series.length < 2) return null;
  const values = series.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${pad},${pad + h} ${points} ${pad + w},${pad + h}`;

  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

SparklineSVG.propTypes = {
  series: PropTypes.arrayOf(PropTypes.shape({ t: PropTypes.number, v: PropTypes.number })).isRequired,
  color: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
};

const BarChartSVG = ({ data, color, width = 280, height = 100 }) => {
  if (!data || data.length === 0) return null;
  const values = data.map((d) => d.v);
  const max = Math.max(...values) || 1;
  const barW = (width - 8) / data.length - 2;
  const pad = 4;

  return (
    <svg width={width} height={height} aria-hidden="true">
      {data.map((d, i) => {
        const bh = Math.max(1, ((d.v / max) * (height - pad * 2)));
        const x = pad + i * (barW + 2);
        const y = height - pad - bh;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={bh}
            rx="1"
            fill={color}
            opacity={0.7 + 0.3 * (d.v / max)}
          />
        );
      })}
    </svg>
  );
};

BarChartSVG.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({ t: PropTypes.number, v: PropTypes.number })).isRequired,
  color: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
};

const MultiBarChartSVG = ({ platforms, metric, width = 560, height = 160 }) => {
  const values = platforms.map((p) => ({ label: p.label, color: p.color, value: p.data?.[metric] || 0 }));
  const max = Math.max(...values.map((v) => v.value)) || 1;
  const barW = (width - 32) / values.length - 6;
  const pad = 8;

  return (
    <svg width={width} height={height} aria-hidden="true" style={{ width: '100%' }}>
      {values.map((v, i) => {
        const bh = Math.max(1, ((v.value / max) * (height - pad * 2 - 20)));
        const x = pad + i * (barW + 6);
        const y = height - pad - 20 - bh;
        return (
          <g key={v.label}>
            <rect x={x} y={y} width={barW} height={bh} rx="2" fill={v.color} opacity="0.85" />
            <text
              x={x + barW / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity="0.6"
            >
              {v.label.slice(0, 5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

MultiBarChartSVG.propTypes = {
  platforms: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      color: PropTypes.string,
      data: PropTypes.object,
    })
  ).isRequired,
  metric: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
};

const MetricCard = ({ label, value, delta, icon: Icon, color, series, loading }) => {
  const isPositive = delta >= 0;
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 transition-all"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-60 uppercase tracking-wide">{label}</span>
        <span
          className="flex items-center justify-center rounded-lg w-8 h-8"
          style={{ background: `${color}22` }}
        >
          <Icon size={15} color={color} />
        </span>
      </div>
      {loading ? (
        <div className="h-7 rounded animate-pulse" style={{ background: 'var(--skeleton)' }} />
      ) : (
        <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {value}
        </span>
      )}
      <div className="flex items-center justify-between">
        <span
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: isPositive ? '#22c55e' : '#ef4444' }}
        >
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(delta).toFixed(1)}%
        </span>
        {series && <SparklineSVG series={series} color={color} />}
      </div>
    </div>
  );
};

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  delta: PropTypes.number.isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
  series: PropTypes.array,
  loading: PropTypes.bool,
};

MetricCard.defaultProps = {
  loading: false,
};

const PlatformBadge = ({ platform, active, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
    style={{
      background: active ? platform.color : 'var(--tab-bg)',
      color: active ? '#fff' : 'var(--text-secondary)',
      border: `1px solid ${active ? platform.color : 'var(--card-border)'}`,
      opacity: active ? 1 : 0.75,
    }}
  >
    {platform.label}
  </button>
);

PlatformBadge.propTypes = {
  platform: PropTypes.shape({ id: PropTypes.string, label: PropTypes.string, color: PropTypes.string }).isRequired,
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

const LiveIndicator = ({ connected }) => (
  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: connected ? '#22c55e' : '#ef4444' }}>
    <span
      className="w-2 h-2 rounded-full"
      style={{
        background: connected ? '#22c55e' : '#ef4444',
        boxShadow: connected ? '0 0 0 0 #22c55e88' : 'none',
        animation: connected ? 'pulse-ring 1.5s ease-out infinite' : 'none',
      }}
    />
    {connected ? 'Live' : 'Offline'}
    {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
  </span>
);

LiveIndicator.propTypes = {
  connected: PropTypes.bool.isRequired,
};

const ErrorBanner = ({ message, onDismiss }) => (
  <div
    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm"
    style={{ background: '#ef444422', border: '1px solid #ef444466', color: '#ef4444' }}
  >
    <AlertCircle size={16} />
    <span className="flex-1">{message}</span>
    <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
  </div>
);

ErrorBanner.propTypes = {
  message: PropTypes.string.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

const SocialAnalyticsDashboard = () => {
  const [activePlatform, setActivePlatform] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [platformData, setPlatformData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [comparisonMetric, setComparisonMetric] = useState('views');
  const [theme, setTheme] = useState('dark');
  const refreshTimer = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const t = root.getAttribute('data-theme') || 'dark';
      setTheme(t);
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    setTheme(root.getAttribute('data-theme') || 'dark');
    return () => observer.disconnect();
  }, []);

  const isDark = theme !== 'light';

  const cssVars = {
    '--card-bg':        isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    '--card-border':    isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    '--tab-bg':         isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    '--text-primary':   isDark ? '#f1f5f9' : '#0f172a',
    '--text-secondary': isDark ? '#94a3b8' : '#64748b',
    '--skeleton':       isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    '--dash-bg':        isDark ? '#0f172a' : '#f8fafc',
    '--header-bg':      isDark ? 'rgba(15,23,42,0.95)' : 'rgba(248,250,252,0.95)',
  };

  const fetchPlatformData = useCallback(async (platform, range) => {
    const apiBase = typeof import.meta !== 'undefined'
      ? import.meta.env?.VITE_ANALYTICS_API_URL
      : undefined;

    if (apiBase) {
      try {
        const res = await fetch(
          `${apiBase}/analytics?platform=${platform}&range=${range}`,
          {
            headers: {
              Authorization: `Bearer ${import.meta.env?.VITE_ANALYTICS_API_KEY || ''}`,
            },
          }
        );
        if (!res.ok) throw new Error(`API ${res.status}`);
        return await res.json();
      } catch {
        return generateMockPlatformData(platform);
      }
    }
    return generateMockPlatformData(platform);
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        PLATFORMS.map(async (p) => {
          const data = await fetchPlatformData(p.id, timeRange);
          return [p.id, data];
        })
      );
      if (mountedRef.current) {
        setPlatformData(Object.fromEntries(results));
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) setError(`Failed to load analytics: ${err.message}`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchPlatformData, timeRange]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const socket = window._socket;
    if (!socket) return;

    const onConnect = () => setWsConnected(true);
    const onDisconnect = () => setWsConnected(false);
    const onAnalyticsUpdate = (payload) => {
      if (!mountedRef.current) return;
      setPlatformData((prev) => {
        const updated = { ...prev };
        Object.entries(payload).forEach(([pid, data]) => {
          if (updated[pid]) {
            updated[pid] = { ...updated[pid], ...data };
          }
        });
        return updated;
      });
      setLastUpdated(new Date());
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('analytics:update', onAnalyticsUpdate);
    setWsConnected(socket.connected || false);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('analytics:update', onAnalyticsUpdate);
    };
  }, []);

  useEffect(() => {
    clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(() => {
      if (!wsConnected) loadAllData();
    }, 60_000);
    return () => clearInterval(refreshTimer.current);
  }, [wsConnected, loadAllData]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const currentData = platformData[activePlatform];
  const activePlatformMeta = PLATFORMS.find((p) => p.id === activePlatform);

  const metrics = currentData
    ? [
        { label: 'Views',      value: formatNumber(currentData.views),      delta: 12.4,  icon: Eye,      color: '#6366f1', series: currentData.viewsSeries },
        { label: 'Likes',      value: formatNumber(currentData.likes),      delta: 8.7,   icon: Heart,    color: '#ec4899', series: currentData.likesSeries },
        { label: 'Reach',      value: formatNumber(currentData.reach),      delta: -2.1,  icon: Globe,    color: '#0ea5e9', series: null },
        { label: 'Retention',  value: `${currentData.retention?.toFixed(1)}%`, delta: 1.3, icon: Activity, color: '#f59e0b', series: null },
        { label: 'Followers',  value: formatNumber(currentData.followers),  delta: 5.9,   icon: Users,    color: '#22c55e', series: null },
        { label: 'Engagement', value: `${currentData.engagement?.toFixed(2)}%`, delta: 0.4, icon: Share2,  color: '#a855f7', series: null },
      ]
    : [];

  const comparisonPlatforms = PLATFORMS.filter((p) => p.id !== 'all').map((p) => ({
    ...p,
    data: platformData[p.id],
  }));

  const handleExport = () => {
    try {
      const rows = [
        ['Platform', 'Views', 'Likes', 'Reach', 'Retention %', 'Followers', 'Engagement %'],
        ...PLATFORMS.filter((p) => p.id !== 'all').map((p) => {
          const d = platformData[p.id];
          if (!d) return [p.label, '', '', '', '', '', ''];
          return [p.label, d.views, d.likes, d.reach, d.retention?.toFixed(1), d.followers, d.engagement?.toFixed(2)];
        }),
      ];
      const csv = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-analytics-${timeRange}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  };

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 #22c55e88; }
          70%  { box-shadow: 0 0 0 6px #22c55e00; }
          100% { box-shadow: 0 0 0 0 #22c55e00; }
        }
        @keyframes shimmer {
          0%   { opacity: 0.4; }
          50%  { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        .sad-skeleton { animation: shimmer 1.4s ease-in-out infinite; }
      `}</style>
      <div
        className="min-h-screen p-4 md:p-6"
        style={{ ...cssVars, background: 'var(--dash-bg)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-6">

          {/* Header */}
          <div
            className="sticky top-0 z-10 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 backdrop-blur"
            style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <BarChart2 size={20} color="#6366f1" />
              <span className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)' }}>
                Social Analytics
              </span>
              <LiveIndicator connected={wsConnected} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Time Range */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setTimeRange(r.id)}
                    className="px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: timeRange === r.id ? '#6366f1' : 'transparent',
                      color: timeRange === r.id ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'var(--tab-bg)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
              >
                <Download size={13} />
                Export
              </button>

              <button
                onClick={loadAllData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'var(--tab-bg)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)', opacity: loading ? 0.5 : 1 }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {lastUpdated && (
              <span className="text-xs w-full md:w-auto" style={{ color: 'var(--text-secondary)' }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Error */}
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          {/* Platform Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {PLATFORMS.map((p) => (
              <PlatformBadge
                key={p.id}
                platform={p}
                active={activePlatform === p.id}
                onClick={() => setActivePlatform(p.id)}
              />
            ))}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 h-28 sad-skeleton"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                  />
                ))
              : metrics.map((m) => (
                  <MetricCard key={m.label} {...m} loading={loading} />
                ))}
          </div>

          {/* Main chart + bar chart row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Views over time */}
            <div
              className="xl:col-span-2 rounded-xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Views Over Time
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {activePlatformMeta?.label} · {timeRange}
                </span>
              </div>
              {loading ? (
                <div className="h-24 rounded sad-skeleton" style={{ background: 'var(--skeleton)' }} />
              ) : currentData?.viewsSeries ? (
                <BarChartSVG
                  data={currentData.viewsSeries}
                  color={activePlatformMeta?.color || '#6366f1'}
                  width={560}
                  height={100}
                />
              ) : (
                <div className="h-24 flex items-center justify-center text-sm opacity-40">No data</div>
              )}
            </div>

            {/* Retention gauge */}
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Avg Retention
              </span>
              {loading ? (
                <div className="h-24 rounded sad-skeleton" style={{ background: 'var(--skeleton)' }} />
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 gap-3">
                  <RetentionGauge value={currentData?.retention ?? 0} color={activePlatformMeta?.color || '#6366f1'} />
                  <span className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                    Average viewer retention rate
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Multi-platform comparison */}
          <div
            className="rounded-xl p-4 flex flex-col gap-4"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Platform Comparison
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Metric:</span>
                <select
                  value={comparisonMetric}
                  onChange={(e) => setComparisonMetric(e.target.value)}
                  className="text-xs rounded-lg px-2 py-1.5 outline-none"
                  style={{
                    background: 'var(--tab-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <option value="views">Views</option>
                  <option value="likes">Likes</option>
                  <option value="reach">Reach</option>
                  <option value="followers">Followers</option>
                  <option value="engagement">Engagement %</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="h-40 rounded sad-skeleton" style={{ background: 'var(--skeleton)' }} />
            ) : (
              <MultiBarChartSVG
                platforms={comparisonPlatforms}
                metric={comparisonMetric}
                height={140}
              />
            )}

            <div className="flex flex-wrap gap-3">
              {comparisonPlatforms.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {p.label}
                    {p.data && (
                      <span className="ml-1 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {comparisonMetric === 'engagement'
                          ? `${p.data.engagement?.toFixed(2)}%`
                          : formatNumber(p.data[comparisonMetric] || 0)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

const RetentionGauge = ({ value, color }) => {
  const pct = Math.min(100, Math.max(0, value));
  const r = 44;
  const cx = 60;
  const cy = 60;
  const startAngle = -220;
  const sweepAngle = 260;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPath = (startDeg, endDeg, radius) => {
    const s = toRad(startDeg);
    const e = toRad(endDeg);
    const x1 = cx + radius * Math.cos(s);
    const y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e);
    const y2 = cy + radius * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const fillEnd = startAngle + sweepAngle * (pct / 100);

  return (
    <svg width="120" height="90" aria-label={`Retention ${pct.toFixed(1)}%`}>
      <path d={arcPath(startAngle, startAngle + sweepAngle, r)} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth="8" strokeLinecap="round" />
      <path d={arcPath(startAngle, fillEnd, r)} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>
        {pct.toFixed(1)}%
      </text>
    </svg>
  );
};

RetentionGauge.propTypes = {
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

export default SocialAnalyticsDashboard;
