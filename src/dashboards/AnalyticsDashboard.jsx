// src/dashboards/AnalyticsDashboard.jsx
// Nexus AI Pro — Social Media Analytics Dashboard
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// 2026-04-23

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, Users,
  Play, MessageSquare, Repeat2, ThumbsUp, Bookmark,
  Activity, Clock, Globe, RefreshCw, Download, Filter,
  AlertCircle, CheckCircle, Zap
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#010101', accent: '#69C9D0', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: '#C13584', accent: '#E1306C', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2', accent: '#42B72A', icon: '👥' },
  { id: 'twitch',    label: 'Twitch',    color: '#9146FF', accent: '#BF94FF', icon: '🎮' },
  { id: 'discord',   label: 'Discord',   color: '#5865F2', accent: '#57F287', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#FFD700', accent: '#FFA500', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',    color: '#FF4500', accent: '#FF6534', icon: '🤖' },
  { id: 'redgifs',   label: 'RedGIFs',   color: '#E53E3E', accent: '#FC8181', icon: '🎞️' },
];

const TIME_RANGES = [
  { id: '24h', label: '24 Hours' },
  { id: '7d',  label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
];

const CHART_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#F97316'];

function generateTimeSeries(points, base, variance, trend = 0) {
  return Array.from({ length: points }, (_, i) => ({
    time: i,
    value: Math.max(0, Math.round(base + Math.random() * variance - variance / 2 + trend * i))
  }));
}

function buildPlatformMetrics(platformId) {
  const multipliers = {
    tiktok:    { views: 850000, likes: 42000, reach: 1200000, retention: 68, followers: 125000 },
    instagram: { views: 320000, likes: 28000, reach:  680000, retention: 54, followers:  89000 },
    facebook:  { views: 210000, likes: 14000, reach:  480000, retention: 41, followers: 210000 },
    twitch:    { views:  45000, likes:  8500, reach:   92000, retention: 73, followers:  34000 },
    discord:   { views:      0, likes:  5200, reach:   18000, retention: 88, followers:  22000 },
    lemon8:    { views:  78000, likes: 11000, reach:  145000, retention: 59, followers:  41000 },
    reddit:    { views: 195000, likes: 31000, reach:  420000, retention: 47, followers:  67000 },
    redgifs:   { views: 680000, likes: 55000, reach:  920000, retention: 62, followers:  98000 },
  };
  const m = multipliers[platformId] || multipliers.tiktok;
  const jitter = () => 0.85 + Math.random() * 0.3;
  return {
    views:     Math.round(m.views     * jitter()),
    likes:     Math.round(m.likes     * jitter()),
    reach:     Math.round(m.reach     * jitter()),
    retention: Math.round(m.retention * jitter()),
    followers: Math.round(m.followers * jitter()),
    shares:    Math.round(m.likes * 0.18 * jitter()),
    comments:  Math.round(m.likes * 0.12 * jitter()),
    saves:     Math.round(m.likes * 0.09 * jitter()),
    impressions: Math.round(m.reach * 1.4 * jitter()),
    ctr:       parseFloat((2.1 + Math.random() * 3.8).toFixed(2)),
    engagementRate: parseFloat((3.2 + Math.random() * 8.5).toFixed(2)),
    avgWatchTime: parseFloat((15 + Math.random() * 45).toFixed(1)),
  };
}

function buildTimelineData(range) {
  const points = { '24h': 24, '7d': 7, '30d': 30, '90d': 90 }[range] || 30;
  const labels = Array.from({ length: points }, (_, i) => {
    if (range === '24h') return `${i}:00`;
    if (range === '7d')  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i % 7];
    return `Day ${i + 1}`;
  });
  return labels.map((label, i) => ({
    label,
    views:       Math.round(50000 + Math.random() * 200000),
    likes:       Math.round(2000  + Math.random() * 15000),
    followers:   Math.round(100   + Math.random() * 2000),
    reach:       Math.round(80000 + Math.random() * 350000),
    retention:   Math.round(45    + Math.random() * 40),
    engRate:     parseFloat((3 + Math.random() * 10).toFixed(2)),
  }));
}

function buildRetentionCurve() {
  return Array.from({ length: 20 }, (_, i) => ({
    second: (i + 1) * 3,
    rate: Math.round(100 - (i * 4.2) - Math.random() * 8),
  }));
}

function buildAudienceData() {
  return [
    { age: '13-17', value: 12 },
    { age: '18-24', value: 34 },
    { age: '25-34', value: 28 },
    { age: '35-44', value: 16 },
    { age: '45-54', value: 7  },
    { age: '55+',   value: 3  },
  ];
}

function MetricCard({ label, value, delta, icon: Icon, color, format = 'number' }) {
  const formatted = format === 'percent'
    ? `${value}%`
    : format === 'time'
    ? `${value}s`
    : value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
    ? `${(value / 1_000).toFixed(1)}K`
    : String(value);

  const positive = delta >= 0;

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{formatted}</div>
      <div className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {positive ? '+' : ''}{delta}% vs prev period
      </div>
    </div>
  );
}

function PlatformSelector({ platforms, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
            active === p.id
              ? 'border-transparent text-white'
              : 'border-gray-600 text-gray-400 bg-gray-800 hover:border-gray-400'
          }`}
          style={active === p.id ? { background: p.color, borderColor: p.accent } : {}}
        >
          <span>{p.icon}</span>
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard({ socket }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [timeRange, setTimeRange]   = useState('7d');
  const [metrics, setMetrics]       = useState(() => buildPlatformMetrics('tiktok'));
  const [timeline, setTimeline]     = useState(() => buildTimelineData('7d'));
  const [retention, setRetention]   = useState(() => buildRetentionCurve());
  const [audience, setAudience]     = useState(() => buildAudienceData());
  const [liveCount, setLiveCount]   = useState(0);
  const [isLive, setIsLive]         = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const refreshRef = useRef(null);

  const platform = PLATFORMS.find(p => p.id === activePlatform) || PLATFORMS[0];

  const refresh = useCallback(() => {
    setMetrics(buildPlatformMetrics(activePlatform));
    setTimeline(buildTimelineData(timeRange));
    setRetention(buildRetentionCurve());
    setAudience(buildAudienceData());
    setLastUpdated(new Date());
  }, [activePlatform, timeRange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.platform === activePlatform) {
        setMetrics(prev => ({ ...prev, ...data.metrics }));
        setLastUpdated(new Date());
      }
    };
    socket.on('analytics:update', handler);
    socket.emit('analytics:subscribe', { platform: activePlatform, range: timeRange });
    return () => {
      socket.off('analytics:update', handler);
      socket.emit('analytics:unsubscribe', { platform: activePlatform });
    };
  }, [socket, activePlatform, timeRange]);

  // Live viewer simulation for streaming platforms
  useEffect(() => {
    const streaming = ['twitch', 'tiktok'];
    if (!streaming.includes(activePlatform)) { setIsLive(false); return; }
    setIsLive(true);
    const base = activePlatform === 'twitch' ? 4200 : 18000;
    const iv = setInterval(() => {
      setLiveCount(Math.round(base + (Math.random() - 0.5) * 800));
    }, 2000);
    return () => clearInterval(iv);
  }, [activePlatform]);

  // Auto-refresh every 30s
  useEffect(() => {
    refreshRef.current = setInterval(refresh, 30000);
    return () => clearInterval(refreshRef.current);
  }, [refresh]);

  const deltaMap = {
    views: 14.2, likes: 8.7, reach: 21.3, followers: 5.6,
    retention: -2.1, shares: 18.9, comments: 11.4, saves: 6.8,
    impressions: 19.7, ctr: 3.2, engagementRate: 7.1, avgWatchTime: -4.3,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity size={24} className="text-indigo-400" />
            Social Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time cross-platform performance · Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-medium">{liveCount.toLocaleString()} live</span>
            </div>
          )}
          <button onClick={refresh} className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg text-sm transition-colors">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Platform + Time selectors */}
      <div className="flex flex-col gap-3">
        <PlatformSelector platforms={PLATFORMS} active={activePlatform} onChange={setActivePlatform} />
        <div className="flex gap-2">
          {TIME_RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                timeRange === r.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <MetricCard label="Views"       value={metrics.views}       delta={deltaMap.views}       icon={Eye}       color={platform.accent} />
        <MetricCard label="Likes"       value={metrics.likes}       delta={deltaMap.likes}       icon={Heart}     color="#EC4899" />
        <MetricCard label="Reach"       value={metrics.reach}       delta={deltaMap.reach}       icon={Globe}     color="#14B8A6" />
        <MetricCard label="Followers"   value={metrics.followers}   delta={deltaMap.followers}   icon={Users}     color="#8B5CF6" />
        <MetricCard label="Shares"      value={metrics.shares}      delta={deltaMap.shares}      icon={Share2}    color="#F59E0B" />
        <MetricCard label="Comments"    value={metrics.comments}    delta={deltaMap.comments}    icon={MessageSquare} color="#10B981" />
        <MetricCard label="Retention"   value={metrics.retention}   delta={deltaMap.retention}   icon={Clock}     color="#F97316" format="percent" />
        <MetricCard label="Eng. Rate"   value={metrics.engagementRate} delta={deltaMap.engagementRate} icon={Zap} color="#6366F1" format="percent" />
        <MetricCard label="Avg Watch"   value={metrics.avgWatchTime} delta={deltaMap.avgWatchTime} icon={Play}    color="#EF4444" format="time" />
        <MetricCard label="Impressions" value={metrics.impressions}  delta={deltaMap.impressions}  icon={TrendingUp} color="#06B6D4" />
        <MetricCard label="Saves"       value={metrics.saves}       delta={deltaMap.saves}       icon={Bookmark}  color="#A78BFA" />
        <MetricCard label="CTR"         value={metrics.ctr}         delta={deltaMap.ctr}         icon={CheckCircle} color="#34D399" format="percent" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Views & Reach Timeline */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Eye size={14} className="text-indigo-400" /> Views & Reach Over Time
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#14B8A6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#F9FAFB' }} />
              <Legend />
              <Area type="monotone" dataKey="views" stroke="#6366F1" fill="url(#viewsGrad)" strokeWidth={2} name="Views" />
              <Area type="monotone" dataKey="reach" stroke="#14B8A6" fill="url(#reachGrad)" strokeWidth={2} name="Reach" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Breakdown */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <ThumbsUp size={14} className="text-pink-400" /> Engagement Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeline.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="likes"     fill="#EC4899" name="Likes"    radius={[2,2,0,0]} />
              <Bar dataKey="followers" fill="#8B5CF6" name="New Followers" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Retention Curve */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-orange-400" /> Audience Retention
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={retention}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="second" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => `${v}s`} />
              <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} formatter={v => [`${v}%`, 'Retention']} />
              <Line type="monotone" dataKey="rate" stroke="#F97316" strokeWidth={2} dot={false} name="Retention %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Audience Age */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Users size={14} className="text-violet-400" /> Audience Demographics
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={audience} dataKey="value" nameKey="age" cx="50%" cy="50%" outerRadius={75} label={({ age, value }) => `${age}: ${value}%`} labelLine={false} fontSize={10}>
                {audience.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} formatter={v => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Comparison Radar */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Activity size={14} className="text-cyan-400" /> Platform Performance Index
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={[
              { metric: 'Views',     score: 85 },
              { metric: 'Reach',     score: 72 },
              { metric: 'Retention', score: 68 },
              { metric: 'Eng.',      score: 79 },
              { metric: 'Growth',    score: 61 },
              { metric: 'Saves',     score: 54 },
            ]}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Score" dataKey="score" stroke={platform.accent} fill={platform.accent} fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engagement Rate Timeline */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Zap size={14} className="text-yellow-400" /> Engagement Rate Trend
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} formatter={v => [`${v}%`, 'Eng. Rate']} />
            <Line type="monotone" dataKey="engRate" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} name="Engagement Rate" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Content Table */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-green-400" /> Top Performing Content
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2 pr-4">Post</th>
                <th className="text-right py-2 px-3">Views</th>
                <th className="text-right py-2 px-3">Likes</th>
                <th className="text-right py-2 px-3">Eng. Rate</th>
                <th className="text-right py-2 px-3">Reach</th>
                <th className="text-right py-2">Retention</th>
              </tr>
            </thead>
            <tbody>
              {[
                { title: 'Product Demo #7',       views: 842000, likes: 38400, eng: 9.2,  reach: 1100000, ret: 72 },
                { title: 'Behind The Scenes',     views: 521000, likes: 29100, eng: 7.8,  reach:  840000, ret: 65 },
                { title: 'Tutorial Series Ep.12', views: 387000, likes: 21800, eng: 11.4, reach:  620000, ret: 81 },
                { title: 'Community Q&A',         views: 298000, likes: 18200, eng: 8.1,  reach:  510000, ret: 69 },
                { title: 'Launch Announcement',   views: 215000, likes: 14600, eng: 6.4,  reach:  390000, ret: 58 },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-white">{row.title}</td>
                  <td className="text-right py-2.5 px-3 text-gray-300">{(row.views / 1000).toFixed(0)}K</td>
                  <td className="text-right py-2.5 px-3 text-pink-400">{(row.likes / 1000).toFixed(1)}K</td>
                  <td className="text-right py-2.5 px-3 text-yellow-400">{row.eng}%</td>
                  <td className="text-right py-2.5 px-3 text-cyan-400">{(row.reach / 1000000).toFixed(1)}M</td>
                  <td className="text-right py-2.5 text-orange-400">{row.ret}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
