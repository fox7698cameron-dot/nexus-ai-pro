/**
 * AnalyticsDashboard.jsx
 * Social Media Analytics Dashboard — real-time metrics across platforms
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
 * Updated: 2026-07-21
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const PLATFORMS = [
  { id: 'tiktok',    name: 'TikTok',     color: '#010101', accent: '#69C9D0', emoji: '🎵' },
  { id: 'instagram', name: 'Instagram',  color: '#833AB4', accent: '#FD1D1D', emoji: '📸' },
  { id: 'facebook',  name: 'Facebook',   color: '#1877F2', accent: '#42B72A', emoji: '📘' },
  { id: 'twitch',    name: 'Twitch',     color: '#9146FF', accent: '#F0F0FF', emoji: '🎮' },
  { id: 'discord',   name: 'Discord',    color: '#5865F2', accent: '#57F287', emoji: '💬' },
  { id: 'lemon8',    name: 'Lemon8',     color: '#FFE600', accent: '#FF6B2B', emoji: '🍋' },
  { id: 'reddit',    name: 'Reddit',     color: '#FF4500', accent: '#FF6534', emoji: '🔴' },
  { id: 'redgifs',   name: 'RedGifs',    color: '#CC0000', accent: '#FF5050', emoji: '🎬' },
];

const METRICS = ['views', 'likes', 'reach', 'retention', 'followers', 'engagement'];

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function MetricCard({ label, value, trend, accent }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 18px',
      minWidth: 120,
      flex: '1 1 120px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--text)', margin: '4px 0 2px' }}>
        {formatNumber(value)}
      </div>
      {trend !== undefined && (
        <div style={{ fontSize: 12, color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, data, selected, onSelect }) {
  const summary = data?.summary || {};
  return (
    <div
      onClick={() => onSelect(platform.id)}
      style={{
        background: selected ? platform.color : 'var(--card-bg)',
        border: `2px solid ${selected ? platform.accent : 'var(--border)'}`,
        borderRadius: 12,
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: selected ? 1 : 0.85,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>{platform.emoji}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: selected ? '#fff' : 'var(--text)' }}>
          {platform.name}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {['views', 'likes', 'reach', 'followers'].map(m => (
          <div key={m} style={{ fontSize: 12, color: selected ? '#ffffffcc' : 'var(--text-muted)' }}>
            <span style={{ textTransform: 'capitalize' }}>{m}:</span>{' '}
            <strong style={{ color: selected ? '#fff' : 'var(--text)' }}>
              {formatNumber(summary[m]?.latest)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SparkLine({ values = [], color = '#3b82f6', height = 40 }) {
  if (!values.length) return <div style={{ height }} />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 200;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function MetricChart({ platform, metric, history }) {
  const values = (history || []).map(m => m.value || 0);
  const platformDef = PLATFORMS.find(p => p.id === platform);
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'capitalize' }}>
        {platformDef?.emoji} {platformDef?.name} — {metric} (last {values.length} points)
      </div>
      <SparkLine values={values} color={platformDef?.accent || '#3b82f6'} height={60} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>Min: {formatNumber(Math.min(...values, 0))}</span>
        <span>Max: {formatNumber(Math.max(...values, 0))}</span>
        <span>Latest: {formatNumber(values[values.length - 1])}</span>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [platformData, setPlatformData] = useState({});
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [metricHistory, setMetricHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/dashboard/overview');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      const byPlatform = {};
      for (const p of data.platforms || []) {
        byPlatform[p.platform] = {
          summary: Object.fromEntries(
            Object.entries(p).filter(([k]) => k !== 'platform')
              .map(([k, v]) => [k, { latest: v }])
          )
        };
      }
      setPlatformData(byPlatform);
      setLastUpdated(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetricHistory = useCallback(async (platform, metric) => {
    try {
      const res = await fetch(`/api/analytics/${platform}?type=${metric}`);
      if (!res.ok) return;
      const data = await res.json();
      setMetricHistory(data.metrics || []);
    } catch {
      setMetricHistory([]);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    pollRef.current = setInterval(fetchOverview, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchOverview]);

  useEffect(() => {
    fetchMetricHistory(selectedPlatform, selectedMetric);
  }, [selectedPlatform, selectedMetric, fetchMetricHistory]);

  const selectedPlatformDef = PLATFORMS.find(p => p.id === selectedPlatform);
  const selectedData = platformData[selectedPlatform] || {};

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', color: 'var(--text, #111)' }}>
      <style>{`
        :root { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
        @media (prefers-color-scheme: dark) {
          :root { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        }
        :root[data-theme="dark"] { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        :root[data-theme="light"] { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Social Analytics Dashboard</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Real-time metrics across all platforms
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchOverview}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
              background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13 }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px',
          color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading analytics...</div>
      ) : (
        <>
          {/* Platform Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {PLATFORMS.map(p => (
              <PlatformCard
                key={p.id}
                platform={p}
                data={platformData[p.id]}
                selected={selectedPlatform === p.id}
                onSelect={setSelectedPlatform}
              />
            ))}
          </div>

          {/* Metric Selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {METRICS.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMetric(m)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)',
                  cursor: 'pointer', fontSize: 13, fontWeight: selectedMetric === m ? 700 : 400,
                  background: selectedMetric === m ? (selectedPlatformDef?.color || '#3b82f6') : 'var(--card-bg)',
                  color: selectedMetric === m ? '#fff' : 'var(--text)',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Selected Platform Detail */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
              {selectedPlatformDef?.emoji} {selectedPlatformDef?.name} — Detail
            </h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {METRICS.map(m => (
                <MetricCard
                  key={m}
                  label={m}
                  value={selectedData.summary?.[m]?.latest}
                  accent={selectedPlatformDef?.accent}
                />
              ))}
            </div>
            <MetricChart
              platform={selectedPlatform}
              metric={selectedMetric}
              history={metricHistory}
            />
          </div>

          {/* Cross-Platform Comparison */}
          <div>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
              Cross-Platform {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Comparison
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PLATFORMS.map(p => {
                const val = platformData[p.id]?.summary?.[selectedMetric]?.latest || 0;
                const allVals = PLATFORMS.map(pp => platformData[pp.id]?.summary?.[selectedMetric]?.latest || 0);
                const max = Math.max(...allVals, 1);
                const pct = (val / max) * 100;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ minWidth: 90, fontSize: 13 }}>{p.emoji} {p.name}</span>
                    <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 16, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, background: p.accent || p.color, height: '100%', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ minWidth: 50, textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
                      {formatNumber(val)}
                    </span>
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
