// AnalyticsDashboard.jsx | 2026-10-01
// Real-time social media analytics dashboard

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Eye, Heart, Share2, Download, RefreshCw } from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', color: '#69C9D0' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'twitch', label: 'Twitch', color: '#9146FF' },
  { id: 'discord', label: 'Discord', color: '#5865F2' },
  { id: 'lemon8', label: 'Lemon8', color: '#FFD700' },
  { id: 'reddit', label: 'Reddit', color: '#FF4500' },
  { id: 'redgifs', label: 'RedGifs', color: '#FF3333' },
];

const DATE_RANGES = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
];

const PIE_COLORS = ['#69C9D0', '#E1306C', '#1877F2', '#9146FF', '#5865F2', '#FFD700', '#FF4500', '#FF3333'];

/** Generate mock time-series data for a given platform */
function generateMockData(platform, range) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const seed = platform.charCodeAt(0);
  return Array.from({ length: days }, (_, i) => {
    const base = (seed * 137 + i * 41) % 10000;
    return {
      date: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: Math.round(base * 1.5 + Math.random() * 2000),
      likes: Math.round(base * 0.08 + Math.random() * 500),
      reach: Math.round(base * 1.2 + Math.random() * 1500),
      followers: Math.round(base * 0.02 + Math.random() * 100),
      retention: Math.round(30 + (seed % 40) + Math.random() * 20),
    };
  });
}

/** Metric card component */
function MetricCard({ icon: Icon, label, value, trend, color }) {
  const positive = trend >= 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow flex flex-col gap-2 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{label}</span>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</div>
      <div className={`flex items-center gap-1 text-xs font-semibold ${positive ? 'text-green-500' : 'text-red-500'}`}>
        {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {positive ? '+' : ''}{trend.toFixed(1)}% vs prev period
      </div>
    </div>
  );
}

/** Error boundary */
class AnalyticsErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">
          Analytics dashboard encountered an error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

/** Main AnalyticsDashboard component */
export default function AnalyticsDashboard({ socket }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [dateRange, setDateRange] = useState('30d');
  const [data, setData] = useState([]);
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const platformMeta = PLATFORMS.find(p => p.id === activePlatform) || PLATFORMS[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Attempt real API; fall back to mock if unavailable
      const res = await fetch(`/api/analytics/${activePlatform}?range=${dateRange}`, {
        signal: (abortRef.current = new AbortController()).signal,
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || generateMockData(activePlatform, dateRange));
      } else {
        setData(generateMockData(activePlatform, dateRange));
      }
    } catch {
      setData(generateMockData(activePlatform, dateRange));
    } finally {
      setLoading(false);
    }
  }, [activePlatform, dateRange]);

  useEffect(() => {
    loadData();
    return () => abortRef.current?.abort();
  }, [loadData]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!socket) return;
    const handler = (event) => {
      if (event.platform === activePlatform) {
        setRealtimeEvents(prev => [event, ...prev].slice(0, 20));
      }
    };
    socket.on('analytics:update', handler);
    socket.emit('analytics:subscribe', { platform: activePlatform });
    return () => {
      socket.off('analytics:update', handler);
      socket.emit('analytics:unsubscribe', { platform: activePlatform });
    };
  }, [socket, activePlatform]);

  // Summary metrics from latest data slice
  const latest = data.slice(-7);
  const prev = data.slice(-14, -7);
  const sumKey = (arr, key) => arr.reduce((s, d) => s + (d[key] || 0), 0);
  const trend = (key) => {
    const cur = sumKey(latest, key);
    const old = sumKey(prev, key);
    return old === 0 ? 0 : ((cur - old) / old) * 100;
  };

  // Pie data: last day across platforms (simulated)
  const pieData = PLATFORMS.map((p, i) => ({
    name: p.label,
    value: Math.round(1000 + (p.id.charCodeAt(0) * 137) % 8000),
  }));

  const handleExport = () => {
    const csv = ['date,views,likes,reach,followers,retention', ...data.map(d =>
      `${d.date},${d.views},${d.likes},${d.reach},${d.followers},${d.retention}`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${activePlatform}-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnalyticsErrorBoundary>
      <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Analytics</h1>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Platform switcher */}
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              style={activePlatform === p.id ? { backgroundColor: p.color, color: '#fff' } : {}}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition
                ${activePlatform === p.id
                  ? 'border-transparent shadow'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex gap-2">
          {DATE_RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setDateRange(r.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
                ${dateRange === r.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400'
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard icon={Eye} label="Views" value={sumKey(latest, 'views')} trend={trend('views')} color={platformMeta.color} />
          <MetricCard icon={Heart} label="Likes" value={sumKey(latest, 'likes')} trend={trend('likes')} color="#E1306C" />
          <MetricCard icon={Share2} label="Reach" value={sumKey(latest, 'reach')} trend={trend('reach')} color="#1877F2" />
          <MetricCard icon={Users} label="Followers" value={sumKey(latest, 'followers')} trend={trend('followers')} color="#9146FF" />
          <MetricCard icon={TrendingUp} label="Retention %" value={Math.round(sumKey(latest, 'retention') / Math.max(latest.length, 1))} trend={trend('retention')} color="#FFD700" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Views area chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Views Over Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={platformMeta.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={platformMeta.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="views" stroke={platformMeta.color} fill="url(#viewGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement bar chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Engagement Breakdown</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="likes" fill="#E1306C" radius={[3, 3, 0, 0]} />
                <Bar dataKey="reach" fill="#1877F2" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Follower growth line chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Follower Growth</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="followers" stroke="#9146FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Platform share pie */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Cross-Platform Reach</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time event feed */}
        {realtimeEvents.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Live Events</h2>
            <ul className="space-y-1 max-h-40 overflow-y-auto text-sm">
              {realtimeEvents.map((ev, i) => (
                <li key={i} className="flex gap-2 text-gray-600 dark:text-gray-300">
                  <span className="text-gray-400 text-xs">{new Date(ev.ts).toLocaleTimeString()}</span>
                  <span>{ev.type}: {JSON.stringify(ev.data)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AnalyticsErrorBoundary>
  );
}
