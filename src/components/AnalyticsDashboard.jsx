// Nexus AI Pro - AnalyticsDashboard | 2026-10-12
import { useState, useEffect, useCallback } from 'react';

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', color: '#69C9D0' },
  { id: 'instagram', name: 'Instagram', color: '#E1306C' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2' },
  { id: 'twitch', name: 'Twitch', color: '#9147FF' },
  { id: 'discord', name: 'Discord', color: '#5865F2' },
  { id: 'lemon8', name: 'Lemon8', color: '#FFD700' },
  { id: 'reddit', name: 'Reddit', color: '#FF4500' },
  { id: 'redgifs', name: 'RedGifs', color: '#E63946' },
];

const EMPTY_METRICS = {
  followers: 0, views: 0, likes: 0, shares: 0, reach: 0, retention: 0, connected: false,
};

function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function MiniBarChart({ data, color }) {
  const max = Math.max(...data, 1);
  const w = 120, h = 40, barW = Math.floor(w / data.length) - 2;
  return (
    <svg width={w} height={h} aria-label="Bar chart" role="img">
      {data.map((v, i) => {
        const barH = Math.max(2, Math.round((v / max) * (h - 4)));
        return (
          <rect
            key={i}
            x={i * (barW + 2)}
            y={h - barH - 2}
            width={barW}
            height={barH}
            fill={color}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}

function SparkLine({ data, color }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 120, h = 40;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - 4 - ((v / max) * (h - 8));
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} aria-label="Sparkline" role="img">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

function PlatformCard({ platform, metrics, trend }) {
  const retentionColor = metrics.retention >= 60 ? '#22c55e' : metrics.retention >= 30 ? '#eab308' : '#ef4444';
  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm" style={{ color: platform.color }}>{platform.name}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${metrics.connected ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}
          aria-label={metrics.connected ? 'Connected' : 'Disconnected'}
        >
          {metrics.connected ? 'Live' : 'Offline'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Followers', metrics.followers],
          ['Views', metrics.views],
          ['Likes', metrics.likes],
          ['Shares', metrics.shares],
          ['Reach', metrics.reach],
        ].map(([label, val]) => (
          <div key={label}>
            <div className="text-white font-semibold text-sm">{formatNum(val)}</div>
            <div className="text-gray-400 text-xs">{label}</div>
          </div>
        ))}
        <div>
          <div className="font-semibold text-sm" style={{ color: retentionColor }}>{metrics.retention}%</div>
          <div className="text-gray-400 text-xs">Retention</div>
        </div>
      </div>
      {trend && (
        <div className="flex gap-2 items-end">
          <div>
            <div className="text-gray-400 text-xs mb-1">Views trend</div>
            <SparkLine data={trend} color={platform.color} />
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Engagement</div>
            <MiniBarChart data={trend.map((v, i) => Math.round(v * 0.04 + i * 10))} color={platform.color} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(
    Object.fromEntries(PLATFORMS.map(p => [p.id, { ...EMPTY_METRICS }]))
  );
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(prev => ({ ...prev, ...data.metrics }));
      if (data.trends) setTrends(data.trends);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const socket = window.socketInstance;
    if (!socket) return;
    const handler = (data) => {
      setMetrics(prev => ({ ...prev, ...data.metrics }));
      if (data.trends) setTrends(prev => ({ ...prev, ...data.trends }));
      setLastUpdated(new Date());
    };
    socket.on('analytics:update', handler);
    return () => socket.off('analytics:update', handler);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload = { metrics, trends, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-live="polite" aria-busy="true">
        <div className="text-gray-400 animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-6 text-white min-h-screen bg-gray-900" aria-label="Analytics Dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          {lastUpdated && (
            <p className="text-gray-400 text-xs mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchMetrics}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition-colors"
            aria-label="Refresh analytics"
          >
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg transition-colors disabled:opacity-50"
            aria-label="Export analytics data"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm" role="alert">
          Failed to load analytics: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PLATFORMS.map(platform => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            metrics={metrics[platform.id] ?? EMPTY_METRICS}
            trend={trends[platform.id]}
          />
        ))}
      </div>

      <section className="mt-8" aria-label="Platform connection status">
        <h2 className="text-lg font-semibold mb-3">Connection Status</h2>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(platform => {
            const connected = metrics[platform.id]?.connected;
            return (
              <div
                key={platform.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${connected ? 'bg-green-900/40 border border-green-700' : 'bg-gray-800 border border-gray-700'}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`}
                  aria-hidden="true"
                />
                <span style={{ color: platform.color }}>{platform.name}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
