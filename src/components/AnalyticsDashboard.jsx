// src/components/AnalyticsDashboard.jsx
// Nexus AI Pro — Social Media Analytics Dashboard
// Real-time metrics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Eye, Heart,
  Share2, RefreshCw, Link, Unlink, ChevronDown, ChevronUp,
  Activity, Clock, Globe, Zap, Play, MessageSquare
} from 'lucide-react';

const PLATFORM_CONFIG = {
  tiktok:    { label: 'TikTok',    color: '#010101', accent: '#ff0050', emoji: '🎵' },
  instagram: { label: 'Instagram', color: '#E1306C', accent: '#833AB4', emoji: '📸' },
  facebook:  { label: 'Facebook',  color: '#1877F2', accent: '#42B72A', emoji: '📘' },
  twitch:    { label: 'Twitch',    color: '#9146FF', accent: '#F8F8F8', emoji: '🟣' },
  discord:   { label: 'Discord',   color: '#5865F2', accent: '#EB459E', emoji: '💬' },
  lemon8:    { label: 'Lemon8',    color: '#FFD700', accent: '#FF6B35', emoji: '🍋' },
  reddit:    { label: 'Reddit',    color: '#FF4500', accent: '#0DD3BB', emoji: '🔴' },
  redgifs:   { label: 'RedGIFs',   color: '#E50914', accent: '#B81D24', emoji: '🎞️' },
};

const PLATFORMS = Object.keys(PLATFORM_CONFIG);

function useAnalytics(platform) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('nexus:accessToken');
      const resp = await fetch(`/api/analytics/platform/${platform}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setData(await resp.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

function useOverview() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexus:accessToken');
      const resp = await fetch('/api/analytics/overview', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) setData(await resp.json());
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); const id = setInterval(fetch_, 30000); return () => clearInterval(id); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, delta, icon: Icon, color }) {
  const positive = delta > 0;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={16} className="text-gray-500" />}
      </div>
      <div className="text-2xl font-bold text-white">{value?.toLocaleString() ?? '—'}</div>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(delta).toLocaleString()} this month
        </div>
      )}
    </div>
  );
}

function MiniBar({ value, max, color = '#6366f1' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function TrendChart({ data = [], color = '#6366f1' }) {
  if (!data.length) return null;
  const values = data.map(d => d.views || 0);
  const max = Math.max(...values, 1);
  const width  = 240;
  const height = 60;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * height * 0.9;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function PlatformCard({ platform, onSelect, selected }) {
  const cfg = PLATFORM_CONFIG[platform];
  const { data, loading, error, refetch } = useAnalytics(platform);

  return (
    <div
      className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        selected ? 'border-indigo-500 bg-gray-800' : 'border-gray-700 bg-gray-900 hover:border-gray-500'
      }`}
      onClick={() => onSelect(platform)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.emoji}</span>
          <span className="font-semibold text-white">{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={14} className="text-gray-400 animate-spin" />}
          {!loading && (
            <button
              onClick={e => { e.stopPropagation(); refetch(); }}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          )}
          {selected ? <ChevronUp size={14} className="text-indigo-400" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>

      {error ? (
        <p className="text-red-400 text-xs">{error}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="text-lg font-bold text-white">{data.followers?.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Followers</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{data.engagementRate}%</div>
              <div className="text-xs text-gray-400">Engagement</div>
            </div>
          </div>
          <TrendChart data={data.dailyTrend || []} color={cfg.accent} />
        </>
      ) : (
        <div className="text-gray-500 text-sm">Loading…</div>
      )}
    </div>
  );
}

function PlatformDetail({ platform }) {
  const cfg = PLATFORM_CONFIG[platform];
  const { data, loading } = useAnalytics(platform);

  if (loading) return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 flex items-center justify-center">
      <RefreshCw size={24} className="text-indigo-400 animate-spin" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{cfg.emoji}</span>
        <div>
          <h2 className="text-xl font-bold text-white">{cfg.label}</h2>
          <p className="text-gray-400 text-sm">Last 30 days · {data.source === 'demo' ? 'Demo data' : 'Live'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Followers"   value={data.followers}      delta={data.followerDelta}  icon={Users}       />
        <StatCard label="Total Views" value={data.totalViews}     icon={Eye}                  />
        <StatCard label="Total Likes" value={data.totalLikes}     icon={Heart}                />
        <StatCard label="Engagement"  value={`${data.engagementRate}%`} icon={Activity}       />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-3">Reach & Impressions</h3>
          <div className="space-y-2">
            {[
              { label: 'Organic Reach',  value: data.reachEstimate },
              { label: 'Impressions',    value: data.impressions },
              { label: 'Unique Viewers', value: Math.round(data.impressions * 0.6) },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{item.label}</span>
                  <span className="text-white">{item.value?.toLocaleString()}</span>
                </div>
                <MiniBar value={item.value} max={data.impressions} color={cfg.accent} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-3">Retention & Completion</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Retention Rate</span>
                <span className="text-white">{data.retentionRate}%</span>
              </div>
              <MiniBar value={data.retentionRate} max={100} color="#22c55e" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Completion Rate</span>
                <span className="text-white">{data.completionRate}%</span>
              </div>
              <MiniBar value={data.completionRate} max={100} color="#3b82f6" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Share Rate</span>
                <span className="text-white">{data.shareRate}%</span>
              </div>
              <MiniBar value={data.shareRate} max={10} color="#f59e0b" />
            </div>
          </div>
        </div>
      </div>

      {data.topContent?.length > 0 && (
        <div>
          <h3 className="text-gray-300 text-sm font-medium mb-3">Top Content (Last 30 Days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-700">
                  <th className="text-left pb-2">#</th>
                  <th className="text-left pb-2">Type</th>
                  <th className="text-right pb-2">Views</th>
                  <th className="text-right pb-2">Likes</th>
                  <th className="text-right pb-2">Comments</th>
                  <th className="text-right pb-2">Shares</th>
                </tr>
              </thead>
              <tbody>
                {data.topContent.map(item => (
                  <tr key={item.rank} className="border-b border-gray-800 text-gray-300">
                    <td className="py-2 text-gray-500">{item.rank}</td>
                    <td className="py-2 capitalize">{item.type}</td>
                    <td className="py-2 text-right">{item.views.toLocaleString()}</td>
                    <td className="py-2 text-right">{item.likes.toLocaleString()}</td>
                    <td className="py-2 text-right">{item.comments.toLocaleString()}</td>
                    <td className="py-2 text-right">{item.shares.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.peakHours?.length > 0 && (
        <div>
          <h3 className="text-gray-300 text-sm font-medium mb-3">Peak Engagement Hours</h3>
          <div className="flex items-end gap-1 h-16">
            {data.peakHours.map(h => (
              <div key={h.hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${h.relativeEngagement * 50}%`,
                    backgroundColor: h.relativeEngagement > 1.2 ? cfg.accent : '#374151',
                  }}
                />
                {h.hour % 6 === 0 && (
                  <span className="text-gray-600 text-xs mt-1">{h.hour}h</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [realtimeActive,   setRealtimeActive]   = useState(false);
  const [realtimeData,     setRealtimeData]      = useState(null);
  const { data: overview, loading: overviewLoading, refetch: refetchOverview } = useOverview();

  const totalFollowers = useMemo(() =>
    overview?.overview?.totalFollowers?.toLocaleString() ?? '—', [overview]);

  const totalViews = useMemo(() =>
    overview?.overview?.totalViews?.toLocaleString() ?? '—', [overview]);

  const connectedCount = overview?.connectedCount ?? 0;

  useEffect(() => {
    if (!realtimeActive) { setRealtimeData(null); return; }
    const token = localStorage.getItem('nexus:accessToken');
    const poll = async () => {
      try {
        const resp = await fetch('/api/analytics/realtime', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) setRealtimeData(await resp.json());
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [realtimeActive]);

  const togglePlatform = (platform) =>
    setSelectedPlatform(prev => prev === platform ? null : platform);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={28} className="text-indigo-400" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time social media insights across {PLATFORMS.length} platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRealtimeActive(a => !a)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              realtimeActive
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Zap size={14} />
            {realtimeActive ? 'Live' : 'Enable Live'}
          </button>
          <button
            onClick={refetchOverview}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={14} className={overviewLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Followers" value={overview?.overview?.totalFollowers} icon={Users} />
        <StatCard label="Total Views"     value={overview?.overview?.totalViews}     icon={Eye}   />
        <StatCard label="Total Likes"     value={overview?.overview?.totalLikes}     icon={Heart} />
        <StatCard label="Connected"       value={connectedCount}                     icon={Globe} />
      </div>

      {/* Real-time panel */}
      {realtimeActive && realtimeData && (
        <div className="mb-8 bg-gray-900 border border-green-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Live Data · updates every 5s</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {realtimeData.realtime?.filter(r => r.liveViewers > 0 || r.lastHourViews > 0).map(r => (
              <div key={r.platform} className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1 capitalize">{r.platform}</div>
                {r.liveViewers > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-white text-sm">{r.liveViewers} live</span>
                  </div>
                )}
                <div className="text-gray-300 text-xs">{r.lastHourViews.toLocaleString()} views/hr</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {PLATFORMS.map(platform => (
          <PlatformCard
            key={platform}
            platform={platform}
            selected={selectedPlatform === platform}
            onSelect={togglePlatform}
          />
        ))}
      </div>

      {/* Expanded detail */}
      {selectedPlatform && (
        <div className="mt-4">
          <PlatformDetail platform={selectedPlatform} />
        </div>
      )}

      {/* Footer note */}
      <p className="text-gray-600 text-xs text-center mt-8">
        Connect platforms via Settings → Integrations to see live data. Demo metrics shown until connected.
      </p>
    </div>
  );
}
