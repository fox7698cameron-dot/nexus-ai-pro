/**
 * AnalyticsDashboard — Real-time social media analytics
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
 * @date 2026-08-03
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const PLATFORMS = {
  tiktok:    { name: 'TikTok',     color: '#69c9d0', icon: '🎵', accent: '#ee1d52' },
  instagram: { name: 'Instagram',  color: '#e1306c', icon: '📸', accent: '#833ab4' },
  facebook:  { name: 'Facebook',   color: '#1877f2', icon: '👍', accent: '#0d65d9' },
  twitch:    { name: 'Twitch',     color: '#9146ff', icon: '🎮', accent: '#6c35b5' },
  discord:   { name: 'Discord',    color: '#5865f2', icon: '💬', accent: '#4752c4' },
  lemon8:    { name: 'Lemon8',     color: '#ffd54f', icon: '🍋', accent: '#f9a825' },
  reddit:    { name: 'Reddit',     color: '#ff4500', icon: '🤖', accent: '#cc3700' },
  redgifs:   { name: 'RedGIFs',    color: '#e53935', icon: '🔴', accent: '#b71c1c' }
};

const PERIODS = ['24h', '7d', '30d', '90d'];

const METRIC_LABELS = {
  views:         { label: 'Views',          icon: '👁️',  format: 'num' },
  likes:         { label: 'Likes',          icon: '❤️',  format: 'num' },
  shares:        { label: 'Shares',         icon: '🔁',  format: 'num' },
  comments:      { label: 'Comments',       icon: '💬',  format: 'num' },
  followers:     { label: 'Followers',      icon: '👥',  format: 'num' },
  reach:         { label: 'Reach',          icon: '📡',  format: 'num' },
  impressions:   { label: 'Impressions',    icon: '📊',  format: 'num' },
  retention:     { label: 'Retention %',    icon: '⏱️',  format: 'pct' },
  engagementRate:{ label: 'Engagement Rate',icon: '📈',  format: 'pct' }
};

function fmt(val, type) {
  if (type === 'pct') return `${val}%`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return String(val);
}

function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 24;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * h
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

function MetricCard({ label, icon, value, format, sparkData, color }) {
  return (
    <div style={{
      background: '#1e293b', borderRadius: 10, padding: '14px 16px',
      border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>{icon} {label}</span>
      </div>
      <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700 }}>{fmt(value, format)}</div>
      <MiniSparkline data={sparkData} color={color} />
    </div>
  );
}

function PlatformCard({ platform, data, selected, onSelect }) {
  const cfg = PLATFORMS[platform];
  const m = data?.metrics;
  return (
    <div
      onClick={() => onSelect(platform)}
      style={{
        background: selected ? `${cfg.color}18` : '#1e293b',
        border: `1.5px solid ${selected ? cfg.color : '#334155'}`,
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        transition: 'all 0.15s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{cfg.icon}</span>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{cfg.name}</span>
        <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
          background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
      </div>
      {m && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 10 }}>Views</div>
            <div style={{ color: cfg.color, fontWeight: 700 }}>{fmt(m.views, 'num')}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: 10 }}>Engagement</div>
            <div style={{ color: '#f1f5f9', fontWeight: 700 }}>{fmt(m.engagementRate, 'pct')}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: 10 }}>Followers</div>
            <div style={{ color: '#f1f5f9', fontWeight: 700 }}>{fmt(m.followers, 'num')}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: 10 }}>Retention</div>
            <div style={{ color: '#f1f5f9', fontWeight: 700 }}>{fmt(m.retention, 'pct')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function RetentionBar({ value }) {
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
        <span>Audience Retention</span>
        <span style={{ color, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: '#0f172a', borderRadius: 4 }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('nexus_access_token');
      const res = await fetch(`/api/analytics/social?period=${period}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const byPlatform = {};
      (data.platforms || []).forEach(p => { byPlatform[p.name] = p; });
      setAnalyticsData(byPlatform);
      setLastUpdated(new Date());
      setError('');
    } catch (e) {
      setError(`Failed to load analytics: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
    intervalRef.current = setInterval(fetchAnalytics, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchAnalytics]);

  const activePlatformData = analyticsData?.[selectedPlatform];
  const metrics = activePlatformData?.metrics;
  const timeSeries = activePlatformData?.timeSeries || [];
  const sparkViews = timeSeries.map(t => t.views);
  const cfg = PLATFORMS[selectedPlatform];

  return (
    <div style={{ color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>📊 Social Analytics</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Real-time metrics across all platforms
            {lastUpdated && <span> · Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${period === p ? '#6366f1' : '#334155'}`,
              background: period === p ? '#6366f133' : 'transparent',
              color: period === p ? '#818cf8' : '#64748b', cursor: 'pointer'
            }}>{p}</button>
          ))}
          <button onClick={fetchAnalytics} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: '1.5px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer'
          }}>↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Platform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        {Object.keys(PLATFORMS).map(platform => (
          <PlatformCard
            key={platform}
            platform={platform}
            data={analyticsData?.[platform]}
            selected={selectedPlatform === platform}
            onSelect={setSelectedPlatform}
          />
        ))}
      </div>

      {/* Detailed metrics for selected platform */}
      {metrics && (
        <div style={{ background: '#1e293b', borderRadius: 14, padding: 24, border: `1.5px solid ${cfg.color}44` }}>
          <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{cfg.icon}</span>
            <span style={{ color: cfg.color }}>{cfg.name}</span>
            <span style={{ color: '#64748b', fontWeight: 400, fontSize: 14 }}>— Detailed View</span>
          </h3>

          <div style={{ marginBottom: 20 }}>
            <RetentionBar value={metrics.retention} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {Object.entries(METRIC_LABELS).map(([key, { label, icon, format }]) => (
              <MetricCard
                key={key}
                label={label} icon={icon}
                value={metrics[key]}
                format={format}
                sparkData={key === 'views' ? sparkViews : undefined}
                color={cfg.color}
              />
            ))}
          </div>

          {/* View & Reach breakdown */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: 16 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Views vs Reach</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Views</div>
                  <div style={{ color: cfg.color, fontWeight: 700, fontSize: 18 }}>{fmt(metrics.views, 'num')}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Reach</div>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18 }}>{fmt(metrics.reach, 'num')}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Impressions</div>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18 }}>{fmt(metrics.impressions, 'num')}</div>
                </div>
              </div>
            </div>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: 16 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Engagement Breakdown</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Likes</div>
                  <div style={{ color: '#ef4444', fontWeight: 700 }}>{fmt(metrics.likes, 'num')}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Comments</div>
                  <div style={{ color: '#3b82f6', fontWeight: 700 }}>{fmt(metrics.comments, 'num')}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Shares</div>
                  <div style={{ color: '#10b981', fontWeight: 700 }}>{fmt(metrics.shares, 'num')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Connect platform CTA */}
          <div style={{ marginTop: 16, padding: 14, background: '#0f172a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Connect your {cfg.name} account for live data</span>
            <button style={{
              padding: '8px 16px', borderRadius: 8, background: cfg.color,
              border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer'
            }}>Connect {cfg.icon}</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading analytics...</div>
      )}
    </div>
  );
}
