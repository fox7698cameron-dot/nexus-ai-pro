/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Analytics Dashboard — Social Media Real-Time Metrics
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
 * Displays: views, likes, reach, retention, engagement, trending data
 * Date: 2026-08-09
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import {
  TrendingUp, Users, Eye, Heart, Share2, MessageCircle,
  RefreshCw, Loader2, AlertCircle, BarChart3, Activity
} from 'lucide-react';

// ─── Platform configs ─────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', color: '#69C9D0', gradient: 'linear-gradient(135deg, #69C9D0, #EE1D52)', emoji: '🎵' },
  { id: 'instagram', name: 'Instagram', color: '#E1306C', gradient: 'linear-gradient(135deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D)', emoji: '📸' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', gradient: 'linear-gradient(135deg, #1877F2, #42A5F5)', emoji: '👥' },
  { id: 'twitch', name: 'Twitch', color: '#9146FF', gradient: 'linear-gradient(135deg, #9146FF, #BF5FFF)', emoji: '🎮' },
  { id: 'discord', name: 'Discord', color: '#5865F2', gradient: 'linear-gradient(135deg, #5865F2, #7289DA)', emoji: '💬' },
  { id: 'lemon8', name: 'Lemon8', color: '#FFD700', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)', emoji: '🍋' },
  { id: 'reddit', name: 'Reddit', color: '#FF4500', gradient: 'linear-gradient(135deg, #FF4500, #FF6534)', emoji: '🔴' },
  { id: 'redgifs', name: 'RedGIFs', color: '#FF3333', gradient: 'linear-gradient(135deg, #FF3333, #CC0000)', emoji: '🎞️' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' },
  refreshBtn: {
    padding: '8px 16px',
    background: 'rgba(102,126,234,0.15)',
    border: '1px solid rgba(102,126,234,0.3)',
    borderRadius: '8px',
    color: '#a78bfa',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
  },
  totalsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' },
  totalCard: (color) => ({
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid rgba(255,255,255,0.06)`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '12px',
    padding: '16px 20px',
  }),
  totalLabel: { fontSize: '0.75rem', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  totalValue: { fontSize: '1.6rem', fontWeight: '700', color: '#fff' },
  platformTabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  platformTab: (active, color) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? '#fff' : '#6b7280',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? '600' : '400',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  }),
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  metricCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '20px',
  },
  metricIcon: { marginBottom: '12px' },
  metricLabel: { fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' },
  metricValue: { fontSize: '1.8rem', fontWeight: '700', color: '#fff', lineHeight: 1 },
  metricSub: { fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' },
  chartSection: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  chartTitle: { fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '16px' },
  trendChart: { position: 'relative', height: '80px', display: 'flex', alignItems: 'flex-end', gap: '2px' },
  trendBar: (pct, color) => ({
    flex: 1,
    height: `${Math.max(4, pct)}%`,
    background: color,
    borderRadius: '2px 2px 0 0',
    transition: 'height 0.3s',
    opacity: 0.8,
  }),
  retentionChart: { display: 'flex', alignItems: 'flex-end', gap: '3px', height: '60px' },
  retentionBar: (pct, color) => ({
    flex: 1,
    height: `${pct}%`,
    background: `linear-gradient(to top, ${color}88, ${color})`,
    borderRadius: '2px 2px 0 0',
  }),
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '16px', color: '#fca5a5', display: 'flex', gap: '8px', alignItems: 'center' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#6b7280', gap: '10px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  section: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' },
  badge: (color) => ({
    display: 'inline-block',
    padding: '2px 8px',
    background: `${color}22`,
    border: `1px solid ${color}44`,
    borderRadius: '4px',
    color,
    fontSize: '0.7rem',
    fontWeight: '600',
  }),
};

function formatK(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, color }) {
  return (
    <div style={s.metricCard}>
      <div style={{ ...s.metricIcon, color }}>{icon}</div>
      <div style={s.metricLabel}>{label}</div>
      <div style={{ ...s.metricValue, color }}>{value}</div>
      {sub && <div style={s.metricSub}>{sub}</div>}
    </div>
  );
}

// ─── Trend Chart (sparkline) ──────────────────────────────────────────────────

function TrendChart({ data, color, valueKey = 'views' }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={s.trendChart}>
      {data.slice(-14).map((d, i) => (
        <div key={i} style={s.trendBar(((d[valueKey] || 0) / max) * 100, color)} title={`${d.date}: ${formatK(d[valueKey] || 0)}`} />
      ))}
    </div>
  );
}

// ─── Retention Chart ──────────────────────────────────────────────────────────

function RetentionChart({ data, color }) {
  if (!data?.length) return null;
  return (
    <div style={s.retentionChart}>
      {data.map((d, i) => (
        <div key={i} style={s.retentionBar(d.pct, color)} title={`${d.second}s: ${d.pct}%`} />
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { authFetch } = useAuth();
  const { t, num } = useLanguage();

  const [overview, setOverview] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const loadOverview = useCallback(async (forceRefresh = false) => {
    setError(null);
    if (forceRefresh) setRefreshing(true);

    try {
      const resp = await authFetch(`/api/analytics/overview${forceRefresh ? '?refresh=true' : ''}`);
      if (!resp.ok) throw new Error('Failed to load analytics');
      const data = await resp.json();
      setOverview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadOverview();

    // Real-time updates via WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'analytics:update') loadOverview();
      } catch { /* ignore */ }
    };

    return () => ws.close();
  }, [loadOverview]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => loadOverview(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadOverview]);

  if (loading) {
    return (
      <div style={s.loading}>
        <Loader2 size={24} className="animate-spin" />
        <span>Loading analytics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.container}>
        <div style={s.error}><AlertCircle size={18} />{error}</div>
      </div>
    );
  }

  const totals = overview?.totals ?? {};
  const platformData = overview?.platforms?.[selectedPlatform];
  const platform = PLATFORMS.find(p => p.id === selectedPlatform);

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>
          <BarChart3 size={22} color="#667eea" />
          {t('analytics.title')}
          <div style={{ fontSize: '0.7rem', background: 'rgba(102,126,234,0.2)', padding: '3px 8px', borderRadius: '6px', color: '#a78bfa' }}>
            REAL-TIME
          </div>
        </div>
        <button style={s.refreshBtn} onClick={() => loadOverview(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Totals row */}
      <div style={s.totalsRow}>
        <div style={s.totalCard('#667eea')}>
          <div style={s.totalLabel}><Users size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Total Followers</div>
          <div style={s.totalValue}>{formatK(totals.totalFollowers ?? 0)}</div>
        </div>
        <div style={s.totalCard('#22c55e')}>
          <div style={s.totalLabel}><Eye size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Total Views</div>
          <div style={s.totalValue}>{formatK(totals.totalViews ?? 0)}</div>
        </div>
        <div style={s.totalCard('#f43f5e')}>
          <div style={s.totalLabel}><Heart size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Total Likes</div>
          <div style={s.totalValue}>{formatK(totals.totalLikes ?? 0)}</div>
        </div>
        <div style={s.totalCard('#f59e0b')}>
          <div style={s.totalLabel}><TrendingUp size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Total Reach</div>
          <div style={s.totalValue}>{formatK(totals.totalReach ?? 0)}</div>
        </div>
        <div style={s.totalCard('#8b5cf6')}>
          <div style={s.totalLabel}><Activity size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Platforms</div>
          <div style={s.totalValue}>{PLATFORMS.length}</div>
        </div>
      </div>

      {/* Platform tabs */}
      <div style={s.platformTabs}>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            style={s.platformTab(selectedPlatform === p.id, p.color)}
            onClick={() => setSelectedPlatform(p.id)}
          >
            <span>{p.emoji}</span>
            {p.name}
          </button>
        ))}
      </div>

      {platformData && !platformData.error ? (
        <>
          {/* Platform metrics grid */}
          <div style={s.metricsGrid}>
            <MetricCard icon={<Users size={20} />} label="Followers" value={formatK(platformData.followers)} color={platform?.color} />
            <MetricCard icon={<Eye size={20} />} label={t('analytics.views')} value={formatK(platformData.views)} color="#22c55e" />
            <MetricCard icon={<Heart size={20} />} label={t('analytics.likes')} value={formatK(platformData.likes)} color="#f43f5e" />
            <MetricCard icon={<TrendingUp size={20} />} label={t('analytics.reach')} value={formatK(platformData.reach)} color="#f59e0b" />
            <MetricCard icon={<MessageCircle size={20} />} label="Comments" value={formatK(platformData.comments)} color="#6366f1" />
            <MetricCard icon={<Share2 size={20} />} label={t('analytics.shares')} value={formatK(platformData.shares)} color="#8b5cf6" />
            <MetricCard icon={<Activity size={20} />} label={t('analytics.engagement')} value={`${platformData.engagementRate}%`} color="#f59e0b" />
            <MetricCard icon={<Eye size={20} />} label="Impressions" value={formatK(platformData.impressions)} color="#06b6d4" sub={`Avg. watch: ${platformData.avgWatchTime}`} />
          </div>

          {/* 30-day trend + Retention */}
          <div style={s.twoCol}>
            <div style={s.chartSection}>
              <div style={s.chartTitle}>📈 30-Day Views Trend</div>
              <TrendChart data={platformData.trend} color={platform?.color} valueKey="views" />
            </div>
            <div style={s.chartSection}>
              <div style={s.chartTitle}>⏱ Viewer Retention</div>
              <RetentionChart data={platformData.retention} color={platform?.color} />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '8px', display: 'flex', gap: '16px' }}>
                <span>Avg Watch: {platformData.avgWatchTime}</span>
                <span>Completion: {platformData.completionRate}</span>
              </div>
            </div>
          </div>

          {/* Demographics + Top Countries */}
          <div style={s.twoCol}>
            <div style={s.section}>
              <div style={s.chartTitle}>👥 Age Demographics</div>
              {platformData.demographics && Object.entries(platformData.demographics).map(([age, pct]) => (
                <div key={age} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '48px', fontSize: '0.75rem', color: '#9ca3af' }}>{age}</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: platform?.color, borderRadius: '3px' }} />
                  </div>
                  <span style={{ width: '36px', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'right' }}>{pct}%</span>
                </div>
              ))}
            </div>
            <div style={s.section}>
              <div style={s.chartTitle}>🌍 Top Countries</div>
              {platformData.topCountries?.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <span style={{ color: '#e5e7eb' }}>{c.country}</span>
                  <span style={s.badge(platform?.color ?? '#667eea')}>{c.pct}%</span>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px' }}>Best Posting Times</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {platformData.bestPostingTimes?.map(time => (
                    <span key={time} style={s.badge('#22c55e')}>{time}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={s.error}>
          <AlertCircle size={18} />
          {platformData?.error ?? 'No data available for this platform — connect your account to get started'}
        </div>
      )}
    </div>
  );
}
