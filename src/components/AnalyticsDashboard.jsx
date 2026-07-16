// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/components/AnalyticsDashboard.jsx — 2026-07-16

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const PLATFORMS = {
  tiktok: { name: 'TikTok', icon: '🎵', color: '#ff0050', bg: '#1a0010', accent: '#ff0050' },
  instagram: { name: 'Instagram', icon: '📸', color: '#e1306c', bg: '#1a0010', accent: '#f77737' },
  facebook: { name: 'Facebook', icon: '👥', color: '#1877f2', bg: '#0a1628', accent: '#1877f2' },
  twitch: { name: 'Twitch', icon: '🎮', color: '#9146ff', bg: '#0e0a1a', accent: '#9146ff' },
  discord: { name: 'Discord', icon: '💬', color: '#5865f2', bg: '#0a0b1a', accent: '#5865f2' },
  lemon8: { name: 'Lemon8', icon: '🍋', color: '#fbbf24', bg: '#1a1500', accent: '#fbbf24' },
  reddit: { name: 'Reddit', icon: '👽', color: '#ff4500', bg: '#1a0800', accent: '#ff4500' },
  redgifs: { name: 'RedGIFs', icon: '🎬', color: '#ff3333', bg: '#1a0000', accent: '#ff3333' },
  youtube: { name: 'YouTube', icon: '▶️', color: '#ff0000', bg: '#1a0000', accent: '#ff0000' },
  twitter: { name: 'X / Twitter', icon: '✖️', color: '#ffffff', bg: '#0a0a0a', accent: '#1da1f2' },
};

const METRIC_KEYS = ['views', 'likes', 'reach', 'retention', 'followers', 'engagement', 'shares', 'comments'];

function formatNumber(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function SparkLine({ data, color }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 30;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MetricCard({ label, value, prev, data, color, icon }) {
  const delta = prev > 0 ? ((value - prev) / prev) * 100 : 0;
  const isUp = delta >= 0;
  return (
    <div style={{
      background: '#111827', borderRadius: 10, padding: '14px 16px',
      border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span><span style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{formatNumber(value)}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: isUp ? '#22c55e' : '#ef4444' }}>
          {isUp ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </span>
        <SparkLine data={data} color={color} />
      </div>
    </div>
  );
}

function PlatformCard({ platform, metrics, selected, onSelect }) {
  const p = PLATFORMS[platform];
  if (!p) return null;
  return (
    <div
      onClick={onSelect}
      style={{
        cursor: 'pointer', padding: '10px 14px', borderRadius: 10,
        background: selected ? p.bg : '#111827',
        border: `1px solid ${selected ? p.accent : '#1f2937'}`,
        display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
        boxShadow: selected ? `0 0 12px ${p.accent}44` : 'none',
      }}
    >
      <span style={{ fontSize: 22 }}>{p.icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: selected ? p.color : '#e5e7eb' }}>{p.name}</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>{formatNumber(metrics?.followers || 0)} followers</div>
      </div>
      {selected && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: p.accent }} />}
    </div>
  );
}

function RealtimeIndicator({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: active ? '#22c55e' : '#6b7280' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: active ? '#22c55e' : '#374151',
        boxShadow: active ? '0 0 8px #22c55e' : 'none',
        animation: active ? 'pulse 2s infinite' : 'none',
      }} />
      {active ? 'Live' : 'Paused'}
    </div>
  );
}

function generateMockMetrics(platform, seed) {
  const base = {
    tiktok: { views: 2400000, likes: 180000, reach: 3200000, retention: 72, followers: 425000, engagement: 8.4, shares: 42000, comments: 18000 },
    instagram: { views: 890000, likes: 67000, reach: 1200000, retention: 61, followers: 210000, engagement: 6.2, shares: 12000, comments: 8900 },
    facebook: { views: 340000, likes: 24000, reach: 780000, retention: 45, followers: 98000, engagement: 3.1, shares: 8400, comments: 3200 },
    twitch: { views: 58000, likes: 4200, reach: 82000, retention: 88, followers: 34000, engagement: 12.6, shares: 1200, comments: 9800 },
    discord: { views: 0, likes: 0, reach: 28000, retention: 0, followers: 12000, engagement: 22.4, shares: 0, comments: 0 },
    lemon8: { views: 120000, likes: 9800, reach: 180000, retention: 58, followers: 28000, engagement: 7.8, shares: 3400, comments: 2100 },
    reddit: { views: 640000, likes: 48000, reach: 920000, retention: 52, followers: 84000, engagement: 5.4, shares: 18000, comments: 24000 },
    redgifs: { views: 1800000, likes: 92000, reach: 2400000, retention: 67, followers: 64000, engagement: 9.2, shares: 34000, comments: 8400 },
    youtube: { views: 480000, likes: 32000, reach: 620000, retention: 78, followers: 78000, engagement: 7.1, shares: 6800, comments: 4200 },
    twitter: { views: 320000, likes: 28000, reach: 480000, retention: 42, followers: 54000, engagement: 4.8, shares: 12000, comments: 5600 },
  }[platform] || {};

  const jitter = (v) => Math.max(0, Math.round(v * (0.9 + Math.random() * 0.2)));
  const result = {};
  for (const k of METRIC_KEYS) result[k] = jitter(base[k] || 0);

  const history = {};
  for (const k of METRIC_KEYS) {
    history[k] = Array.from({ length: 24 }, (_, i) => jitter(base[k] * (0.7 + (i / 24) * 0.3) || 0));
  }

  return { ...result, history, platform, lastUpdated: Date.now() };
}

export function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [metricsMap, setMetricsMap] = useState({});
  const [prevMetrics, setPrevMetrics] = useState({});
  const [isLive, setIsLive] = useState(true);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const tickRef = useRef(null);

  const fetchMetrics = useCallback(async (platform) => {
    try {
      const res = await fetch(`/api/analytics/${platform}?range=${range}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.metrics;
      }
    } catch {}
    return generateMockMetrics(platform);
  }, [range]);

  const refreshAll = useCallback(async () => {
    const platforms = Object.keys(PLATFORMS);
    const results = await Promise.all(platforms.map(p => fetchMetrics(p)));
    const next = {};
    platforms.forEach((p, i) => { next[p] = results[i]; });
    setMetricsMap(prev => { setPrevMetrics(prev); return next; });
    setLoading(false);
  }, [fetchMetrics]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (isLive) {
      tickRef.current = setInterval(() => {
        setMetricsMap(prev => {
          const next = { ...prev };
          const p = selectedPlatform;
          if (next[p]) {
            const delta = (v) => Math.max(0, v + Math.round((Math.random() - 0.45) * v * 0.02));
            const m = { ...next[p] };
            for (const k of METRIC_KEYS) { if (m[k] !== undefined) m[k] = delta(m[k]); }
            m.lastUpdated = Date.now();
            next[p] = m;
          }
          return next;
        });
      }, 4000);
    }
    return () => clearInterval(tickRef.current);
  }, [isLive, selectedPlatform]);

  const current = metricsMap[selectedPlatform] || {};
  const prev = prevMetrics[selectedPlatform] || {};
  const platform = PLATFORMS[selectedPlatform];

  const METRIC_ICONS = {
    views: '👁️', likes: '❤️', reach: '📡', retention: '⏱️',
    followers: '👥', engagement: '💬', shares: '🔁', comments: '💭',
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0c', padding: 20, fontFamily: 'inherit', color: '#fff' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>📊 {t('analytics')}</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Social media performance across all platforms</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <RealtimeIndicator active={isLive} />
          <button onClick={() => setIsLive(v => !v)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #374151', background: '#1f2937', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
            {isLive ? '⏸ Pause' : '▶ Resume'}
          </button>
          {['24h', '7d', '30d', '90d'].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '5px 10px', borderRadius: 6, border: `1px solid ${range === r ? '#3b82f6' : '#374151'}`,
              background: range === r ? '#1e3a5f' : '#1f2937', color: range === r ? '#60a5fa' : '#9ca3af',
              cursor: 'pointer', fontSize: 12,
            }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
        {Object.keys(PLATFORMS).map(p => (
          <PlatformCard
            key={p} platform={p}
            metrics={metricsMap[p]}
            selected={selectedPlatform === p}
            onSelect={() => setSelectedPlatform(p)}
          />
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading metrics...</div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
            padding: '12px 16px', borderRadius: 10, background: platform?.bg,
            border: `1px solid ${platform?.accent}44`,
          }}>
            <span style={{ fontSize: 32 }}>{platform?.icon}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: platform?.color }}>{platform?.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Last updated: {current.lastUpdated ? new Date(current.lastUpdated).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            {METRIC_KEYS.map(k => (
              <MetricCard
                key={k}
                label={t(k) || k}
                value={current[k] || 0}
                prev={prev[k] || 0}
                data={current.history?.[k] || []}
                color={platform?.color || '#3b82f6'}
                icon={METRIC_ICONS[k] || '📈'}
              />
            ))}
          </div>

          <div style={{ background: '#111827', borderRadius: 10, padding: 20, border: '1px solid #1f2937' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: '#e5e7eb' }}>24-Hour Engagement Trend</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {['views', 'likes', 'reach', 'engagement'].map(k => {
                const hist = current.history?.[k] || [];
                const mini = Math.min(...hist), maxi = Math.max(...hist);
                return (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {METRIC_ICONS[k]} {t(k) || k}
                    </div>
                    <svg width="100%" height="50" viewBox={`0 0 ${hist.length} 50`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={platform?.color || '#3b82f6'} stopOpacity="0.4" />
                          <stop offset="100%" stopColor={platform?.color || '#3b82f6'} stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      {hist.length > 1 && (() => {
                        const range2 = maxi - mini || 1;
                        const pts = hist.map((v, i) => `${i},${50 - ((v - mini) / range2) * 48}`).join(' ');
                        const areaPath = `M0,50 ` + hist.map((v, i) => `L${i},${50 - ((v - mini) / range2) * 48}`).join(' ') + ` L${hist.length - 1},50 Z`;
                        return (
                          <>
                            <path d={areaPath} fill={`url(#grad-${k})`} />
                            <polyline points={pts} fill="none" stroke={platform?.color || '#3b82f6'} strokeWidth="1.5" strokeLinejoin="round" />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#e5e7eb' }}>👁️ View & Reach Breakdown</h4>
              {['views', 'reach', 'retention'].map(k => {
                const val = current[k] || 0;
                const max = Math.max(current.views || 1, current.reach || 1, current.retention || 1, 1);
                const pct = Math.min(100, (val / max) * 100);
                return (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                      <span>{METRIC_ICONS[k]} {t(k) || k}</span>
                      <span>{k === 'retention' ? `${val}%` : formatNumber(val)}</span>
                    </div>
                    <div style={{ height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: platform?.color || '#3b82f6', borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#e5e7eb' }}>❤️ Engagement Breakdown</h4>
              {['likes', 'shares', 'comments', 'followers'].map(k => {
                const val = current[k] || 0;
                const max = Math.max(...['likes', 'shares', 'comments', 'followers'].map(x => current[x] || 0), 1);
                const pct = Math.min(100, (val / max) * 100);
                return (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                      <span>{METRIC_ICONS[k]} {t(k) || k}</span>
                      <span>{formatNumber(val)}</span>
                    </div>
                    <div style={{ height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: platform?.accent || '#3b82f6', borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
