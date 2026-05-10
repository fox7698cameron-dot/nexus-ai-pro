// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Activity, TrendingUp, Users, Eye, Heart, Share2,
  BarChart3, Globe, Zap, RefreshCw, Link, CheckCircle,
  XCircle, Play,
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────

const PLATFORM_META = {
  tiktok:    { label: 'TikTok',    color: '#010101', emoji: '🎵' },
  instagram: { label: 'Instagram', color: '#E4405F', emoji: '📸' },
  facebook:  { label: 'Facebook',  color: '#1877F2', emoji: '👥' },
  twitch:    { label: 'Twitch',    color: '#9146FF', emoji: '🎮' },
  discord:   { label: 'Discord',   color: '#5865F2', emoji: '💬' },
  lemon8:    { label: 'Lemon8',    color: '#FFE400', emoji: '🍋' },
  reddit:    { label: 'Reddit',    color: '#FF4500', emoji: '🤖' },
  redgifs:   { label: 'RedGifs',   color: '#FF6B6B', emoji: '🎬' },
};
const PLATFORMS = Object.keys(PLATFORM_META);

const COLORS = { views: '#a855f7', likes: '#ec4899', grid: '#1f1f2e' };

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function authHeader() {
  const token = localStorage.getItem('nexus:token') ?? sessionStorage.getItem('nexus:token') ?? '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path) {
  const res = await fetch(`/api${path}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ─── Mock data builders (used when platform not connected) ─────────────────

function mockSeries(days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d.toISOString().slice(0, 10), views: Math.floor(Math.random() * 8000 + 1000), likes: Math.floor(Math.random() * 400 + 50) };
  });
}

function mockRegions() {
  return [
    { region: 'United States', pct: 32 }, { region: 'United Kingdom', pct: 14 },
    { region: 'Canada', pct: 11 }, { region: 'Australia', pct: 9 },
    { region: 'Germany', pct: 7 }, { region: 'France', pct: 6 },
    { region: 'Brazil', pct: 5 }, { region: 'Japan', pct: 4 },
    { region: 'India', pct: 3 }, { region: 'Other', pct: 9 },
  ];
}

function mockFeed() {
  const actions = ['liked your post', 'commented', 'shared your content', 'started following you'];
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    platform: PLATFORMS[i % PLATFORMS.length],
    user: `user_${'*'.repeat(4)}${Math.floor(Math.random() * 9999)}`,
    action: actions[i % actions.length],
    ts: Date.now() - i * 45_000,
  }));
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />;
}

function StatCard({ icon: Icon, label, value, change, loading }) {
  const up = change >= 0;
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider">
        <Icon size={14} />
        {label}
      </div>
      {loading
        ? <Skeleton className="h-8 w-24" />
        : <div className="text-2xl font-bold text-white">{fmt(value)}</div>}
      <div className={`text-xs font-medium ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
        {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% vs last period
      </div>
    </div>
  );
}

// SVG multi-line chart — no external lib
function LineChart({ series, loading }) {
  const W = 800, H = 240, PAD = 40;
  if (loading) return <Skeleton className="h-60 w-full rounded-xl" />;
  if (!series?.length) return null;

  const maxViews = Math.max(...series.map(d => d.views), 1);
  const maxLikes = Math.max(...series.map(d => d.likes), 1);
  const n = series.length;

  const xOf = i => PAD + (i / (n - 1)) * (W - PAD * 2);
  const yViews = v => PAD + (1 - v / maxViews) * (H - PAD * 2);
  const yLikes = v => PAD + (1 - v / maxLikes) * (H - PAD * 2);

  const viewsPath = series.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yViews(d.views)}`).join(' ');
  const likesPath = series.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yLikes(d.likes)}`).join(' ');

  // Area fill under views line
  const areaPath = `${viewsPath} L${xOf(n - 1)},${H - PAD} L${xOf(0)},${H - PAD} Z`;

  // Tick labels — every 5 days
  const ticks = series.filter((_, i) => i % 5 === 0);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-4 mb-3 text-xs text-white/60">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-purple-400" /> Views</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-pink-400" /> Likes</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
        <defs>
          <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={PAD} y1={PAD + (1 - f) * (H - PAD * 2)} x2={W - PAD} y2={PAD + (1 - f) * (H - PAD * 2)}
            stroke={COLORS.grid} strokeWidth="1" />
        ))}
        {/* Area */}
        <path d={areaPath} fill="url(#gv)" />
        {/* Lines */}
        <path d={viewsPath} fill="none" stroke={COLORS.views} strokeWidth="2"
          style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: 'drawLine 1.2s ease forwards' }} />
        <path d={likesPath} fill="none" stroke={COLORS.likes} strokeWidth="2"
          style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: 'drawLine 1.4s ease forwards' }} />
        {/* X labels */}
        {ticks.map((d, i) => {
          const idx = series.indexOf(d);
          return <text key={i} x={xOf(idx)} y={H - 4} textAnchor="middle" fill="#ffffff60" fontSize="9">{d.date?.slice(5)}</text>;
        })}
        <style>{`@keyframes drawLine { to { stroke-dashoffset: 0; } }`}</style>
      </svg>
    </div>
  );
}

// Retention heatmap (SVG)
function RetentionHeatmap({ data, loading }) {
  if (loading) return <Skeleton className="h-24 w-full rounded-xl" />;
  const points = data?.curve ?? [];
  if (!points.length) return null;

  const W = 700, H = 80, PAD = 20;
  const n = points.length;
  const cellW = (W - PAD * 2) / n;

  const colorFor = pct => {
    const r = Math.round(255 * (1 - pct / 100));
    const g = Math.round(200 * (pct / 100));
    return `rgb(${r},${g},80)`;
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm font-semibold text-white/70 mb-3">Watch Retention Heatmap</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {points.map((p, i) => (
          <g key={i}>
            <rect x={PAD + i * cellW} y={10} width={cellW - 2} height={36}
              fill={colorFor(p.retained)} rx="3" opacity="0.9" />
            <text x={PAD + i * cellW + cellW / 2} y={62} textAnchor="middle" fill="#ffffff80" fontSize="8">
              {p.pct}%
            </text>
            <text x={PAD + i * cellW + cellW / 2} y={28} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">
              {p.retained.toFixed(0)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Platform card in the breakdown grid
function PlatformCard({ platform, data, loading, onConnect }) {
  const meta = PLATFORM_META[platform];
  const isConnected = data?.connected;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <span className="font-semibold text-white text-sm">{meta.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected
            ? <CheckCircle size={14} className="text-emerald-400" />
            : <XCircle size={14} className="text-white/30" />}
          <span className={`text-xs ${isConnected ? 'text-emerald-400' : 'text-white/30'}`}>
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {loading
        ? <><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></>
        : isConnected
          ? (
            <div className="grid grid-cols-2 gap-y-2 text-xs text-white/70">
              <span className="flex items-center gap-1"><Eye size={11} /> {fmt(data.views)} views</span>
              <span className="flex items-center gap-1"><Heart size={11} /> {fmt(data.likes)} likes</span>
              <span className="flex items-center gap-1"><Share2 size={11} /> {fmt(data.shares)} shares</span>
              <span className="flex items-center gap-1"><Users size={11} /> {fmt(data.followers)} followers</span>
              <span className="flex items-center gap-1 col-span-2">
                <Activity size={11} /> {data.engagementRate ?? 0}% engagement
              </span>
              {data.trendingHashtags?.length > 0 && (
                <div className="col-span-2 flex flex-wrap gap-1 mt-1">
                  {data.trendingHashtags.slice(0, 5).map(h => (
                    <span key={h} className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 text-[10px]">#{h}</span>
                  ))}
                </div>
              )}
            </div>
          )
          : (
            <button
              onClick={() => onConnect(platform)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-white transition-all"
              style={{ background: `${meta.color}cc` }}
            >
              <Link size={12} /> Connect {meta.label}
            </button>
          )}
    </div>
  );
}

// Real-time feed item
function FeedItem({ item }) {
  const meta = PLATFORM_META[item.platform];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-base shrink-0">{meta?.emoji}</span>
      <div className="flex-1 min-w-0">
        <span className="text-white/80 text-xs font-medium">{item.user}</span>
        <span className="text-white/40 text-xs"> {item.action}</span>
      </div>
      <span className="text-white/30 text-xs shrink-0">{timeAgo(item.ts)}</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [platformData, setPlatformData] = useState({});
  const [series, setSeries] = useState(mockSeries());
  const [retention, setRetention] = useState(null);
  const [regions] = useState(mockRegions());
  const [feed, setFeed] = useState(mockFeed());
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // ── Data fetch ──

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [overviewRes, retentionRes] = await Promise.allSettled([
      apiFetch('/analytics/overview'),
      apiFetch('/analytics/retention'),
    ]);

    if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data);
    if (retentionRes.status === 'fulfilled') setRetention(retentionRes.value.data);

    const settled = await Promise.allSettled(
      PLATFORMS.map(p => apiFetch(`/analytics/platform/${p}`))
    );
    const next = {};
    PLATFORMS.forEach((p, i) => {
      if (settled[i].status === 'fulfilled') next[p] = settled[i].value.data;
    });
    setPlatformData(next);
    setLastUpdated(Date.now());
    setLoading(false);
  }, []);

  // ── Socket.IO ──

  useEffect(() => {
    const socket = io({ path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      clearInterval(refreshTimerRef.current);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      // Poll every 60s when socket is down
      refreshTimerRef.current = setInterval(fetchAll, 60_000);
    });

    socket.on('analytics:update', data => {
      if (data.platforms) {
        const next = {};
        data.platforms.forEach(d => { next[d.platform] = d; });
        setPlatformData(prev => ({ ...prev, ...next }));
        setLastUpdated(Date.now());
      }
      if (data.feed) setFeed(prev => [...data.feed, ...prev].slice(0, 50));
    });

    return () => {
      socket.disconnect();
      clearInterval(refreshTimerRef.current);
    };
  }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Append mock feed items periodically when socket is disconnected for demo feel
  useEffect(() => {
    if (socketConnected) return;
    const t = setInterval(() => {
      setFeed(prev => [mockFeed()[0], ...prev].slice(0, 50));
    }, 8_000);
    return () => clearInterval(t);
  }, [socketConnected]);

  // ── OAuth connect ──

  const handleConnect = useCallback(platform => {
    const popup = window.open(
      `/api/analytics/connect/${platform}`,
      `connect_${platform}`,
      'width=600,height=700,scrollbars=yes'
    );
    const poll = setInterval(() => {
      if (popup?.closed) {
        clearInterval(poll);
        fetchAll();
      }
    }, 500);
  }, [fetchAll]);

  // ── Derived stats ──

  const stats = [
    { icon: Globe,     label: 'Total Reach',      value: overview?.totalViews ?? 0,      change: 12.4 },
    { icon: Eye,       label: 'Total Views',       value: overview?.totalViews ?? 0,      change: 8.7  },
    { icon: Activity,  label: 'Total Engagement',  value: overview?.totalLikes ?? 0,      change: -2.1 },
    { icon: Users,     label: 'Total Followers',   value: overview?.totalFollowers ?? 0,  change: 5.3  },
  ];

  // Build combined series from connected platforms or use mock
  useEffect(() => {
    const connected = PLATFORMS.filter(p => platformData[p]?.connected);
    if (!connected.length) return;
    const allSeries = connected.flatMap(p => platformData[p]?.growthSeries ?? []);
    if (allSeries.length) setSeries(allSeries.slice(0, 30).map(s => ({ ...s, views: s.value ?? 0, likes: Math.floor((s.value ?? 0) * 0.05) })));
  }, [platformData]);

  // ── Top content ──

  const topContent = PLATFORMS.flatMap(p => {
    const d = platformData[p];
    if (!d?.connected) return [];
    return (d.recentPosts ?? []).slice(0, 3).map((post, i) => ({
      id: `${p}-${i}`,
      platform: p,
      title: post.title ?? post.name ?? `Post #${i + 1}`,
      views: post.impression_cnt ?? post.views ?? Math.floor(Math.random() * 50000),
      likes: post.likes ?? Math.floor(Math.random() * 2000),
    }));
  }).slice(0, 10);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0a0c' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 size={28} className="text-purple-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
              <span className="text-xs text-white/40">{socketConnected ? 'Live' : 'Polling'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-white/30">Updated {timeAgo(lastUpdated)}</span>
            )}
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/15 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Platform Selector ── */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {PLATFORMS.map(p => {
            const meta = PLATFORM_META[p];
            const connected = platformData[p]?.connected;
            const active = selectedPlatform === p;
            return (
              <button
                key={p}
                onClick={() => setSelectedPlatform(active ? null : p)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  active ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-xl">{meta.emoji}</span>
                <span className="text-[10px] text-white/60 hidden sm:block">{meta.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/20'}`} />
              </button>
            );
          })}
        </div>

        {/* ── Overview Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => <StatCard key={s.label} {...s} loading={loading} />)}
        </div>

        {/* ── Main Chart ── */}
        <LineChart series={series} loading={loading} />

        {/* ── Platform Breakdown Grid ── */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Platform Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLATFORMS.map(p => (
              <PlatformCard
                key={p}
                platform={p}
                data={platformData[p]}
                loading={loading}
                onConnect={handleConnect}
              />
            ))}
          </div>
        </div>

        {/* ── Retention + Reach (side-by-side on desktop) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RetentionHeatmap data={retention} loading={loading} />

          {/* Reach by Region */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <Globe size={14} /> Reach by Region
            </h3>
            <div className="space-y-2">
              {regions.map(r => (
                <div key={r.region} className="flex items-center gap-2">
                  <span className="text-xs text-white/60 w-32 shrink-0 truncate">{r.region}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
                      style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="text-xs text-white/40 w-8 text-right shrink-0">{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Real-Time Feed + Content Performance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Real-Time Feed */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" /> Real-Time Feed
            </h3>
            <div className="overflow-y-auto max-h-72 pr-1 space-y-0">
              {feed.map(item => <FeedItem key={item.id} item={item} />)}
            </div>
          </div>

          {/* Content Performance */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-purple-400" /> Top Content
            </h3>
            {loading
              ? <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              : topContent.length
                ? (
                  <div className="space-y-2 overflow-y-auto max-h-72">
                    {topContent.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                        <span className="text-white/30 text-xs w-4 shrink-0">{i + 1}</span>
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                          <Play size={12} className="text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white truncate">{c.title}</div>
                          <div className="text-[10px] text-white/40 flex gap-2 mt-0.5">
                            <span>{fmt(c.views)} views</span>
                            <span>{fmt(c.likes)} likes</span>
                            <span className="uppercase">{PLATFORM_META[c.platform]?.label}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
                : (
                  <div className="flex flex-col items-center justify-center h-40 text-white/20 text-sm gap-2">
                    <Link size={24} />
                    <span>Connect platforms to see top content</span>
                  </div>
                )}
          </div>
        </div>

      </div>
    </div>
  );
}
