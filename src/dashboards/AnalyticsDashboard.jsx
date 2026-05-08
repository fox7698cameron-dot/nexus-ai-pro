// src/dashboards/AnalyticsDashboard.jsx
// Nexus AI Pro - Social Media Analytics Dashboard
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, Users,
  RefreshCw, Activity, Play, MessageCircle, Radio, Globe
} from 'lucide-react';

const PLATFORM_CONFIG = {
  tiktok: { label: 'TikTok', color: '#010101', accent: '#fe2c55', emoji: '🎵' },
  instagram: { label: 'Instagram', color: '#e1306c', accent: '#833ab4', emoji: '📸' },
  facebook: { label: 'Facebook', color: '#1877f2', accent: '#0d5db5', emoji: '👍' },
  twitch: { label: 'Twitch', color: '#9146ff', accent: '#6441a5', emoji: '🎮' },
  discord: { label: 'Discord', color: '#5865f2', accent: '#404eed', emoji: '💬' },
  lemon8: { label: 'Lemon8', color: '#ffcc00', accent: '#e6b800', emoji: '🍋' },
  reddit: { label: 'Reddit', color: '#ff4500', accent: '#cc3700', emoji: '🤿' },
  redgifs: { label: 'RedGIFs', color: '#f40064', accent: '#c2004f', emoji: '🎬' },
};

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function MetricCard({ title, value, change, icon: Icon, color = 'blue', loading = false }) {
  const isPositive = typeof change === 'number' ? change >= 0 : true;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</span>
        <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon size={14} className={`text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{isPositive ? '+' : ''}{change}% this week</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlatformBadge({ platform, connected }) {
  const cfg = PLATFORM_CONFIG[platform] || {};
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
      connected
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
    }`}>
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
    </div>
  );
}

// Mock real-time data generator (replace with WebSocket feed in production)
function generateMockData(platform) {
  const base = { tiktok: 50000, instagram: 30000, facebook: 20000, twitch: 8000, discord: 15000, lemon8: 5000, reddit: 12000, redgifs: 3000 };
  const b = base[platform] || 10000;
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    views: Math.floor(b * (0.3 + Math.random() * 0.7)),
    likes: Math.floor(b * 0.04 * (0.5 + Math.random())),
    reach: Math.floor(b * (0.5 + Math.random() * 0.5)),
    retention: Math.floor(40 + Math.random() * 40),
  }));
}

export default function AnalyticsDashboard({ userId, accessToken }) {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState(['tiktok', 'instagram', 'twitch', 'discord']);
  const [realtimeActive, setRealtimeActive] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/${selectedPlatform}/metrics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      } else {
        // Fall back to demo data
        setMetrics({
          followers: '124.5K', followerChange: 3.2,
          totalLikes: '2.1M', likesChange: 8.7,
          totalViews: '18.4M', viewsChange: 12.1,
          avgRetention: '68%', retentionChange: 1.4,
          engagementRate: '4.2%', engagementChange: 0.3,
          reach: '890K', reachChange: 5.6,
        });
      }
      setChartData(generateMockData(selectedPlatform));
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform, accessToken]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Real-time polling every 30s
  useEffect(() => {
    if (!realtimeActive) return;
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [realtimeActive, fetchMetrics]);

  const cfg = PLATFORM_CONFIG[selectedPlatform];

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRealtimeActive(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              realtimeActive
                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 text-gray-500'
            }`}
          >
            <Radio size={12} className={realtimeActive ? 'animate-pulse' : ''} />
            {realtimeActive ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Platform selector */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(PLATFORM_CONFIG).map(p => (
          <button
            key={p}
            onClick={() => setSelectedPlatform(p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedPlatform === p
                ? 'shadow-md scale-105'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 hover:border-purple-300'
            }`}
            style={selectedPlatform === p ? {
              backgroundColor: PLATFORM_CONFIG[p].color,
              borderColor: PLATFORM_CONFIG[p].color,
              color: '#fff',
            } : {}}
          >
            {PLATFORM_CONFIG[p].emoji} {PLATFORM_CONFIG[p].label}
          </button>
        ))}
      </div>

      {/* Connected platforms */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">Connected:</span>
        {Object.keys(PLATFORM_CONFIG).map(p => (
          <PlatformBadge key={p} platform={p} connected={connectedPlatforms.includes(p)} />
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Followers" value={metrics?.followers ?? '—'} change={metrics?.followerChange} icon={Users} color="blue" loading={loading} />
        <MetricCard title="Total Likes" value={metrics?.totalLikes ?? '—'} change={metrics?.likesChange} icon={Heart} color="pink" loading={loading} />
        <MetricCard title="Total Views" value={metrics?.totalViews ?? '—'} change={metrics?.viewsChange} icon={Eye} color="purple" loading={loading} />
        <MetricCard title="Avg Retention" value={metrics?.avgRetention ?? '—'} change={metrics?.retentionChange} icon={Activity} color="green" loading={loading} />
        <MetricCard title="Engagement" value={metrics?.engagementRate ?? '—'} change={metrics?.engagementChange} icon={TrendingUp} color="yellow" loading={loading} />
        <MetricCard title="Reach" value={metrics?.reach ?? '—'} change={metrics?.reachChange} icon={Globe} color="indigo" loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views & Reach */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            {cfg.emoji} {cfg.label} — Views & Reach (24h)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="views" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} name="Views" />
              <Area type="monotone" dataKey="reach" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Reach" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Likes & Retention */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Likes & Retention Rate</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} dot={false} name="Likes" />
              <Line yAxisId="right" type="monotone" dataKey="retention" stroke="#10b981" strokeWidth={2} dot={false} name="Retention %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Platform comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Platform Comparison — Weekly Reach</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { platform: 'TikTok', reach: 890000 },
              { platform: 'Instagram', reach: 540000 },
              { platform: 'Facebook', reach: 320000 },
              { platform: 'Twitch', reach: 45000 },
              { platform: 'Discord', reach: 22000 },
              { platform: 'Reddit', reach: 67000 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="platform" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => v.toLocaleString()} />
              <Bar dataKey="reach" name="Reach">
                {CHART_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Engagement Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Likes', value: 45 },
                  { name: 'Comments', value: 20 },
                  { name: 'Shares', value: 18 },
                  { name: 'Saves', value: 12 },
                  { name: 'Clicks', value: 5 },
                ]}
                cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value"
              >
                {CHART_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
              </Pie>
              <Tooltip formatter={v => `${v}%`} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top content table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top Performing Content</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {['Content', 'Platform', 'Views', 'Likes', 'Shares', 'Retention'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                { title: 'How I built an AI in 24h', platform: 'tiktok', views: '2.4M', likes: '180K', shares: '45K', retention: '72%' },
                { title: 'Coding montage vol.3', platform: 'instagram', views: '840K', likes: '92K', shares: '18K', retention: '68%' },
                { title: 'Live coding stream', platform: 'twitch', views: '32K', likes: '8.1K', shares: '1.2K', retention: '58%' },
                { title: 'Dev community update', platform: 'discord', views: '15K', likes: '2.3K', shares: '890', retention: '81%' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{row.title}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1">
                      {PLATFORM_CONFIG[row.platform]?.emoji}
                      <span className="text-gray-500">{PLATFORM_CONFIG[row.platform]?.label}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.views}</td>
                  <td className="px-4 py-2.5 text-pink-600 dark:text-pink-400">{row.likes}</td>
                  <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400">{row.shares}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">{row.retention}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
