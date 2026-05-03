// src/dashboards/AnalyticsDashboard.jsx
// Nexus AI Pro — Social Media Analytics Dashboard
// Updated: 2026-05-03

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, Users, Clock,
  RefreshCw, Filter, Download, ChevronDown, Activity,
  BarChart3, PieChart, Play, MessageSquare, ThumbsUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PLATFORM_CONFIG = {
  tiktok:    { label: 'TikTok',    color: '#010101', accent: '#fe2c55', icon: '🎵', metrics: ['views','likes','shares','comments','followers','reach','retention'] },
  instagram: { label: 'Instagram', color: '#833ab4', accent: '#fd1d1d', icon: '📸', metrics: ['reach','impressions','likes','comments','saves','followers','reels_views'] },
  facebook:  { label: 'Facebook',  color: '#1877f2', accent: '#42b72a', icon: '👥', metrics: ['reach','impressions','reactions','shares','comments','page_views','video_views'] },
  twitch:    { label: 'Twitch',    color: '#9147ff', accent: '#f0f0ff', icon: '🎮', metrics: ['viewers','followers','subscribers','chat_messages','clips','hours_watched','avg_viewers'] },
  discord:   { label: 'Discord',   color: '#5865f2', accent: '#57f287', icon: '💬', metrics: ['members','online','messages','channels','boosts','retention','growth'] },
  lemon8:    { label: 'Lemon8',    color: '#ffcc00', accent: '#ff6b35', icon: '🍋', metrics: ['views','likes','comments','saves','followers','reach','engagement_rate'] },
  reddit:    { label: 'Reddit',    color: '#ff4500', accent: '#ff6534', icon: '👽', metrics: ['upvotes','comments','shares','karma','subscribers','post_reach','awards'] },
  redgifs:   { label: 'RedGIFs',   color: '#e50914', accent: '#ff6b6b', icon: '🎬', metrics: ['views','likes','downloads','shares','followers','retention','avg_watch'] },
};

const METRIC_LABELS = {
  views: 'Views', likes: 'Likes', shares: 'Shares', comments: 'Comments',
  followers: 'Followers', reach: 'Reach', retention: 'Retention %',
  impressions: 'Impressions', saves: 'Saves', reels_views: 'Reels Views',
  reactions: 'Reactions', page_views: 'Page Views', video_views: 'Video Views',
  viewers: 'Peak Viewers', subscribers: 'Subscribers', chat_messages: 'Chat Messages',
  clips: 'Clips', hours_watched: 'Hours Watched', avg_viewers: 'Avg Viewers',
  members: 'Members', online: 'Online', messages: 'Messages',
  channels: 'Channels', boosts: 'Server Boosts', growth: 'Growth %',
  engagement_rate: 'Engagement %', upvotes: 'Upvotes', karma: 'Karma',
  post_reach: 'Post Reach', awards: 'Awards', downloads: 'Downloads',
  avg_watch: 'Avg Watch %'
};

function generateMockTimeSeries(base, variance, points = 24) {
  return Array.from({ length: points }, (_, i) => ({
    t: Date.now() - (points - 1 - i) * 3600000,
    v: Math.max(0, Math.round(base + (Math.random() - 0.5) * variance))
  }));
}

function generatePlatformData(platformKey) {
  const multipliers = {
    tiktok: 50000, instagram: 30000, facebook: 25000,
    twitch: 8000, discord: 5000, lemon8: 3000,
    reddit: 15000, redgifs: 20000
  };
  const base = multipliers[platformKey] || 10000;
  const cfg = PLATFORM_CONFIG[platformKey];
  const data = {};
  cfg.metrics.forEach(m => {
    const mBase = m.includes('rate') || m.includes('retention') || m.includes('avg_watch')
      ? Math.random() * 40 + 10
      : base * (0.5 + Math.random());
    data[m] = {
      current: Math.round(mBase),
      previous: Math.round(mBase * (0.8 + Math.random() * 0.4)),
      series: generateMockTimeSeries(mBase, mBase * 0.3)
    };
  });
  return data;
}

function MetricCard({ label, current, previous, accent, icon }) {
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const up = delta >= 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {current >= 1000000
          ? `${(current / 1000000).toFixed(1)}M`
          : current >= 1000
            ? `${(current / 1000).toFixed(1)}K`
            : current.toLocaleString()}
        {(label.includes('%') || label.includes('Retention') || label.includes('Engagement') || label.includes('Avg Watch'))
          ? '%' : ''}
      </div>
      <div className={`flex items-center gap-1 text-xs mt-1 ${up ? 'text-green-600' : 'text-red-500'}`}>
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>{Math.abs(delta).toFixed(1)}% vs last period</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.abs(delta) * 2 + 20)}%`,
            backgroundColor: accent
          }}
        />
      </div>
    </div>
  );
}

function SparkLine({ series, color }) {
  if (!series || series.length < 2) return null;
  const vals = series.map(d => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 120, h = 32;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlatformPanel({ platformKey, data }) {
  const cfg = PLATFORM_CONFIG[platformKey];
  const [expanded, setExpanded] = useState(false);
  const primaryMetrics = cfg.metrics.slice(0, 4);
  const secondaryMetrics = cfg.metrics.slice(4);
  const iconMap = {
    views: <Eye size={14} />, likes: <Heart size={14} />, shares: <Share2 size={14} />,
    followers: <Users size={14} />, reach: <Activity size={14} />, retention: <Clock size={14} />,
    viewers: <Eye size={14} />, comments: <MessageSquare size={14} />, upvotes: <ThumbsUp size={14} />
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.accent})` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cfg.icon}</span>
            <div>
              <h3 className="font-bold text-lg">{cfg.label}</h3>
              <span className="text-xs opacity-80">Real-time Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs">LIVE</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {primaryMetrics.map(metric => {
            const d = data[metric];
            if (!d) return null;
            return (
              <MetricCard
                key={metric}
                label={METRIC_LABELS[metric] || metric}
                current={d.current}
                previous={d.previous}
                accent={cfg.accent}
                icon={iconMap[metric] || '📊'}
              />
            );
          })}
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show less' : `Show ${secondaryMetrics.length} more metrics`}
        </button>

        {expanded && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-3">
            {secondaryMetrics.map(metric => {
              const d = data[metric];
              if (!d) return null;
              return (
                <div key={metric} className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-xs text-gray-500">{METRIC_LABELS[metric] || metric}</span>
                  <span className="font-semibold text-sm dark:text-white">
                    {d.current.toLocaleString()}
                  </span>
                  <SparkLine series={d.series} color={cfg.accent} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewRow({ allData }) {
  const totals = {
    reach: 0, engagement: 0, followers: 0, posts: Object.keys(allData).length * 12
  };
  Object.entries(allData).forEach(([pk, pd]) => {
    if (pd.reach) totals.reach += pd.reach.current;
    if (pd.followers) totals.followers += pd.followers.current;
    if (pd.likes) totals.engagement += pd.likes.current;
    if (pd.views) totals.engagement += pd.views.current;
  });

  const cards = [
    { label: 'Total Reach', value: totals.reach, icon: <Activity size={20} />, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Followers', value: totals.followers, icon: <Users size={20} />, color: 'from-purple-500 to-pink-500' },
    { label: 'Total Engagement', value: totals.engagement, icon: <Heart size={20} />, color: 'from-red-500 to-orange-500' },
    { label: 'Content Pieces', value: totals.posts, icon: <BarChart3 size={20} />, color: 'from-green-500 to-teal-500' }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map(c => (
        <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-xl p-4 text-white shadow-md`}>
          <div className="flex items-center gap-2 mb-2 opacity-90">{c.icon}<span className="text-sm font-medium">{c.label}</span></div>
          <div className="text-2xl font-bold">
            {c.value >= 1000000 ? `${(c.value / 1000000).toFixed(1)}M` : c.value >= 1000 ? `${(c.value / 1000).toFixed(1)}K` : c.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard({ userRole = 'user' }) {
  const { t } = useTranslation();
  const [selectedPlatforms, setSelectedPlatforms] = useState(Object.keys(PLATFORM_CONFIG));
  const [platformData, setPlatformData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const data = {};
    selectedPlatforms.forEach(p => { data[p] = generatePlatformData(p); });
    setPlatformData(data);
    setLastRefresh(new Date());
    setLoading(false);
  }, [selectedPlatforms]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, 30000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, loadData]);

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(platformData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time social media metrics across all platforms
            {lastRefresh && ` · Last updated ${lastRefresh.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
          >
            <option value="1h">Last 1h</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            onClick={() => setAutoRefresh(r => !r)}
            className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${autoRefresh ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'} dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300`}
          >
            <Activity size={14} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {(userRole === 'admin' || userRole === 'dev') && (
            <button
              onClick={exportData}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Platform toggles */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => togglePlatform(key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedPlatforms.includes(key)
                ? 'text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
            style={selectedPlatforms.includes(key) ? { backgroundColor: cfg.color } : {}}
          >
            <span>{cfg.icon}</span>
            <span>{cfg.label}</span>
          </button>
        ))}
      </div>

      {/* Overview row */}
      {Object.keys(platformData).length > 0 && (
        <div className="mb-6">
          <OverviewRow allData={platformData} />
        </div>
      )}

      {/* Platform panels */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={32} className="animate-spin text-blue-600" />
            <span className="text-gray-500">Loading analytics data…</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {selectedPlatforms.map(pk => (
            platformData[pk] ? (
              <PlatformPanel key={pk} platformKey={pk} data={platformData[pk]} />
            ) : null
          ))}
        </div>
      )}

      {selectedPlatforms.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Filter size={40} className="mx-auto mb-3 opacity-40" />
          <p>Select at least one platform to view analytics</p>
        </div>
      )}
    </div>
  );
}
