/**
 * AnalyticsDashboard.jsx
 * Nexus AI Pro — Social Media Analytics Dashboard
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
 * Supports: Real-time metrics, views, likes, reach, retention tracking
 * Multi-platform: Linux, Windows, macOS, iOS, Android, Electron, Desktop, Mobile, Tablet
 * Updated: 2026-08-21
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, Users,
  Play, Clock, BarChart3, Activity, RefreshCw, Wifi,
  WifiOff, AlertTriangle, CheckCircle, Globe, Zap,
  Video, MessageSquare, Star, ArrowUp, ArrowDown,
  Filter, Download, Calendar, ChevronDown, Bell
} from 'lucide-react';

// ─── Platform configuration ──────────────────────────────────────────────────
const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#010101',
    accent: '#fe2c55',
    gradient: 'from-black to-pink-600',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'reach', 'watchTime'],
    apiKey: 'TIKTOK_API_KEY',
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    accent: '#833AB4',
    gradient: 'from-purple-500 to-pink-500',
    metrics: ['impressions', 'reach', 'likes', 'comments', 'saves', 'shares', 'profileVisits'],
    apiKey: 'INSTAGRAM_API_KEY',
  },
  facebook: {
    name: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    accent: '#0d65d8',
    gradient: 'from-blue-600 to-blue-800',
    metrics: ['reach', 'impressions', 'reactions', 'comments', 'shares', 'clicks', 'videoViews'],
    apiKey: 'FACEBOOK_API_KEY',
  },
  twitch: {
    name: 'Twitch',
    icon: '🎮',
    color: '#9147FF',
    accent: '#772ce8',
    gradient: 'from-purple-600 to-indigo-700',
    metrics: ['viewers', 'followers', 'subscribers', 'chatMessages', 'clipViews', 'watchTime', 'raids'],
    apiKey: 'TWITCH_CLIENT_ID',
  },
  discord: {
    name: 'Discord',
    icon: '💬',
    color: '#5865F2',
    accent: '#4752c4',
    gradient: 'from-indigo-500 to-blue-700',
    metrics: ['members', 'onlineMembers', 'messages', 'newMembers', 'boosts', 'retention'],
    apiKey: 'DISCORD_BOT_TOKEN',
  },
  lemon8: {
    name: 'Lemon8',
    icon: '🍋',
    color: '#FFD700',
    accent: '#f0c000',
    gradient: 'from-yellow-400 to-orange-500',
    metrics: ['views', 'likes', 'comments', 'saves', 'followers', 'reach'],
    apiKey: 'LEMON8_API_KEY',
  },
  reddit: {
    name: 'Reddit',
    icon: '🤖',
    color: '#FF4500',
    accent: '#e03d00',
    gradient: 'from-orange-500 to-red-600',
    metrics: ['upvotes', 'comments', 'shares', 'awards', 'followers', 'reach', 'postKarma'],
    apiKey: 'REDDIT_CLIENT_ID',
  },
  redgifs: {
    name: 'RedGIFs',
    icon: '🎞️',
    color: '#FF3E3E',
    accent: '#cc0000',
    gradient: 'from-red-500 to-rose-700',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'watchTime'],
    apiKey: 'REDGIFS_API_KEY',
  },
};

// ─── Metric display helpers ───────────────────────────────────────────────────
const formatNumber = (n) => {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const formatPercent = (v) => (v !== undefined ? `${v.toFixed(1)}%` : '—');

const TrendIcon = ({ delta }) =>
  delta > 0 ? (
    <ArrowUp className="inline w-3 h-3 text-emerald-400" />
  ) : delta < 0 ? (
    <ArrowDown className="inline w-3 h-3 text-red-400" />
  ) : null;

// ─── Simulated real-time data generator ──────────────────────────────────────
const generateMockMetrics = (platform) => {
  const base = {
    tiktok: { views: 1_420_000, likes: 84_300, shares: 12_200, comments: 4_560, followers: 234_700, reach: 1_650_000, watchTime: 38 },
    instagram: { impressions: 980_000, reach: 720_000, likes: 56_400, comments: 2_800, saves: 8_900, shares: 3_200, profileVisits: 14_500 },
    facebook: { reach: 540_000, impressions: 890_000, reactions: 23_100, comments: 4_200, shares: 9_800, clicks: 18_700, videoViews: 312_000 },
    twitch: { viewers: 3_842, followers: 45_600, subscribers: 1_230, chatMessages: 28_400, clipViews: 87_000, watchTime: 2_400, raids: 12 },
    discord: { members: 12_780, onlineMembers: 2_340, messages: 48_900, newMembers: 234, boosts: 18, retention: 78.4 },
    lemon8: { views: 234_000, likes: 18_900, comments: 1_240, saves: 4_560, followers: 8_900, reach: 298_000 },
    reddit: { upvotes: 34_200, comments: 2_180, shares: 890, awards: 42, followers: 67_800, reach: 412_000, postKarma: 156_400 },
    redgifs: { views: 2_340_000, likes: 98_700, shares: 23_400, comments: 8_900, followers: 45_600, watchTime: 42 },
  };
  const m = base[platform] || {};
  const jitter = (v) => Math.round(v * (0.97 + Math.random() * 0.06));
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, jitter(v)]));
};

const generateRetentionCurve = () =>
  Array.from({ length: 10 }, (_, i) => ({
    second: i * 10,
    retention: Math.max(10, 100 - i * 9 + Math.random() * 5 - 2.5),
  }));

// ─── MetricCard ───────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, delta, icon: Icon, format = formatNumber }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 hover:bg-white/10 transition-all">
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      {Icon && <Icon className="w-4 h-4 text-gray-500" />}
    </div>
    <div className="text-2xl font-bold text-white">{format(value)}</div>
    {delta !== undefined && (
      <div className={`text-xs ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        <TrendIcon delta={delta} /> {Math.abs(delta).toFixed(1)}% vs yesterday
      </div>
    )}
  </div>
);

// ─── RetentionChart ───────────────────────────────────────────────────────────
const RetentionChart = ({ data }) => {
  if (!data || !data.length) return null;
  const max = 100;
  const w = 300;
  const h = 80;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.retention / max) * h;
    return `${x},${y}`;
  });
  return (
    <div className="mt-2">
      <p className="text-xs text-gray-400 mb-1">Retention Curve</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <defs>
          <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          points={`0,${h} ${pts.join(' ')} ${w},${h}`}
          fill="url(#retGrad)"
        />
      </svg>
    </div>
  );
};

// ─── PlatformPanel ───────────────────────────────────────────────────────────
const PlatformPanel = ({ platformKey, metrics, retention, connected, lastUpdate }) => {
  const cfg = PLATFORMS[platformKey];
  if (!cfg) return null;

  const metricIcons = {
    views: Eye, impressions: Eye, viewers: Eye, upvotes: TrendingUp,
    likes: Heart, reactions: Heart,
    shares: Share2, followers: Users, members: Users, subscribers: Users,
    comments: MessageSquare, messages: MessageSquare,
    reach: Globe, watchTime: Clock, retention: Activity,
    chatMessages: MessageSquare, newMembers: Users,
    saves: Star, clicks: Zap, boosts: Star, awards: Star,
    raids: Zap, onlineMembers: Activity, profileVisits: Eye,
    videoViews: Video, postKarma: TrendingUp, clipViews: Play,
  };

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{cfg.icon}</span>
          <div>
            <h3 className="font-bold text-white text-lg">{cfg.name}</h3>
            <span className={`text-xs ${connected ? 'text-emerald-400' : 'text-gray-500'}`}>
              {connected ? '● Live' : '○ Disconnected'}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {lastUpdate ? `Updated ${new Date(lastUpdate).toLocaleTimeString()}` : 'Awaiting data'}
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cfg.metrics.map((m) => {
          const Icon = metricIcons[m] || BarChart3;
          const val = metrics?.[m];
          const fmt = m === 'watchTime' ? formatDuration : m === 'retention' ? formatPercent : formatNumber;
          return (
            <MetricCard
              key={m}
              label={m.replace(/([A-Z])/g, ' $1').trim()}
              value={val}
              delta={val !== undefined ? (Math.random() - 0.45) * 15 : undefined}
              icon={Icon}
              format={fmt}
            />
          );
        })}
      </div>

      {/* Retention curve for video platforms */}
      {['tiktok', 'instagram', 'facebook', 'twitch', 'redgifs'].includes(platformKey) && retention && (
        <RetentionChart data={retention} />
      )}
    </div>
  );
};

// ─── Summary bar ─────────────────────────────────────────────────────────────
const SummaryBar = ({ allMetrics }) => {
  const totalViews = (allMetrics.tiktok?.views || 0) + (allMetrics.instagram?.impressions || 0)
    + (allMetrics.facebook?.reach || 0) + (allMetrics.redgifs?.views || 0);
  const totalFollowers = (allMetrics.tiktok?.followers || 0) + (allMetrics.discord?.members || 0)
    + (allMetrics.reddit?.followers || 0) + (allMetrics.twitch?.followers || 0);
  const twitchViewers = allMetrics.twitch?.viewers || 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/40 rounded-2xl p-5">
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Total Reach</p>
        <p className="text-3xl font-bold text-white mt-1">{formatNumber(totalViews)}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Total Audience</p>
        <p className="text-3xl font-bold text-white mt-1">{formatNumber(totalFollowers)}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Live Viewers</p>
        <p className="text-3xl font-bold text-emerald-400 mt-1">{formatNumber(twitchViewers)}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Active Platforms</p>
        <p className="text-3xl font-bold text-white mt-1">{Object.keys(PLATFORMS).length}</p>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [retention, setRetention] = useState({});
  const [connected, setConnected] = useState({});
  const [lastUpdate, setLastUpdate] = useState({});
  const [selectedPlatforms, setSelectedPlatforms] = useState(Object.keys(PLATFORMS));
  const [refreshInterval, setRefreshInterval] = useState(30_000); // 30 s default
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const intervalRef = useRef(null);

  // Fetch metrics (demo: uses mock data; production uses backend API)
  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);
    const now = Date.now();
    const newMetrics = {};
    const newRetention = {};
    const newConnected = {};
    const newLastUpdate = {};

    for (const key of Object.keys(PLATFORMS)) {
      try {
        // In production: const res = await fetch(`/api/analytics/${key}?range=${timeRange}`)
        // Using mock data for demo
        newMetrics[key] = generateMockMetrics(key);
        newRetention[key] = generateRetentionCurve();
        newConnected[key] = true;
        newLastUpdate[key] = now;
      } catch {
        newConnected[key] = false;
      }
    }

    setMetrics(newMetrics);
    setRetention(newRetention);
    setConnected(newConnected);
    setLastUpdate(newLastUpdate);
    setIsRefreshing(false);
  }, [timeRange]);

  // Auto-refresh
  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, refreshInterval);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll, refreshInterval]);

  const togglePlatform = (key) =>
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-purple-400" />
            Social Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time cross-platform metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Time range selector */}
          {['1h', '24h', '7d', '30d', '90d'].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timeRange === r
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {r}
            </button>
          ))}
          {/* Refresh interval */}
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1"
          >
            <option value={10000}>10s refresh</option>
            <option value={30000}>30s refresh</option>
            <option value={60000}>1m refresh</option>
            <option value={300000}>5m refresh</option>
          </select>
          <button
            onClick={fetchAll}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Platform filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(PLATFORMS).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => togglePlatform(key)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border transition-all ${
              selectedPlatforms.includes(key)
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-transparent border-gray-600 text-gray-500'
            }`}
          >
            <span>{cfg.icon}</span> {cfg.name}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <SummaryBar allMetrics={metrics} />

      {/* Per-platform panels */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {selectedPlatforms.map((key) => (
          <PlatformPanel
            key={key}
            platformKey={key}
            metrics={metrics[key]}
            retention={retention[key]}
            connected={connected[key]}
            lastUpdate={lastUpdate[key]}
          />
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-600 mt-8">
        Nexus AI Pro · Analytics Dashboard · Data refreshes every {refreshInterval / 1000}s · {new Date().toLocaleDateString()}
      </p>
    </div>
  );
};

export default AnalyticsDashboard;
