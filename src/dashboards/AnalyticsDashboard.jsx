/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Social analytics dashboard: TikTok, Instagram, Facebook, Twitch, Discord,
 *              Lemon8, Reddit, RedGifs - real-time metrics, reach, retention tracking
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, Users,
  Activity, Clock, RefreshCw, ChevronDown, Zap
} from 'lucide-react';

const PLATFORM_META = {
  tiktok:    { label: 'TikTok',     color: '#010101', bg: 'bg-zinc-900', accent: '#69C9D0', icon: '🎵' },
  instagram: { label: 'Instagram',  color: '#E1306C', bg: 'bg-pink-900',  accent: '#E1306C', icon: '📸' },
  facebook:  { label: 'Facebook',   color: '#1877F2', bg: 'bg-blue-900',  accent: '#1877F2', icon: '📘' },
  twitch:    { label: 'Twitch',     color: '#9146FF', bg: 'bg-purple-900',accent: '#9146FF', icon: '🟣' },
  discord:   { label: 'Discord',    color: '#5865F2', bg: 'bg-indigo-900',accent: '#5865F2', icon: '💬' },
  lemon8:    { label: 'Lemon8',     color: '#FFD700', bg: 'bg-yellow-800',accent: '#FFD700', icon: '🍋' },
  reddit:    { label: 'Reddit',     color: '#FF4500', bg: 'bg-orange-900',accent: '#FF4500', icon: '🤖' },
  redgifs:   { label: 'RedGIFs',    color: '#FF0000', bg: 'bg-red-900',   accent: '#FF0000', icon: '🎬' },
  youtube:   { label: 'YouTube',    color: '#FF0000', bg: 'bg-red-900',   accent: '#FF0000', icon: '▶️' },
  twitter:   { label: 'X / Twitter',color: '#1DA1F2', bg: 'bg-sky-900',   accent: '#1DA1F2', icon: '𝕏' }
};

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatCard({ label, value, icon: Icon, trend, color = 'text-white' }) {
  const isUp = trend >= 0;
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={16} className="text-gray-500" />}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{fmtNum(value)}</div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, data, selected, onSelect }) {
  const meta = PLATFORM_META[platform] || {};
  const isLive = platform === 'twitch';

  return (
    <button
      onClick={() => onSelect(platform)}
      className={`text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-blue-500 bg-gray-700 shadow-lg shadow-blue-900/30'
          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <span className="font-semibold text-white text-sm">{meta.label}</span>
        </div>
        {isLive && data?.live_viewers > 0 && (
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-gray-400 text-xs">Views</div>
          <div className="text-white font-bold">{fmtNum(data?.views)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Followers</div>
          <div className="text-white font-bold">{fmtNum(data?.followers || data?.subscribers)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Likes</div>
          <div className="text-white font-bold">{fmtNum(data?.likes)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Retention</div>
          <div className="text-white font-bold">{data?.retention_rate ?? '—'}%</div>
        </div>
      </div>
    </button>
  );
}

function RetentionBar({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-sm w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(100, value || 0)}%` }}
        />
      </div>
      <span className="text-white text-sm w-10 text-right">{value ?? 0}%</span>
    </div>
  );
}

export default function AnalyticsDashboard({ authToken }) {
  const [snapshots, setSnapshots] = useState({});
  const [summary, setSummary] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveIndicator, setLiveIndicator] = useState(false);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [snapRes, reachRes] = await Promise.all([
        fetch('/api/analytics/snapshot', { headers }),
        fetch('/api/analytics/reach', { headers })
      ]);
      if (snapRes.ok) setSnapshots((await snapRes.json()).snapshots || {});
      if (reachRes.ok) setSummary(await reachRes.json());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchData(); }, [fetchData, range]);

  // Pulse live indicator every 5s
  useEffect(() => {
    const t = setInterval(() => setLiveIndicator(v => !v), 5000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  const sel = snapshots[selectedPlatform] || {};

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-blue-400" size={24} />
            Social Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time metrics across {Object.keys(PLATFORM_META).length} platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Zap size={12} className={liveIndicator ? 'text-green-400' : 'text-gray-600'} />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </div>
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5"
          >
            <option value="1d">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Reach" value={summary.totalReach} icon={Eye} trend={12.4} color="text-blue-400" />
          <StatCard label="Total Followers" value={summary.totalFollowers} icon={Users} trend={8.1} color="text-purple-400" />
          <StatCard label="Total Views" value={summary.totalViews} icon={TrendingUp} trend={15.7} color="text-green-400" />
          <StatCard label="Engagement Rate" value={`${summary.engagementRate}%`} icon={Heart} trend={-2.3} color="text-pink-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform grid */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Platforms</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.keys(PLATFORM_META).map(p => (
              <PlatformCard
                key={p}
                platform={p}
                data={snapshots[p]}
                selected={selectedPlatform === p}
                onSelect={setSelectedPlatform}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              {PLATFORM_META[selectedPlatform]?.icon} {PLATFORM_META[selectedPlatform]?.label} Detail
            </h2>
            <div className="space-y-3">
              {[
                ['Views', sel.views, Eye],
                ['Likes', sel.likes, Heart],
                ['Comments', sel.comments, null],
                ['Shares', sel.shares, Share2],
                ['Reach', sel.reach, Users],
                ['Impressions', sel.impressions, Eye],
                ['Watch Time (s)', sel.watch_time, Clock]
              ].map(([label, val, Icon]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm flex items-center gap-1.5">
                    {Icon && <Icon size={12} />}{label}
                  </span>
                  <span className="text-white font-semibold">{fmtNum(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Retention */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Retention by Platform
            </h2>
            <div className="space-y-3">
              {['twitch', 'tiktok', 'instagram', 'youtube', 'facebook'].map(p => (
                <RetentionBar
                  key={p}
                  label={PLATFORM_META[p]?.label || p}
                  value={snapshots[p]?.retention_rate}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
