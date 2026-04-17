// nexus-ai-pro/src/dashboards/AnalyticsDashboard.jsx | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Real-time social analytics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2, MessageCircle,
  Users, Radio, RefreshCw, Plus, Link, AlertCircle, Wifi,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     icon: '🎵', color: '#69C9D0' },
  { id: 'instagram', label: 'Instagram',  icon: '📷', color: '#E1306C' },
  { id: 'facebook',  label: 'Facebook',   icon: '👥', color: '#1877F2' },
  { id: 'twitch',    label: 'Twitch',     icon: '🎮', color: '#9146FF' },
  { id: 'discord',   label: 'Discord',    icon: '💬', color: '#5865F2' },
  { id: 'lemon8',    label: 'Lemon8',     icon: '🍋', color: '#FFD700' },
  { id: 'reddit',    label: 'Reddit',     icon: '🤖', color: '#FF4500' },
  { id: 'redgifs',   label: 'RedGifs',    icon: '🎬', color: '#FF6B6B' },
];

function MetricCard({ label, value, delta, icon: Icon, color }) {
  const isPos = delta > 0;
  const TrendIcon = isPos ? TrendingUp : TrendingDown;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{label}</span>
        {Icon && <Icon size={18} style={{ color }} />}
      </div>
      <span className="text-2xl font-bold text-white">{fmtNum(value)}</span>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${isPos ? 'text-green-400' : 'text-red-400'}`}>
          <TrendIcon size={12} />
          <span>{isPos ? '+' : ''}{delta.toFixed(1)}% vs last period</span>
        </div>
      )}
    </div>
  );
}

function PlatformBadge({ platform, connected, onConnect }) {
  const p = PLATFORMS.find(x => x.id === platform);
  return (
    <button
      onClick={() => !connected && onConnect(platform)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
        ${connected
          ? 'border border-green-500/30 bg-green-500/10 text-green-300'
          : 'border border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}`}
    >
      <span>{p?.icon}</span>
      <span>{p?.label}</span>
      {!connected && <Plus size={12} />}
    </button>
  );
}

function fmtNum(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function RetentionChart({ data }) {
  if (!data?.length) return <p className="text-gray-500 text-sm text-center py-4">No retention data</p>;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="second" tick={{ fill: '#6b7280', fontSize: 10 }} label={{ value: 'seconds', position: 'insideBottom', fill: '#6b7280', fontSize: 10 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${v}%`} />
        <Tooltip formatter={(v) => [`${v}%`, 'Retention']} contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
        <Area type="monotone" dataKey="pct" stroke="#6366f1" fill="url(#retGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ReachChart({ history }) {
  if (!history?.length) return <p className="text-gray-500 text-sm text-center py-4">No reach data</p>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={fmtNum} />
        <Tooltip formatter={(v) => [fmtNum(v)]} contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {PLATFORMS.slice(0, 4).map(p => (
          <Line key={p.id} type="monotone" dataKey={p.id} stroke={p.color} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function EngagementBar({ data }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="platform" tick={{ fill: '#6b7280', fontSize: 11 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${v}%`} />
        <Tooltip formatter={v => [`${v}%`, 'Engagement']} contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
        <Bar dataKey="engagement" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <rect key={i} fill={PLATFORMS.find(p => p.id === entry.platform)?.color ?? '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AnalyticsDashboard() {
  const { t } = useTranslation('analytics');
  const [accounts, setAccounts] = useState({});
  const [metrics, setMetrics] = useState({});
  const [history, setHistory] = useState([]);
  const [retention, setRetention] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/metrics', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAccounts(data.accounts ?? {});
      setMetrics(data.metrics ?? {});
      setHistory(data.history ?? []);
      setRetention(data.retention ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(fetchMetrics, 30_000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive, fetchMetrics]);

  const handleConnect = async (platform) => {
    try {
      const res = await fetch(`/api/analytics/connect/${platform}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch (e) {
      setError(e.message);
    }
  };

  const connectedPlatforms = Object.keys(accounts).filter(p => accounts[p]?.connected);
  const totalFollowers = connectedPlatforms.reduce((s, p) => s + (metrics[p]?.followers ?? 0), 0);
  const totalViews = connectedPlatforms.reduce((s, p) => s + (metrics[p]?.views ?? 0), 0);
  const totalLikes = connectedPlatforms.reduce((s, p) => s + (metrics[p]?.likes ?? 0), 0);
  const totalReach = connectedPlatforms.reduce((s, p) => s + (metrics[p]?.reach ?? 0), 0);

  const engagementData = connectedPlatforms.map(p => ({
    platform: p,
    engagement: metrics[p]?.engagement_rate ?? 0,
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Social Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time cross-platform insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
              ${isLive ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
          >
            <Radio size={14} className={isLive ? 'animate-pulse' : ''} />
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-300 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Platform connection row */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PLATFORMS.map(p => (
          <PlatformBadge
            key={p.id}
            platform={p.id}
            connected={!!accounts[p.id]?.connected}
            onConnect={handleConnect}
          />
        ))}
      </div>

      {/* Aggregate KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Followers" value={totalFollowers} delta={2.4} icon={Users} color="#6366f1" />
        <MetricCard label="Total Views"     value={totalViews}    delta={7.1} icon={Eye}   color="#06b6d4" />
        <MetricCard label="Total Likes"     value={totalLikes}    delta={-0.8} icon={Heart} color="#ec4899" />
        <MetricCard label="Total Reach"     value={totalReach}    delta={5.3} icon={Wifi}  color="#22c55e" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Reach Over Time</h2>
          <ReachChart history={history} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Engagement Rate by Platform</h2>
          <EngagementBar data={engagementData} />
        </div>
      </div>

      {/* Retention */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">View Retention Curve</h2>
        <RetentionChart data={retention} />
      </div>

      {/* Per-platform detail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {connectedPlatforms.map(pid => {
          const m = metrics[pid] ?? {};
          const p = PLATFORMS.find(x => x.id === pid);
          return (
            <div key={pid} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{p?.icon}</span>
                <span className="font-semibold text-white">{p?.label}</span>
                <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Followers</div><div className="text-white font-medium text-right">{fmtNum(m.followers)}</div>
                <div className="text-gray-400">Views</div><div className="text-white font-medium text-right">{fmtNum(m.views)}</div>
                <div className="text-gray-400">Likes</div><div className="text-white font-medium text-right">{fmtNum(m.likes)}</div>
                <div className="text-gray-400">Shares</div><div className="text-white font-medium text-right">{fmtNum(m.shares)}</div>
                <div className="text-gray-400">Reach</div><div className="text-white font-medium text-right">{fmtNum(m.reach)}</div>
                <div className="text-gray-400">Engagement</div><div className="text-white font-medium text-right">{m.engagement_rate ? `${m.engagement_rate}%` : '—'}</div>
              </div>
            </div>
          );
        })}

        {connectedPlatforms.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
            <Link size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Connect a platform above to see analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}
