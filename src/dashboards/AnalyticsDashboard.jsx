// src/dashboards/AnalyticsDashboard.jsx
// Nexus AI Pro — Social Media Analytics Dashboard
// Updated: 2026-08-05
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord,
//            Lemon8, Reddit, RedGIFs
// Features: views, likes, reach, retention, engagement, real-time metrics.
// Supports: desktop, mobile, tablet; light & dark themes.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Eye, Heart, Share2,
  Users, MessageSquare, Activity, RefreshCw, Settings,
  ChevronDown, ChevronUp, Wifi, WifiOff, Star, Zap,
  Globe, Clock, Video, Film, Radio
} from 'lucide-react';

// ---------------------------------------------------------------------------
// PLATFORM CONFIG
// ---------------------------------------------------------------------------
const PLATFORMS = [
  { id: 'TIKTOK',    name: 'TikTok',     emoji: '🎵', color: '#fe2c55', bg: '#111111' },
  { id: 'INSTAGRAM', name: 'Instagram',  emoji: '📸', color: '#e1306c', bg: '#fafafa' },
  { id: 'FACEBOOK',  name: 'Facebook',   emoji: '👍', color: '#1877f2', bg: '#f0f2f5' },
  { id: 'TWITCH',    name: 'Twitch',     emoji: '🎮', color: '#9147ff', bg: '#0e0e10' },
  { id: 'DISCORD',   name: 'Discord',    emoji: '💬', color: '#5865f2', bg: '#36393f' },
  { id: 'LEMON8',    name: 'Lemon8',     emoji: '🍋', color: '#f7c94e', bg: '#fffbea' },
  { id: 'REDDIT',    name: 'Reddit',     emoji: '🤖', color: '#ff4500', bg: '#dae0e6' },
  { id: 'REDGIFS',   name: 'RedGIFs',    emoji: '🎬', color: '#d93025', bg: '#1a1a1a' },
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtPct(n) { return n == null ? '—' : n.toFixed(1) + '%'; }

function DeltaBadge({ value }) {
  if (value == null || value === 0) return null;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-500' : 'text-red-500'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// STAT CARD
// ---------------------------------------------------------------------------
function StatCard({ label, value, delta, icon: Icon, accent }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 dark:bg-black/10 border border-white/10 dark:border-white/5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        {Icon && <Icon size={14} style={{ color: accent }} />}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold tabular-nums tracking-tight">{fmtNum(value)}</span>
        <DeltaBadge value={delta} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PLATFORM CARD
// ---------------------------------------------------------------------------
function PlatformCard({ platform, metrics, selected, onClick }) {
  const cfg   = PLATFORMS.find(p => p.id === platform);
  const isErr = metrics?.error;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{cfg?.emoji}</span>
        <div>
          <div className="font-semibold text-sm">{cfg?.name}</div>
          {isErr
            ? <div className="text-xs text-red-500">{metrics.error}</div>
            : <div className="text-xs text-gray-500 dark:text-gray-400">
                {metrics?.accountId ?? 'Not connected'}
              </div>
          }
        </div>
        <div className="ml-auto">
          {isErr
            ? <WifiOff size={14} className="text-red-400" />
            : metrics ? <Wifi size={14} className="text-green-400" /> : null
          }
        </div>
      </div>

      {!isErr && metrics && (
        <div className="grid grid-cols-2 gap-2">
          {platform === 'TWITCH' && (
            <>
              <StatCard label="Live Viewers" value={metrics.liveViewers} icon={Radio} accent={cfg.color} />
              <StatCard label="Followers"    value={metrics.followers}   icon={Users} accent={cfg.color} />
            </>
          )}
          {platform === 'DISCORD' && (
            <>
              <StatCard label="Members"  value={metrics.memberCount}  icon={Users}        accent={cfg.color} />
              <StatCard label="Online"   value={metrics.onlineCount}  icon={Activity}     accent={cfg.color} />
            </>
          )}
          {['TIKTOK', 'INSTAGRAM', 'FACEBOOK'].includes(platform) && (
            <>
              <StatCard label="Reach"   value={metrics.reach  ?? metrics.totalViews}   icon={Eye}  accent={cfg.color} />
              <StatCard label="Engagement" value={metrics.totalLikes ?? metrics.fans}  icon={Heart} accent={cfg.color} />
            </>
          )}
          {platform === 'REDDIT' && (
            <>
              <StatCard label="Subscribers" value={metrics.subscribers} icon={Users}    accent={cfg.color} />
              <StatCard label="Active Now"  value={metrics.activeUsers} icon={Activity} accent={cfg.color} />
            </>
          )}
          {platform === 'REDGIFS' && (
            <>
              <StatCard label="Views" value={metrics.views} icon={Eye}   accent={cfg.color} />
              <StatCard label="Likes" value={metrics.likes} icon={Heart} accent={cfg.color} />
            </>
          )}
          {platform === 'LEMON8' && (
            <div className="col-span-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
              {metrics.note}
            </div>
          )}
        </div>
      )}

      {!metrics && !isErr && (
        <div className="text-xs text-gray-400 italic">Configure in Settings → Connectors</div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// RETENTION CHART (simple bar chart without external deps)
// ---------------------------------------------------------------------------
function RetentionBar({ label, value, max = 100, color = '#3b82f6' }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right">{fmtPct(value)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN ANALYTICS DASHBOARD
// ---------------------------------------------------------------------------
export default function AnalyticsDashboard({ userId, onClose }) {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [allMetrics, setAllMetrics]             = useState({});
  const [loading, setLoading]                   = useState(true);
  const [lastUpdated, setLastUpdated]           = useState(null);
  const [autoRefresh, setAutoRefresh]           = useState(false);
  const [refreshInterval, setRefreshInterval]   = useState(60); // seconds
  const intervalRef                             = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/analytics/summary', {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
      });
      const data = await res.json();
      const metricsMap = {};
      for (const platform of data.platforms ?? []) {
        metricsMap[platform.platform] = platform;
      }
      for (const err of data.errors ?? []) {
        metricsMap[err.platform] = { error: err.error };
      }
      setAllMetrics(metricsMap);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAll, refreshInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, fetchAll]);

  const selected = selectedPlatform ? allMetrics[selectedPlatform] : null;
  const selectedCfg = PLATFORMS.find(p => p.id === selectedPlatform);

  // Aggregate totals
  const totals = Object.values(allMetrics).filter(m => !m.error).reduce(
    (acc, m) => ({
      views:     acc.views     + (m.totalViews   ?? m.views   ?? 0),
      likes:     acc.likes     + (m.totalLikes   ?? m.likes   ?? 0),
      reach:     acc.reach     + (m.reach        ?? 0),
      followers: acc.followers + (m.followers    ?? m.memberCount ?? m.subscribers ?? 0),
    }),
    { views: 0, likes: 0, reach: 0, followers: 0 }
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-500" />
          <h2 className="font-bold text-base">Social Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <Clock size={11} /> Auto ({refreshInterval}s)
          </label>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Aggregate totals strip */}
      <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 shrink-0">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total Views',     value: totals.views,     icon: Eye       },
            { label: 'Total Likes',     value: totals.likes,     icon: Heart     },
            { label: 'Total Reach',     value: totals.reach,     icon: Globe     },
            { label: 'Total Followers', value: totals.followers, icon: Users     },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className="text-white/70 text-xs flex items-center justify-center gap-1">
                <Icon size={10} /> {label}
              </div>
              <div className="text-white font-bold text-sm tabular-nums">{fmtNum(value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {lastUpdated && (
          <p className="text-xs text-gray-400 mb-3">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}

        {/* Platform grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
          {PLATFORMS.map(p => (
            <PlatformCard
              key={p.id}
              platform={p.id}
              metrics={allMetrics[p.id] ?? null}
              selected={selectedPlatform === p.id}
              onClick={() => setSelectedPlatform(selectedPlatform === p.id ? null : p.id)}
            />
          ))}
        </div>

        {/* Expanded detail for selected platform */}
        {selectedPlatform && selected && !selected.error && (
          <div
            className="rounded-2xl p-4 mb-4 border"
            style={{ borderColor: selectedCfg?.color + '44', background: selectedCfg?.color + '0D' }}
          >
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <span>{selectedCfg?.emoji}</span>
              {selectedCfg?.name} — Detailed Metrics
            </h3>

            {/* Retention bars for video platforms */}
            {['TIKTOK', 'INSTAGRAM', 'YOUTUBE'].includes(selectedPlatform) && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">View Retention</h4>
                <div className="space-y-2">
                  <RetentionBar label="25%"  value={selected.retentionPct ?? 80} color={selectedCfg?.color} />
                  <RetentionBar label="50%"  value={(selected.retentionPct ?? 80) * 0.7} color={selectedCfg?.color} />
                  <RetentionBar label="75%"  value={(selected.retentionPct ?? 80) * 0.5} color={selectedCfg?.color} />
                  <RetentionBar label="100%" value={(selected.retentionPct ?? 80) * 0.3} color={selectedCfg?.color} />
                </div>
              </div>
            )}

            {/* Live data for Twitch */}
            {selectedPlatform === 'TWITCH' && (
              <div className="flex items-center gap-3 mb-3">
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  selected.isLive ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {selected.isLive ? <><Zap size={12} /> LIVE</> : 'OFFLINE'}
                </span>
                {selected.isLive && (
                  <span className="text-sm text-gray-500">{fmtNum(selected.liveViewers)} viewers watching {selected.game}</span>
                )}
              </div>
            )}

            {/* Raw data table */}
            <div className="mt-3 bg-white/50 dark:bg-black/20 rounded-xl p-3 overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(selected)
                    .filter(([k]) => !['platform', 'accountId', 'error', 'note', 'fetchedAt'].includes(k))
                    .map(([k, v]) => (
                      <tr key={k} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <td className="py-1 pr-3 text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</td>
                        <td className="py-1 font-mono font-medium text-right">
                          {typeof v === 'boolean' ? (v ? '✓' : '✗') : fmtNum(v)}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
