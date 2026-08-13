// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File: src/components/AnalyticsDashboard.jsx
// Created: 2026-08-13
// Analytics Dashboard - Real-time social media metrics

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Activity,
  Users,
  Heart,
  Eye,
  TrendingUp,
  TrendingDown,
  WifiOff,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart2,
  Globe,
  Radio,
} from 'lucide-react';
import { io as socketIo } from 'socket.io-client';

// ---------------------------------------------------------------------------
// i18n — minimal key/value store; replace with i18next or react-intl as needed
// ---------------------------------------------------------------------------
const TRANSLATIONS = {
  en: {
    'dashboard.title': 'Analytics Dashboard',
    'dashboard.subtitle': 'Real-time social media metrics',
    'filter.label': 'Date Range',
    'filter.7d': 'Last 7 days',
    'filter.30d': 'Last 30 days',
    'filter.90d': 'Last 90 days',
    'filter.custom': 'Custom',
    'filter.from': 'From',
    'filter.to': 'To',
    'metric.likes': 'Likes',
    'metric.reach': 'Reach',
    'metric.views': 'Views',
    'metric.retention': 'Retention Rate',
    'metric.followers': 'Follower Growth',
    'metric.engagement': 'Engagement Rate',
    'platform.status.connected': 'Connected',
    'platform.status.disconnected': 'Disconnected',
    'platform.status.reconnecting': 'Reconnecting…',
    'platform.status.error': 'Error',
    'export.button': 'Export CSV',
    'export.success': 'CSV exported',
    'loading.text': 'Loading metrics…',
    'error.fetch': 'Failed to load data. Retrying…',
    'error.websocket': 'Live feed interrupted. Attempting reconnect…',
    'live.label': 'LIVE',
    'chart.nodata': 'No data for this period',
    'section.overview': 'Overview',
    'section.platforms': 'Platforms',
    'section.trends': 'Trends',
  },
};

let _locale = 'en';
const t = (key) => TRANSLATIONS[_locale]?.[key] ?? key;

// ---------------------------------------------------------------------------
// Platform configuration
// ---------------------------------------------------------------------------
const PLATFORMS = [
  {
    id: 'tiktok',
    label: 'TikTok',
    color: '#69C9D0',
    accent: '#EE1D52',
    icon: '♪',
    endpoint: '/api/analytics/tiktok',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    accent: '#833AB4',
    icon: '◈',
    endpoint: '/api/analytics/instagram',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    accent: '#0A5FD6',
    icon: '⬡',
    endpoint: '/api/analytics/facebook',
  },
  {
    id: 'twitch',
    label: 'Twitch',
    color: '#9146FF',
    accent: '#7B2FBE',
    icon: '▶',
    endpoint: '/api/analytics/twitch',
  },
  {
    id: 'discord',
    label: 'Discord',
    color: '#5865F2',
    accent: '#4752C4',
    icon: '◉',
    endpoint: '/api/analytics/discord',
  },
  {
    id: 'lemon8',
    label: 'Lemon8',
    color: '#F7C744',
    accent: '#D4A020',
    icon: '◍',
    endpoint: '/api/analytics/lemon8',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    color: '#FF4500',
    accent: '#CC3700',
    icon: '◎',
    endpoint: '/api/analytics/reddit',
  },
  {
    id: 'redgifs',
    label: 'RedGIFs',
    color: '#E63946',
    accent: '#B51F2B',
    icon: '▣',
    endpoint: '/api/analytics/redgifs',
  },
];

const DATE_RANGES = [
  { key: '7d', label: t('filter.7d'), days: 7 },
  { key: '30d', label: t('filter.30d'), days: 30 },
  { key: '90d', label: t('filter.90d'), days: 90 },
  { key: 'custom', label: t('filter.custom'), days: null },
];

const METRIC_KEYS = [
  'likes',
  'reach',
  'views',
  'retention',
  'followers',
  'engagement',
];

const WS_RECONNECT_DELAY_MS = 3000;
const WS_MAX_RETRIES = 8;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
const formatNumber = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const formatPct = (n) =>
  n == null || isNaN(n) ? '—' : `${Number(n).toFixed(2)}%`;

const isoDate = (d) => d.toISOString().split('T')[0];

const subtractDays = (d, days) => {
  const r = new Date(d);
  r.setDate(r.getDate() - days);
  return r;
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const exportCsv = (rows, filename = 'analytics.csv') => {
  if (!rows.length) return;
  const header = Object.keys(rows[0]).join(',');
  const body = rows
    .map((r) =>
      Object.values(r)
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// SVG Sparkline (mini line chart)
// ---------------------------------------------------------------------------
const LineSparkline = ({ data = [], color = '#06B6D4', width = 120, height = 36 }) => {
  if (!data.length) return <div style={{ width, height }} />;
  const values = data.map((d) => (typeof d === 'object' ? d.value : d));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;
  const W = width - pad * 2;
  const H = height - pad * 2;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1 || 1)) * W;
    const y = pad + H - ((v - min) / range) * H;
    return `${x},${y}`;
  });

  const areaBottom = `${pad + W},${pad + H} ${pad},${pad + H}`;
  const areaPath = `M ${pts.join(' L ')} L ${areaBottom} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#sg-${color.replace('#', '')})`}
        stroke="none"
      />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* endpoint dot */}
      {pts.length > 0 && (() => {
        const last = pts[pts.length - 1].split(',');
        return (
          <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
        );
      })()}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// SVG Bar Chart
// ---------------------------------------------------------------------------
const BarChart = ({
  data = [],
  color = '#06B6D4',
  labelKey = 'label',
  valueKey = 'value',
  height = 160,
}) => {
  const values = data.map((d) => d[valueKey] ?? 0);
  const max = Math.max(...values, 1);
  const barCount = data.length;
  const barW = 28;
  const gap = 10;
  const padL = 46;
  const padB = 28;
  const padT = 12;
  const padR = 12;
  const innerH = height - padT - padB;
  const totalW = padL + barCount * (barW + gap) - gap + padR;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: padT + innerH - frac * innerH,
    label: formatNumber(Math.round(frac * max)),
  }));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        width={totalW}
        height={height}
        aria-label="Bar chart"
        style={{ display: 'block', minWidth: '100%' }}
      >
        {/* Grid */}
        {gridLines.map((g) => (
          <g key={g.y}>
            <line
              x1={padL}
              y1={g.y}
              x2={totalW - padR}
              y2={g.y}
              stroke="var(--chart-grid)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <text
              x={padL - 6}
              y={g.y + 4}
              textAnchor="end"
              fill="var(--text-muted)"
              fontSize="9"
              fontVariantNumeric="tabular-nums"
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const val = d[valueKey] ?? 0;
          const barH = clamp((val / max) * innerH, 1, innerH);
          const x = padL + i * (barW + gap);
          const y = padT + innerH - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="3"
                fill={color}
                opacity="0.85"
              />
              <text
                x={x + barW / 2}
                y={height - padB + 14}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="9"
              >
                {d[labelKey]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SVG Multi-line trend chart
// ---------------------------------------------------------------------------
const TrendChart = ({ series = [], height = 200 }) => {
  const allValues = series.flatMap((s) => s.data.map((d) => d.value ?? d));
  if (!allValues.length) {
    return (
      <div className="chart-empty" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {t('chart.nodata')}
      </div>
    );
  }
  const min = Math.min(...allValues);
  const max = Math.max(...allValues, 1);
  const range = max - min || 1;
  const padL = 48;
  const padB = 24;
  const padT = 12;
  const padR = 12;
  const W = 600;
  const innerH = height - padT - padB;
  const innerW = W - padL - padR;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: padT + innerH - frac * innerH,
    label: formatNumber(Math.round(frac * (max - min) + min)),
  }));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Trend chart"
        style={{ display: 'block' }}
      >
        {/* Horizontal grid */}
        {gridLines.map((g) => (
          <g key={g.y}>
            <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="var(--chart-grid)" strokeWidth="1" strokeDasharray="4,4" />
            <text x={padL - 6} y={g.y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontVariantNumeric="tabular-nums">{g.label}</text>
          </g>
        ))}

        {/* Series lines */}
        {series.map((s) => {
          const vals = s.data.map((d) => (typeof d === 'object' ? d.value : d));
          const pts = vals.map((v, i) => {
            const x = padL + (i / (vals.length - 1 || 1)) * innerW;
            const y = padT + innerH - ((v - min) / range) * innerH;
            return [x, y];
          });
          const polyPts = pts.map((p) => p.join(',')).join(' ');
          const areaD = `M ${polyPts.replace(/,/g, ',')} L ${padL + innerW},${padT + innerH} L ${padL},${padT + innerH} Z`;
          const gradId = `tg-${s.color.replace('#', '')}`;
          return (
            <g key={s.id}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
              <polyline points={polyPts} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* X-axis labels — first, middle, last */}
        {series[0]?.labels?.map((label, i, arr) => {
          if (i !== 0 && i !== Math.floor(arr.length / 2) && i !== arr.length - 1) return null;
          const x = padL + (i / (arr.length - 1 || 1)) * innerW;
          return (
            <text key={i} x={x} y={height - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{label}</text>
          );
        })}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Connection status badge
// ---------------------------------------------------------------------------
const ConnectionBadge = ({ status }) => {
  const config = {
    connected: { label: t('platform.status.connected'), cls: 'badge-connected', Icon: CheckCircle2 },
    disconnected: { label: t('platform.status.disconnected'), cls: 'badge-disconnected', Icon: WifiOff },
    reconnecting: { label: t('platform.status.reconnecting'), cls: 'badge-reconnecting', Icon: RefreshCw },
    error: { label: t('platform.status.error'), cls: 'badge-error', Icon: AlertCircle },
  };
  const { label, cls, Icon } = config[status] ?? config.disconnected;
  return (
    <span className={`conn-badge ${cls}`}>
      <Icon size={10} />
      {label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Metric tile
// ---------------------------------------------------------------------------
const MetricTile = ({ metricKey, value, delta, sparkData, color, loading }) => {
  const labels = {
    likes: t('metric.likes'),
    reach: t('metric.reach'),
    views: t('metric.views'),
    retention: t('metric.retention'),
    followers: t('metric.followers'),
    engagement: t('metric.engagement'),
  };
  const Icons = {
    likes: Heart,
    reach: Globe,
    views: Eye,
    retention: Activity,
    followers: Users,
    engagement: Zap,
  };
  const isPct = metricKey === 'retention' || metricKey === 'engagement';
  const displayVal = loading ? '—' : isPct ? formatPct(value) : formatNumber(value);
  const deltaPositive = delta >= 0;
  const Icon = Icons[metricKey] ?? Activity;

  return (
    <div className="metric-tile">
      <div className="metric-tile-header">
        <Icon size={14} color={color} />
        <span className="metric-label">{labels[metricKey] ?? metricKey}</span>
      </div>
      <div className="metric-value" style={{ '--accent': color }}>
        {loading ? <span className="skeleton skeleton-val" /> : displayVal}
      </div>
      <div className="metric-footer">
        <span className={`metric-delta ${deltaPositive ? 'delta-up' : 'delta-down'}`}>
          {loading ? null : (
            <>
              {deltaPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(delta ?? 0).toFixed(1)}%
            </>
          )}
        </span>
        <LineSparkline data={sparkData ?? []} color={color} width={80} height={28} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Platform metrics row
// ---------------------------------------------------------------------------
const PlatformRow = ({ platform, metrics, connectionStatus, loading, expanded, onToggle }) => {
  const totalEngagement = metrics?.engagement ?? 0;
  return (
    <div className="platform-row">
      <button
        className="platform-row-header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="platform-icon" style={{ background: platform.color + '22', color: platform.color }}>
          {platform.icon}
        </span>
        <span className="platform-name">{platform.label}</span>
        <ConnectionBadge status={connectionStatus} />
        <span className="platform-eng">
          {loading ? <span className="skeleton skeleton-sm" /> : `${formatPct(totalEngagement)} eng.`}
        </span>
        {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>

      {expanded && (
        <div className="platform-metrics-grid">
          {METRIC_KEYS.map((mk) => (
            <MetricTile
              key={mk}
              metricKey={mk}
              value={metrics?.[mk] ?? 0}
              delta={metrics?.[`${mk}Delta`] ?? 0}
              sparkData={metrics?.[`${mk}Spark`] ?? []}
              color={platform.color}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Date range filter
// ---------------------------------------------------------------------------
const DateRangeFilter = ({ active, onChange, customFrom, customTo, onCustomChange }) => (
  <div className="filter-bar">
    <span className="filter-bar-label">
      <Calendar size={13} />
      {t('filter.label')}
    </span>
    <div className="filter-chips">
      {DATE_RANGES.map((r) => (
        <button
          key={r.key}
          className={`filter-chip ${active === r.key ? 'active' : ''}`}
          onClick={() => onChange(r.key)}
        >
          {r.label}
        </button>
      ))}
    </div>
    {active === 'custom' && (
      <div className="custom-range">
        <label>
          {t('filter.from')}
          <input
            type="date"
            className="date-input"
            value={customFrom}
            max={customTo}
            onChange={(e) => onCustomChange('from', e.target.value)}
          />
        </label>
        <label>
          {t('filter.to')}
          <input
            type="date"
            className="date-input"
            value={customTo}
            min={customFrom}
            onChange={(e) => onCustomChange('to', e.target.value)}
          />
        </label>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Custom hooks
// ---------------------------------------------------------------------------

/**
 * useWebSocket — connects to a WebSocket endpoint, manages reconnection,
 * and exposes received messages + connection state.
 */
const useWebSocket = (url) => {
  const [status, setStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!url || !mountedRef.current) return;

    try {
      // Use socket.io-client for the managed transport layer.
      // reconnection: false because we own the retry logic (scheduleReconnect).
      const socket = socketIo(url, {
        transports: ['websocket'],
        reconnection: false,
        path: '/socket.io',
      });

      socket.on('connect', () => {
        if (!mountedRef.current) return;
        setStatus('connected');
        retriesRef.current = 0;
      });

      // Server emits { platform, likes, reach, … } on the 'analytics' event
      socket.on('analytics', (data) => {
        if (!mountedRef.current) return;
        setLastMessage(data);
      });

      socket.on('disconnect', scheduleReconnect);
      socket.on('connect_error', scheduleReconnect);

      // Expose a uniform teardown handle
      wsRef.current = { close: () => socket.disconnect() };
    } catch {
      scheduleReconnect();
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleReconnect() {
    if (!mountedRef.current) return;
    if (retriesRef.current >= WS_MAX_RETRIES) {
      setStatus('error');
      return;
    }
    setStatus('reconnecting');
    retriesRef.current += 1;
    reconnectTimerRef.current = setTimeout(connect, WS_RECONNECT_DELAY_MS);
  }

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close?.();
    };
  }, [connect]);

  return { status, lastMessage };
};

/**
 * useAnalytics — fetches aggregate metrics for a platform + date range,
 * merges in real-time WS updates, and manages loading/error state.
 */
const useAnalytics = ({ platformId, endpoint, dateFrom, dateTo }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const qs = new URLSearchParams({ from: dateFrom, to: dateTo }).toString();
      const res = await fetch(`${endpoint}?${qs}`, {
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message ?? 'Unknown error');
        // Provide empty scaffold so UI doesn't break entirely
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, dateFrom, dateTo]);

  useEffect(() => {
    fetch_();
    return () => abortRef.current?.abort();
  }, [fetch_]);

  const merge = useCallback((wsPayload) => {
    if (!wsPayload || wsPayload.platform !== platformId) return;
    setData((prev) => {
      if (!prev) return prev;
      // Merge live values; append to sparklines (keep last 20 points)
      const next = { ...prev };
      METRIC_KEYS.forEach((mk) => {
        if (wsPayload[mk] != null) {
          const prev_spark = prev[`${mk}Spark`] ?? [];
          next[mk] = wsPayload[mk];
          next[`${mk}Spark`] = [...prev_spark.slice(-19), { value: wsPayload[mk] }];
        }
      });
      return next;
    });
  }, [platformId]);

  return { data, loading, error, refetch: fetch_, merge };
};

// ---------------------------------------------------------------------------
// Main dashboard component
// ---------------------------------------------------------------------------
const AnalyticsDashboard = ({ locale = 'en', wsUrl = '/ws/analytics' }) => {
  // Locale injection
  _locale = locale;

  const [dateRange, setDateRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState(isoDate(subtractDays(new Date(), 30)));
  const [customTo, setCustomTo] = useState(isoDate(new Date()));
  const [expandedPlatforms, setExpandedPlatforms] = useState(
    () => new Set(PLATFORMS.slice(0, 3).map((p) => p.id))
  );
  const [exportMsg, setExportMsg] = useState('');

  // Derive date range bounds
  const { dateFrom, dateTo } = useMemo(() => {
    if (dateRange === 'custom') return { dateFrom: customFrom, dateTo: customTo };
    const days = DATE_RANGES.find((r) => r.key === dateRange)?.days ?? 30;
    return {
      dateFrom: isoDate(subtractDays(new Date(), days)),
      dateTo: isoDate(new Date()),
    };
  }, [dateRange, customFrom, customTo]);

  // WebSocket for live updates
  const { status: wsStatus, lastMessage } = useWebSocket(wsUrl);

  // Per-platform analytics hooks (rendered via an outer component that maps)
  // We manage platform state here centrally.
  const platformStates = usePlatformStates({ dateFrom, dateTo, wsStatus, lastMessage });

  // Toggle platform expansion
  const togglePlatform = useCallback((id) => {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Build summary totals
  const summary = useMemo(() => {
    const totals = { likes: 0, reach: 0, views: 0, followers: 0 };
    PLATFORMS.forEach((p) => {
      const d = platformStates[p.id]?.data;
      if (!d) return;
      totals.likes += d.likes ?? 0;
      totals.reach += d.reach ?? 0;
      totals.views += d.views ?? 0;
      totals.followers += d.followers ?? 0;
    });
    return totals;
  }, [platformStates]);

  // Trend series for global chart
  const trendSeries = useMemo(() => {
    return PLATFORMS.slice(0, 4).map((p) => {
      const spark = platformStates[p.id]?.data?.viewsSpark ?? [];
      return {
        id: p.id,
        label: p.label,
        color: p.color,
        data: spark.length ? spark : Array.from({ length: 10 }, (_, i) => ({ value: 0, i })),
        labels: spark.map((_, i) => `${i + 1}`),
      };
    });
  }, [platformStates]);

  // Per-platform bar data (engagement)
  const engagementBarData = useMemo(() =>
    PLATFORMS.map((p) => ({
      label: p.label.slice(0, 2),
      value: platformStates[p.id]?.data?.engagement ?? 0,
      color: p.color,
    })),
    [platformStates]
  );

  // CSV export
  const handleExport = useCallback(() => {
    const rows = PLATFORMS.map((p) => {
      const d = platformStates[p.id]?.data ?? {};
      return {
        platform: p.label,
        from: dateFrom,
        to: dateTo,
        likes: d.likes ?? '',
        reach: d.reach ?? '',
        views: d.views ?? '',
        retention_pct: d.retention ?? '',
        follower_growth: d.followers ?? '',
        engagement_pct: d.engagement ?? '',
      };
    });
    exportCsv(rows, `analytics_${dateFrom}_${dateTo}.csv`);
    setExportMsg(t('export.success'));
    setTimeout(() => setExportMsg(''), 3000);
  }, [platformStates, dateFrom, dateTo]);

  const anyLoading = PLATFORMS.some((p) => platformStates[p.id]?.loading);
  const anyError = PLATFORMS.some((p) => platformStates[p.id]?.error);

  return (
    <>
      <style>{STYLES}</style>
      <div className="ad-root">
        {/* Header */}
        <header className="ad-header">
          <div className="ad-header-left">
            <BarChart2 size={22} color="var(--accent)" />
            <div>
              <h1 className="ad-title">{t('dashboard.title')}</h1>
              <p className="ad-subtitle">{t('dashboard.subtitle')}</p>
            </div>
          </div>
          <div className="ad-header-right">
            {wsStatus === 'connected' && (
              <span className="live-pill">
                <Radio size={10} />
                {t('live.label')}
              </span>
            )}
            {wsStatus === 'reconnecting' && (
              <span className="ws-warn">
                <RefreshCw size={12} className="spin" />
                {t('error.websocket')}
              </span>
            )}
            <button className="btn-export" onClick={handleExport}>
              <Download size={14} />
              {exportMsg || t('export.button')}
            </button>
          </div>
        </header>

        {/* Date filter */}
        <DateRangeFilter
          active={dateRange}
          onChange={setDateRange}
          customFrom={customFrom}
          customTo={customTo}
          onCustomChange={(field, val) => {
            if (field === 'from') setCustomFrom(val);
            else setCustomTo(val);
          }}
        />

        {/* Error banner */}
        {anyError && (
          <div className="error-banner" role="alert">
            <AlertCircle size={15} />
            {t('error.fetch')}
          </div>
        )}

        {/* Summary tiles */}
        <section className="ad-section">
          <h2 className="section-title">{t('section.overview')}</h2>
          <div className="summary-grid">
            {[
              { key: 'likes', Icon: Heart, label: t('metric.likes'), val: summary.likes },
              { key: 'reach', Icon: Globe, label: t('metric.reach'), val: summary.reach },
              { key: 'views', Icon: Eye, label: t('metric.views'), val: summary.views },
              { key: 'followers', Icon: Users, label: t('metric.followers'), val: summary.followers },
            ].map(({ key, Icon, label, val }) => (
              <div className="summary-tile" key={key}>
                <Icon size={18} color="var(--accent)" />
                <div className="summary-tile-label">{label}</div>
                <div className="summary-tile-val">
                  {anyLoading ? <span className="skeleton skeleton-val" /> : formatNumber(val)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trend chart */}
        <section className="ad-section">
          <h2 className="section-title">{t('section.trends')}</h2>
          <div className="chart-card">
            <div className="chart-legend">
              {trendSeries.map((s) => (
                <span key={s.id} className="legend-item">
                  <span className="legend-dot" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
            <TrendChart series={trendSeries} height={180} />
          </div>
          <div className="chart-card" style={{ marginTop: '1rem' }}>
            <p className="chart-card-label">Engagement Rate by Platform (%)</p>
            <BarChart
              data={engagementBarData}
              color="var(--accent)"
              labelKey="label"
              valueKey="value"
              height={150}
            />
          </div>
        </section>

        {/* Per-platform breakdown */}
        <section className="ad-section">
          <h2 className="section-title">{t('section.platforms')}</h2>
          <div className="platform-list">
            {PLATFORMS.map((p) => {
              const state = platformStates[p.id] ?? {};
              return (
                <PlatformRow
                  key={p.id}
                  platform={p}
                  metrics={state.data}
                  connectionStatus={state.connStatus ?? 'disconnected'}
                  loading={state.loading ?? true}
                  expanded={expandedPlatforms.has(p.id)}
                  onToggle={() => togglePlatform(p.id)}
                />
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="ad-footer">
          <Clock size={12} />
          Last updated: {isoDate(new Date())} · Range: {dateFrom} → {dateTo}
        </footer>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// usePlatformStates — top-level hook that manages per-platform data
// We can't call hooks in a loop, so we accept that approach and instead
// use a single useEffect that fans out fetches per platform.
// ---------------------------------------------------------------------------
function usePlatformStates({ dateFrom, dateTo, wsStatus, lastMessage }) {
  const [states, setStates] = useState(() =>
    Object.fromEntries(
      PLATFORMS.map((p) => [p.id, { data: null, loading: true, error: null, connStatus: 'disconnected' }])
    )
  );
  const aborts = useRef({});

  // Fan-out fetch per platform
  useEffect(() => {
    PLATFORMS.forEach(async (p) => {
      aborts.current[p.id]?.abort();
      aborts.current[p.id] = new AbortController();
      setStates((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id], loading: true, error: null },
      }));
      try {
        const qs = new URLSearchParams({ from: dateFrom, to: dateTo }).toString();
        const res = await fetch(`${p.endpoint}?${qs}`, {
          signal: aborts.current[p.id].signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setStates((prev) => ({
          ...prev,
          [p.id]: { data: json, loading: false, error: null, connStatus: 'connected' },
        }));
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Seed with synthetic demo data so the UI has something to show
          setStates((prev) => ({
            ...prev,
            [p.id]: {
              data: generateDemoData(p.id),
              loading: false,
              error: err.message,
              connStatus: 'error',
            },
          }));
        }
      }
    });
    return () => Object.values(aborts.current).forEach((a) => a.abort());
  }, [dateFrom, dateTo]);

  // Reflect WS connection status
  useEffect(() => {
    setStates((prev) => {
      const next = { ...prev };
      PLATFORMS.forEach((p) => {
        next[p.id] = { ...next[p.id], connStatus: next[p.id].error ? 'error' : wsStatus === 'connected' ? 'connected' : wsStatus };
      });
      return next;
    });
  }, [wsStatus]);

  // Merge real-time WS messages
  useEffect(() => {
    if (!lastMessage) return;
    const pid = lastMessage.platform;
    if (!pid) return;
    setStates((prev) => {
      if (!prev[pid]) return prev;
      const existing = prev[pid].data ?? {};
      const next = { ...existing };
      METRIC_KEYS.forEach((mk) => {
        if (lastMessage[mk] != null) {
          const prevSpark = existing[`${mk}Spark`] ?? [];
          next[mk] = lastMessage[mk];
          next[`${mk}Spark`] = [...prevSpark.slice(-19), { value: lastMessage[mk] }];
        }
      });
      return { ...prev, [pid]: { ...prev[pid], data: next } };
    });
  }, [lastMessage]);

  return states;
}

// ---------------------------------------------------------------------------
// Demo/fallback data generator (used when API is unavailable)
// ---------------------------------------------------------------------------
function generateDemoData(platformId) {
  const seed = platformId.charCodeAt(0) * 17;
  const rng = (base, variance) => Math.round(base + (Math.sin(seed + base) * variance));
  const spark = (base, len = 14) =>
    Array.from({ length: len }, (_, i) => ({
      value: rng(base, base * 0.15 * Math.sin(i)),
    }));

  return {
    likes: rng(48_000, 12_000),
    likesDelta: rng(4.2, 3),
    likesSpark: spark(48_000),
    reach: rng(320_000, 80_000),
    reachDelta: rng(7.1, 5),
    reachSpark: spark(320_000),
    views: rng(1_200_000, 300_000),
    viewsDelta: rng(-1.8, 2),
    viewsSpark: spark(1_200_000),
    retention: rng(64, 8),
    retentionDelta: rng(1.2, 1.5),
    retentionSpark: spark(64),
    followers: rng(2_400, 600),
    followersDelta: rng(3.5, 2),
    followersSpark: spark(2_400),
    engagement: rng(5.8, 2),
    engagementDelta: rng(0.3, 0.5),
    engagementSpark: spark(5.8),
  };
}

// ---------------------------------------------------------------------------
// Styles (CSS-in-JS string) — token-first, both themes
// ---------------------------------------------------------------------------
const STYLES = `
  :root {
    --bg: #F7F8FA;
    --surface: #FFFFFF;
    --surface-raised: #F0F2F7;
    --border: #E2E6EF;
    --text: #111827;
    --text-secondary: #374151;
    --text-muted: #6B7280;
    --accent: #06B6D4;
    --accent-dim: #CFFAFE;
    --semantic-ok: #10B981;
    --semantic-warn: #F59E0B;
    --semantic-err: #EF4444;
    --semantic-info: #6366F1;
    --chart-grid: #E5E7EB;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
    --radius: 10px;
    --radius-sm: 6px;
    --font-ui: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0E1117;
      --surface: #161B27;
      --surface-raised: #1E2535;
      --border: #2A3349;
      --text: #F1F5F9;
      --text-secondary: #CBD5E1;
      --text-muted: #64748B;
      --accent: #22D3EE;
      --accent-dim: #0E3A45;
      --semantic-ok: #34D399;
      --semantic-warn: #FBBF24;
      --semantic-err: #F87171;
      --semantic-info: #818CF8;
      --chart-grid: #2A3349;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.25);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
    }
  }

  :root[data-theme="dark"] {
    --bg: #0E1117;
    --surface: #161B27;
    --surface-raised: #1E2535;
    --border: #2A3349;
    --text: #F1F5F9;
    --text-secondary: #CBD5E1;
    --text-muted: #64748B;
    --accent: #22D3EE;
    --accent-dim: #0E3A45;
    --semantic-ok: #34D399;
    --semantic-warn: #FBBF24;
    --semantic-err: #F87171;
    --semantic-info: #818CF8;
    --chart-grid: #2A3349;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.25);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  }

  *, *::before, *::after { box-sizing: border-box; }

  .ad-root {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
    min-height: 100vh;
    padding: clamp(1rem, 3vw, 2rem);
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Header */
  .ad-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .ad-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .ad-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text);
    margin: 0;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .ad-subtitle {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0.2rem 0 0;
  }
  .ad-header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  /* Live pill */
  .live-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--semantic-err);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 3px 8px;
    border-radius: 99px;
    text-transform: uppercase;
  }
  .ws-warn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    color: var(--semantic-warn);
  }

  /* Export button */
  .btn-export {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.45rem 0.9rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, box-shadow 0.15s;
    box-shadow: var(--shadow-sm);
  }
  .btn-export:hover { opacity: 0.88; box-shadow: var(--shadow-md); }
  .btn-export:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* Error banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    background: color-mix(in srgb, var(--semantic-err) 12%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--semantic-err) 30%, var(--border));
    border-radius: var(--radius-sm);
    color: var(--semantic-err);
    font-size: 0.82rem;
    padding: 0.6rem 1rem;
    margin-bottom: 1rem;
  }

  /* Filter bar */
  .filter-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow-sm);
  }
  .filter-bar-label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
  .filter-chips {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .filter-chip {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    border-radius: 99px;
    padding: 0.28rem 0.75rem;
    font-size: 0.78rem;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .filter-chip:hover { background: var(--accent-dim); border-color: var(--accent); }
  .filter-chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }
  .filter-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .custom-range {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
    margin-left: 0.5rem;
  }
  .custom-range label {
    font-size: 0.75rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .date-input {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.78rem;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
  }
  .date-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

  /* Section */
  .ad-section { margin-bottom: 2rem; }
  .section-title {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
    margin: 0 0 0.85rem;
  }

  /* Summary tiles */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.85rem;
  }
  .summary-tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.15s;
  }
  .summary-tile:hover { box-shadow: var(--shadow-md); }
  .summary-tile-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
  }
  .summary-tile-val {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  /* Chart card */
  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 1.25rem;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .chart-card-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    margin: 0 0 0.75rem;
  }
  .chart-legend {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Platform list */
  .platform-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .platform-row {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.15s;
  }
  .platform-row:hover { box-shadow: var(--shadow-md); }
  .platform-row-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.8rem 1rem;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
    text-align: left;
    color: var(--text);
    font-family: var(--font-ui);
    transition: background 0.12s;
  }
  .platform-row-header:hover { background: var(--surface-raised); }
  .platform-row-header:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .platform-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }
  .platform-name {
    font-size: 0.88rem;
    font-weight: 600;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .platform-eng {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Metric tiles grid inside platform row */
  .platform-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1px;
    border-top: 1px solid var(--border);
    background: var(--border);
  }
  .metric-tile {
    background: var(--surface);
    padding: 0.9rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .metric-tile-header {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .metric-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .metric-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .metric-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.1rem;
  }
  .metric-delta {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.72rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .delta-up { color: var(--semantic-ok); }
  .delta-down { color: var(--semantic-err); }

  /* Connection badges */
  .conn-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 99px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .badge-connected { background: color-mix(in srgb, var(--semantic-ok) 15%, transparent); color: var(--semantic-ok); }
  .badge-disconnected { background: color-mix(in srgb, var(--text-muted) 15%, transparent); color: var(--text-muted); }
  .badge-reconnecting { background: color-mix(in srgb, var(--semantic-warn) 15%, transparent); color: var(--semantic-warn); }
  .badge-error { background: color-mix(in srgb, var(--semantic-err) 15%, transparent); color: var(--semantic-err); }

  /* Skeleton loaders */
  .skeleton {
    border-radius: 4px;
    background: linear-gradient(90deg, var(--surface-raised) 25%, var(--border) 50%, var(--surface-raised) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    display: inline-block;
  }
  .skeleton-val { width: 80px; height: 1.25rem; }
  .skeleton-sm { width: 60px; height: 0.8rem; }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Spin animation */
  .spin { animation: spin 1.2s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Footer */
  .ad-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    color: var(--text-muted);
    padding-top: 1rem;
    border-top: 1px solid var(--border);
    margin-top: 1rem;
    font-variant-numeric: tabular-nums;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .summary-grid { grid-template-columns: 1fr 1fr; }
    .platform-metrics-grid { grid-template-columns: 1fr 1fr; }
    .ad-header { flex-direction: column; }
    .ad-header-right { width: 100%; justify-content: flex-start; }
    .filter-bar { flex-direction: column; align-items: flex-start; }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton, .spin { animation: none; }
    .btn-export, .platform-row, .summary-tile { transition: none; }
  }
`;

export default AnalyticsDashboard;
