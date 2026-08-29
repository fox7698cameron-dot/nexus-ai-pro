/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * src/analytics/AnalyticsDashboard.jsx
 * Social-media analytics dashboard — real-time metrics across:
 * TikTok · Instagram · Facebook · Twitch · Discord · Lemon8 · Reddit · RedGIFs
 * Date: 2026-08-29
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { t } from '../i18n/index.js';

// ── Platform colours & icons ──────────────────────────────────────────────
const PLATFORM_META = {
  tiktok:    { emoji: '🎵', label: 'TikTok',     color: '#010101', bg: '#f0f0f0' },
  instagram: { emoji: '📸', label: 'Instagram',   color: '#E1306C', bg: '#fff0f5' },
  facebook:  { emoji: '📘', label: 'Facebook',    color: '#1877F2', bg: '#f0f5ff' },
  twitch:    { emoji: '🎮', label: 'Twitch',      color: '#9146FF', bg: '#f5f0ff' },
  discord:   { emoji: '💬', label: 'Discord',     color: '#5865F2', bg: '#f0f1ff' },
  lemon8:    { emoji: '🍋', label: 'Lemon8',      color: '#c9a000', bg: '#fffbeb' },
  reddit:    { emoji: '🤖', label: 'Reddit',      color: '#FF4500', bg: '#fff3f0' },
  redgifs:   { emoji: '🎞️', label: 'RedGIFs',    color: '#FF3860', bg: '#fff0f3' },
};

const PERIODS = [
  { id: '1d',  label: '24h'  },
  { id: '7d',  label: '7d'   },
  { id: '28d', label: '28d'  },
  { id: '90d', label: '90d'  },
];

// ── Mini sparkline (no external lib) ──────────────────────────────────────
function Sparkline({ data, color = '#3B82F6', height = 40 }) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────
function StatTile({ label, value, delta, prefix = '', suffix = '', color = '#3B82F6', sparkData }) {
  const sign    = delta >= 0 ? '+' : '';
  const dColor  = delta >= 0 ? '#10B981' : '#EF4444';
  const fmtVal  = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 140,
      flex: '1 1 140px',
    }}>
      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
        {prefix}{fmtVal}{suffix}
      </span>
      {delta !== undefined && (
        <span style={{ fontSize: 12, color: dColor, fontWeight: 600 }}>
          {sign}{typeof delta === 'number' ? delta.toLocaleString() : delta}
        </span>
      )}
      {sparkData && <Sparkline data={sparkData} color={color} />}
    </div>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────
function PlatformCard({ platformId, data, isLive }) {
  const meta   = PLATFORM_META[platformId] ?? { emoji: '📊', label: platformId, color: '#6B7280', bg: '#f9fafb' };
  const totals = data?.totals ?? {};
  const rt     = data?.realtime ?? {};

  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${meta.color}22`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ background: `${meta.color}11`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${meta.color}22` }}>
        <span style={{ fontSize: 24 }}>{meta.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#111827' }}>{meta.label}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>{data?.period ?? '—'}</div>
        </div>
        {isLive && (
          <span style={{ background: '#10B981', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
            ● LIVE
          </span>
        )}
      </div>

      {/* Real-time row */}
      {isLive && (
        <div style={{ background: '#f0fdf4', padding: '8px 18px', borderBottom: '1px solid #dcfce7', display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#065f46' }}>👁 {rt.activeViewers ?? '—'} viewing</span>
          <span style={{ fontSize: 11, color: '#065f46' }}>▶ {rt.viewsLastMinute ?? '—'}/min</span>
          <span style={{ fontSize: 11, color: '#065f46' }}>❤ {rt.likesLastMinute ?? '—'}/min</span>
        </div>
      )}

      {/* Tiles grid */}
      <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <StatTile label="Views"       value={totals.views}         color={meta.color} sparkData={(data?.series ?? []).map(s => s.views)} />
        <StatTile label="Likes"       value={totals.likes}         color={meta.color} />
        <StatTile label="Reach"       value={totals.reach}         color={meta.color} />
        <StatTile label="Followers"   value={totals.followers}     delta={totals.followerDelta} color={meta.color} />
        <StatTile label="Retention"   value={totals.retention}     suffix="%" color={meta.color} />
        <StatTile label="Engagement"  value={totals.engagementRate} suffix="%" color={meta.color} />
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ token }) {
  const [period,    setPeriod]    = useState('7d');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [metrics,   setMetrics]   = useState({});
  const [overview,  setOverview]  = useState(null);
  const [isLive,    setIsLive]    = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const liveTimerRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Fetch platform list once
  useEffect(() => {
    fetch('/api/analytics/platforms', { headers })
      .then(r => r.json())
      .then(d => setPlatforms(d.platforms ?? []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Fetch metrics for selected period
  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, ...platRes] = await Promise.all([
        fetch(`/api/analytics/overview/all?period=${period}`, { headers }),
        ...Object.keys(PLATFORM_META).map(p =>
          fetch(`/api/analytics/${p}?period=${period}`, { headers })
        ),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());

      const platData = {};
      const platKeys = Object.keys(PLATFORM_META);
      for (let i = 0; i < platRes.length; i++) {
        if (platRes[i].ok) {
          platData[platKeys[i]] = await platRes[i].json();
        }
      }
      setMetrics(platData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, token]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  // Live polling
  useEffect(() => {
    if (!isLive) { clearInterval(liveTimerRef.current); return; }
    liveTimerRef.current = setInterval(loadMetrics, 30_000);
    return () => clearInterval(liveTimerRef.current);
  }, [isLive, loadMetrics]);

  // Build overview summary numbers
  const summary = overview?.summary ?? {};

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111827', padding: 24, maxWidth: 1400 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>📊 {t('analytics.title')}</h1>
          <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 14 }}>
            {Object.keys(PLATFORM_META).map(k => PLATFORM_META[k].emoji).join(' ')} Real-time cross-platform analytics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                style={{ border: 'none', padding: '6px 14px', cursor: 'pointer', fontWeight: period === p.id ? 700 : 400,
                  background: period === p.id ? '#3B82F6' : 'transparent', color: period === p.id ? '#fff' : '#374151', fontSize: 13 }}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Live toggle */}
          <button onClick={() => setIsLive(l => !l)}
            style={{ border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: isLive ? '#10B981' : '#e5e7eb', color: isLive ? '#fff' : '#374151' }}>
            {isLive ? '● LIVE' : '○ Go Live'}
          </button>
          <button onClick={loadMetrics} disabled={loading}
            style={{ border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', background: '#6B7280', color: '#fff', fontSize: 13 }}>
            {loading ? '⏳' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#b91c1c', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Tab nav ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {['overview', ...Object.keys(PLATFORM_META)].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ border: 'none', background: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 400,
              fontSize: 13, color: activeTab === tab ? '#3B82F6' : '#6B7280',
              borderBottom: activeTab === tab ? '2px solid #3B82F6' : '2px solid transparent',
              marginBottom: -2 }}>
            {tab === 'overview' ? '📊 Overview' : `${PLATFORM_META[tab]?.emoji} ${PLATFORM_META[tab]?.label}`}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div>
          {/* Summary tiles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <StatTile label="Total Views"     value={summary.totalViews}     color="#3B82F6" />
            <StatTile label="Total Likes"     value={summary.totalLikes}     color="#EC4899" />
            <StatTile label="Total Reach"     value={summary.totalReach}     color="#8B5CF6" />
            <StatTile label="Total Followers" value={summary.totalFollowers} color="#10B981" />
          </div>

          {/* All platform cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 16 }}>
            {Object.keys(PLATFORM_META).map(pid => (
              <PlatformCard key={pid} platformId={pid} data={metrics[pid]} isLive={isLive} />
            ))}
          </div>
        </div>
      )}

      {/* ── Individual platform tab ── */}
      {activeTab !== 'overview' && PLATFORM_META[activeTab] && (
        <div>
          <PlatformCard platformId={activeTab} data={metrics[activeTab]} isLive={isLive} />

          {/* Series chart (simple bar) */}
          {metrics[activeTab]?.series?.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginTop: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Daily Views — {PERIODS.find(p => p.id === period)?.label}</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
                {metrics[activeTab].series.map((s, i) => {
                  const maxV = Math.max(...metrics[activeTab].series.map(x => x.views), 1);
                  const h    = Math.round((s.views / maxV) * 90);
                  return (
                    <div key={i} title={`${s.date}: ${s.views.toLocaleString()} views`}
                      style={{ flex: 1, height: h, minHeight: 2, background: PLATFORM_META[activeTab]?.color ?? '#3B82F6',
                        borderRadius: '3px 3px 0 0', opacity: 0.8, cursor: 'help' }} />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                <span>{metrics[activeTab].series[0]?.date}</span>
                <span>{metrics[activeTab].series.at(-1)?.date}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Platform connection status ── */}
      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>🔌 Platform Connections</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {platforms.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600,
              background: p.connected ? '#f0fdf4' : '#fafafa',
              color: p.connected ? '#065f46' : '#6B7280',
            }}>
              <span>{p.emoji}</span>
              <span>{p.name}</span>
              <span>{p.connected ? '✓' : '○'}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '10px 0 0' }}>
          Connect platforms by setting their API tokens in environment variables. Disconnected platforms show simulated data.
        </p>
      </div>
    </div>
  );
}
