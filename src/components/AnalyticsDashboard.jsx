// AnalyticsDashboard.jsx | 2026-10-08

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, TrendingUp, Users, Eye, Heart, Share2,
  Activity, RefreshCw, Globe, Zap,
} from 'lucide-react';

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'Twitch', 'Discord', 'Lemon8', 'Reddit', 'RedGifs'];
const TIME_RANGES = ['24h', '7d', '30d', '90d'];
const PLATFORM_COLORS = {
  TikTok: '#010101', Instagram: '#E1306C', Facebook: '#1877F2',
  Twitch: '#9146FF', Discord: '#5865F2', Lemon8: '#FFD700',
  Reddit: '#FF4500', RedGifs: '#FF3D3D',
};

function MetricCard({ icon: Icon, label, value, color, loading }) {
  if (loading) return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  );
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3 shadow-sm">
      <div className="p-2 rounded-lg" style={{ backgroundColor: color + '22' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

function LineChart({ data, color }) {
  if (!data || data.length < 2) return null;
  const W = 300, H = 80;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 10) - 5;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
      <polyline fill="none" stroke={color || '#6366F1'} strokeWidth="2" points={pts} />
    </svg>
  );
}

function BarComparison({ platforms, metric, data }) {
  if (!data) return <Skeleton className="h-32" />;
  const values = platforms.map(p => Number(data[p.toLowerCase()]?.[metric]) || 0);
  const max = Math.max(...values) || 1;
  return (
    <div className="flex items-end gap-1 h-32">
      {platforms.map((p, i) => (
        <div key={p} className="flex flex-col items-center flex-1 gap-1">
          <div
            className="w-full rounded-t transition-all duration-500"
            style={{
              height: `${(values[i] / max) * 100}%`,
              backgroundColor: PLATFORM_COLORS[p] || '#6366F1',
              minHeight: 2,
            }}
          />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{p}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [platform, setPlatform] = useState('TikTok');
  const [timeRange, setTimeRange] = useState('7d');
  const [metrics, setMetrics] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const socketRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/metrics?platform=all&timeRange=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        // Build trend from views across platforms
        const pts = PLATFORMS.map(p => Number(data[p.toLowerCase()]?.views) || 0);
        setTrendData(pts);
      }
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/realtime?platform=${platform.toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        setRealtime(data);
        setLiveIndicator(v => !v);
      }
    } catch {}
  }, [platform]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { fetchRealtime(); }, [fetchRealtime]);

  useEffect(() => {
    const iv = setInterval(fetchRealtime, 10000);
    return () => clearInterval(iv);
  }, [fetchRealtime]);

  // Socket.io live updates
  useEffect(() => {
    let io;
    try {
      if (window.io) {
        io = window.io('/analytics', { transports: ['websocket'] });
        socketRef.current = io;
        io.on('metrics', data => setMetrics(prev => ({ ...prev, ...data })));
      }
    } catch {}
    return () => { io?.disconnect(); };
  }, []);

  const pKey = platform.toLowerCase();
  const cur = metrics?.[pKey];

  const metricCards = cur ? [
    { icon: Eye, label: 'Views', value: Number(cur.views).toLocaleString(), color: '#6366F1' },
    { icon: Heart, label: 'Likes', value: Number(cur.likes).toLocaleString(), color: '#EC4899' },
    { icon: Globe, label: 'Reach', value: Number(cur.reach).toLocaleString(), color: '#14B8A6' },
    { icon: Users, label: 'Followers', value: Number(cur.followers).toLocaleString(), color: '#F59E0B' },
    { icon: TrendingUp, label: 'Engagement', value: `${cur.engagement}%`, color: '#10B981' },
    { icon: Activity, label: 'Retention', value: `${cur.retention}%`, color: '#8B5CF6' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-indigo-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${liveIndicator ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
            <Zap size={10} />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${timeRange === r ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={fetchMetrics}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${platform === p ? 'text-white border-transparent shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}
            style={platform === p ? { backgroundColor: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] } : {}}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Real-time strip */}
      {realtime && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 mb-6 flex flex-wrap gap-4 text-white">
          <div className="flex items-center gap-2">
            <Activity size={16} />
            <span className="text-sm font-medium">{Number(realtime.liveViewers).toLocaleString()} live viewers</span>
          </div>
          <div className="flex items-center gap-2">
            <Share2 size={16} />
            <span className="text-sm font-medium">{realtime.currentEngagement}% engagement</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} />
            <span className="text-sm font-medium">{Number(realtime.activeUsers).toLocaleString()} active</span>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <MetricCard key={i} loading />)
          : metricCards.map(m => <MetricCard key={m.label} {...m} />)
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" />
            Views Trend ({timeRange})
          </h2>
          {loading
            ? <Skeleton className="h-16" />
            : <LineChart data={trendData} color={PLATFORM_COLORS[platform]} />
          }
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-500" />
            Platform Comparison — Views
          </h2>
          {loading
            ? <Skeleton className="h-32" />
            : <BarComparison platforms={PLATFORMS} metric="views" data={metrics} />
          }
        </div>
      </div>
    </div>
  );
}
