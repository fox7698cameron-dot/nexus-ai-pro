/* src/analytics/SocialAnalyticsDashboard.jsx
   Created: 2026-10-11
   Analytics Dashboard - Social Media Real-Time Metrics
   Supports: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  Share2,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  Globe,
  MessageCircle,
  Star,
  Zap,
  BarChart2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  MoreHorizontal,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// i18n keys (replace values with your i18n library calls, e.g. t('key'))
// ---------------------------------------------------------------------------
const i18n = {
  dashboard_title: 'Social Analytics Dashboard',
  platform_connections: 'Platform Connections',
  realtime_metrics: 'Real-Time Metrics',
  platform_comparison: 'Platform Comparison',
  recent_activity: 'Recent Activity',
  content_performance: 'Content Performance',
  engagement_rate: 'Engagement Rate',
  audience_retention: 'Audience Retention',
  total_views: 'Total Views',
  total_likes: 'Total Likes',
  total_reach: 'Total Reach',
  avg_retention: 'Avg. Retention',
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  live: 'Live',
  export_csv: 'Export CSV',
  export_json: 'Export JSON',
  last_updated: 'Last updated',
  followers: 'Followers',
  views: 'Views',
  likes: 'Likes',
  comments: 'Comments',
  shares: 'Shares',
  reach: 'Reach',
  retention: 'Retention',
  eng_rate: 'Eng. Rate',
  platform: 'Platform',
  content: 'Content',
  posted: 'Posted',
  performance: 'Performance',
  follower_growth: 'Follower Growth',
  no_data: 'No data available',
};

// ---------------------------------------------------------------------------
// Mock realistic data (scaffolding — replace with API calls in production)
// ---------------------------------------------------------------------------
const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#010101', accent: '#fe2c55', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: '#833ab4', accent: '#fd1d1d', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', accent: '#42b72a', icon: '👤' },
  { id: 'twitch',    label: 'Twitch',    color: '#9146ff', accent: '#bf94ff', icon: '🎮' },
  { id: 'discord',   label: 'Discord',   color: '#5865f2', accent: '#57f287', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#ffcc00', accent: '#ff6b00', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',    color: '#ff4500', accent: '#ff6534', icon: '🤖' },
  { id: 'redgifs',   label: 'RedGifs',   color: '#e53935', accent: '#ff8a80', icon: '🎬' },
];

/** @returns {Object} mock platform metrics */
function generateMockMetrics() {
  return {
    tiktok:    { views: 4_821_340, likes: 312_450, reach: 5_100_000, retention: 68, eng_rate: 6.48, followers: 234_567, follower_growth: 1_234, comments: 18_920, shares: 24_310, connected: true,  live: true  },
    instagram: { views: 2_190_800, likes: 198_760, reach: 2_850_000, retention: 54, eng_rate: 9.07, followers: 189_234, follower_growth: 876,   comments: 11_430, shares: 8_920,  connected: true,  live: false },
    facebook:  { views: 1_043_200, likes: 87_340,  reach: 1_560_000, retention: 41, eng_rate: 4.21, followers: 98_432,  follower_growth: 312,   comments: 6_780,  shares: 14_210, connected: true,  live: false },
    twitch:    { views: 892_400,   likes: 54_320,  reach: 912_000,   retention: 72, eng_rate: 6.09, followers: 67_890,  follower_growth: 543,   comments: 34_210, shares: 3_450,  connected: true,  live: true  },
    discord:   { views: 234_100,   likes: 19_870,  reach: 280_000,   retention: 83, eng_rate: 8.48, followers: 45_231,  follower_growth: 189,   comments: 98_430, shares: 1_230,  connected: true,  live: false },
    lemon8:    { views: 567_800,   likes: 43_210,  reach: 620_000,   retention: 61, eng_rate: 7.61, followers: 32_145,  follower_growth: 654,   comments: 4_320,  shares: 6_780,  connected: false, live: false },
    reddit:    { views: 1_234_560, likes: 76_540,  reach: 1_450_000, retention: 49, eng_rate: 6.21, followers: 123_456, follower_growth: 987,   comments: 54_320, shares: 31_200, connected: true,  live: false },
    redgifs:   { views: 3_456_780, likes: 234_560, reach: 3_800_000, retention: 58, eng_rate: 6.79, followers: 87_654,  follower_growth: 1_102, comments: 9_870,  shares: 45_670, connected: false, live: false },
  };
}

const RECENT_ACTIVITY = [
  { id: 1, platform: 'tiktok',    type: 'comment', user: '@dance_crew',    msg: 'This is fire! 🔥',           time: '2m ago' },
  { id: 2, platform: 'instagram', type: 'like',    user: '@photo_fanatic', msg: 'Liked your post',            time: '3m ago' },
  { id: 3, platform: 'twitch',    type: 'follow',  user: 'GamerX99',       msg: 'Started following you',     time: '4m ago' },
  { id: 4, platform: 'reddit',    type: 'comment', user: 'u/tech_nerd',    msg: 'Great analysis!',           time: '5m ago' },
  { id: 5, platform: 'discord',   type: 'message', user: 'CoolUser#1234',  msg: 'Welcome to the server!',   time: '7m ago' },
  { id: 6, platform: 'facebook',  type: 'share',   user: 'Maria Santos',   msg: 'Shared your video',        time: '9m ago' },
  { id: 7, platform: 'tiktok',    type: 'follow',  user: '@viral_vibes',   msg: 'Started following you',    time: '11m ago' },
  { id: 8, platform: 'lemon8',    type: 'like',    user: '@lifestyle_lu',  msg: 'Liked your photo',         time: '14m ago' },
];

const CONTENT_PERFORMANCE = [
  { id: 1, platform: 'tiktok',    title: 'Morning routine vlog #45',   views: 1_240_000, likes: 98_430, eng: 7.94, trend: 'up'   },
  { id: 2, platform: 'instagram', title: 'Sunset photography tips',    views: 432_000,   likes: 54_210, eng: 12.55, trend: 'up'  },
  { id: 3, platform: 'twitch',    title: 'Speedrun challenge stream',  views: 234_000,   likes: 18_900, eng: 8.08, trend: 'down' },
  { id: 4, platform: 'reddit',    title: 'AMA: Building a SaaS in 30d', views: 567_000,  likes: 34_560, eng: 6.10, trend: 'up'  },
  { id: 5, platform: 'facebook',  title: 'Community Q&A session',     views: 198_000,   likes: 12_340, eng: 6.23, trend: 'down' },
  { id: 6, platform: 'redgifs',   title: 'Behind-the-scenes reel',    views: 876_000,   likes: 67_890, eng: 7.76, trend: 'up'  },
];

// Engagement rate timeseries (last 14 days) for SVG line chart
const ENGAGEMENT_SERIES = [
  { day: 'Oct 28', rate: 5.2 },
  { day: 'Oct 29', rate: 5.8 },
  { day: 'Oct 30', rate: 4.9 },
  { day: 'Oct 31', rate: 6.7 },
  { day: 'Nov 1',  rate: 7.1 },
  { day: 'Nov 2',  rate: 6.3 },
  { day: 'Nov 3',  rate: 8.2 },
  { day: 'Nov 4',  rate: 7.8 },
  { day: 'Nov 5',  rate: 9.1 },
  { day: 'Nov 6',  rate: 8.4 },
  { day: 'Nov 7',  rate: 7.6 },
  { day: 'Nov 8',  rate: 8.9 },
  { day: 'Nov 9',  rate: 9.4 },
  { day: 'Oct 10', rate: 8.7 },
];

// Audience retention waterfall (% by time segment)
const RETENTION_WATERFALL = [
  { label: '0–10%',   value: 100 },
  { label: '10–20%',  value: 87  },
  { label: '20–30%',  value: 74  },
  { label: '30–40%',  value: 63  },
  { label: '40–50%',  value: 58  },
  { label: '50–60%',  value: 51  },
  { label: '60–70%',  value: 46  },
  { label: '70–80%',  value: 41  },
  { label: '80–90%',  value: 36  },
  { label: '90–100%', value: 32  },
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
/**
 * Format a large number with K/M abbreviations.
 * @param {number} n
 * @returns {string}
 */
function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Get a platform config object by id.
 * @param {string} id
 * @returns {Object}
 */
function getPlatform(id) {
  return PLATFORMS.find((p) => p.id === id) ?? { label: id, color: '#6b7280', accent: '#9ca3af', icon: '🌐' };
}

/**
 * Build CSV string from metrics.
 * @param {Object} metrics
 * @returns {string}
 */
function buildCSV(metrics) {
  const headers = ['platform', 'views', 'likes', 'reach', 'retention', 'eng_rate', 'followers', 'follower_growth', 'comments', 'shares'];
  const rows = Object.entries(metrics).map(([id, m]) =>
    [id, m.views, m.likes, m.reach, m.retention, m.eng_rate, m.followers, m.follower_growth, m.comments, m.shares].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * StatusBadge — shows connected / disconnected / live
 * @param {{ connected: boolean, live: boolean }} props
 */
function StatusBadge({ connected, live }) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        {i18n.live}
      </span>
    );
  }
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <CheckCircle className="w-3 h-3" />
        {i18n.connected}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/20 text-zinc-400 border border-zinc-600/30">
      <XCircle className="w-3 h-3" />
      {i18n.disconnected}
    </span>
  );
}

/**
 * PlatformCard — single platform connection status card
 * @param {{ platform: Object, metrics: Object }} props
 */
function PlatformCard({ platform, metrics }) {
  const m = metrics[platform.id] ?? {};
  return (
    <div
      className="relative flex flex-col gap-3 p-4 rounded-xl border border-zinc-700/60 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      style={{ borderLeftColor: platform.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{platform.icon}</span>
          <span className="font-semibold text-zinc-100 text-sm">{platform.label}</span>
        </div>
        <StatusBadge connected={m.connected} live={m.live} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
        <div>
          <div className="text-zinc-500 uppercase tracking-wide text-[10px]">{i18n.followers}</div>
          <div className="font-semibold text-zinc-200 text-sm">{fmtNum(m.followers ?? 0)}</div>
        </div>
        <div>
          <div className="text-zinc-500 uppercase tracking-wide text-[10px]">{i18n.eng_rate}</div>
          <div className="font-semibold text-zinc-200 text-sm">{m.eng_rate?.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-zinc-500 uppercase tracking-wide text-[10px]">{i18n.views}</div>
          <div className="font-semibold text-zinc-200 text-sm">{fmtNum(m.views ?? 0)}</div>
        </div>
        <div>
          <div className="text-zinc-500 uppercase tracking-wide text-[10px]">{i18n.follower_growth}</div>
          <div className="inline-flex items-center gap-0.5 font-semibold text-emerald-400 text-sm">
            <ChevronUp className="w-3 h-3" />
            {fmtNum(m.follower_growth ?? 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MetricTile — large KPI card
 * @param {{ label: string, value: string|number, icon: React.ReactNode, delta?: number, color: string }} props
 */
function MetricTile({ label, value, icon, delta, color }) {
  const isUp = delta >= 0;
  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl border border-zinc-700/60 bg-zinc-800/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">{label}</span>
        <span className="p-2 rounded-lg" style={{ backgroundColor: `${color}22`, color }}>
          {icon}
        </span>
      </div>
      <div className="text-3xl font-bold text-zinc-100">{value}</div>
      {delta !== undefined && (
        <div className={`inline-flex items-center gap-1 text-xs font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isUp ? '+' : ''}{delta}% vs yesterday
        </div>
      )}
    </div>
  );
}

/**
 * CSS-based horizontal bar chart for platform comparison
 * @param {{ metrics: Object, field: string, label: string }} props
 */
function PlatformBarChart({ metrics, field, label }) {
  const data = PLATFORMS
    .filter((p) => metrics[p.id])
    .map((p) => ({ platform: p, value: metrics[p.id][field] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2.5">
      {data.map(({ platform, value }) => (
        <div key={platform.id} className="flex items-center gap-3">
          <span className="w-20 text-xs text-zinc-400 text-right shrink-0">{platform.label}</span>
          <div className="flex-1 bg-zinc-700/40 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 rounded-full transition-all duration-700"
              style={{
                width: `${(value / max) * 100}%`,
                background: `linear-gradient(90deg, ${platform.color}, ${platform.accent})`,
              }}
            />
          </div>
          <span className="w-16 text-xs text-zinc-300 font-medium shrink-0">{fmtNum(value)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * SVG Line Chart for engagement rate over time
 * @param {{ series: Array<{day: string, rate: number}> }} props
 */
function EngagementLineChart({ series }) {
  const W = 600;
  const H = 180;
  const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxRate = Math.max(...series.map((s) => s.rate)) * 1.1;
  const minRate = Math.max(0, Math.min(...series.map((s) => s.rate)) * 0.9);

  const toX = (i) => PAD.left + (i / (series.length - 1)) * innerW;
  const toY = (v) => PAD.top + innerH - ((v - minRate) / (maxRate - minRate)) * innerH;

  const linePath = series
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(s.rate).toFixed(1)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L${toX(series.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)}` +
    ` L${toX(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const yTicks = [minRate, (minRate + maxRate) / 2, maxRate].map((v) => ({ v, y: toY(v) }));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[320px]" aria-label="Engagement rate line chart">
        <defs>
          <linearGradient id="engGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis gridlines */}
        {yTicks.map(({ v, y }) => (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#71717a">{v.toFixed(1)}%</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#engGradient)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {series.map((s, i) => (
          <circle key={i} cx={toX(i)} cy={toY(s.rate)} r="4" fill="#6366f1" stroke="#18181b" strokeWidth="2">
            <title>{s.day}: {s.rate}%</title>
          </circle>
        ))}

        {/* X-axis labels (every other point) */}
        {series.map((s, i) =>
          i % 2 === 0 ? (
            <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#71717a">{s.day}</text>
          ) : null
        )}
      </svg>
    </div>
  );
}

/**
 * Audience retention waterfall bars
 * @param {{ data: Array<{label: string, value: number}> }} props
 */
function RetentionWaterfall({ data }) {
  return (
    <div className="flex items-end gap-1.5 h-36">
      {data.map(({ label, value }) => {
        const heightPct = value;
        const hue = Math.round(120 * (value / 100)); // green→red gradient
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-zinc-500 font-medium">{value}%</span>
            <div className="w-full rounded-t-sm transition-all duration-500" style={{
              height: `${heightPct}%`,
              background: `hsl(${hue}, 70%, 50%)`,
              minHeight: 4,
            }} title={`${label}: ${value}%`} />
            <span className="text-[8px] text-zinc-600 rotate-0 leading-none text-center">{label.split('–')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Activity feed item
 * @param {{ item: Object }} props
 */
function ActivityItem({ item }) {
  const platform = getPlatform(item.platform);
  const typeIcons = {
    comment: <MessageCircle className="w-3.5 h-3.5" />,
    like:    <Heart className="w-3.5 h-3.5" />,
    follow:  <Users className="w-3.5 h-3.5" />,
    share:   <Share2 className="w-3.5 h-3.5" />,
    message: <MessageCircle className="w-3.5 h-3.5" />,
  };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-700/40 last:border-0">
      <span
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
        style={{ backgroundColor: `${platform.color}33`, color: platform.accent }}
        title={platform.label}
      >
        {typeIcons[item.type] ?? <Activity className="w-3.5 h-3.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-zinc-300 text-xs font-medium">{item.user}</span>
        <span className="text-zinc-500 text-xs"> · {item.msg}</span>
      </div>
      <span className="text-[11px] text-zinc-600 shrink-0">{item.time}</span>
    </div>
  );
}

/**
 * Content performance table row
 * @param {{ item: Object }} props
 */
function ContentRow({ item }) {
  const platform = getPlatform(item.platform);
  return (
    <tr className="border-b border-zinc-700/40 last:border-0 hover:bg-zinc-700/20 transition-colors">
      <td className="py-3 px-4">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${platform.color}22`, color: platform.accent }}
        >
          <span>{platform.icon}</span>
          {platform.label}
        </span>
      </td>
      <td className="py-3 px-4 text-zinc-300 text-sm max-w-[180px] truncate">{item.title}</td>
      <td className="py-3 px-4 text-zinc-400 text-sm text-right">{fmtNum(item.views)}</td>
      <td className="py-3 px-4 text-zinc-400 text-sm text-right">{fmtNum(item.likes)}</td>
      <td className="py-3 px-4 text-sm text-right">
        <span className={`font-semibold ${item.eng >= 8 ? 'text-emerald-400' : item.eng >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
          {item.eng.toFixed(2)}%
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-right">
        {item.trend === 'up'
          ? <TrendingUp className="w-4 h-4 text-emerald-400 inline" />
          : <TrendingDown className="w-4 h-4 text-red-400 inline" />}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

/**
 * SocialAnalyticsDashboard
 *
 * Comprehensive real-time social media analytics dashboard.
 * Connects to a backend API (configured via env vars) and optionally uses
 * socket.io-client for live updates or falls back to polling.
 *
 * @param {{ initialMetrics?: Object, pollInterval?: number, darkMode?: boolean }} props
 */
export default function SocialAnalyticsDashboard({ initialMetrics, pollInterval = 30_000, darkMode = true }) {
  const [metrics, setMetrics]             = useState(initialMetrics ?? generateMockMetrics());
  const [activity, setActivity]           = useState(RECENT_ACTIVITY);
  const [content, setContent]             = useState(CONTENT_PERFORMANCE);
  const [engSeries, setEngSeries]         = useState(ENGAGEMENT_SERIES);
  const [comparisonField, setCompField]   = useState('views');
  const [connected, setConnected]         = useState(false);
  const [lastUpdated, setLastUpdated]     = useState(new Date());
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [filterPlatform, setFilterPlat]   = useState('all');
  const [exportMenuOpen, setExportMenu]   = useState(false);
  const socketRef = useRef(null);
  const pollRef   = useRef(null);

  // -------------------------------------------------------------------------
  // Live data: prefer socket.io, fallback to polling
  // -------------------------------------------------------------------------
  const fetchMetrics = useCallback(async () => {
    // API endpoint configured via env var (Vite: import.meta.env.VITE_API_BASE_URL)
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
    if (!baseUrl) {
      // No API configured — keep mock data, simulate minor variance
      setMetrics((prev) => {
        const updated = { ...prev };
        PLATFORMS.forEach(({ id }) => {
          if (updated[id]) {
            updated[id] = {
              ...updated[id],
              views:   updated[id].views   + Math.floor(Math.random() * 1200),
              likes:   updated[id].likes   + Math.floor(Math.random() * 80),
              reach:   updated[id].reach   + Math.floor(Math.random() * 900),
            };
          }
        });
        return updated;
      });
      setLastUpdated(new Date());
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/analytics/social`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data.metrics ?? data);
      if (data.activity) setActivity(data.activity);
      if (data.content)  setContent(data.content);
      if (data.engSeries) setEngSeries(data.engSeries);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[SocialAnalytics] fetch failed:', err.message);
    }
  }, []);

  useEffect(() => {
    // Attempt socket.io connection
    let io;
    try {
      // Dynamically import socket.io-client if available
      import('socket.io-client').then((mod) => {
        const socketUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL) || window.location.origin;
        io = mod.io(socketUrl, { path: '/api/socket', transports: ['websocket'] });
        socketRef.current = io;

        io.on('connect', () => setConnected(true));
        io.on('disconnect', () => setConnected(false));

        io.on('analytics:update', (data) => {
          if (data.metrics)   setMetrics(data.metrics);
          if (data.activity)  setActivity((prev) => [data.activity, ...prev].slice(0, 20));
          if (data.engSeries) setEngSeries(data.engSeries);
          setLastUpdated(new Date());
        });
      }).catch(() => {
        // socket.io-client not available — use polling
        setConnected(false);
      });
    } catch (_) {
      setConnected(false);
    }

    // Always set up polling as a safety net / fallback
    pollRef.current = setInterval(fetchMetrics, pollInterval);
    fetchMetrics(); // initial load

    return () => {
      clearInterval(pollRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [fetchMetrics, pollInterval]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMetrics();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleExportCSV = () => {
    const csv  = buildCSV(metrics);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `social-analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenu(false);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify({ metrics, activity: activity.slice(0, 20), engSeries }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `social-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenu(false);
  };

  // -------------------------------------------------------------------------
  // Derived totals
  // -------------------------------------------------------------------------
  const totals = Object.values(metrics).reduce(
    (acc, m) => ({
      views:     acc.views     + (m.views     ?? 0),
      likes:     acc.likes     + (m.likes     ?? 0),
      reach:     acc.reach     + (m.reach     ?? 0),
      retention: acc.retention + (m.retention ?? 0),
      count:     acc.count     + 1,
    }),
    { views: 0, likes: 0, reach: 0, retention: 0, count: 0 }
  );
  const avgRetention = totals.count ? Math.round(totals.retention / totals.count) : 0;

  const filteredPlatforms = filterPlatform === 'all'
    ? PLATFORMS
    : PLATFORMS.filter((p) => p.id === filterPlatform);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className={`min-h-screen bg-zinc-900 text-zinc-100 font-sans antialiased ${darkMode ? 'dark' : ''}`}>
      {/* ---- Header ---- */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 bg-zinc-900/95 backdrop-blur border-b border-zinc-700/60">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-indigo-400" />
          <h1 className="text-lg font-bold text-zinc-100">{i18n.dashboard_title}</h1>
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            {i18n.last_updated}: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${connected ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-zinc-600/40 bg-zinc-800 text-zinc-500'}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{connected ? 'Live' : 'Polling'}</span>
          </span>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
            title="Refresh"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Export menu */}
          <div className="relative">
            <button
              onClick={() => setExportMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-36 rounded-xl border border-zinc-700 bg-zinc-800 shadow-xl z-50 overflow-hidden">
                <button onClick={handleExportCSV}  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">{i18n.export_csv}</button>
                <button onClick={handleExportJSON} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">{i18n.export_json}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 md:px-6 py-6 space-y-8 max-w-screen-2xl mx-auto">

        {/* ---- 1. Platform connection cards ---- */}
        <section aria-labelledby="platforms-heading">
          <h2 id="platforms-heading" className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            {i18n.platform_connections}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            {PLATFORMS.map((p) => (
              <PlatformCard key={p.id} platform={p} metrics={metrics} />
            ))}
          </div>
        </section>

        {/* ---- 2. Real-time metric tiles ---- */}
        <section aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            {i18n.realtime_metrics}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricTile label={i18n.total_views}  value={fmtNum(totals.views)}  icon={<Eye className="w-5 h-5" />}     delta={4.2}  color="#6366f1" />
            <MetricTile label={i18n.total_likes}  value={fmtNum(totals.likes)}  icon={<Heart className="w-5 h-5" />}   delta={7.8}  color="#ec4899" />
            <MetricTile label={i18n.total_reach}  value={fmtNum(totals.reach)}  icon={<Radio className="w-5 h-5" />}   delta={-1.3} color="#f59e0b" />
            <MetricTile label={i18n.avg_retention} value={`${avgRetention}%`}   icon={<Zap className="w-5 h-5" />}     delta={2.1}  color="#10b981" />
          </div>
        </section>

        {/* ---- 3. Platform comparison + 4. Recent activity ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart */}
          <section className="lg:col-span-2 p-5 rounded-xl border border-zinc-700/60 bg-zinc-800/50" aria-labelledby="comparison-heading">
            <div className="flex items-center justify-between mb-5">
              <h2 id="comparison-heading" className="font-semibold text-zinc-100">{i18n.platform_comparison}</h2>
              <div className="flex gap-1">
                {['views', 'likes', 'reach', 'followers'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setCompField(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${comparisonField === f ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <PlatformBarChart metrics={metrics} field={comparisonField} label={comparisonField} />
          </section>

          {/* Activity feed */}
          <section className="p-5 rounded-xl border border-zinc-700/60 bg-zinc-800/50" aria-labelledby="activity-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="activity-heading" className="font-semibold text-zinc-100">{i18n.recent_activity}</h2>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <div className="overflow-y-auto max-h-64 pr-1">
              {activity.map((item) => <ActivityItem key={item.id} item={item} />)}
            </div>
          </section>
        </div>

        {/* ---- 5. Content performance table ---- */}
        <section aria-labelledby="content-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="content-heading" className="font-semibold text-zinc-100">{i18n.content_performance}</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <select
                className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={filterPlatform}
                onChange={(e) => setFilterPlat(e.target.value)}
                aria-label="Filter by platform"
              >
                <option value="all">All platforms</option>
                {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-800/80 text-[11px] uppercase tracking-widest text-zinc-500">
                    <th className="py-3 px-4">{i18n.platform}</th>
                    <th className="py-3 px-4">{i18n.content}</th>
                    <th className="py-3 px-4 text-right">{i18n.views}</th>
                    <th className="py-3 px-4 text-right">{i18n.likes}</th>
                    <th className="py-3 px-4 text-right">{i18n.eng_rate}</th>
                    <th className="py-3 px-4 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/30 bg-zinc-900/30">
                  {content
                    .filter((c) => filterPlatform === 'all' || c.platform === filterPlatform)
                    .map((item) => <ContentRow key={item.id} item={item} />)}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---- 6. Engagement rate graph + 7. Retention waterfall ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SVG line chart */}
          <section className="p-5 rounded-xl border border-zinc-700/60 bg-zinc-800/50" aria-labelledby="eng-heading">
            <h2 id="eng-heading" className="font-semibold text-zinc-100 mb-4">{i18n.engagement_rate} (14-day)</h2>
            <EngagementLineChart series={engSeries} />
          </section>

          {/* Retention waterfall */}
          <section className="p-5 rounded-xl border border-zinc-700/60 bg-zinc-800/50" aria-labelledby="retention-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="retention-heading" className="font-semibold text-zinc-100">{i18n.audience_retention}</h2>
              <span className="text-xs text-zinc-500">% viewers remaining by video segment</span>
            </div>
            <RetentionWaterfall data={RETENTION_WATERFALL} />
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>Start</span>
              <span>End of content</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-zinc-600 py-4 border-t border-zinc-700/40">
          NexusAI Pro · Social Analytics · {i18n.last_updated}: {lastUpdated.toLocaleString()} · Data refreshes every {pollInterval / 1000}s
        </footer>
      </main>
    </div>
  );
}
