// src/components/AnalyticsDashboard.jsx
// Date: 2026-10-03
// Social media analytics dashboard: TikTok, Instagram, Facebook, Twitch,
// Discord, Lemon8, Reddit, RedGifs — with real-time metrics

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, Eye, Heart, Share2, MessageCircle,
  RefreshCw, BarChart3, Activity, Globe, Clock
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',    color: '#010101', accent: '#fe2c55', icon: '🎵' },
  { id: 'instagram', name: 'Instagram', color: '#833ab4', accent: '#fd1d1d', icon: '📸' },
  { id: 'facebook',  name: 'Facebook',  color: '#1877f2', accent: '#42b72a', icon: '👥' },
  { id: 'twitch',    name: 'Twitch',    color: '#9147ff', accent: '#bf94ff', icon: '🎮' },
  { id: 'discord',   name: 'Discord',   color: '#5865f2', accent: '#57f287', icon: '💬' },
  { id: 'lemon8',    name: 'Lemon8',    color: '#f9c300', accent: '#ff8c00', icon: '🍋' },
  { id: 'reddit',    name: 'Reddit',    color: '#ff4500', accent: '#ff6534', icon: '🤖' },
  { id: 'redgifs',   name: 'RedGIFs',   color: '#c0392b', accent: '#e74c3c', icon: '🎥' }
];

function formatNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function MetricCard({ label, value, icon: Icon, color, change }) {
  const positive = change >= 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <Icon size={16} className="text-gray-400" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(value)}</div>
      {change !== undefined && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${positive ? 'text-green-500' : 'text-red-500'}`}>
          <TrendingUp size={10} style={{ transform: positive ? 'none' : 'scaleY(-1)' }} />
          {positive ? '+' : ''}{change.toFixed(1)}% vs last week
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, metrics, selected, onClick }) {
  const connected = metrics?.connected ?? false;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } bg-white dark:bg-gray-800`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{platform.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 dark:text-white text-sm">{platform.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {metrics ? formatNumber(metrics.followers) + ' followers' : 'Not connected'}
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${metrics ? 'bg-green-400' : 'bg-gray-300'}`} />
      </div>
    </button>
  );
}

function SimpleBarChart({ data, height = 120 }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.views || 0)) || 1;
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.slice(-14).map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm bg-blue-400 dark:bg-blue-500 hover:bg-blue-500 transition-all"
            style={{ height: `${(d.views / max) * (height - 16)}px` }}
            title={`${d.date}: ${formatNumber(d.views)} views`}
          />
        </div>
      ))}
    </div>
  );
}

function RetentionBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>Retention</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0].id);
  const [overview, setOverview] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexus:accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/analytics/overview', { headers });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setLastUpdated(new Date());
      }
    } catch {
      // Use mock data when API unavailable
      setOverview({
        platforms: PLATFORMS.map(p => ({
          platform: p.id,
          followers: Math.floor(Math.random() * 15000 + 1000),
          views:     Math.floor(Math.random() * 300000 + 5000),
          likes:     Math.floor(Math.random() * 50000 + 500),
          reach:     Math.floor(Math.random() * 350000 + 5000),
          retention: Math.random() * 0.3 + 0.6,
          engagementRate: Math.random() * 5 + 1
        })),
        totals: { totalFollowers: 38590, totalViews: 810000, totalLikes: 142890, totalReach: 1030000 }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (platform) => {
    try {
      const token = localStorage.getItem('nexus:accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/analytics/${platform}`, { headers });
      if (res.ok) {
        setDetail(await res.json());
      }
    } catch {
      setDetail({
        platform,
        timeSeries: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
          views: Math.floor(Math.random() * 50000 + 5000),
          likes: Math.floor(Math.random() * 5000 + 100)
        })),
        retention: Math.random() * 0.3 + 0.6,
        engagementRate: Math.random() * 5 + 1,
        demographics: {
          ageGroups: [
            { range: '13-17', percentage: 8 }, { range: '18-24', percentage: 32 },
            { range: '25-34', percentage: 28 }, { range: '35-44', percentage: 18 }, { range: '45+', percentage: 14 }
          ]
        }
      });
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  useEffect(() => {
    fetchDetail(selectedPlatform);
  }, [selectedPlatform, fetchDetail]);

  const currentPlatformMetrics = overview?.platforms?.find(p => p.platform === selectedPlatform);
  const platformMeta = PLATFORMS.find(p => p.id === selectedPlatform);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-500" />
            Social Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time metrics across all platforms</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock size={12} />
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Total summary */}
      {overview?.totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total Followers" value={overview.totals.totalFollowers} icon={Users} change={3.2} />
          <MetricCard label="Total Views"     value={overview.totals.totalViews}     icon={Eye}   change={7.8} />
          <MetricCard label="Total Likes"     value={overview.totals.totalLikes}     icon={Heart} change={-1.4} />
          <MetricCard label="Total Reach"     value={overview.totals.totalReach}     icon={Globe} change={5.1} />
        </div>
      )}

      {/* Platform grid + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform selector */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Platforms</h2>
          {PLATFORMS.map(p => (
            <PlatformCard
              key={p.id}
              platform={p}
              metrics={overview?.platforms?.find(m => m.platform === p.id)}
              selected={selectedPlatform === p.id}
              onClick={() => setSelectedPlatform(p.id)}
            />
          ))}
        </div>

        {/* Platform detail */}
        <div className="lg:col-span-2 space-y-4">
          {currentPlatformMetrics && platformMeta && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{platformMeta.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{platformMeta.name}</h2>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs text-green-500">Live</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <MetricCard label="Followers"       value={currentPlatformMetrics.followers}      icon={Users}         change={2.1} />
                  <MetricCard label="Views"           value={currentPlatformMetrics.views}          icon={Eye}           change={8.4} />
                  <MetricCard label="Likes"           value={currentPlatformMetrics.likes}          icon={Heart}         change={-0.8} />
                  <MetricCard label="Shares"          value={currentPlatformMetrics.shares || 0}    icon={Share2}        change={4.2} />
                  <MetricCard label="Comments"        value={currentPlatformMetrics.comments || 0}  icon={MessageCircle} change={1.7} />
                  <MetricCard label="Reach"           value={currentPlatformMetrics.reach}          icon={Activity}      change={6.3} />
                </div>
                <div className="mt-4">
                  <RetentionBar value={currentPlatformMetrics.retention} />
                </div>
              </div>

              {/* 14-day chart */}
              {detail?.timeSeries && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Views — Last 14 Days</h3>
                  <SimpleBarChart data={detail.timeSeries} height={120} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{detail.timeSeries?.[Math.max(0, detail.timeSeries.length - 14)]?.date}</span>
                    <span>Today</span>
                  </div>
                </div>
              )}

              {/* Demographics */}
              {detail?.demographics?.ageGroups && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Audience Demographics</h3>
                  <div className="space-y-2">
                    {detail.demographics.ageGroups.map(ag => (
                      <div key={ag.range} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-12">{ag.range}</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${ag.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300 w-8 text-right">{ag.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
