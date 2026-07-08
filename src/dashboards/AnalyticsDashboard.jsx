// src/dashboards/AnalyticsDashboard.jsx
// Date: 2026-07-08
// Social media analytics dashboard: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, Eye, Heart, Share2, MessageSquare,
  RefreshCw, Activity, BarChart3, Globe, Play, Zap,
  ChevronUp, ChevronDown, AlertCircle, CheckCircle,
  Star, Award, Radio
} from 'lucide-react';

const PLATFORMS = {
  tiktok: { name: 'TikTok', emoji: '🎵', color: '#010101', bgColor: 'bg-black', textColor: 'text-white', accent: '#fe2c55' },
  instagram: { name: 'Instagram', emoji: '📸', color: '#E1306C', bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500', textColor: 'text-white', accent: '#E1306C' },
  facebook: { name: 'Facebook', emoji: '📘', color: '#1877F2', bgColor: 'bg-blue-600', textColor: 'text-white', accent: '#1877F2' },
  twitch: { name: 'Twitch', emoji: '🟣', color: '#9146FF', bgColor: 'bg-purple-600', textColor: 'text-white', accent: '#9146FF' },
  discord: { name: 'Discord', emoji: '💬', color: '#5865F2', bgColor: 'bg-indigo-600', textColor: 'text-white', accent: '#5865F2' },
  lemon8: { name: 'Lemon8', emoji: '🍋', color: '#FFD100', bgColor: 'bg-yellow-400', textColor: 'text-black', accent: '#FFD100' },
  reddit: { name: 'Reddit', emoji: '🤖', color: '#FF4500', bgColor: 'bg-orange-600', textColor: 'text-white', accent: '#FF4500' },
  redgifs: { name: 'RedGifs', emoji: '🎞️', color: '#E53E3E', bgColor: 'bg-red-600', textColor: 'text-white', accent: '#E53E3E' }
};

const TIME_RANGES = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' }
];

function MetricCard({ label, value, change, icon: Icon, color }) {
  const isPositive = parseFloat(change) >= 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={16} className="text-gray-400" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(value)}</div>
      {change !== undefined && (
        <div className={`flex items-center mt-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {Math.abs(parseFloat(change))}% vs prev
        </div>
      )}
    </div>
  );
}

function MiniSparkline({ data, color = '#3b82f6' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 40;
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function PlatformCard({ platform, data, selected, onClick, loading }) {
  const meta = PLATFORMS[platform] || {};
  const mainMetric = data?.totals?.views || data?.totals?.impressions || data?.totals?.viewers || 0;
  const engagement = (data?.totals?.likes || 0) + (data?.totals?.comments || 0) + (data?.totals?.shares || 0);

  const sparkData = data?.series?.map(p => p.views || p.impressions || p.viewers || 0) || [];

  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-xl p-4 transition-all border-2 ${
        selected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'
      } bg-white dark:bg-gray-800 shadow-sm`}
    >
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center">
          <RefreshCw size={16} className="animate-spin text-gray-400" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{meta.emoji}</span>
        <span className="font-semibold text-gray-900 dark:text-white text-sm">{meta.name}</span>
        <span className="ml-auto">
          <CheckCircle size={14} className="text-green-500" />
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(mainMetric)}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">reach / views</div>
      <div className="mt-2">
        <MiniSparkline data={sparkData} color={meta.accent || '#3b82f6'} />
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {formatNumber(engagement)} engagements
      </div>
    </button>
  );
}

function RetentionChart({ data }) {
  if (!data) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Activity size={16} />
        Retention Curve
      </h3>
      <div className="flex items-end gap-1 h-24">
        {data.retentionCurve.map((point, i) => {
          const maxV = data.retentionCurve[0]?.viewers || 1;
          const pct = (point.viewers / maxV) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-blue-500 rounded-t opacity-80 transition-all"
                style={{ height: `${pct}%` }}
              />
              <span className="text-xs text-gray-400">{point.percentage}%</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Avg watch: <strong>{data.avgWatchPct}%</strong>
      </div>
    </div>
  );
}

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function AnalyticsDashboard({ token }) {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [platformData, setPlatformData] = useState({});
  const [summary, setSummary] = useState(null);
  const [retention, setRetention] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const connectDemo = useCallback(async () => {
    if (!token) return;
    setConnecting(true);
    try {
      const r = await fetch('/api/analytics/demo-connect', { method: 'POST', headers });
      if (r.ok) {
        const d = await r.json();
        setConnectedPlatforms(Object.keys(PLATFORMS));
      }
    } catch (e) {
      setError('Failed to connect demo accounts');
    } finally {
      setConnecting(false);
    }
  }, [token]);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`, { headers });
      if (r.ok) {
        const d = await r.json();
        setSummary(d);
        if (d.connected?.length > 0) {
          setConnectedPlatforms(d.connected.map(a => a.platform));
        }
      }
    } catch (e) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token, timeRange]);

  const fetchPlatformMetrics = useCallback(async (platform) => {
    if (!token || !connectedPlatforms.includes(platform)) return;
    try {
      const r = await fetch(`/api/analytics/metrics/${platform}?timeRange=${timeRange}`, { headers });
      if (r.ok) {
        const data = await r.json();
        setPlatformData(prev => ({ ...prev, [platform]: data }));
      }
    } catch {
      // non-critical
    }
  }, [token, timeRange, connectedPlatforms]);

  const fetchRetention = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`/api/analytics/retention/${selectedPlatform}/demo_content_1`, { headers });
      if (r.ok) setRetention(await r.json());
    } catch {}
  }, [token, selectedPlatform]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { if (connectedPlatforms.length > 0) fetchPlatformMetrics(selectedPlatform); }, [selectedPlatform, fetchPlatformMetrics, connectedPlatforms]);
  useEffect(() => { fetchRetention(); }, [fetchRetention]);

  const currentData = platformData[selectedPlatform];
  const platform = PLATFORMS[selectedPlatform];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-500" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Cross-platform social media metrics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TIME_RANGES.map(tr => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === tr.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tr.label}
            </button>
          ))}
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Connect accounts prompt */}
      {connectedPlatforms.length === 0 && (
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-center">
          <Globe size={32} className="mx-auto text-gray-400 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Connect your social accounts</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Track metrics across TikTok, Instagram, Facebook, Twitch, Discord, and more</p>
          <button
            onClick={connectDemo}
            disabled={connecting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect Demo Accounts'}
          </button>
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Total Reach" value={summary.totalReach} icon={Eye} />
          <MetricCard label="Engagement" value={summary.totalEngagement} icon={Heart} />
          <MetricCard label="Eng. Rate" value={summary.engagementRate} icon={Activity} />
          <MetricCard label="Connected" value={connectedPlatforms.length} icon={Globe} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white dark:bg-gray-800 rounded-xl p-1 w-fit">
        {['overview', 'platform', 'retention'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.keys(PLATFORMS).map(p => (
            <PlatformCard
              key={p}
              platform={p}
              data={platformData[p]}
              selected={selectedPlatform === p}
              onClick={() => {
                setSelectedPlatform(p);
                setActiveTab('platform');
                fetchPlatformMetrics(p);
              }}
              loading={loading && !platformData[p]}
            />
          ))}
        </div>
      )}

      {activeTab === 'platform' && currentData && (
        <div className="space-y-4">
          {/* Platform header */}
          <div className={`rounded-xl p-4 ${platform?.bgColor || 'bg-gray-800'} ${platform?.textColor || 'text-white'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{platform?.emoji}</span>
              <h2 className="text-xl font-bold">{platform?.name}</h2>
            </div>
            <p className="text-sm opacity-80">
              {currentData.account ? `@${currentData.account.username}` : 'Demo Account'} · {timeRange}
            </p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(currentData.totals || {}).slice(0, 8).map(([metric, value]) => (
              <MetricCard
                key={metric}
                label={metric.replace(/_/g, ' ')}
                value={value}
                change={currentData.changes?.[metric]}
              />
            ))}
          </div>

          {/* Time series chart (simple bar chart) */}
          {currentData.series?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Views Over Time</h3>
              <div className="flex items-end gap-1 h-32">
                {currentData.series.slice(-14).map((point, i) => {
                  const val = point.views || point.impressions || point.viewers || 0;
                  const maxVal = Math.max(...currentData.series.slice(-14).map(p => p.views || p.impressions || p.viewers || 0));
                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="relative w-full group">
                        <div
                          className="w-full bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-all"
                          style={{ height: `${Math.max(pct, 2)}%`, minHeight: '4px' }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-1 py-0.5 whitespace-nowrap z-10">
                          {formatNumber(val)}
                        </div>
                      </div>
                      {i % 3 === 0 && <span className="text-xs text-gray-400 rotate-45 origin-left">{point.date?.slice(5)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'retention' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RetentionChart data={retention} />
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp size={16} />
              Drop-off Points
            </h3>
            {retention?.dropOffPoints?.map((dp, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="text-sm text-gray-500 w-16">{dp.percentage}%</div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${dp.dropOff * 5}%` }}
                  />
                </div>
                <div className="text-sm font-medium text-red-500">{dp.dropOff}% drop</div>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-4">Based on {selectedPlatform} content analysis</p>
          </div>
        </div>
      )}

      {/* Real-time indicator */}
      <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Real-time · Last updated {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
