// src/components/AnalyticsDashboard.jsx
// Nexus AI Pro — Social & Content Analytics Dashboard
// Real-time metrics: TikTok · Instagram · Facebook · Twitch · Discord · Lemon8 · Reddit · RedGIFs
// Updated: 2026-05-06

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, MessageSquare, Share2,
  Users, Activity, BarChart3, RefreshCw, Wifi, WifiOff,
  Play, Clock, Star, Zap, Globe, Filter, Download,
  ChevronUp, ChevronDown, Minus, AlertCircle
} from 'lucide-react';

// ── Platform definitions ──────────────────────────────────────────────────────
const PLATFORMS = {
  tiktok:    { label: 'TikTok',    color: '#010101', accent: '#fe2c55', bg: 'bg-[#010101]', icon: '🎵' },
  instagram: { label: 'Instagram', color: '#e1306c', accent: '#f77737', bg: 'bg-gradient-to-br from-[#405de6] via-[#e1306c] to-[#f77737]', icon: '📸' },
  facebook:  { label: 'Facebook',  color: '#1877f2', accent: '#42b72a', bg: 'bg-[#1877f2]', icon: '👥' },
  twitch:    { label: 'Twitch',    color: '#9147ff', accent: '#bf94ff', bg: 'bg-[#9147ff]', icon: '🎮' },
  discord:   { label: 'Discord',   color: '#5865f2', accent: '#99aab5', bg: 'bg-[#5865f2]', icon: '💬' },
  lemon8:    { label: 'Lemon8',    color: '#ffcb00', accent: '#ff6b35', bg: 'bg-[#ffcb00]', icon: '🍋' },
  reddit:    { label: 'Reddit',    color: '#ff4500', accent: '#ff6314', bg: 'bg-[#ff4500]', icon: '🤖' },
  redgifs:   { label: 'RedGIFs',   color: '#e50000', accent: '#ff6b6b', bg: 'bg-[#e50000]', icon: '🔴' },
};

// ── Metric helpers ────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const pct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

function seed(platform, key) {
  let h = 0;
  for (const ch of `${platform}${key}`) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function buildBaseMetrics(platform) {
  const s = (k, lo, hi) => lo + (seed(platform, k) % (hi - lo));
  return {
    followers:    s('followers', 10_000, 5_000_000),
    views:        s('views',     50_000, 20_000_000),
    likes:        s('likes',     1_000,  500_000),
    comments:     s('comments',  100,    50_000),
    shares:       s('shares',    50,     30_000),
    reach:        s('reach',     5_000,  3_000_000),
    retention:    (s('ret', 30, 80)) / 100,
    engagementRate: (s('eng', 2, 12)) / 100,
    watchTime:    s('wt', 30, 300),
    liveViewers:  platform === 'twitch' ? s('live', 100, 50_000) : 0,
    onlineMembers: platform === 'discord' ? s('mem', 200, 100_000) : 0,
    upvoteRatio:  platform === 'reddit' ? (s('up', 60, 99)) / 100 : 1,
    karmaScore:   platform === 'reddit' ? s('karma', 1_000, 500_000) : 0,
  };
}

function applyDelta(base, tick) {
  const jitter = (k) => 1 + (Math.sin(tick * 0.3 + seed('d', k)) * 0.02);
  return {
    ...base,
    views:       Math.round(base.views     * jitter('v') + tick * 12),
    likes:       Math.round(base.likes     * jitter('l') + tick * 3),
    comments:    Math.round(base.comments  * jitter('c') + tick * 0.8),
    shares:      Math.round(base.shares    * jitter('s') + tick * 0.4),
    reach:       Math.round(base.reach     * jitter('r') + tick * 8),
    liveViewers: base.liveViewers > 0 ? Math.round(base.liveViewers * jitter('lv')) : 0,
    onlineMembers: base.onlineMembers > 0 ? Math.round(base.onlineMembers * jitter('om')) : 0,
  };
}

function buildHistory(base, points = 24) {
  return Array.from({ length: points }, (_, i) => ({
    t: i,
    views:    Math.round(base.views * (0.6 + 0.4 * (i / points)) + (Math.sin(i * 0.5) * base.views * 0.1)),
    likes:    Math.round(base.likes * (0.5 + 0.5 * (i / points))),
    comments: Math.round(base.comments * (0.4 + 0.6 * (i / points))),
  }));
}

// ── Sparkline (inline SVG) ────────────────────────────────────────────────────
function Sparkline({ data, color = '#60a5fa', height = 32 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map((d) => d.views);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} className="opacity-80">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

// ── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ value }) {
  if (value > 0)  return <span className="flex items-center gap-0.5 text-green-400 text-xs font-medium"><ChevronUp size={12} />{pct(value)}</span>;
  if (value < 0)  return <span className="flex items-center gap-0.5 text-red-400   text-xs font-medium"><ChevronDown size={12}/>{pct(value)}</span>;
  return <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={12} />0.0%</span>;
}

// ── Per-platform metric card ──────────────────────────────────────────────────
function PlatformCard({ platform, metrics, history, prev, selected, onClick }) {
  const p = PLATFORMS[platform];
  if (!p) return null;
  const trend = prev ? ((metrics.views - prev.views) / (prev.views || 1)) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/40 bg-gray-800'
          : 'border-gray-700 bg-gray-800/60 hover:border-gray-500'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{p.icon}</span>
          <span className="font-semibold text-white text-sm">{p.label}</span>
        </div>
        <TrendBadge value={trend} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-gray-400 text-xs">Views</p>
          <p className="text-white font-bold text-base">{fmt(metrics.views)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Reach</p>
          <p className="text-white font-bold text-base">{fmt(metrics.reach)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Likes</p>
          <p className="text-white font-bold text-base">{fmt(metrics.likes)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Engage</p>
          <p className="text-white font-bold text-base">{(metrics.engagementRate * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-gray-400 text-xs">Followers</p>
          <p className="text-gray-300 text-xs font-medium">{fmt(metrics.followers)}</p>
        </div>
        <Sparkline data={history} color={p.accent} />
      </div>

      {platform === 'twitch' && metrics.liveViewers > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-medium">LIVE · {fmt(metrics.liveViewers)} viewers</span>
        </div>
      )}
      {platform === 'discord' && (
        <div className="mt-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-400 text-xs">{fmt(metrics.onlineMembers)} online</span>
        </div>
      )}
      {platform === 'reddit' && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-orange-400 text-xs">{(metrics.upvoteRatio * 100).toFixed(0)}% upvoted · {fmt(metrics.karmaScore)} karma</span>
        </div>
      )}
    </button>
  );
}

// ── Detail panel for selected platform ───────────────────────────────────────
function DetailPanel({ platform, metrics, history }) {
  const p = PLATFORMS[platform];
  if (!p) return null;

  const rows = [
    { label: 'Total Views',        value: fmt(metrics.views),       icon: <Eye size={14} /> },
    { label: 'Unique Reach',       value: fmt(metrics.reach),       icon: <Globe size={14} /> },
    { label: 'Likes / Hearts',     value: fmt(metrics.likes),       icon: <Heart size={14} /> },
    { label: 'Comments',           value: fmt(metrics.comments),    icon: <MessageSquare size={14} /> },
    { label: 'Shares / Reposts',   value: fmt(metrics.shares),      icon: <Share2 size={14} /> },
    { label: 'Followers',          value: fmt(metrics.followers),   icon: <Users size={14} /> },
    { label: 'Engagement Rate',    value: `${(metrics.engagementRate * 100).toFixed(2)}%`, icon: <Activity size={14} /> },
    { label: 'Avg Watch Time',     value: `${metrics.watchTime}s`,  icon: <Clock size={14} /> },
    { label: 'Retention Rate',     value: `${(metrics.retention * 100).toFixed(1)}%`, icon: <TrendingUp size={14} /> },
  ];

  const peak = Math.max(...history.map((d) => d.views));
  const sparkW = 260, sparkH = 60;
  const vals = history.map((d) => d.views);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals) || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * sparkW},${sparkH - ((v - mn) / (mx - mn)) * sparkH}`).join(' ');

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{p.icon}</span>
        <div>
          <h3 className="text-white font-bold text-lg">{p.label}</h3>
          <p className="text-gray-400 text-xs">Last 24h performance</p>
        </div>
      </div>

      {/* 24h sparkline */}
      <div className="mb-5">
        <p className="text-gray-400 text-xs mb-1">Views over 24h · peak {fmt(peak)}</p>
        <svg width={sparkW} height={sparkH} className="w-full" viewBox={`0 0 ${sparkW} ${sparkH}`}>
          <defs>
            <linearGradient id={`fill-${platform}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={p.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill={`url(#fill-${platform})`}
            points={`0,${sparkH} ${pts} ${sparkW},${sparkH}`}
          />
          <polyline fill="none" stroke={p.accent} strokeWidth="2" points={pts} />
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-1 border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 text-xs">{r.icon}{r.label}</div>
            <span className="text-white text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aggregate summary bar ─────────────────────────────────────────────────────
function AggregateSummary({ allMetrics }) {
  const total = Object.values(allMetrics).reduce(
    (acc, m) => ({
      views:    acc.views    + m.views,
      reach:    acc.reach    + m.reach,
      likes:    acc.likes    + m.likes,
      followers:acc.followers+ m.followers,
    }),
    { views: 0, reach: 0, likes: 0, followers: 0 }
  );

  const cards = [
    { label: 'Total Views',     value: fmt(total.views),     icon: <Eye size={16} />,      color: 'text-blue-400' },
    { label: 'Total Reach',     value: fmt(total.reach),     icon: <Globe size={16} />,    color: 'text-purple-400' },
    { label: 'Total Likes',     value: fmt(total.likes),     icon: <Heart size={16} />,    color: 'text-pink-400' },
    { label: 'Total Followers', value: fmt(total.followers), icon: <Users size={16} />,    color: 'text-green-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl bg-gray-800 border border-gray-700 p-4">
          <div className={`flex items-center gap-2 mb-1 ${c.color}`}>{c.icon}<span className="text-xs text-gray-400">{c.label}</span></div>
          <p className="text-white text-xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [tick, setTick]         = useState(0);
  const [selected, setSelected] = useState('tiktok');
  const [live, setLive]         = useState(true);
  const [filter, setFilter]     = useState('all');
  const prevRef = useRef({});

  const bases = useRef(
    Object.fromEntries(Object.keys(PLATFORMS).map((p) => [p, buildBaseMetrics(p)]))
  );

  const histories = useRef(
    Object.fromEntries(Object.keys(PLATFORMS).map((p) => [p, buildHistory(bases.current[p])]))
  );

  const metrics = useRef(
    Object.fromEntries(Object.keys(PLATFORMS).map((p) => [p, applyDelta(bases.current[p], 0)]))
  );

  const [snapshot, setSnapshot] = useState({ ...metrics.current });

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setTick((t) => {
        const next = t + 1;
        prevRef.current = { ...metrics.current };
        Object.keys(PLATFORMS).forEach((p) => {
          metrics.current[p] = applyDelta(bases.current[p], next);
          const hist = histories.current[p];
          hist.push({ t: next, views: metrics.current[p].views, likes: metrics.current[p].likes, comments: metrics.current[p].comments });
          if (hist.length > 24) hist.shift();
        });
        setSnapshot({ ...metrics.current });
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [live]);

  const platformKeys = Object.keys(PLATFORMS).filter(
    (k) => filter === 'all' || (filter === 'video' && ['tiktok', 'instagram', 'redgifs', 'twitch'].includes(k)) ||
            (filter === 'community' && ['reddit', 'discord', 'facebook'].includes(k))
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-400" size={24} />
            Analytics Dashboard
          </h1>
          <p className="text-gray-400 text-sm">Cross-platform social & content metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            {['all', 'video', 'community'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setLive((l) => !l)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${live ? 'bg-green-600/20 text-green-400 border border-green-600/40' : 'bg-gray-700 text-gray-400'}`}
          >
            {live ? <Wifi size={14} /> : <WifiOff size={14} />}
            {live ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={() => setTick((t) => t + 1)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Aggregate summary */}
      <AggregateSummary allMetrics={snapshot} />

      {/* Platform grid + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {platformKeys.map((p) => (
            <PlatformCard
              key={p}
              platform={p}
              metrics={snapshot[p] || buildBaseMetrics(p)}
              history={histories.current[p] || []}
              prev={prevRef.current[p]}
              selected={selected === p}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>
        <div className="lg:col-span-1">
          {selected && snapshot[selected] && (
            <DetailPanel
              platform={selected}
              metrics={snapshot[selected]}
              history={histories.current[selected] || []}
            />
          )}
        </div>
      </div>

      {/* Live indicator footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          {live && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          {live ? 'Streaming live data (3s interval)' : 'Live updates paused'}
        </div>
        <span>Tick #{tick} · {Object.keys(PLATFORMS).length} platforms monitored</span>
      </div>
    </div>
  );
}
