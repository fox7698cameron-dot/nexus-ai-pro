/**
 * src/components/dashboards/AnalyticsDashboard.jsx
 * Social Media Analytics Dashboard — Real-time metrics across all platforms
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
 * Features: view/like/reach/retention tracking, real-time updates, sparklines
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Eye, Heart, MessageCircle, Share2, Users, Radio, Activity,
  Clock, TrendingUp, Zap, RefreshCw, Wifi, WifiOff, Plus,
  X, BarChart3, ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react';

// ─── Platform Config ──────────────────────────────────────────────────────────

const PLATFORMS = {
  tiktok:    { name: 'TikTok',     color: '#000000', accent: '#FE2C55', emoji: '🎵' },
  instagram: { name: 'Instagram',  color: '#E1306C', accent: '#833AB4', emoji: '📸' },
  facebook:  { name: 'Facebook',   color: '#1877F2', accent: '#166FE5', emoji: '👥' },
  twitch:    { name: 'Twitch',     color: '#9146FF', accent: '#772CE8', emoji: '🎮' },
  discord:   { name: 'Discord',    color: '#5865F2', accent: '#4752C4', emoji: '💬' },
  lemon8:    { name: 'Lemon8',     color: '#FFD700', accent: '#FFA500', emoji: '🍋' },
  reddit:    { name: 'Reddit',     color: '#FF4500', accent: '#CC3700', emoji: '🔴' },
  redgifs:   { name: 'RedGIFs',    color: '#FF2D55', accent: '#CC0033', emoji: '🎬' },
};

const METRIC_ICONS = {
  views:       Eye,
  likes:       Heart,
  comments:    MessageCircle,
  shares:      Share2,
  followers:   Users,
  reach:       Radio,
  impressions: Activity,
  retention:   TrendingUp,
  engagement:  Zap,
};

function formatNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatPct(n) {
  return `${n.toFixed(1)}%`;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#6366f1', height = 32 }) {
  if (!data?.length) return null;
  const max   = Math.max(...data);
  const min   = Math.min(...data);
  const range = max - min || 1;
  const w     = 120;
  const h     = height;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, formatted, trend, color, Icon, sparkData }) {
  const trendUp = trend >= 0;
  return (
    <div style={{
      background: 'var(--card-bg, rgba(255,255,255,0.05))',
      border:     '1px solid var(--border, rgba(255,255,255,0.1))',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icon && <Icon size={14} style={{ color }} />}
          <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </span>
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize: 11,
            color: trendUp ? '#10b981' : '#ef4444',
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text, #f9fafb)' }}>
        {formatted || formatNum(value || 0)}
      </div>
      {sparkData && (
        <Sparkline data={sparkData} color={color} />
      )}
    </div>
  );
}

// ─── PlatformPanel ────────────────────────────────────────────────────────────

function PlatformPanel({ platform, metrics, daily, isActive, onSelect }) {
  const cfg = PLATFORMS[platform];
  if (!cfg || !metrics) return null;

  const sparkViews = daily?.map(d => d.views) ?? [];

  return (
    <div
      onClick={() => onSelect(platform)}
      style={{
        background:   isActive ? `${cfg.accent}22` : 'var(--card-bg, rgba(255,255,255,0.04))',
        border:       `2px solid ${isActive ? cfg.accent : 'transparent'}`,
        borderRadius: 12,
        padding: 12,
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{cfg.emoji}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text, #f9fafb)' }}>{cfg.name}</span>
        </div>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isActive ? '#10b981' : '#6b7280',
        }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>
          <Eye size={10} style={{ display: 'inline', marginRight: 2 }} />
          {formatNum(metrics.views)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>
          <Heart size={10} style={{ display: 'inline', marginRight: 2 }} />
          {formatNum(metrics.likes)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>
          <Users size={10} style={{ display: 'inline', marginRight: 2 }} />
          {formatNum(metrics.followers)}
        </span>
      </div>
      <Sparkline data={sparkViews} color={cfg.accent} height={24} />
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function AnalyticsDashboard({ apiBase = '/api' }) {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [metricsData,      setMetricsData]      = useState({});
  const [overview,         setOverview]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [realtimeActive,   setRealtimeActive]   = useState(false);
  const [lastUpdated,      setLastUpdated]      = useState(null);
  const [error,            setError]            = useState(null);
  const sseRef = useRef(null);

  // ── Fetch all platform metrics ──────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${apiBase}/analytics/overview`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOverview(data);

      // Fetch per-platform details for selected
      const detailed = {};
      for (const p of Object.keys(PLATFORMS)) {
        const r = await fetch(`${apiBase}/analytics/metrics/${p}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` },
        });
        if (r.ok) {
          detailed[p] = await r.json();
        }
      }
      setMetricsData(detailed);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      // Show mock data in offline/dev mode
      const mock = {};
      for (const p of Object.keys(PLATFORMS)) {
        const seed = p.charCodeAt(0) * 137;
        mock[p] = {
          metrics: {
            views:       seed * 100,
            likes:       seed * 5,
            comments:    seed * 2,
            shares:      seed,
            followers:   seed * 50,
            reach:       seed * 140,
            impressions: seed * 180,
            watchTimeSec: seed * 12,
            retention:   35 + (seed % 30),
            engagement:  parseFloat(((seed * 5 / (seed * 50)) * 100).toFixed(2)),
          },
          daily: Array.from({ length: 30 }, (_, i) => ({
            date:   new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
            views:  seed * 100 / 30 * (0.7 + Math.sin(i) * 0.5),
            likes:  seed * 5 / 30,
            shares: seed / 30,
          })),
        };
      }
      setMetricsData(mock);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  // ── Real-time SSE ─────────────────────────────────────────────────────────
  const startRealtime = useCallback(() => {
    if (sseRef.current) return;
    const token = localStorage.getItem('nexus_token') || '';
    const sse   = new EventSource(`${apiBase}/analytics/realtime?token=${token}`);

    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.platforms) {
          setMetricsData(prev => {
            const updated = { ...prev };
            for (const [p, m] of Object.entries(data.platforms)) {
              updated[p] = { ...updated[p], metrics: m };
            }
            return updated;
          });
          setLastUpdated(new Date());
        }
      } catch {}
    };

    sse.onerror = () => {
      sse.close();
      sseRef.current = null;
      setRealtimeActive(false);
    };

    sseRef.current = sse;
    setRealtimeActive(true);
  }, [apiBase]);

  const stopRealtime = useCallback(() => {
    sseRef.current?.close();
    sseRef.current = null;
    setRealtimeActive(false);
  }, []);

  useEffect(() => {
    fetchAll();
    return () => stopRealtime();
  }, [fetchAll, stopRealtime]);

  const currentData    = metricsData[selectedPlatform] || {};
  const currentMetrics = currentData.metrics || {};
  const currentDaily   = currentData.daily   || [];
  const currentCfg     = PLATFORMS[selectedPlatform];

  // ── Totals banner ──────────────────────────────────────────────────────────
  const totals = overview?.totals || {};

  return (
    <div style={{
      padding: '20px',
      color: 'var(--text, #f9fafb)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 1200,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📊 Analytics Dashboard</h1>
          {lastUpdated && (
            <p style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', margin: '4px 0 0' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={realtimeActive ? stopRealtime : startRealtime}
            style={{
              display:        'flex', alignItems: 'center', gap: 6,
              padding:        '8px 14px',
              borderRadius:   8,
              border:         'none',
              background:     realtimeActive ? '#10b98122' : 'rgba(255,255,255,0.1)',
              color:          realtimeActive ? '#10b981' : 'var(--text, #f9fafb)',
              cursor:         'pointer',
              fontSize:       13,
            }}
          >
            {realtimeActive ? <Wifi size={14} /> : <WifiOff size={14} />}
            {realtimeActive ? 'Live' : 'Start Live'}
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text, #f9fafb)', cursor: 'pointer', fontSize: 13,
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
          borderRadius: 8, fontSize: 13, color: '#fca5a5',
        }}>
          ⚠️ {error} — showing demo data
        </div>
      )}

      {/* Totals Banner */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Total Views',     value: totals.totalViews     || 0, Icon: Eye      },
          { label: 'Total Likes',     value: totals.totalLikes     || 0, Icon: Heart    },
          { label: 'Total Followers', value: totals.totalFollowers || 0, Icon: Users    },
          { label: 'Total Reach',     value: totals.totalReach     || 0, Icon: Radio    },
        ].map(({ label, value, Icon }) => (
          <div key={label} style={{
            background: 'var(--card-bg, rgba(255,255,255,0.05))',
            border:     '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: 10, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={13} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{formatNum(value)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Platform Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
            Platforms
          </h3>
          {Object.keys(PLATFORMS).map(p => (
            <PlatformPanel
              key={p}
              platform={p}
              metrics={metricsData[p]?.metrics}
              daily={metricsData[p]?.daily}
              isActive={selectedPlatform === p}
              onSelect={setSelectedPlatform}
            />
          ))}
        </div>

        {/* Detail Panel */}
        <div>
          {currentCfg && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{currentCfg.emoji}</span>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{currentCfg.name}</h2>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>Analytics Overview</p>
              </div>
            </div>
          )}

          {/* Metric Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  height: 90, borderRadius: 12,
                  background: 'var(--card-bg, rgba(255,255,255,0.05))',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))
            ) : (
              <>
                <MetricCard label="Views"       value={currentMetrics.views}       color="#6366f1" Icon={METRIC_ICONS.views}       sparkData={currentDaily.map(d => d.views)} />
                <MetricCard label="Likes"       value={currentMetrics.likes}       color="#ec4899" Icon={METRIC_ICONS.likes}       sparkData={currentDaily.map(d => d.likes)} />
                <MetricCard label="Comments"    value={currentMetrics.comments}    color="#f59e0b" Icon={METRIC_ICONS.comments} />
                <MetricCard label="Shares"      value={currentMetrics.shares}      color="#10b981" Icon={METRIC_ICONS.shares}      sparkData={currentDaily.map(d => d.shares)} />
                <MetricCard label="Followers"   value={currentMetrics.followers}   color="#3b82f6" Icon={METRIC_ICONS.followers} />
                <MetricCard label="Reach"       value={currentMetrics.reach}       color="#8b5cf6" Icon={METRIC_ICONS.reach} />
                <MetricCard label="Impressions" value={currentMetrics.impressions} color="#06b6d4" Icon={METRIC_ICONS.impressions} />
                <MetricCard label="Watch Time"  formatted={formatTime(currentMetrics.watchTimeSec || 0)} color="#f97316" Icon={METRIC_ICONS.views} />
                <MetricCard label="Retention"   formatted={formatPct(currentMetrics.retention || 0)}    color="#10b981" Icon={METRIC_ICONS.retention} />
                <MetricCard label="Engagement"  formatted={formatPct(currentMetrics.engagement || 0)}   color="#a78bfa" Icon={METRIC_ICONS.engagement} />
              </>
            )}
          </div>

          {/* Top Content */}
          {currentData.topContent && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🏆 Top Content</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentData.topContent.map((item, i) => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--card-bg, rgba(255,255,255,0.04))',
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: currentCfg?.accent || '#6366f1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 14 }}>{item.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>
                      <span><Eye size={10} style={{ display: 'inline' }} /> {formatNum(item.views)}</span>
                      <span><Heart size={10} style={{ display: 'inline' }} /> {formatNum(item.likes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
