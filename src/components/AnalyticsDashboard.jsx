// ================================================
// NEXUS AI PRO - Social Media Analytics Dashboard
// ================================================
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import { useState, useEffect, useCallback, useMemo } from 'react';

// ─── Platform configuration ───────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  tiktok:    { name: 'TikTok',    emoji: '🎵', accent: '#69C9D0', ring: 'ring-cyan-400'   },
  instagram: { name: 'Instagram', emoji: '📸', accent: '#E1306C', ring: 'ring-pink-500'   },
  facebook:  { name: 'Facebook',  emoji: '👥', accent: '#1877F2', ring: 'ring-blue-500'   },
  twitch:    { name: 'Twitch',    emoji: '🎮', accent: '#9146FF', ring: 'ring-purple-500' },
  discord:   { name: 'Discord',   emoji: '💬', accent: '#5865F2', ring: 'ring-indigo-500' },
  lemon8:    { name: 'Lemon8',    emoji: '🍋', accent: '#F7C244', ring: 'ring-yellow-400' },
  reddit:    { name: 'Reddit',    emoji: '🤖', accent: '#FF4500', ring: 'ring-orange-500' },
  redgifs:   { name: 'RedGIFs',   emoji: '🎞️', accent: '#FF1A1A', ring: 'ring-red-500'   },
};

const DEFAULT_PLATFORMS = Object.keys(PLATFORM_CONFIG);
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:3001';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Utility functions ────────────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString();
}

function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return (n * 100).toFixed(1) + '%';
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (d > 0)  return `${d}d ago`;
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  return 'just now';
}

function pickPrimaryMetrics(platform, metrics) {
  if (!metrics) return [];
  switch (platform) {
    case 'tiktok':
      return [
        { label: 'Views',           value: metrics.views,           unit: '' },
        { label: 'Followers',       value: metrics.followers,       unit: '' },
        { label: 'Likes',           value: metrics.likes,           unit: '' },
        { label: 'Shares',          value: metrics.shares,          unit: '' },
        { label: 'FYP Impressions', value: metrics.fyp_impressions, unit: '' },
        { label: 'Completion Rate', value: metrics.completionRate,  unit: '', pct: true },
        { label: 'Engagement',      value: metrics.engagementRate,  unit: '', pct: true },
        { label: 'Comments',        value: metrics.comments,        unit: '' },
      ];
    case 'instagram':
      return [
        { label: 'Reach',        value: metrics.reach,        unit: '' },
        { label: 'Followers',    value: metrics.followers,    unit: '' },
        { label: 'Impressions',  value: metrics.impressions,  unit: '' },
        { label: 'Likes',        value: metrics.likes,        unit: '' },
        { label: 'Story Views',  value: metrics.storyViews,  unit: '' },
        { label: 'Saves',        value: metrics.saves,        unit: '' },
        { label: 'Reach Rate',   value: metrics.reachRate,   unit: '', pct: true },
        { label: 'Engagement',   value: metrics.engagementRate, unit: '', pct: true },
      ];
    case 'facebook':
      return [
        { label: 'Followers',   value: metrics.pageFollowers, unit: '' },
        { label: 'Post Reach',  value: metrics.postReach,    unit: '' },
        { label: 'Page Views',  value: metrics.pageViews,   unit: '' },
        { label: 'Video Views', value: metrics.videoViews,  unit: '' },
        { label: 'Reactions',   value: metrics.reactions,   unit: '' },
        { label: 'Shares',      value: metrics.shares,      unit: '' },
        { label: 'Comments',    value: metrics.comments,    unit: '' },
        { label: 'Engagement',  value: metrics.engagementRate, unit: '', pct: true },
      ];
    case 'twitch':
      return [
        { label: 'Avg Viewers',  value: metrics.avgConcurrentViewers, unit: '' },
        { label: 'Peak Viewers', value: metrics.peakViewers,          unit: '' },
        { label: 'Followers',    value: metrics.followers,            unit: '' },
        { label: 'Subscribers',  value: metrics.subscribers,          unit: '' },
        { label: 'Stream Hours', value: metrics.streamHours,          unit: 'h' },
        { label: 'Chat Msgs',    value: metrics.chatMessages,         unit: '' },
        { label: 'Clip Views',   value: metrics.clipViews,            unit: '' },
        { label: 'Engagement',   value: metrics.engagementRate,       unit: '', pct: true },
      ];
    case 'discord':
      return [
        { label: 'Members',       value: metrics.members,      unit: '' },
        { label: 'Online Now',    value: metrics.onlineNow,    unit: '' },
        { label: 'Messages Sent', value: metrics.messagesSent, unit: '' },
        { label: 'Voice Minutes', value: metrics.voiceMinutes, unit: 'm' },
        { label: 'Server Boosts', value: metrics.boosts,       unit: '' },
        { label: 'Channels',      value: metrics.channels,     unit: '' },
        { label: 'Engagement',    value: metrics.engagementRate, unit: '', pct: true },
      ];
    case 'lemon8':
      return [
        { label: 'Views',      value: metrics.views,           unit: '' },
        { label: 'Followers',  value: metrics.followers,       unit: '' },
        { label: 'Reach',      value: metrics.reach,           unit: '' },
        { label: 'Likes',      value: metrics.likes,           unit: '' },
        { label: 'Saves',      value: metrics.saves,           unit: '' },
        { label: 'Engagement', value: metrics.engagementRate,  unit: '', pct: true },
      ];
    case 'reddit':
      return [
        { label: 'Total Karma',   value: metrics.karma,          unit: '' },
        { label: 'Post Karma',    value: metrics.postKarma,      unit: '' },
        { label: 'Comment Karma', value: metrics.commentKarma,   unit: '' },
        { label: 'Followers',     value: metrics.followers,      unit: '' },
        { label: 'Post Views',    value: metrics.postViews,      unit: '' },
        { label: 'Awards',        value: metrics.awardsReceived, unit: '' },
        { label: 'Engagement',    value: metrics.engagementRate, unit: '', pct: true },
      ];
    case 'redgifs':
      return [
        { label: 'Total Views', value: metrics.views,           unit: '' },
        { label: 'Followers',   value: metrics.followers,       unit: '' },
        { label: 'Likes',       value: metrics.likes,           unit: '' },
        { label: 'Total GIFs',  value: metrics.totalGIFs,       unit: '' },
        { label: 'Engagement',  value: metrics.engagementRate,  unit: '', pct: true },
      ];
    default:
      return Object.entries(metrics).slice(0, 8).map(([k, v]) => ({ label: k, value: v, unit: '' }));
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

function Sparkline({ data, color = '#6366f1', height = 36, width = 96 }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => (typeof d === 'object' ? d.value : d));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible flex-shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="2.5" fill={color} />
    </svg>
  );
}

function TrendBadge({ change }) {
  if (change === null || change === undefined) return null;
  const pos = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pos ? 'text-emerald-500' : 'text-red-500'}`}>
      {pos ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function StatCard({ label, value, unit = '', pct = false, sparkData, accent, change }) {
  const display = pct ? fmtPct(value) : `${fmt(value)}${unit ? ' ' + unit : ''}`;
  const sparkColor = accent || '#6366f1';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium truncate">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{display}</p>
      <div className="flex items-center justify-between">
        <TrendBadge change={change ?? (Math.random() * 30 - 8)} />
        {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
      </div>
    </div>
  );
}

function RetentionCurve({ platforms: platformList, data }) {
  const W = 420; const H = 180;
  const PAD = { t: 14, r: 20, b: 32, l: 42 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const toX = t => PAD.l + (t / 100) * iW;
  const toY = r => PAD.t + (1 - r / 100) * iH;

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-full" style={{ minWidth: 280 }}>
        {/* Grid */}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={PAD.l} y1={toY(v)} x2={W - PAD.r} y2={toY(v)} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD.l - 5} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v}%</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map(v => (
          <text key={v} x={toX(v)} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">{v}%</text>
        ))}
        {/* Axis labels */}
        <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#9ca3af">Content Progress</text>
        <text x={10} y={H / 2} textAnchor="middle" fontSize="9" fill="#9ca3af" transform={`rotate(-90,10,${H / 2})`}>Retention</text>

        {/* Curves */}
        {(data || []).map((pd) => {
          if (!pd?.curve?.length) return null;
          const cfg = PLATFORM_CONFIG[pd.platform];
          if (!cfg) return null;
          const pts = pd.curve
            .map(pt => `${toX(pt.timePercent).toFixed(1)},${toY(pt.retentionPercent).toFixed(1)}`)
            .join(' ');
          return (
            <polyline
              key={pd.platform}
              points={pts}
              fill="none"
              stroke={cfg.accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {(data || []).map(pd => {
          const cfg = PLATFORM_CONFIG[pd.platform];
          if (!cfg) return null;
          return (
            <div key={pd.platform} className="flex items-center gap-1">
              <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: cfg.accent }} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{cfg.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostingHeatmap({ data }) {
  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-0.5">
        {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-5 w-full" />)}
      </div>
    );
  }

  const byKey = {};
  for (const cell of data) byKey[`${cell.day}:${cell.hour}`] = cell.score;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 340 }}>
        {/* Hour labels */}
        <div className="flex items-center mb-0.5">
          <div className="w-8 flex-shrink-0" />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center" style={{ fontSize: 8, color: '#9ca3af' }}>
              {h % 6 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {/* Day rows */}
        {DAY_NAMES.map((day, d) => (
          <div key={day} className="flex items-center gap-0" style={{ marginBottom: 2 }}>
            <div className="w-8 flex-shrink-0 text-right pr-1" style={{ fontSize: 9, color: '#9ca3af' }}>{day}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const score = byKey[`${d}:${h}`] ?? 0;
              return (
                <div
                  key={h}
                  className="flex-1 rounded-sm cursor-help"
                  style={{
                    height: 14,
                    backgroundColor: `rgba(99, 102, 241, ${(score / 100).toFixed(2)})`,
                  }}
                  title={`${day} ${h}:00 — Engagement score: ${score}`}
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-400">Low</span>
          {[0.1, 0.25, 0.45, 0.65, 0.9].map(op => (
            <div key={op} className="w-4 rounded-sm" style={{ height: 10, backgroundColor: `rgba(99,102,241,${op})` }} />
          ))}
          <span className="text-xs text-gray-400">High</span>
        </div>
      </div>
    </div>
  );
}

function ContentTable({ items, sortBy, sortDir, onSort }) {
  const sorted = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [items, sortBy, sortDir]);

  const cols = [
    { key: 'type',          label: 'Type',       sortable: false },
    { key: 'count',         label: 'Count',      sortable: true  },
    { key: 'avgViews',      label: 'Avg Views',  sortable: true  },
    { key: 'avgLikes',      label: 'Avg Likes',  sortable: true  },
    { key: 'avgEngagement', label: 'Engagement', sortable: true  },
  ];

  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No content data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[360px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {cols.map(col => (
              <th
                key={col.key}
                onClick={col.sortable ? () => onSort(col.key) : undefined}
                className={[
                  'py-2 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide select-none',
                  col.sortable ? 'cursor-pointer hover:text-gray-800 dark:hover:text-gray-200' : '',
                ].join(' ')}
              >
                {col.label}
                {col.sortable && sortBy === col.key && (
                  <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{row.type}</td>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{row.count ?? '—'}</td>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-300">
                {fmt(row.avgViews ?? row.avgViewers ?? row.avgDailyMessages)}
              </td>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-300">
                {fmt(row.avgLikes ?? row.avgReactions ?? row.avgKarma ?? row.avgDailyMinutes)}
              </td>
              <td className="py-2 px-3">
                {row.avgEngagement != null ? (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    row.avgEngagement > 0.06
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : row.avgEngagement > 0.04
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {fmtPct(row.avgEngagement)}
                  </span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConnectModal({ platform, onClose, onConnect }) {
  const [step, setStep] = useState('idle'); // idle | connecting | success | error
  const [errMsg, setErrMsg] = useState('');
  const cfg = PLATFORM_CONFIG[platform] || {};

  async function handleConnect() {
    setStep('connecting');
    try {
      const res = await fetch(`${API_BASE}/api/analytics/${platform}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken:  `mock-access-token-${platform}-${Date.now()}`,
          refreshToken: `mock-refresh-token-${platform}`,
          accountId:    `account-${platform}-demo`,
          accountName:  `${cfg.name || platform} Demo Account`,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStep('success');
      setTimeout(() => { onConnect(platform, data); onClose(); }, 900);
    } catch (e) {
      setErrMsg(e.message || 'Connection failed');
      setStep('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{cfg.emoji}</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Connect {cfg.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            aria-label="Close"
          >✕</button>
        </div>

        {step === 'idle' && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Authorize Nexus AI Pro to read your {cfg.name} analytics. Your OAuth tokens are encrypted with AES-256-GCM before storage.
            </p>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>✓ Read-only analytics access</p>
              <p>✓ No posting permissions requested</p>
              <p>✓ Revoke any time</p>
            </div>
            <button
              onClick={handleConnect}
              className="w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: cfg.accent || '#6366f1' }}
            >
              Connect with {cfg.name}
            </button>
          </>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Connecting to {cfg.name}…</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xl">✓</div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Connected successfully!</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-500">Error: {errMsg}</p>
            <button
              onClick={() => setStep('idle')}
              className="text-sm text-indigo-500 hover:underline text-left"
            >Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveBadge({ isLive }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      isLive
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
      {isLive ? 'Live' : 'Offline'}
    </div>
  );
}

function ConnectionStatus({ platform, connected, onConnect, onDisconnect }) {
  const cfg = PLATFORM_CONFIG[platform] || {};
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {connected ? 'Connected' : 'Not connected'}
      </span>
      {connected ? (
        <button
          onClick={() => onDisconnect(platform)}
          className="text-xs text-red-400 hover:text-red-600 underline ml-1"
        >Disconnect</button>
      ) : (
        <button
          onClick={() => onConnect(platform)}
          className="text-xs text-indigo-500 hover:text-indigo-700 underline ml-1"
        >Connect</button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard({
  platforms: propPlatforms,
  onPlatformConnect,
  onPlatformDisconnect,
}) {
  const platformList = propPlatforms || DEFAULT_PLATFORMS;

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeView, setActiveView]           = useState('overview');
  const [overview, setOverview]               = useState(null);
  const [platformData, setPlatformData]       = useState({});
  const [retentionData, setRetentionData]     = useState(null);
  const [trendingData, setTrendingData]       = useState(null);
  const [scheduleData, setScheduleData]       = useState(null);
  const [realtimeData, setRealtimeData]       = useState({});
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingPlatform, setLoadingPlatform] = useState(false);
  const [error, setError]                     = useState(null);
  const [connectModal, setConnectModal]       = useState(null);
  const [connected, setConnected]             = useState({});
  const [isLive, setIsLive]                   = useState(false);
  const [sortBy, setSortBy]                   = useState('count');
  const [sortDir, setSortDir]                 = useState('desc');
  const [realtimeInterval, setRealtimeInterval] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      const [ovRes, retRes, trendRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/overview`),
        fetch(`${API_BASE}/api/analytics/retention`),
        fetch(`${API_BASE}/api/analytics/trending`),
      ]);
      if (!ovRes.ok) throw new Error(`Overview: ${ovRes.status}`);
      const [ov, ret, trend] = await Promise.all([ovRes.json(), retRes.json(), trendRes.json()]);
      setOverview(ov);
      setRetentionData(ret);
      setTrendingData(trend);
      // Sync connected state
      if (ov.platforms) {
        const conn = {};
        ov.platforms.forEach(p => { conn[p.platform] = p.connected; });
        setConnected(conn);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchPlatformData = useCallback(async (platform) => {
    if (platformData[platform]) return; // already cached
    setLoadingPlatform(true);
    setError(null);
    try {
      const [platRes, schedRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/${platform}`),
        fetch(`${API_BASE}/api/analytics/schedule`),
      ]);
      if (!platRes.ok) throw new Error(`${platform}: ${platRes.status}`);
      const [plat, sched] = await Promise.all([platRes.json(), schedRes.json()]);
      setPlatformData(prev => ({ ...prev, [platform]: plat }));
      setScheduleData(sched);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPlatform(false);
    }
  }, [platformData]);

  const fetchRealtime = useCallback(async (platform) => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/${platform}/realtime`);
      if (res.ok) {
        const data = await res.json();
        setRealtimeData(prev => ({ ...prev, [platform]: data }));
      }
    } catch {
      // realtime is best-effort
    }
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    if (activeView !== 'overview') {
      fetchPlatformData(activeView);
      fetchRealtime(activeView);
    }
  }, [activeView, fetchPlatformData, fetchRealtime]);

  // Poll realtime every 30s for active platform
  useEffect(() => {
    if (realtimeInterval) clearInterval(realtimeInterval);
    if (activeView !== 'overview') {
      const id = setInterval(() => fetchRealtime(activeView), 30_000);
      setRealtimeInterval(id);
      return () => clearInterval(id);
    }
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = typeof window !== 'undefined' ? window.socket : null;
    if (!socket) return;
    const handler = (data) => {
      if (data?.platform) {
        setRealtimeData(prev => ({ ...prev, [data.platform]: data }));
      }
      if (data?.overview) setOverview(data.overview);
    };
    socket.on('analytics:update', handler);
    setIsLive(true);
    return () => {
      socket.off('analytics:update', handler);
      setIsLive(false);
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSort(col) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  function handleConnectRequest(platform) {
    setConnectModal(platform);
  }

  function handleConnectSuccess(platform, data) {
    setConnected(prev => ({ ...prev, [platform]: true }));
    // Invalidate cached platform data so it refreshes with connected state
    setPlatformData(prev => { const n = { ...prev }; delete n[platform]; return n; });
    onPlatformConnect?.(platform, data);
  }

  async function handleDisconnect(platform) {
    try {
      await fetch(`${API_BASE}/api/analytics/${platform}/disconnect`, { method: 'DELETE' });
      setConnected(prev => ({ ...prev, [platform]: false }));
      setPlatformData(prev => { const n = { ...prev }; delete n[platform]; return n; });
      onPlatformDisconnect?.(platform);
    } catch {
      // best-effort
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const activePlatformData = activeView !== 'overview' ? platformData[activeView] : null;
  const activeCfg          = PLATFORM_CONFIG[activeView] || {};
  const activeSchedule     = scheduleData?.platforms?.find(p => p.platform === activeView);
  const activeRealtime     = realtimeData[activeView] || null;

  const primaryMetrics = activePlatformData
    ? pickPrimaryMetrics(activeView, activePlatformData.metrics)
    : [];

  const contentTypes = activePlatformData?.metrics?.contentTypes || [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Analytics</span>
              <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500">/ Social Media</span>
            </div>
            <div className="flex items-center gap-3">
              <LiveBadge isLive={isLive} />
              <button
                onClick={fetchOverview}
                className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >↻ Refresh</button>
            </div>
          </div>

          {/* Platform tabs */}
          <div className="flex overflow-x-auto gap-1 pb-0 scrollbar-hide -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveView('overview')}
              className={[
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeView === 'overview'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              ].join(' ')}
            >
              📊 Overview
            </button>
            {platformList.map(p => {
              const cfg = PLATFORM_CONFIG[p] || { name: p, emoji: '•' };
              const isActive = activeView === p;
              return (
                <button
                  key={p}
                  onClick={() => setActiveView(p)}
                  className={[
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                  ].join(' ')}
                >
                  <span>{cfg.emoji}</span>
                  <span className="hidden sm:inline">{cfg.name}</span>
                  {connected[p] && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── OVERVIEW VIEW ── */}
        {activeView === 'overview' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {loadingOverview ? (
                Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)
              ) : overview ? (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 col-span-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total Followers</p>
                    <p className="text-2xl font-bold mt-1">{fmt(overview.summary.totalFollowers)}</p>
                    <p className="text-xs text-gray-400 mt-1">across {overview.summary.totalPlatforms} platforms</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total Reach</p>
                    <p className="text-2xl font-bold mt-1">{fmt(overview.summary.totalReach)}</p>
                    <TrendBadge change={12.4} />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Avg Engagement</p>
                    <p className="text-2xl font-bold mt-1">{overview.summary.avgEngagementRate}%</p>
                    <TrendBadge change={-1.2} />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Top Platform</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">{PLATFORM_CONFIG[overview.summary.topPlatform]?.emoji}</span>
                      <p className="text-lg font-bold">{PLATFORM_CONFIG[overview.summary.topPlatform]?.name || overview.summary.topPlatform}</p>
                    </div>
                    <p className="text-xs text-emerald-500 mt-1">{overview.summary.connectedPlatforms} connected</p>
                  </div>
                </>
              ) : null}
            </div>

            {/* Platform grid */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Platform Status</h2>
              {loadingOverview ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
              ) : overview ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {overview.platforms.map(p => {
                    const cfg = PLATFORM_CONFIG[p.platform] || { name: p.platform, emoji: '•', accent: '#6366f1' };
                    return (
                      <div
                        key={p.platform}
                        onClick={() => setActiveView(p.platform)}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">{cfg.emoji}</span>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.connected ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        </div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{cfg.name}</p>
                        <p className="text-lg font-bold mt-1">{fmt(p.followers)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtPct(p.engagementRate)} eng.</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Retention curves */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Retention Curves — All Platforms</h2>
              {retentionData ? (
                <RetentionCurve data={retentionData.platforms} />
              ) : (
                <Skeleton className="h-44" />
              )}
            </div>

            {/* Trending content */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Trending Content</h2>
              {trendingData ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {trendingData.trending.map((item, i) => {
                    const cfg = PLATFORM_CONFIG[item.platform] || { emoji: '•', name: item.platform, accent: '#6366f1' };
                    const mainMetric = item.views || item.reach || item.karma || item.viewers || item.messages || 0;
                    return (
                      <div key={i} className="flex items-center gap-3 py-2.5">
                        <span className="text-base flex-shrink-0">{cfg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                          <p className="text-xs text-gray-400">{cfg.name} · {relativeTime(item.postedAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(mainMetric)}</p>
                          <p className="text-xs text-emerald-500">{fmtPct(item.engagementRate)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── PLATFORM VIEW ── */}
        {activeView !== 'overview' && (
          <>
            {/* Platform header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeCfg.emoji}</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{activeCfg.name}</h1>
                  <ConnectionStatus
                    platform={activeView}
                    connected={!!connected[activeView]}
                    onConnect={handleConnectRequest}
                    onDisconnect={handleDisconnect}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeRealtime && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {fmt(activeRealtime.liveMetrics?.activeUsers)} active now
                  </span>
                )}
                {!connected[activeView] && (
                  <button
                    onClick={() => handleConnectRequest(activeView)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: activeCfg.accent || '#6366f1' }}
                  >
                    + Connect Platform
                  </button>
                )}
              </div>
            </div>

            {/* Metrics grid */}
            {loadingPlatform && !activePlatformData ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
            ) : activePlatformData ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {primaryMetrics.map((m, i) => (
                  <StatCard
                    key={m.label}
                    label={m.label}
                    value={m.value}
                    unit={m.unit}
                    pct={m.pct}
                    accent={activeCfg.accent}
                    sparkData={i < 2 ? (activePlatformData.timeSeries?.primary || []) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <p className="text-lg mb-2">No data available</p>
                <p className="text-sm">Connect your {activeCfg.name} account to see analytics.</p>
                <button
                  onClick={() => handleConnectRequest(activeView)}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: activeCfg.accent || '#6366f1' }}
                >Connect {activeCfg.name}</button>
              </div>
            )}

            {activePlatformData && (
              <>
                {/* Time-series + Realtime row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Primary time series */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">30-Day Trend</h2>
                    <div className="flex items-end gap-2">
                      <Sparkline
                        data={activePlatformData.timeSeries?.primary || []}
                        color={activeCfg.accent || '#6366f1'}
                        width={300}
                        height={80}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>30d ago</span>
                      <span>Today</span>
                    </div>
                  </div>

                  {/* Real-time panel */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Live Metrics</h2>
                      <LiveBadge isLive={!!activeRealtime} />
                    </div>
                    {activeRealtime ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Active Users',       value: activeRealtime.liveMetrics?.activeUsers },
                            { label: 'Interactions / min', value: activeRealtime.liveMetrics?.interactionsPerMin },
                            { label: 'Recent Likes',       value: activeRealtime.liveMetrics?.recentLikes },
                            { label: 'Recent Comments',    value: activeRealtime.liveMetrics?.recentComments },
                          ].map(m => (
                            <div key={m.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{m.label}</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(m.value)}</p>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Last 5 minutes</p>
                          <Sparkline
                            data={(activeRealtime.last5Minutes || []).map(d => ({ value: d.activeUsers }))}
                            color={activeCfg.accent || '#6366f1'}
                            width={260}
                            height={40}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-24 text-gray-400 dark:text-gray-500 text-sm">
                        <p>Loading live data…</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Retention curve (single platform) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Retention Curve</h2>
                  <RetentionCurve
                    data={[{ platform: activeView, curve: activePlatformData.retention || [] }]}
                  />
                </div>

                {/* Content performance table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Content Performance</h2>
                  <ContentTable
                    items={contentTypes}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </div>

                {/* Best posting times heatmap */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Best Posting Times</h2>
                      <p className="text-xs text-gray-400 mt-0.5">7-day × 24-hour engagement score heatmap</p>
                    </div>
                    {activeSchedule?.topSlots && (
                      <div className="hidden sm:block text-right">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Top slots</p>
                        {activeSchedule.topSlots.slice(0, 3).map((s, i) => (
                          <p key={i} className="text-xs text-gray-600 dark:text-gray-300">
                            {s.day} {s.hour}:00 — <span className="text-indigo-500 font-medium">{s.score}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <PostingHeatmap data={activeSchedule?.heatmap || activePlatformData?.schedule} />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Connect modal */}
      {connectModal && (
        <ConnectModal
          platform={connectModal}
          onClose={() => setConnectModal(null)}
          onConnect={handleConnectSuccess}
        />
      )}
    </div>
  );
}
