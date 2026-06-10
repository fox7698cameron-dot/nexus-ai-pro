// src/components/AnalyticsDashboard.jsx | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  AreaChart, Area, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Eye, Heart, Share2,
  Activity, Filter, Download, RefreshCw, ChevronDown,
  Monitor, Smartphone, Globe, Gamepad2, Code2, Layers,
  Calendar, BarChart2, Radio, Wifi, WifiOff, Sun, Moon,
  GitBranch, GitPullRequest, GitCommit, Target, Cpu, Box
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#69C9D0' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2' },
  { id: 'twitch',    label: 'Twitch',    color: '#9146FF' },
  { id: 'discord',   label: 'Discord',   color: '#5865F2' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#FFD700' },
  { id: 'reddit',    label: 'Reddit',    color: '#FF4500' },
  { id: 'redgifs',   label: 'RedGifs',   color: '#D10000' }
];

const DATE_RANGES = [
  { id: '7d',     label: '7 Days' },
  { id: '30d',    label: '30 Days' },
  { id: '90d',    label: '90 Days' },
  { id: 'custom', label: 'Custom' }
];

const PROJECT_TYPES = [
  { id: 'coding',  label: 'Coding',       icon: Code2 },
  { id: 'gamedev', label: 'Game Dev',     icon: Gamepad2 },
  { id: 'arvr',    label: 'AR/VR/3D',     icon: Layers }
];

const EMPTY_PLATFORM_METRICS = {
  likes: 0, reach: 0, views: 0, retention: 0,
  followersGained: 0, followersLost: 0, engagementRate: 0,
  topContent: []
};

const EMPTY_PROJECTS = {
  coding: {
    languages: [], commitActivity: [], pullRequests: { open: 0, merged: 0, closed: 0 }
  },
  gamedev: {
    buildProgress: 0, milestones: [], platforms: { pc: false, console: false, mobile: false }
  },
  arvr: {
    polygonCount: 0, renderTime: 0, sceneComplexity: 0,
    platforms: { quest: false, psvr: false, hololens: false }
  }
};

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

function getThemeClasses(theme) {
  const dark = theme === 'dark';
  return {
    bg:          dark ? 'bg-gray-950'  : 'bg-gray-50',
    surface:     dark ? 'bg-gray-900'  : 'bg-white',
    surfaceAlt:  dark ? 'bg-gray-800'  : 'bg-gray-100',
    border:      dark ? 'border-gray-700' : 'border-gray-200',
    text:        dark ? 'text-gray-100' : 'text-gray-900',
    textMuted:   dark ? 'text-gray-400' : 'text-gray-500',
    textAccent:  dark ? 'text-indigo-400' : 'text-indigo-600',
    input:       dark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900',
    chartGrid:   dark ? '#374151' : '#e5e7eb',
    chartText:   dark ? '#9ca3af' : '#6b7280',
    tooltipBg:   dark ? '#1f2937' : '#ffffff',
    tooltipBorder: dark ? '#374151' : '#e5e7eb'
  };
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function MetricCard({ label, value, sub, icon: Icon, trend, color, tc }) {
  const isPositive = trend >= 0;
  return (
    <div className={`rounded-xl p-4 border ${tc.surface} ${tc.border} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium uppercase tracking-wide ${tc.textMuted}`}>{label}</span>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <div className={`text-2xl font-bold ${tc.text}`}>{value}</div>
      {sub && <div className={`text-xs ${tc.textMuted}`}>{sub}</div>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, tc }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon size={18} className={tc.textAccent} />}
      <h2 className={`text-base font-semibold ${tc.text}`}>{title}</h2>
    </div>
  );
}

function PlatformBadge({ platform, active, onToggle, tc }) {
  return (
    <button
      onClick={() => onToggle(platform.id)}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
        active
          ? 'text-white border-transparent'
          : `${tc.surfaceAlt} ${tc.border} ${tc.textMuted}`
      }`}
      style={active ? { backgroundColor: platform.color, borderColor: platform.color } : {}}
    >
      {platform.label}
    </button>
  );
}

function ConnectionStatus({ connected, tc }) {
  return (
    <div className={`flex items-center gap-1 text-xs ${connected ? 'text-emerald-500' : tc.textMuted}`}>
      {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
      {connected ? 'Live' : 'Offline'}
    </div>
  );
}

function ProgressBar({ value, color, tc }) {
  return (
    <div className={`w-full h-2 rounded-full ${tc.surfaceAlt}`}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label, tc }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className={'rounded-lg p-3 border shadow-lg text-xs'}
      style={{ backgroundColor: tc.tooltipBg, borderColor: tc.tooltipBorder }}
    >
      <p className={`font-semibold mb-1 ${tc.text}`}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data-fetching helpers
// ---------------------------------------------------------------------------

async function fetchAnalytics(endpoint, params) {
  const url = new URL(`/api/analytics/${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
  return res.json();
}

function buildFallbackData(platforms) {
  const metrics = {};
  platforms.forEach((p) => { metrics[p.id] = { ...EMPTY_PLATFORM_METRICS }; });
  return {
    platformMetrics: metrics,
    timeSeries: [],
    projects: { ...EMPTY_PROJECTS }
  };
}

// ---------------------------------------------------------------------------
// Export helper
// ---------------------------------------------------------------------------

function exportReport(data, dateRange, activePlatforms) {
  const rows = [];
  rows.push(['Platform', 'Likes', 'Reach', 'Views', 'Retention%', 'FollowersGained', 'FollowersLost', 'EngagementRate%']);
  activePlatforms.forEach((pid) => {
    const m = data.platformMetrics?.[pid] ?? EMPTY_PLATFORM_METRICS;
    rows.push([pid, m.likes, m.reach, m.views, m.retention, m.followersGained, m.followersLost, m.engagementRate]);
  });
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics_${dateRange}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

function SocialMetricsSection({ data, activePlatforms, tc }) {
  const metrics = data.platformMetrics ?? {};
  const timeSeries = data.timeSeries ?? [];

  const aggregated = activePlatforms.reduce(
    (acc, pid) => {
      const m = metrics[pid] ?? EMPTY_PLATFORM_METRICS;
      acc.likes += m.likes;
      acc.reach += m.reach;
      acc.views += m.views;
      acc.followersGained += m.followersGained;
      acc.followersLost += m.followersLost;
      return acc;
    },
    { likes: 0, reach: 0, views: 0, followersGained: 0, followersLost: 0 }
  );

  const avgRetention = activePlatforms.length
    ? activePlatforms.reduce((s, pid) => s + (metrics[pid]?.retention ?? 0), 0) / activePlatforms.length
    : 0;

  const avgEngagement = activePlatforms.length
    ? activePlatforms.reduce((s, pid) => s + (metrics[pid]?.engagementRate ?? 0), 0) / activePlatforms.length
    : 0;

  const platformColors = Object.fromEntries(PLATFORMS.map((p) => [p.id, p.color]));

  const radarData = activePlatforms.slice(0, 8).map((pid) => {
    const m = metrics[pid] ?? EMPTY_PLATFORM_METRICS;
    const label = PLATFORMS.find((p) => p.id === pid)?.label ?? pid;
    return {
      subject: label,
      engagement: m.engagementRate,
      retention: m.retention,
      reach: Math.min(100, (m.reach / 1000000) * 100)
    };
  });

  const barData = activePlatforms.map((pid) => {
    const m = metrics[pid] ?? EMPTY_PLATFORM_METRICS;
    const label = PLATFORMS.find((p) => p.id === pid)?.label ?? pid;
    return { platform: label, views: m.views, reach: m.reach, likes: m.likes, color: platformColors[pid] ?? '#6366f1' };
  });

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Total Likes" value={aggregated.likes.toLocaleString()} icon={Heart} color="#e11d48" tc={tc} />
        <MetricCard label="Total Reach" value={aggregated.reach >= 1000000 ? `${(aggregated.reach / 1000000).toFixed(1)}M` : aggregated.reach.toLocaleString()} icon={Globe} color="#6366f1" tc={tc} />
        <MetricCard label="Total Views" value={aggregated.views >= 1000000 ? `${(aggregated.views / 1000000).toFixed(1)}M` : aggregated.views.toLocaleString()} icon={Eye} color="#0ea5e9" tc={tc} />
        <MetricCard label="Avg Retention" value={`${avgRetention.toFixed(1)}%`} icon={Activity} color="#10b981" tc={tc} />
        <MetricCard label="Followers Gained" value={`+${aggregated.followersGained.toLocaleString()}`} icon={Users} color="#f59e0b" tc={tc} />
        <MetricCard label="Avg Engagement" value={`${avgEngagement.toFixed(2)}%`} icon={Share2} color="#8b5cf6" tc={tc} />
      </div>

      {/* Time series — area chart */}
      {timeSeries.length > 0 && (
        <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
          <SectionHeader title="Reach Over Time" icon={TrendingUp} tc={tc} />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {activePlatforms.map((pid) => (
                  <linearGradient key={pid} id={`grad_${pid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={platformColors[pid] ?? '#6366f1'} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={platformColors[pid] ?? '#6366f1'} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="date" tick={{ fill: tc.chartText, fontSize: 11 }} />
              <YAxis tick={{ fill: tc.chartText, fontSize: 11 }} />
              <Tooltip content={(props) => <ChartTooltip {...props} tc={tc} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: tc.chartText }} />
              {activePlatforms.map((pid) => {
                const label = PLATFORMS.find((p) => p.id === pid)?.label ?? pid;
                return (
                  <Area
                    key={pid}
                    type="monotone"
                    dataKey={pid}
                    name={label}
                    stroke={platformColors[pid] ?? '#6366f1'}
                    fill={`url(#grad_${pid})`}
                    strokeWidth={2}
                    dot={false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart — views/reach/likes per platform */}
        <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
          <SectionHeader title="Views by Platform" icon={BarChart2} tc={tc} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="platform" tick={{ fill: tc.chartText, fontSize: 11 }} />
              <YAxis tick={{ fill: tc.chartText, fontSize: 11 }} />
              <Tooltip content={(props) => <ChartTooltip {...props} tc={tc} />} />
              <Bar dataKey="views" name="Views" radius={[4, 4, 0, 0]}>
                {barData.map((entry) => (
                  <React.Fragment key={entry.platform}>
                    {/* per-bar fill via cell pattern */}
                  </React.Fragment>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar — engagement / retention / reach */}
        <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
          <SectionHeader title="Engagement Radar" icon={Activity} tc={tc} />
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <PolarGrid stroke={tc.chartGrid} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: tc.chartText, fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: tc.chartText, fontSize: 9 }} />
              <Radar name="Engagement %" dataKey="engagement" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Radar name="Retention %" dataKey="retention" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontSize: 11, color: tc.chartText }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-platform detail rows */}
      <div className={`rounded-xl border ${tc.surface} ${tc.border} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={tc.surfaceAlt}>
              <tr>
                {['Platform', 'Likes', 'Reach', 'Views', 'Retention', '+Followers', '-Followers', 'Engagement', 'Top Content'].map((h) => (
                  <th key={h} className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${tc.textMuted}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activePlatforms.map((pid, i) => {
                const m = metrics[pid] ?? EMPTY_PLATFORM_METRICS;
                const p = PLATFORMS.find((x) => x.id === pid);
                const top = (m.topContent ?? []).slice(0, 1)[0] ?? '—';
                return (
                  <tr key={pid} className={`border-t ${tc.border} ${i % 2 === 1 ? tc.surfaceAlt : ''}`}>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 font-medium" style={{ color: p?.color }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p?.color }} />
                        {p?.label ?? pid}
                      </span>
                    </td>
                    <td className={`px-3 py-2 ${tc.text}`}>{m.likes.toLocaleString()}</td>
                    <td className={`px-3 py-2 ${tc.text}`}>{m.reach.toLocaleString()}</td>
                    <td className={`px-3 py-2 ${tc.text}`}>{m.views.toLocaleString()}</td>
                    <td className={`px-3 py-2 ${tc.text}`}>{m.retention.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-emerald-500">+{m.followersGained.toLocaleString()}</td>
                    <td className="px-3 py-2 text-rose-500">-{m.followersLost.toLocaleString()}</td>
                    <td className={`px-3 py-2 ${tc.text}`}>{m.engagementRate.toFixed(2)}%</td>
                    <td className={`px-3 py-2 ${tc.textMuted} max-w-[140px] truncate`} title={String(top)}>{String(top)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coding project section
// ---------------------------------------------------------------------------

function CodingProjectsSection({ data, tc }) {
  const coding = data?.projects?.coding ?? EMPTY_PROJECTS.coding;
  const languages = coding.languages ?? [];
  const commits = coding.commitActivity ?? [];
  const prs = coding.pullRequests ?? { open: 0, merged: 0, closed: 0 };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Language breakdown */}
        <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
          <SectionHeader title="Language Breakdown" icon={Code2} tc={tc} />
          <div className="space-y-2">
            {languages.length === 0 && <p className={`text-xs ${tc.textMuted}`}>No language data available.</p>}
            {languages.map((lang) => (
              <div key={lang.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={tc.text}>{lang.name}</span>
                  <span className={tc.textMuted}>{lang.percent?.toFixed(1) ?? 0}%</span>
                </div>
                <ProgressBar value={lang.percent ?? 0} color={lang.color ?? '#6366f1'} tc={tc} />
              </div>
            ))}
          </div>
        </div>

        {/* PR status */}
        <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
          <SectionHeader title="Pull Request Status" icon={GitPullRequest} tc={tc} />
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-lg p-3 text-center ${tc.surfaceAlt}`}>
              <p className="text-2xl font-bold text-amber-500">{prs.open}</p>
              <p className={`text-xs mt-1 ${tc.textMuted}`}>Open</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${tc.surfaceAlt}`}>
              <p className="text-2xl font-bold text-emerald-500">{prs.merged}</p>
              <p className={`text-xs mt-1 ${tc.textMuted}`}>Merged</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${tc.surfaceAlt}`}>
              <p className="text-2xl font-bold text-rose-500">{prs.closed}</p>
              <p className={`text-xs mt-1 ${tc.textMuted}`}>Closed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commit activity */}
      {commits.length > 0 && (
        <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
          <SectionHeader title="Commit Activity" icon={GitCommit} tc={tc} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={commits} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="date" tick={{ fill: tc.chartText, fontSize: 10 }} />
              <YAxis tick={{ fill: tc.chartText, fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={(props) => <ChartTooltip {...props} tc={tc} />} />
              <Bar dataKey="commits" name="Commits" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Game development section
// ---------------------------------------------------------------------------

function GameDevSection({ data, tc }) {
  const gd = data?.projects?.gamedev ?? EMPTY_PROJECTS.gamedev;
  const milestones = gd.milestones ?? [];
  const platforms = gd.platforms ?? {};

  const platformItems = [
    { key: 'pc',      label: 'PC',      icon: Monitor },
    { key: 'console', label: 'Console', icon: Gamepad2 },
    { key: 'mobile',  label: 'Mobile',  icon: Smartphone }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Build progress */}
        <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
          <SectionHeader title="Build Progress" icon={Target} tc={tc} />
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke={tc.chartGrid} strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="#6366f1" strokeWidth="10"
                  strokeDasharray={`${(gd.buildProgress ?? 0) * 2.513} 251.3`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${tc.text}`}>{gd.buildProgress ?? 0}%</span>
              </div>
            </div>
            <div className="flex gap-3">
              {platformItems.map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs ${
                    platforms[key] ? 'border-indigo-500 text-indigo-400' : `${tc.border} ${tc.textMuted}`
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
          <SectionHeader title="Milestone Tracking" icon={GitBranch} tc={tc} />
          {milestones.length === 0 && <p className={`text-xs ${tc.textMuted}`}>No milestones defined.</p>}
          <div className="space-y-3">
            {milestones.map((ms) => (
              <div key={ms.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={tc.text}>{ms.name}</span>
                  <span className={tc.textMuted}>{ms.progress ?? 0}%</span>
                </div>
                <ProgressBar value={ms.progress ?? 0} color={ms.done ? '#10b981' : '#6366f1'} tc={tc} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AR/VR/3D section
// ---------------------------------------------------------------------------

function ARVRSection({ data, tc }) {
  const arvr = data?.projects?.arvr ?? EMPTY_PROJECTS.arvr;
  const platforms = arvr.platforms ?? {};

  const platformItems = [
    { key: 'quest',    label: 'Quest' },
    { key: 'psvr',     label: 'PSVR' },
    { key: 'hololens', label: 'HoloLens' }
  ];

  const statsCards = [
    { label: 'Polygon Count', value: (arvr.polygonCount ?? 0).toLocaleString(), icon: Box, color: '#8b5cf6' },
    { label: 'Render Time (ms)', value: `${arvr.renderTime ?? 0}ms`, icon: Cpu, color: '#0ea5e9' },
    { label: 'Scene Complexity', value: (arvr.sceneComplexity ?? 0).toFixed(1), icon: Layers, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statsCards.map((s) => (
          <MetricCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} tc={tc} />
        ))}
      </div>

      <div className={`rounded-xl border p-4 ${tc.surface} ${tc.border}`}>
        <SectionHeader title="Target Platforms" icon={Globe} tc={tc} />
        <div className="flex flex-wrap gap-3">
          {platformItems.map(({ key, label }) => (
            <div
              key={key}
              className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                platforms[key]
                  ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                  : `${tc.border} ${tc.textMuted}`
              }`}
            >
              {label}
              {platforms[key] && <span className="ml-2 text-emerald-400">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range picker
// ---------------------------------------------------------------------------

function DateRangePicker({ dateRange, setDateRange, customStart, setCustomStart, customEnd, setCustomEnd, tc }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {DATE_RANGES.map((r) => (
        <button
          key={r.id}
          onClick={() => setDateRange(r.id)}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
            dateRange === r.id
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : `${tc.surfaceAlt} ${tc.border} ${tc.textMuted} hover:border-indigo-400`
          }`}
        >
          {r.label}
        </button>
      ))}
      {dateRange === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className={`text-xs rounded-lg border px-2 py-1 ${tc.input}`}
          />
          <span className={`text-xs ${tc.textMuted}`}>to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className={`text-xs rounded-lg border px-2 py-1 ${tc.input}`}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalyticsDashboard({ theme = 'dark', initialData = null }) {
  const tc = getThemeClasses(theme);

  const [activePlatforms, setActivePlatforms] = useState(PLATFORMS.map((p) => p.id));
  const [activeProjectTab, setActiveProjectTab] = useState('coding');
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState(initialData ?? buildFallbackData(PLATFORMS));
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const socketRef = useRef(null);

  // ---- fetch analytics data ----
  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const params = { range: dateRange, platforms: activePlatforms.join(',') };
      if (dateRange === 'custom' && customStart && customEnd) {
        params.start = customStart;
        params.end = customEnd;
      }
      const result = await fetchAnalytics('overview', params);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, activePlatforms, customStart, customEnd]);

  useEffect(() => {
    if (!initialData) {
      loadData();
    }
  }, [loadData, initialData]);

  // ---- Socket.IO real-time updates ----
  useEffect(() => {
    // Use pre-existing socket on window if provided, otherwise skip (no client import needed)
    const socket = typeof window !== 'undefined' && window.__SOCKET__;
    if (!socket) return;

    socketRef.current = socket;

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleAnalytics = (payload) => {
      if (payload && typeof payload === 'object') {
        setData((prev) => ({ ...prev, ...payload }));
        setLastUpdated(new Date());
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('analytics:update', handleAnalytics);
    socket.on('analytics:platform', handleAnalytics);
    socket.on('analytics:projects', handleAnalytics);

    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('analytics:update', handleAnalytics);
      socket.off('analytics:platform', handleAnalytics);
      socket.off('analytics:projects', handleAnalytics);
    };
  }, []);

  // ---- platform toggle ----
  const togglePlatform = useCallback((pid) => {
    setActivePlatforms((prev) =>
      prev.includes(pid)
        ? prev.length > 1 ? prev.filter((x) => x !== pid) : prev
        : [...prev, pid]
    );
  }, []);

  const handleExport = useCallback(() => {
    exportReport(data, dateRange, activePlatforms);
  }, [data, dateRange, activePlatforms]);

  // ---- render ----
  return (
    <div className={`min-h-screen ${tc.bg} ${tc.text} font-sans`}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-xl font-bold ${tc.text}`}>Analytics Dashboard</h1>
            {lastUpdated && (
              <p className={`text-xs mt-0.5 ${tc.textMuted}`}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ConnectionStatus connected={socketConnected} tc={tc} />
            <button
              onClick={loadData}
              disabled={refreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${tc.surfaceAlt} ${tc.border} ${tc.text} hover:border-indigo-400 disabled:opacity-50`}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all"
            >
              <Download size={13} />
              Export CSV
            </button>
            {/* Theme indicator (controlled via prop) */}
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg ${tc.surfaceAlt} ${tc.border} border text-xs ${tc.textMuted}`}>
              {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
              {theme === 'dark' ? 'Dark' : 'Light'}
            </div>
          </div>
        </div>

        {/* Date range picker */}
        <div className={`rounded-xl border p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${tc.surface} ${tc.border}`}>
          <div className="flex items-center gap-2 shrink-0">
            <Calendar size={14} className={tc.textAccent} />
            <span className={`text-xs font-medium ${tc.textMuted}`}>Date Range:</span>
          </div>
          <DateRangePicker
            dateRange={dateRange}
            setDateRange={setDateRange}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            tc={tc}
          />
        </div>

        {/* Platform filter */}
        <div className={`rounded-xl border p-3 ${tc.surface} ${tc.border}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 shrink-0 mr-1">
              <Filter size={14} className={tc.textAccent} />
              <span className={`text-xs font-medium ${tc.textMuted}`}>Platforms:</span>
            </div>
            {PLATFORMS.map((p) => (
              <PlatformBadge
                key={p.id}
                platform={p}
                active={activePlatforms.includes(p.id)}
                onToggle={togglePlatform}
                tc={tc}
              />
            ))}
            <button
              onClick={() => setActivePlatforms(PLATFORMS.map((p) => p.id))}
              className={`ml-auto text-xs ${tc.textAccent} hover:underline`}
            >
              Select all
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            Failed to load analytics data: {error}. Showing cached or empty data.
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`rounded-xl border h-32 animate-pulse ${tc.surface} ${tc.border}`} />
            ))}
          </div>
        ) : (
          <>
            {/* Social Metrics */}
            <div className={`rounded-2xl border p-5 ${tc.surface} ${tc.border}`}>
              <SectionHeader title="Social Media Analytics" icon={Radio} tc={tc} />
              <SocialMetricsSection data={data} activePlatforms={activePlatforms} tc={tc} />
            </div>

            {/* Project Tracking */}
            <div className={`rounded-2xl border p-5 ${tc.surface} ${tc.border}`}>
              <SectionHeader title="Project Tracking" icon={Code2} tc={tc} />

              {/* Tab switcher */}
              <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ backgroundColor: tc.surfaceAlt.includes('gray-800') ? '#1f2937' : '#f3f4f6' }}>
                {PROJECT_TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveProjectTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeProjectTab === id
                        ? 'bg-indigo-600 text-white shadow'
                        : `${tc.textMuted} hover:${tc.text}`
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {activeProjectTab === 'coding'  && <CodingProjectsSection data={data} tc={tc} />}
              {activeProjectTab === 'gamedev' && <GameDevSection data={data} tc={tc} />}
              {activeProjectTab === 'arvr'    && <ARVRSection data={data} tc={tc} />}
            </div>
          </>
        )}

        {/* Footer */}
        <p className={`text-center text-xs ${tc.textMuted} pb-2`}>
          Nexus AI Pro Analytics · © 2025-2026 Cameron Fox · Data via /api/analytics/*
        </p>
      </div>
    </div>
  );
}
