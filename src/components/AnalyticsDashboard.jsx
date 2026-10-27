// AnalyticsDashboard.jsx
// Created: 2026-10-27
// Social media analytics dashboard with real-time metrics
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
// API keys must be set via environment variables - never hardcode credentials here

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, TrendingUp, Users, Eye, Heart, Share2,
  Activity, Globe, MessageSquare, Video, Play, Star,
  ChevronUp, ChevronDown, RefreshCw, Download, Filter,
  AlertCircle, CheckCircle, Clock, Zap
} from 'lucide-react';

// i18n string map — swap locale to localize all UI text
const STRINGS = {
  en: {
    title: 'Analytics Dashboard',
    subtitle: 'Real-time social media performance',
    views: 'Views',
    likes: 'Likes',
    reach: 'Reach',
    retention: 'Retention',
    followers: 'Followers',
    shares: 'Shares',
    comments: 'Comments',
    engagement: 'Engagement Rate',
    allPlatforms: 'All Platforms',
    lastUpdated: 'Last updated',
    export: 'Export Data',
    refresh: 'Refresh',
    loading: 'Loading analytics...',
    error: 'Failed to load data',
    noData: 'No data available',
    trend: 'Trend',
    peak: 'Peak',
    avg: 'Average',
  },
  es: {
    title: 'Panel de Análisis',
    subtitle: 'Rendimiento en redes sociales en tiempo real',
    views: 'Vistas',
    likes: 'Me gusta',
    reach: 'Alcance',
    retention: 'Retención',
    followers: 'Seguidores',
    shares: 'Compartidos',
    comments: 'Comentarios',
    engagement: 'Tasa de interacción',
    allPlatforms: 'Todas las plataformas',
    lastUpdated: 'Última actualización',
    export: 'Exportar datos',
    refresh: 'Actualizar',
    loading: 'Cargando análisis...',
    error: 'Error al cargar datos',
    noData: 'Sin datos disponibles',
    trend: 'Tendencia',
    peak: 'Pico',
    avg: 'Promedio',
  },
};

// Platform configuration — API keys come from env vars, never from here
const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#010101',
    accent: '#fe2c55',
    gradient: 'from-[#010101] to-[#fe2c55]',
    bg: 'bg-[#fe2c55]/10',
    border: 'border-[#fe2c55]/30',
    text: 'text-[#fe2c55]',
    // API endpoint configured via VITE_TIKTOK_API_BASE env var
    envKey: 'VITE_TIKTOK_API_BASE',
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#833ab4',
    accent: '#fd1d1d',
    gradient: 'from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    envKey: 'VITE_INSTAGRAM_API_BASE',
  },
  facebook: {
    name: 'Facebook',
    icon: '👥',
    color: '#1877f2',
    accent: '#1877f2',
    gradient: 'from-[#1877f2] to-[#42b72a]',
    bg: 'bg-blue-600/10',
    border: 'border-blue-600/30',
    text: 'text-blue-400',
    envKey: 'VITE_FACEBOOK_API_BASE',
  },
  twitch: {
    name: 'Twitch',
    icon: '🎮',
    color: '#9146ff',
    accent: '#9146ff',
    gradient: 'from-[#9146ff] to-[#6441a5]',
    bg: 'bg-purple-600/10',
    border: 'border-purple-600/30',
    text: 'text-purple-300',
    envKey: 'VITE_TWITCH_API_BASE',
  },
  discord: {
    name: 'Discord',
    icon: '💬',
    color: '#5865f2',
    accent: '#5865f2',
    gradient: 'from-[#5865f2] to-[#7289da]',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    envKey: 'VITE_DISCORD_API_BASE',
  },
  lemon8: {
    name: 'Lemon8',
    icon: '🍋',
    color: '#ffcc00',
    accent: '#ffcc00',
    gradient: 'from-[#ffcc00] to-[#ff9500]',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
    text: 'text-yellow-400',
    envKey: 'VITE_LEMON8_API_BASE',
  },
  reddit: {
    name: 'Reddit',
    icon: '🤖',
    color: '#ff4500',
    accent: '#ff4500',
    gradient: 'from-[#ff4500] to-[#ff6534]',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    envKey: 'VITE_REDDIT_API_BASE',
  },
  redgifs: {
    name: 'RedGifs',
    icon: '🎬',
    color: '#e53935',
    accent: '#e53935',
    gradient: 'from-[#e53935] to-[#b71c1c]',
    bg: 'bg-red-600/10',
    border: 'border-red-600/30',
    text: 'text-red-400',
    envKey: 'VITE_REDGIFS_API_BASE',
  },
};

// Generate seeded demo metrics so values are stable across renders
function seedMetrics(platformKey, seed = 1) {
  const s = (seed * 9301 + 49297) % 233280;
  const r = s / 233280;
  const base = {
    tiktok: { views: 2_400_000, likes: 180_000, followers: 95_000 },
    instagram: { views: 1_200_000, likes: 92_000, followers: 62_000 },
    facebook: { views: 800_000, likes: 45_000, followers: 120_000 },
    twitch: { views: 350_000, likes: 28_000, followers: 18_000 },
    discord: { views: 0, likes: 0, followers: 8_500 },
    lemon8: { views: 220_000, likes: 15_000, followers: 9_200 },
    reddit: { views: 650_000, likes: 48_000, followers: 32_000 },
    redgifs: { views: 1_800_000, likes: 120_000, followers: 44_000 },
  }[platformKey] || { views: 100_000, likes: 10_000, followers: 5_000 };

  return {
    views: Math.round(base.views * (0.9 + r * 0.2)),
    likes: Math.round(base.likes * (0.9 + r * 0.2)),
    reach: Math.round(base.views * 1.3 * (0.9 + r * 0.2)),
    retention: Math.round(38 + r * 30),
    followers: Math.round(base.followers * (0.98 + r * 0.04)),
    shares: Math.round(base.likes * 0.12 * (0.9 + r * 0.2)),
    comments: Math.round(base.likes * 0.07 * (0.9 + r * 0.2)),
    engagementRate: parseFloat((3.5 + r * 6).toFixed(2)),
    trend: r > 0.5 ? 'up' : 'down',
    trendPct: parseFloat((r * 15).toFixed(1)),
    history: Array.from({ length: 12 }, (_, i) => ({
      label: `${i * 2}h`,
      value: Math.round(base.views / 12 * (0.7 + Math.sin(i) * 0.3 + r * 0.2)),
    })),
  };
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Inline SVG mini bar chart — no external deps
function MiniBarChart({ data, color = '#6366f1', height = 40 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const barW = width / data.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const barH = (d.value / max) * height;
        return (
          <rect
            key={i}
            x={i * (barW + 1)}
            y={height - barH}
            width={barW}
            height={barH}
            fill={color}
            opacity={0.7 + (i / data.length) * 0.3}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

// Retention ring
function RetentionRing({ pct, color }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="33" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
        {pct}%
      </text>
    </svg>
  );
}

function MetricCard({ label, value, icon: Icon, color, trend, trendPct }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-1.5 text-xs text-white/50">
        {Icon && <Icon size={12} />}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold text-white">{formatNumber(value)}</div>
      {trend && (
        <div className={`flex items-center gap-0.5 text-xs ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend === 'up' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {trendPct}%
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platformKey, metrics, t, isSelected, onSelect }) {
  const platform = PLATFORMS[platformKey];
  if (!platform || !metrics) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(platformKey)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(platformKey)}
      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200
        ${isSelected ? 'ring-2 ring-white/40 scale-[1.02]' : 'hover:scale-[1.01]'}
        ${platform.bg} ${platform.border}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{platform.icon}</span>
          <div>
            <div className="font-semibold text-white text-sm">{platform.name}</div>
            <div className="text-xs text-white/50">{formatNumber(metrics.followers)} {t.followers}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${metrics.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {metrics.trend === 'up' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {metrics.trendPct}%
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <MetricCard label={t.views} value={metrics.views} icon={Eye} />
        <MetricCard label={t.likes} value={metrics.likes} icon={Heart} />
        <MetricCard label={t.reach} value={metrics.reach} icon={Globe} />
        <MetricCard label={t.engagement} value={`${metrics.engagementRate}%`} icon={Activity} />
      </div>

      {/* Retention + mini chart */}
      <div className="flex items-end gap-3">
        <div className="flex flex-col items-center gap-1">
          <RetentionRing pct={metrics.retention} color={platform.accent} />
          <span className="text-[10px] text-white/40">{t.retention}</span>
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-white/40 mb-1">{t.views} (24h)</div>
          <MiniBarChart data={metrics.history} color={platform.accent} height={36} />
        </div>
      </div>
    </div>
  );
}

function TotalsBar({ allMetrics, t }) {
  const total = Object.values(allMetrics).reduce(
    (acc, m) => ({
      views: acc.views + (m?.views || 0),
      likes: acc.likes + (m?.likes || 0),
      reach: acc.reach + (m?.reach || 0),
      followers: acc.followers + (m?.followers || 0),
    }),
    { views: 0, likes: 0, reach: 0, followers: 0 }
  );

  const items = [
    { label: t.views, value: total.views, icon: Eye, color: 'text-blue-400' },
    { label: t.likes, value: total.likes, icon: Heart, color: 'text-pink-400' },
    { label: t.reach, value: total.reach, icon: Globe, color: 'text-green-400' },
    { label: t.followers, value: total.followers, icon: Users, color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className={`flex items-center gap-2 mb-2 ${color}`}>
            <Icon size={16} />
            <span className="text-xs font-medium text-white/60">{label}</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatNumber(value)}</div>
          <div className="text-xs text-white/30 mt-1">{t.allPlatforms}</div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard({ userId, platform = 'all', darkMode = false }) {
  const locale = navigator?.language?.startsWith('es') ? 'es' : 'en';
  const t = STRINGS[locale] || STRINGS.en;

  const [selectedPlatform, setSelectedPlatform] = useState(platform === 'all' ? null : platform);
  const [allMetrics, setAllMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tick, setTick] = useState(0);
  const wsRef = useRef(null);

  // Load metrics — in production, replace this with real API calls using env-var base URLs
  const loadMetrics = useCallback(() => {
    try {
      const seed = Date.now() % 1000;
      const fresh = Object.fromEntries(
        Object.keys(PLATFORMS).map((key) => [key, seedMetrics(key, seed + key.length)])
      );
      setAllMetrics(fresh);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  // Initial load
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Real-time polling (replace with WebSocket from env-configured endpoint in production)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((n) => n + 1);
      loadMetrics();
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  // WebSocket hook — endpoint from env var
  useEffect(() => {
    const wsUrl = typeof window !== 'undefined' &&
      (window.__ENV?.VITE_WS_URL || import.meta?.env?.VITE_WS_URL);
    if (!wsUrl) return;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          if (update.type === 'analytics' && update.platform) {
            setAllMetrics((prev) => ({ ...prev, [update.platform]: update.metrics }));
            setLastUpdated(new Date().toLocaleTimeString());
          }
        } catch {
          // non-JSON message, ignore
        }
      };
      return () => ws.close();
    } catch {
      // WebSocket not available in this environment
    }
  }, []);

  const handleExport = useCallback(() => {
    const data = JSON.stringify({ userId, metrics: allMetrics, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${userId || 'export'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [userId, allMetrics]);

  const containerClass = `min-h-screen p-4 sm:p-6 ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-900 text-white'}`;

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center h-64 gap-3">
          <RefreshCw size={20} className="animate-spin text-purple-400" />
          <span className="text-white/60">{t.loading}</span>
        </div>
      </div>
    );
  }

  const displayPlatforms = selectedPlatform
    ? [selectedPlatform]
    : Object.keys(PLATFORMS);

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={24} className="text-purple-400" />
            {t.title}
          </h1>
          <p className="text-white/40 text-sm mt-1">{t.subtitle}</p>
          {lastUpdated && (
            <p className="text-white/30 text-xs mt-1 flex items-center gap-1">
              <Clock size={11} /> {t.lastUpdated}: {lastUpdated}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMetrics}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            <RefreshCw size={14} /> {t.refresh}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm transition-colors"
          >
            <Download size={14} /> {t.export}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-sm mb-4">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Totals bar */}
      {!selectedPlatform && <TotalsBar allMetrics={allMetrics} t={t} />}

      {/* Platform filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setSelectedPlatform(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
            ${!selectedPlatform ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
        >
          {t.allPlatforms}
        </button>
        {Object.entries(PLATFORMS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => setSelectedPlatform(key === selectedPlatform ? null : key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1
              ${selectedPlatform === key ? 'bg-white/20 text-white ring-1 ring-white/40' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
          >
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>

      {/* Platform cards grid */}
      <div className={`grid gap-4 ${selectedPlatform ? 'grid-cols-1 max-w-lg' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}`}>
        {displayPlatforms.map((key) => (
          <PlatformCard
            key={key}
            platformKey={key}
            metrics={allMetrics[key]}
            t={t}
            isSelected={selectedPlatform === key}
            onSelect={(k) => setSelectedPlatform(selectedPlatform === k ? null : k)}
          />
        ))}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center gap-2 mt-6 text-xs text-white/30">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Live data — auto-refreshes every 30 seconds
      </div>
    </div>
  );
}
