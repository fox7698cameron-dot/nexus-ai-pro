// File: SocialAnalyticsDashboard.jsx | Created: 2026-08-31 | Nexus AI Pro

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Users, Eye, Heart, Radio,
  Activity, BarChart2, Download, RefreshCw, Zap,
  PlayCircle, MessageCircle, Share2, Clock, Award
} from 'lucide-react';

// ─── Platform configuration ──────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#69C9D0', accent: '#EE1D52' },
  { id: 'instagram', label: 'Instagram',  color: '#E1306C', accent: '#833AB4' },
  { id: 'facebook',  label: 'Facebook',   color: '#1877F2', accent: '#0866FF' },
  { id: 'twitch',    label: 'Twitch',     color: '#9146FF', accent: '#BF94FF' },
  { id: 'discord',   label: 'Discord',    color: '#5865F2', accent: '#7289DA' },
  { id: 'lemon8',    label: 'Lemon8',     color: '#FFD700', accent: '#FFA500' },
  { id: 'reddit',    label: 'Reddit',     color: '#FF4500', accent: '#FF6534' },
  { id: 'redgifs',   label: 'RedGifs',    color: '#FF2020', accent: '#CC0000' },
];

// ─── Seed data generators ─────────────────────────────────────────────────────

const seedMetrics = (platformId) => {
  const seeds = {
    tiktok:    { views: 4_820_300, likes: 312_400, reach: 6_100_000, followers: 892_000, engagement: 8.4,  retention: 62 },
    instagram: { views: 2_150_000, likes: 198_700, reach: 3_400_000, followers: 445_000, engagement: 6.2,  retention: 55 },
    facebook:  { views: 980_000,   likes: 64_200,  reach: 1_820_000, followers: 310_000, engagement: 3.8,  retention: 42 },
    twitch:    { views: 560_000,   likes: 44_100,  reach: 720_000,   followers: 128_000, engagement: 12.1, retention: 78 },
    discord:   { views: 0,         likes: 0,       reach: 42_000,    followers: 42_000,  engagement: 22.4, retention: 91 },
    lemon8:    { views: 340_000,   likes: 28_900,  reach: 510_000,   followers: 76_000,  engagement: 7.6,  retention: 58 },
    reddit:    { views: 1_240_000, likes: 92_300,  reach: 2_100_000, followers: 234_000, engagement: 5.9,  retention: 49 },
    redgifs:   { views: 3_680_000, likes: 276_100, reach: 4_900_000, followers: 381_000, engagement: 9.8,  retention: 67 },
  };
  return seeds[platformId] || seeds.tiktok;
};

const seedContent = (platformId) => [
  { id: 1, title: 'Morning Routine Vlog',          views: 420_000, likes: 38_200, shares: 4_100, duration: '8:24', date: '2026-08-28', trend: 'up' },
  { id: 2, title: 'AI Tool Breakdown 2026',         views: 385_000, likes: 29_700, shares: 6_800, duration: '12:05', date: '2026-08-25', trend: 'up' },
  { id: 3, title: 'Game Dev Devlog #14',            views: 218_000, likes: 18_400, shares: 2_200, duration: '15:32', date: '2026-08-22', trend: 'down' },
  { id: 4, title: 'Nexus AI Pro Feature Demo',      views: 197_000, likes: 16_900, shares: 3_500, duration: '6:48', date: '2026-08-19', trend: 'up' },
  { id: 5, title: 'AR Prototyping in 60 Seconds',   views: 156_000, likes: 14_200, shares: 7_900, duration: '0:60', date: '2026-08-16', trend: 'up' },
];

const generateChartPoints = (count = 14) => {
  let val = 40 + Math.random() * 30;
  return Array.from({ length: count }, (_, i) => {
    val = Math.max(5, Math.min(100, val + (Math.random() - 0.44) * 18));
    return { x: i, y: Math.round(val) };
  });
};

const seedChartData = () => ({
  views:      generateChartPoints(),
  engagement: generateChartPoints(),
  followers:  generateChartPoints(),
});

// ─── Utility helpers ──────────────────────────────────────────────────────────

const fmt = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const nudge = (v, range = 0.02) =>
  +(v * (1 + (Math.random() - 0.5) * range)).toFixed(1);

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, color, delta }) {
  const positive = delta >= 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
          <Icon size={15} />
          {label}
        </div>
        {delta !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${positive ? 'text-emerald-500' : 'text-red-400'}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

function SparkLine({ points, color }) {
  if (!points?.length) return null;
  const W = 240, H = 80, pad = 6;
  const xs = points.map((p, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
  const ys = points.map((p) => H - pad - ((p.y / 100) * (H - pad * 2)));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const area = `${d} L${xs[xs.length - 1]},${H - pad} L${xs[0]},${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="2.5" fill={color} opacity="0.7" />
      ))}
    </svg>
  );
}

function ContentRow({ item, idx }) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      <td className="py-3 pl-4 pr-2 text-gray-500 dark:text-gray-400 text-sm w-6">{idx + 1}</td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <PlayCircle size={14} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{item.title}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{item.date} · {item.duration}</p>
      </td>
      <td className="py-3 pr-4 text-sm text-right text-gray-700 dark:text-gray-300">{fmt(item.views)}</td>
      <td className="py-3 pr-4 text-sm text-right text-gray-700 dark:text-gray-300">{fmt(item.likes)}</td>
      <td className="py-3 pr-4 text-sm text-right text-gray-700 dark:text-gray-300">{fmt(item.shares)}</td>
      <td className="py-3 pr-4 text-sm text-right">
        {item.trend === 'up'
          ? <TrendingUp size={14} className="inline text-emerald-500" />
          : <TrendingDown size={14} className="inline text-red-400" />}
      </td>
    </tr>
  );
}

function DemographicsBar({ label, pct, color }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 text-gray-500 dark:text-gray-400 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-10 text-gray-700 dark:text-gray-300 font-medium">{pct}%</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SocialAnalyticsDashboard({ platformConnections = {}, onConnect = () => {} }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [metrics, setMetrics] = useState(seedMetrics('tiktok'));
  const [chartData, setChartData] = useState(seedChartData);
  const [content, setContent] = useState(seedContent('tiktok'));
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeChart, setActiveChart] = useState('views');
  const intervalRef = useRef(null);

  const platform = PLATFORMS.find((p) => p.id === activePlatform);

  // Simulated real-time updates (Socket.io stub via setInterval)
  const startRealtime = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setMetrics((prev) => ({
        views:      Math.round(nudge(prev.views,      0.01)),
        likes:      Math.round(nudge(prev.likes,      0.01)),
        reach:      Math.round(nudge(prev.reach,      0.008)),
        followers:  Math.round(nudge(prev.followers,  0.005)),
        engagement: nudge(prev.engagement, 0.03),
        retention:  Math.min(100, Math.max(1, nudge(prev.retention, 0.02))),
      }));
      setChartData((prev) => {
        const shift = (arr) => {
          const next = [...arr.slice(1), { x: arr[arr.length - 1].x + 1, y: Math.round(Math.max(5, Math.min(100, arr[arr.length - 1].y + (Math.random() - 0.44) * 18))) }];
          return next;
        };
        return { views: shift(prev.views), engagement: shift(prev.engagement), followers: shift(prev.followers) };
      });
      setLastUpdated(new Date());
    }, 4000);
  }, []);

  useEffect(() => {
    if (isLive) startRealtime();
    else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [isLive, startRealtime, activePlatform]);

  const switchPlatform = (id) => {
    setActivePlatform(id);
    setMetrics(seedMetrics(id));
    setChartData(seedChartData());
    setContent(seedContent(id));
    setLastUpdated(new Date());
  };

  const demographics = [
    { label: '13–17',  pct: 12, color: platform.color },
    { label: '18–24',  pct: 34, color: platform.color },
    { label: '25–34',  pct: 28, color: platform.accent },
    { label: '35–44',  pct: 16, color: platform.accent },
    { label: '45+',    pct: 10, color: '#94a3b8' },
  ];

  const topCard = content[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 size={24} style={{ color: platform.color }} />
            Social Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Real-time indicator */}
          <button
            onClick={() => setIsLive((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
              ${isLive ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                       : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {isLive ? 'LIVE' : 'PAUSED'}
          </button>
          <button
            onClick={() => { setMetrics(seedMetrics(activePlatform)); setChartData(seedChartData()); setLastUpdated(new Date()); }}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => switchPlatform(p.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all
              ${activePlatform === p.id
                ? 'text-white border-transparent shadow-md'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}
            style={activePlatform === p.id ? { background: p.color } : {}}
          >
            {p.label}
            {platformConnections[p.id] && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <MetricCard icon={Eye}        label="Views"          value={fmt(metrics.views)}      delta={1.8}  color={platform.color} />
        <MetricCard icon={Heart}      label="Likes"          value={fmt(metrics.likes)}      delta={2.4}  color={platform.color} />
        <MetricCard icon={Radio}      label="Reach"          value={fmt(metrics.reach)}      delta={0.9}  color={platform.color} />
        <MetricCard icon={Users}      label="Followers"      value={fmt(metrics.followers)}  delta={0.4}  color={platform.color} />
        <MetricCard icon={Activity}   label="Engagement"     value={`${metrics.engagement}%`} delta={0.3} color={platform.color} />
        <MetricCard icon={Clock}      label="Retention"      value={`${Math.round(metrics.retention)}%`} delta={-0.6} color={platform.color} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Performance Trend (14 days)</h2>
            <div className="flex gap-1">
              {['views', 'engagement', 'followers'].map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveChart(k)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors
                    ${activeChart === k ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  style={activeChart === k ? { background: platform.color } : {}}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <SparkLine points={chartData[activeChart]} color={platform.color} />
        </div>

        {/* Audience demographics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Audience Age Demographics</h2>
          <div className="flex flex-col gap-3">
            {demographics.map((d) => (
              <DemographicsBar key={d.label} {...d} />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">Gender split</p>
            <div className="flex gap-2 mt-1.5">
              <div className="flex-1 h-3 rounded-l-full" style={{ background: platform.color, opacity: 0.85 }} title="Female 54%" />
              <div className="h-3 rounded-r-full bg-blue-400" style={{ width: '46%' }} title="Male 46%" />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>F 54%</span><span>M 46%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top content card + Content table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Top performing card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} style={{ color: platform.color }} />
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Top Performer</h2>
          </div>
          <div className="w-full aspect-video rounded-lg flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${platform.color}22, ${platform.accent}33)` }}>
            <PlayCircle size={36} style={{ color: platform.color }} />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{topCard.title}</p>
          <p className="text-xs text-gray-400">{topCard.date} · {topCard.duration}</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { icon: Eye,            val: fmt(topCard.views) },
              { icon: Heart,          val: fmt(topCard.likes) },
              { icon: Share2,         val: fmt(topCard.shares) },
            ].map(({ icon: I, val }, i) => (
              <div key={i} className="text-center">
                <I size={14} className="mx-auto mb-0.5 text-gray-400" />
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{val}</p>
              </div>
            ))}
          </div>
          {!platformConnections[activePlatform] && (
            <button
              onClick={() => onConnect(activePlatform)}
              className="mt-4 w-full py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: platform.color }}
            >
              <Zap size={12} className="inline mr-1" /> Connect {platform.label}
            </button>
          )}
        </div>

        {/* Content performance table */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Content Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  <th className="py-2 pl-4 pr-2 w-6">#</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4 text-right">Views</th>
                  <th className="py-2 pr-4 text-right">Likes</th>
                  <th className="py-2 pr-4 text-right">Shares</th>
                  <th className="py-2 pr-4 text-right">Trend</th>
                </tr>
              </thead>
              <tbody>
                {content.map((item, idx) => (
                  <ContentRow key={item.id} item={item} idx={idx} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Real-time activity feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Live Activity Stream</h2>
          <span className="ml-auto text-xs text-gray-400">
            <MessageCircle size={12} className="inline mr-1" />
            Simulated Socket.io feed
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            `+${Math.round(Math.random() * 80 + 20)} views in last 60s`,
            `${Math.round(Math.random() * 30 + 5)} new followers`,
            `Engagement spike detected`,
            `${Math.round(Math.random() * 15 + 2)} comments`,
            `${Math.round(Math.random() * 10 + 1)} shares`,
          ].map((event, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {event}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
