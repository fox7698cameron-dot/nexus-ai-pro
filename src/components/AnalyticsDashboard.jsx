// src/components/AnalyticsDashboard.jsx — Updated: 2026-07-25
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Users, Eye, Heart, Share2,
  Download, RefreshCw, Settings, X, Check, AlertTriangle,
  ChevronDown, BarChart3, Activity, Zap, Globe, Calendar,
  Plus, Trash2, ExternalLink, Search, Filter, ArrowUpRight,
  ArrowDownRight, Minus, Lock, Key, Wifi, WifiOff
} from 'lucide-react';

// ─── Platform registry ────────────────────────────────────────────────────────

const PLATFORMS = {
  tiktok: {
    label: 'TikTok',
    color: '#010101',
    accent: '#fe2c55',
    bg: 'bg-[#010101]',
    ring: 'ring-[#fe2c55]',
    text: 'text-[#fe2c55]',
    gradient: 'from-[#010101] to-[#fe2c55]',
    credentialFields: [
      { key: 'clientKey', label: 'Client Key', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },
  instagram: {
    label: 'Instagram',
    color: '#e1306c',
    accent: '#f77737',
    bg: 'bg-[#e1306c]',
    ring: 'ring-[#e1306c]',
    text: 'text-[#e1306c]',
    gradient: 'from-[#833ab4] via-[#e1306c] to-[#f77737]',
    credentialFields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'appSecret', label: 'App Secret', type: 'password' },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },
  facebook: {
    label: 'Facebook',
    color: '#1877f2',
    accent: '#1877f2',
    bg: 'bg-[#1877f2]',
    ring: 'ring-[#1877f2]',
    text: 'text-[#1877f2]',
    gradient: 'from-[#1877f2] to-[#0d4f9e]',
    credentialFields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'appSecret', label: 'App Secret', type: 'password' },
      { key: 'pageToken', label: 'Page Access Token', type: 'password' },
    ],
  },
  twitch: {
    label: 'Twitch',
    color: '#9146ff',
    accent: '#9146ff',
    bg: 'bg-[#9146ff]',
    ring: 'ring-[#9146ff]',
    text: 'text-[#9146ff]',
    gradient: 'from-[#9146ff] to-[#6441a5]',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
      { key: 'accessToken', label: 'OAuth Token', type: 'password' },
    ],
  },
  discord: {
    label: 'Discord',
    color: '#5865f2',
    accent: '#5865f2',
    bg: 'bg-[#5865f2]',
    ring: 'ring-[#5865f2]',
    text: 'text-[#5865f2]',
    gradient: 'from-[#5865f2] to-[#404eed]',
    credentialFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password' },
      { key: 'guildId', label: 'Server (Guild) ID', type: 'text' },
    ],
  },
  lemon8: {
    label: 'Lemon8',
    color: '#ffd700',
    accent: '#ff8c00',
    bg: 'bg-[#ffd700]',
    ring: 'ring-[#ffd700]',
    text: 'text-[#b8860b]',
    gradient: 'from-[#ffd700] to-[#ff8c00]',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'userId', label: 'User ID', type: 'text' },
    ],
  },
  reddit: {
    label: 'Reddit',
    color: '#ff4500',
    accent: '#ff4500',
    bg: 'bg-[#ff4500]',
    ring: 'ring-[#ff4500]',
    text: 'text-[#ff4500]',
    gradient: 'from-[#ff4500] to-[#cc3700]',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
      { key: 'username', label: 'Username', type: 'text' },
    ],
  },
  redgifs: {
    label: 'RedGifs',
    color: '#e53e3e',
    accent: '#e53e3e',
    bg: 'bg-[#e53e3e]',
    ring: 'ring-[#e53e3e]',
    text: 'text-[#e53e3e]',
    gradient: 'from-[#e53e3e] to-[#9b1c1c]',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'username', label: 'Username', type: 'text' },
    ],
  },
};

const DATE_RANGES = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 },
];

const METRICS = ['likes', 'reach', 'views', 'retention', 'engagementRate', 'followerGrowth'];

const METRIC_LABELS = {
  likes: 'Likes',
  reach: 'Reach',
  views: 'Views',
  retention: 'Retention %',
  engagementRate: 'Eng. Rate %',
  followerGrowth: 'Follower Growth',
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

const fmtNum = (n) => {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const fmtPct = (n) => (n == null ? '—' : `${n.toFixed(1)}%`);

const deltaIcon = (delta) => {
  if (delta > 0) return <ArrowUpRight size={14} className="text-emerald-500" />;
  if (delta < 0) return <ArrowDownRight size={14} className="text-red-400" />;
  return <Minus size={14} className="text-gray-400" />;
};

// ─── Minimal SVG line chart ───────────────────────────────────────────────────

const SparkLine = ({ data = [], color = '#6366f1', height = 40, width = 120 }) => {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Full multi-series line chart for the comparison view
const LineChart = ({ series = [], labels = [], height = 200 }) => {
  const allVals = series.flatMap((s) => s.data);
  const min = Math.min(0, ...allVals);
  const max = Math.max(...allVals, 1);
  const range = max - min || 1;
  const W = 640;
  const H = height;
  const PAD = { top: 8, right: 16, bottom: 24, left: 48 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const toX = (i, len) => PAD.left + (i / Math.max(len - 1, 1)) * innerW;
  const toY = (v) => PAD.top + innerH - ((v - min) / range) * innerH;

  const yTicks = 4;
  const tickStep = range / yTicks;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      style={{ height }}
    >
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = min + tickStep * i;
        const y = toY(val);
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
              stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end"
              fontSize="10" fill="currentColor" opacity="0.5">
              {fmtNum(Math.round(val))}
            </text>
          </g>
        );
      })}

      {labels.map((lbl, i) => {
        if (i % Math.ceil(labels.length / 6) !== 0) return null;
        const x = toX(i, labels.length);
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle"
            fontSize="10" fill="currentColor" opacity="0.45">
            {lbl}
          </text>
        );
      })}

      {series.map((s, si) => {
        const pts = s.data.map((v, i) => `${toX(i, s.data.length)},${toY(v)}`).join(' ');
        return (
          <polyline key={si} points={pts} fill="none"
            stroke={s.color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        );
      })}
    </svg>
  );
};

// Bar chart for cross-platform metric comparison
const BarChart = ({ data = [], color = '#6366f1', height = 120 }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full rounded-t transition-all duration-500"
            style={{
              height: `${(d.value / max) * (height - 20)}px`,
              backgroundColor: d.color || color,
              minHeight: 2,
            }}
          />
          <span className="text-[9px] truncate w-full text-center opacity-60">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Credential modal ─────────────────────────────────────────────────────────

const CredentialModal = ({ platform, existing = {}, onSave, onClose }) => {
  const cfg = PLATFORMS[platform];
  const [fields, setFields] = useState(() =>
    cfg.credentialFields.reduce((acc, f) => ({ ...acc, [f.key]: existing[f.key] ?? '' }), {})
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, credentials: fields }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      onSave({ platform, credentials: fields });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/10 dark:ring-white/10">
        <div className={`flex items-center justify-between p-5 rounded-t-2xl bg-gradient-to-r ${cfg.gradient}`}>
          <h3 className="font-semibold text-white text-lg">{cfg.label} — Connect</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Lock size={12} /> Credentials are sent only to your backend and never stored in the browser.
          </p>
          {cfg.credentialFields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                {f.label}
              </label>
              <input
                type={f.type}
                value={fields[f.key]}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                  bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ))}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700
              text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
            {saving ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Metric card ──────────────────────────────────────────────────────────────

const MetricCard = ({ label, value, delta, sparkData, color, format = 'number' }) => {
  const formatted = format === 'percent' ? fmtPct(value) : fmtNum(value);
  const deltaColor = delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="rounded-xl p-4 bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/5
      shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {delta != null && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${deltaColor}`}>
            {deltaIcon(delta)}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatted}</span>
      {sparkData?.length > 1 && (
        <div className="opacity-70">
          <SparkLine data={sparkData} color={color} height={36} width={100} />
        </div>
      )}
    </div>
  );
};

// ─── Platform status badge ────────────────────────────────────────────────────

const PlatformBadge = ({ platform, connected, live, onManage }) => {
  const cfg = PLATFORMS[platform];
  return (
    <button
      onClick={onManage}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
        ring-1 ${connected
          ? 'bg-gray-900 dark:bg-gray-800 ring-white/10 text-white'
          : 'bg-gray-100 dark:bg-gray-800 ring-gray-200 dark:ring-gray-700 text-gray-500 dark:text-gray-400'
        } hover:scale-105`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: connected ? cfg.accent : '#6b7280' }}
      />
      {cfg.label}
      {connected && live && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
    </button>
  );
};

// ─── Top content row ──────────────────────────────────────────────────────────

const TopContentRow = ({ item, rank }) => {
  const cfg = PLATFORMS[item.platform];
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{rank}</span>
      <div
        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.color})` }}
      >
        {cfg.label[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{cfg.label} · {item.date}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtNum(item.views)}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{fmtPct(item.engagement)} eng.</p>
      </div>
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="text-gray-400 hover:text-indigo-500 transition-colors flex-shrink-0">
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [connected, setConnected] = useState({});
  const [credentials, setCredentials] = useState({});
  const [metrics, setMetrics] = useState({});
  const [history, setHistory] = useState({});
  const [topContent, setTopContent] = useState([]);
  const [dateRange, setDateRange] = useState(30);
  const [activeView, setActiveView] = useState('overview');
  const [selectedPlatforms, setSelectedPlatforms] = useState(Object.keys(PLATFORMS));
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [modalPlatform, setModalPlatform] = useState(null);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // ── Socket.io connection ─────────────────────────────────────────────────────

  const connectSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    // socket.io-client is exposed via the server's socket.io bundle
    const ioFn = window.io;
    if (!ioFn) return;

    setSocketStatus('connecting');
    const socket = ioFn('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('error'));

    socket.on('analytics:update', (payload) => {
      setMetrics((prev) => ({ ...prev, ...payload.metrics }));
      setHistory((prev) => mergeHistory(prev, payload.history));
      setLastUpdated(new Date());
    });

    socket.on('analytics:topContent', (items) => setTopContent(items));

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  // ── Initial data fetch ───────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const connectedPlatforms = Object.keys(connected).filter((p) => connected[p]);
      if (!connectedPlatforms.length) return;

      const [metricsRes, historyRes, contentRes] = await Promise.allSettled([
        fetch(`/api/analytics/metrics?platforms=${connectedPlatforms.join(',')}&days=${dateRange}`),
        fetch(`/api/analytics/history?platforms=${connectedPlatforms.join(',')}&days=${dateRange}`),
        fetch(`/api/analytics/top-content?platforms=${connectedPlatforms.join(',')}&days=${dateRange}`),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
        const data = await metricsRes.value.json();
        setMetrics(data);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const data = await historyRes.value.json();
        setHistory(data);
      }
      if (contentRes.status === 'fulfilled' && contentRes.value.ok) {
        const data = await contentRes.value.json();
        setTopContent(data);
      }
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [connected, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const mergeHistory = (prev, incoming) => {
    if (!incoming) return prev;
    const merged = { ...prev };
    for (const [platform, data] of Object.entries(incoming)) {
      merged[platform] = { ...(merged[platform] || {}), ...data };
    }
    return merged;
  };

  const handleCredentialSave = useCallback(({ platform, credentials: creds }) => {
    setCredentials((prev) => ({ ...prev, [platform]: creds }));
    setConnected((prev) => ({ ...prev, [platform]: true }));
    setModalPlatform(null);
  }, []);

  const handleDisconnect = useCallback((platform) => {
    setConnected((prev) => ({ ...prev, [platform]: false }));
    setCredentials((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    setMetrics((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
  }, []);

  const togglePlatformFilter = useCallback((platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }, []);

  const exportData = useCallback(() => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      dateRange: `${dateRange}d`,
      metrics,
      history,
      topContent,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, history, topContent, dateRange]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const connectedPlatforms = Object.keys(connected).filter((p) => connected[p]);

  const aggregatedMetrics = METRICS.reduce((acc, key) => {
    const vals = connectedPlatforms
      .filter((p) => selectedPlatforms.includes(p) && metrics[p]?.[key] != null)
      .map((p) => metrics[p][key]);
    acc[key] = vals.length ? vals.reduce((s, v) => s + v, 0) : null;
    return acc;
  }, {});

  const aggregatedDeltas = METRICS.reduce((acc, key) => {
    const vals = connectedPlatforms
      .filter((p) => selectedPlatforms.includes(p) && metrics[p]?.deltas?.[key] != null)
      .map((p) => metrics[p].deltas[key]);
    acc[key] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    return acc;
  }, {});

  const comparisonSeries = connectedPlatforms
    .filter((p) => selectedPlatforms.includes(p) && history[p]?.[selectedMetric]?.length)
    .map((p) => ({
      label: PLATFORMS[p].label,
      color: PLATFORMS[p].accent,
      data: history[p][selectedMetric],
    }));

  const historyLabels = (() => {
    const base = comparisonSeries[0]?.data ?? [];
    return base.map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (base.length - 1 - i));
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
  })();

  const barData = connectedPlatforms
    .filter((p) => selectedPlatforms.includes(p))
    .map((p) => ({
      label: PLATFORMS[p].label,
      value: metrics[p]?.[selectedMetric] ?? 0,
      color: PLATFORMS[p].accent,
    }));

  const filteredContent = topContent.filter((item) => {
    const matchesPlatform = filterPlatform === 'all' || item.platform === filterPlatform;
    const matchesSearch = !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  // ── Render helpers ───────────────────────────────────────────────────────────

  const socketIndicator = {
    connected: 'bg-emerald-400',
    connecting: 'bg-amber-400 animate-pulse',
    error: 'bg-red-400',
    disconnected: 'bg-gray-400',
  }[socketStatus];

  const socketLabel = {
    connected: 'Live',
    connecting: 'Connecting…',
    error: 'Error',
    disconnected: 'Offline',
  }[socketStatus];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md
        border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <BarChart3 size={20} className="text-indigo-500" />
            <h1 className="font-semibold text-base">Analytics</h1>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${socketIndicator}`} />
            {socketLabel}
          </div>

          <div className="flex-1" />

          {/* Date range */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  dateRange === r.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <span className="hidden md:block text-xs text-gray-400">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={fetchAnalytics}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={exportData}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Export data"
          >
            <Download size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Mobile date range ──────────────────────────────────────────────── */}
        <div className="flex sm:hidden items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${
                dateRange === r.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* ── Platform connection bar ────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900 rounded-xl p-4 ring-1 ring-black/5 dark:ring-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Globe size={15} /> Platforms
            </h2>
            <span className="text-xs text-gray-400">
              {connectedPlatforms.length} / {Object.keys(PLATFORMS).length} connected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PLATFORMS).map((p) => (
              <PlatformBadge
                key={p}
                platform={p}
                connected={!!connected[p]}
                live={socketStatus === 'connected' && !!connected[p]}
                onManage={() => setModalPlatform(p)}
              />
            ))}
          </div>
          {connectedPlatforms.length === 0 && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center py-2">
              Click a platform badge above to enter your API credentials and connect.
            </p>
          )}
        </section>

        {/* ── View tabs ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'comparison', label: 'Cross-Platform', icon: BarChart3 },
            { id: 'content', label: 'Top Content', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeView === id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW: OVERVIEW
        ══════════════════════════════════════════════════════════════════════ */}
        {activeView === 'overview' && (
          <div className="space-y-6">

            {/* Aggregate metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {METRICS.map((key) => {
                const isPct = key === 'retention' || key === 'engagementRate';
                const sparkData = connectedPlatforms
                  .filter((p) => selectedPlatforms.includes(p) && history[p]?.[key])
                  .flatMap((p) => history[p][key])
                  .slice(-14);
                return (
                  <MetricCard
                    key={key}
                    label={METRIC_LABELS[key]}
                    value={aggregatedMetrics[key]}
                    delta={aggregatedDeltas[key]}
                    sparkData={sparkData}
                    color="#6366f1"
                    format={isPct ? 'percent' : 'number'}
                  />
                );
              })}
            </div>

            {/* Per-platform breakdown */}
            {connectedPlatforms.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Per Platform</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {connectedPlatforms.filter((p) => selectedPlatforms.includes(p)).map((platform) => {
                    const cfg = PLATFORMS[platform];
                    const m = metrics[platform] ?? {};
                    return (
                      <div
                        key={platform}
                        className="rounded-xl bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/5
                          shadow-sm overflow-hidden"
                      >
                        <div
                          className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`}
                        />
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{cfg.label}</span>
                            <button
                              onClick={() => handleDisconnect(platform)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                              title="Disconnect"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {['views', 'likes', 'reach', 'followerGrowth'].map((key) => (
                              <div key={key} className="space-y-0.5">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {METRIC_LABELS[key]}
                                </p>
                                <p className="text-sm font-semibold">{fmtNum(m[key])}</p>
                              </div>
                            ))}
                          </div>
                          {history[platform]?.views?.length > 1 && (
                            <SparkLine
                              data={history[platform].views}
                              color={cfg.accent}
                              height={32}
                              width={180}
                            />
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Eng. {fmtPct(m.engagementRate)}</span>
                            <span>Ret. {fmtPct(m.retention)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {connectedPlatforms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Zap size={40} className="text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No platforms connected</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                  Connect at least one platform above to start seeing analytics.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW: CROSS-PLATFORM COMPARISON
        ══════════════════════════════════════════════════════════════════════ */}
        {activeView === 'comparison' && (
          <div className="space-y-6">

            {/* Metric selector + platform filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Metric:</span>
                <div className="flex flex-wrap gap-1">
                  {METRICS.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedMetric(key)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        selectedMetric === key
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {METRIC_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform toggle filters */}
            {connectedPlatforms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {connectedPlatforms.map((p) => {
                  const cfg = PLATFORMS[p];
                  const active = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatformFilter(p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        ring-1 transition-all ${
                          active
                            ? 'text-white ring-0'
                            : 'bg-gray-100 dark:bg-gray-800 ring-gray-200 dark:ring-gray-700 text-gray-500'
                        }`}
                      style={active ? { backgroundColor: cfg.accent } : {}}
                    >
                      {cfg.label}
                      {active ? <Check size={11} /> : <Plus size={11} />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Line chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 ring-1 ring-black/5 dark:ring-white/5 shadow-sm">
              <h2 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">
                {METRIC_LABELS[selectedMetric]} over {dateRange} days
              </h2>
              {comparisonSeries.length > 0 ? (
                <>
                  <LineChart series={comparisonSeries} labels={historyLabels} height={220} />
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-4">
                    {comparisonSeries.map((s) => (
                      <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">
                  No history data available yet for the selected platforms.
                </p>
              )}
            </div>

            {/* Bar chart — snapshot */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 ring-1 ring-black/5 dark:ring-white/5 shadow-sm">
              <h2 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">
                {METRIC_LABELS[selectedMetric]} — current snapshot
              </h2>
              {barData.length > 0 ? (
                <BarChart data={barData} height={140} />
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Connect platforms to compare.</p>
              )}
            </div>

            {/* Tabular comparison */}
            {connectedPlatforms.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400">Platform</th>
                      {METRICS.map((key) => (
                        <th key={key} className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {METRIC_LABELS[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {connectedPlatforms
                      .filter((p) => selectedPlatforms.includes(p))
                      .map((platform) => {
                        const cfg = PLATFORMS[platform];
                        const m = metrics[platform] ?? {};
                        return (
                          <tr key={platform} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cfg.accent }}
                                />
                                <span className="font-medium">{cfg.label}</span>
                              </div>
                            </td>
                            {METRICS.map((key) => {
                              const isPct = key === 'retention' || key === 'engagementRate';
                              return (
                                <td key={key} className="text-right py-3 px-3 tabular-nums">
                                  {isPct ? fmtPct(m[key]) : fmtNum(m[key])}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW: TOP CONTENT
        ══════════════════════════════════════════════════════════════════════ */}
        {activeView === 'content' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search content…"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              {/* Platform filter */}
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500
                    appearance-none cursor-pointer"
                >
                  <option value="all">All platforms</option>
                  {Object.entries(PLATFORMS).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl ring-1 ring-black/5 dark:ring-white/5 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              {filteredContent.length > 0 ? (
                filteredContent.map((item, i) => (
                  <TopContentRow key={item.id ?? i} item={item} rank={i + 1} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                  <TrendingUp size={32} className="text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {connectedPlatforms.length === 0
                      ? 'Connect a platform to see top-performing content.'
                      : 'No content matches your filters.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Credential modal ──────────────────────────────────────────────────── */}
      {modalPlatform && (
        <CredentialModal
          platform={modalPlatform}
          existing={credentials[modalPlatform] ?? {}}
          onSave={handleCredentialSave}
          onClose={() => setModalPlatform(null)}
        />
      )}
    </div>
  );
}
