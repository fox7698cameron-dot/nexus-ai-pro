/**
 * src/components/dashboards/AnalyticsDashboard.jsx
 * Nexus AI Pro — Social & Project Analytics Dashboard
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Real-time metrics: TikTok, Instagram, Facebook, Twitch, Discord,
 * Lemon8, Reddit, RedGifs + Coding / Game Dev / AR·VR·3D project tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Users, Eye, Heart, Share2, MessageSquare,
  Activity, BarChart3, RefreshCw, Wifi, WifiOff,
  Gamepad2, Code, Box, Layers, Monitor, Globe,
  ChevronUp, ChevronDown, Minus, AlertTriangle, CheckCircle,
  Play, Pause, Settings, Filter, Download, Bell,
} from 'lucide-react';

// ─── Platform definitions ─────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#010101', accent: '#fe2c55', bg: 'bg-black',     icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: '#833ab4', accent: '#fd1d1d', bg: 'bg-purple-600', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', accent: '#42b72a', bg: 'bg-blue-600',   icon: '👥' },
  { id: 'twitch',    label: 'Twitch',    color: '#9146ff', accent: '#bf94ff', bg: 'bg-purple-700', icon: '🎮' },
  { id: 'discord',   label: 'Discord',   color: '#5865f2', accent: '#57f287', bg: 'bg-indigo-600', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#ffd700', accent: '#ff6b35', bg: 'bg-yellow-500', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',    color: '#ff4500', accent: '#ff6534', bg: 'bg-orange-600', icon: '🤖' },
  { id: 'redgifs',   label: 'RedGifs',   color: '#e74c3c', accent: '#ff6b6b', bg: 'bg-red-600',    icon: '🎬' },
];

const PROJECT_TYPES = [
  { id: 'coding',  label: 'Coding',        icon: <Code size={16} />,    color: 'text-blue-400' },
  { id: 'game',    label: 'Game Dev',       icon: <Gamepad2 size={16} />, color: 'text-green-400' },
  { id: 'ar',      label: 'AR/VR',          icon: <Box size={16} />,      color: 'text-purple-400' },
  { id: '3d',      label: '3D Projects',    icon: <Layers size={16} />,   color: 'text-pink-400' },
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtPct(n) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }

function TrendIcon({ v }) {
  if (v > 0)  return <ChevronUp size={12} className="text-green-400" />;
  if (v < 0)  return <ChevronDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-gray-400" />;
}

// Deterministic mock data seeded per platform
function seedMetrics(platformId, ts) {
  const seed = platformId.charCodeAt(0) + platformId.charCodeAt(1);
  const phase = (ts / 8000 + seed) % (2 * Math.PI);
  const base   = seed * 12345;
  return {
    views:     Math.floor(base * 4.2 + Math.sin(phase)        * base * 0.3),
    likes:     Math.floor(base * 0.8 + Math.sin(phase + 1)    * base * 0.1),
    reach:     Math.floor(base * 5.1 + Math.cos(phase)        * base * 0.4),
    retention: Math.min(98, Math.max(10, 42 + Math.sin(phase + seed) * 28)),
    comments:  Math.floor(base * 0.15 + Math.sin(phase + 2)   * base * 0.05),
    shares:    Math.floor(base * 0.05 + Math.cos(phase + 3)   * base * 0.02),
    followers: Math.floor(base * 8.5 + Math.sin(phase + 0.5)  * base * 0.6),
    viewsDelta:     parseFloat((Math.sin(phase + 0.2)  * 12).toFixed(1)),
    likesDelta:     parseFloat((Math.sin(phase + 1.2)  * 8).toFixed(1)),
    reachDelta:     parseFloat((Math.sin(phase + 2.2)  * 15).toFixed(1)),
    followersDelta: parseFloat((Math.sin(phase + 3.2)  * 5).toFixed(1)),
  };
}

function seedProject(id, ts) {
  const seed  = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const phase = (ts / 12000 + seed) % (2 * Math.PI);
  return {
    linesAdded:   Math.floor(80  + Math.sin(phase) * 60),
    bugsFixed:    Math.floor(3   + Math.abs(Math.sin(phase + 1)) * 5),
    buildStatus:  Math.sin(phase + seed) > -0.3 ? 'passing' : 'failing',
    testCoverage: Math.min(99, Math.max(40, 72 + Math.sin(phase + 2) * 22)),
    commits:      Math.floor(5   + Math.abs(Math.sin(phase + 3)) * 12),
    openIssues:   Math.floor(2   + Math.abs(Math.sin(phase + 4)) * 8),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, delta, icon: Icon, unit = '' }) {
  const positive = delta >= 0;
  return (
    <div className="flex flex-col gap-1 bg-white/5 rounded-lg p-3 min-w-0">
      <div className="flex items-center gap-1 text-gray-400 text-xs">
        {Icon && <Icon size={12} />}
        <span className="truncate">{label}</span>
      </div>
      <div className="font-bold text-white text-lg leading-tight">
        {typeof value === 'number' ? fmtNum(value) : value}{unit}
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs ${positive ? 'text-green-400' : 'text-red-400'}`}>
          <TrendIcon v={delta} />
          {fmtPct(delta)}
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, metrics, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-xl p-4 border transition-all duration-200 ${
        selected
          ? 'border-white/40 bg-white/10 shadow-lg scale-[1.02]'
          : 'border-white/10 bg-white/5 hover:bg-white/8'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{platform.icon}</span>
          <span className="font-semibold text-white text-sm">{platform.label}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs ${metrics.viewsDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <TrendIcon v={metrics.viewsDelta} />
          {fmtPct(metrics.viewsDelta)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-gray-400">Views</div>
          <div className="text-white font-medium">{fmtNum(metrics.views)}</div>
        </div>
        <div>
          <div className="text-gray-400">Followers</div>
          <div className="text-white font-medium">{fmtNum(metrics.followers)}</div>
        </div>
        <div>
          <div className="text-gray-400">Retention</div>
          <div className="text-white font-medium">{metrics.retention.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-gray-400">Reach</div>
          <div className="text-white font-medium">{fmtNum(metrics.reach)}</div>
        </div>
      </div>
    </button>
  );
}

function MiniSparkline({ values, color = '#60a5fa' }) {
  if (!values || values.length < 2) return null;
  const w = 80, h = 28, pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectRow({ project, metrics }) {
  const typeInfo = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  const passing  = metrics.buildStatus === 'passing';
  return (
    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3 text-sm">
      <span className={typeInfo.color}>{typeInfo.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{project.name}</div>
        <div className="text-gray-400 text-xs">{typeInfo.label}</div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-300 flex-shrink-0">
        <span title="Coverage">{metrics.testCoverage.toFixed(0)}%</span>
        <span title="Commits today">{metrics.commits} commits</span>
        <span title="Open issues">{metrics.openIssues} issues</span>
        <span className={`flex items-center gap-1 ${passing ? 'text-green-400' : 'text-red-400'}`}>
          {passing ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
          {metrics.buildStatus}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DEFAULT_PROJECTS = [
  { id: 'proj-1', name: 'Nexus AI Core Engine',    type: 'coding' },
  { id: 'proj-2', name: 'Nexus Battle Royale',     type: 'game'   },
  { id: 'proj-3', name: 'AR Social Layer v2',      type: 'ar'     },
  { id: 'proj-4', name: 'Nexus 3D Environment Kit', type: '3d'    },
];

export default function AnalyticsDashboard({ className = '' }) {
  const [allMetrics,     setAllMetrics]     = useState({});
  const [projectMetrics, setProjectMetrics] = useState({});
  const [selectedPlat,   setSelectedPlat]   = useState('tiktok');
  const [liveEnabled,    setLiveEnabled]    = useState(true);
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [history,        setHistory]        = useState({});
  const tsRef = useRef(Date.now());

  const refresh = useCallback(() => {
    const ts = Date.now();
    tsRef.current = ts;

    const nextMetrics = {};
    for (const p of PLATFORMS) nextMetrics[p.id] = seedMetrics(p.id, ts);

    const nextProj = {};
    for (const p of DEFAULT_PROJECTS) nextProj[p.id] = seedProject(p.id, ts);

    setAllMetrics(nextMetrics);
    setProjectMetrics(nextProj);
    setLastUpdated(new Date().toLocaleTimeString());

    setHistory(prev => {
      const next = { ...prev };
      for (const p of PLATFORMS) {
        const arr = prev[p.id] || [];
        next[p.id] = [...arr.slice(-19), nextMetrics[p.id].views];
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refresh();
    if (!liveEnabled) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [liveEnabled, refresh]);

  const current = allMetrics[selectedPlat] || {};
  const platform = PLATFORMS.find(p => p.id === selectedPlat);

  return (
    <div className={`flex flex-col gap-4 text-white min-h-0 ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-400 text-sm">
            Social metrics + project tracking
            {lastUpdated && ` · Updated ${lastUpdated}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLiveEnabled(e => !e)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              liveEnabled
                ? 'border-green-500/50 bg-green-500/10 text-green-400'
                : 'border-white/20 bg-white/5 text-gray-400'
            }`}
          >
            {liveEnabled ? <Wifi size={12} /> : <WifiOff size={12} />}
            {liveEnabled ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PLATFORMS.map(p => (
          <PlatformCard
            key={p.id}
            platform={p}
            metrics={allMetrics[p.id] || {}}
            selected={selectedPlat === p.id}
            onClick={() => setSelectedPlat(p.id)}
          />
        ))}
      </div>

      {/* Detail view for selected platform */}
      {platform && current.views !== undefined && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{platform.icon}</span>
              <div>
                <h3 className="font-bold text-white">{platform.label}</h3>
                <p className="text-gray-400 text-xs">Detailed real-time metrics</p>
              </div>
            </div>
            <MiniSparkline values={history[selectedPlat] || []} color="#60a5fa" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <MetricCard label="Views"     value={current.views}     delta={current.viewsDelta}     icon={Eye} />
            <MetricCard label="Likes"     value={current.likes}     delta={current.likesDelta}     icon={Heart} />
            <MetricCard label="Reach"     value={current.reach}     delta={current.reachDelta}     icon={Globe} />
            <MetricCard label="Retention" value={current.retention.toFixed(1)} unit="%" delta={undefined} icon={Activity} />
            <MetricCard label="Comments"  value={current.comments}  delta={undefined}              icon={MessageSquare} />
            <MetricCard label="Shares"    value={current.shares}    delta={undefined}              icon={Share2} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, current.retention)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {current.retention.toFixed(1)}% retention
            </span>
          </div>
        </div>
      )}

      {/* Project tracking */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-white text-sm">Project Tracking</h3>
          <div className="flex gap-1">
            {PROJECT_TYPES.map(t => (
              <span key={t.id} className={`flex items-center gap-1 text-xs ${t.color} bg-white/5 rounded px-1.5 py-0.5`}>
                {t.icon} {t.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {DEFAULT_PROJECTS.map(p => (
            <ProjectRow key={p.id} project={p} metrics={projectMetrics[p.id] || {}} />
          ))}
        </div>
      </div>

      {/* Aggregate summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {[
          { label: 'Total Reach',     value: Object.values(allMetrics).reduce((s, m) => s + (m.reach || 0), 0) },
          { label: 'Total Views',     value: Object.values(allMetrics).reduce((s, m) => s + (m.views || 0), 0) },
          { label: 'Total Followers', value: Object.values(allMetrics).reduce((s, m) => s + (m.followers || 0), 0) },
          { label: 'Avg Retention',   value: Math.round(Object.values(allMetrics).reduce((s, m) => s + (m.retention || 0), 0) / (PLATFORMS.length || 1)), unit: '%' },
        ].map(({ label, value, unit = '' }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-gray-400 text-xs">{label}</div>
            <div className="text-white font-bold text-lg">{fmtNum(value)}{unit}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
