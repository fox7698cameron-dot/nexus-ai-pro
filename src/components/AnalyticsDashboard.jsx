/* src/components/AnalyticsDashboard.jsx
   Social Media Analytics Dashboard - Real-time metrics
   Created: 2026-10-29
   Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';

const PLATFORMS = {
  tiktok: {
    name: 'TikTok', icon: '🎵', color: '#010101', accent: '#fe2c55',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'reach', 'retention']
  },
  instagram: {
    name: 'Instagram', icon: '📸', color: '#833ab4', accent: '#fd1d1d',
    metrics: ['impressions', 'reach', 'likes', 'comments', 'saves', 'shares', 'followers', 'retention']
  },
  facebook: {
    name: 'Facebook', icon: '👤', color: '#1877f2', accent: '#42b72a',
    metrics: ['reach', 'impressions', 'likes', 'comments', 'shares', 'views', 'followers']
  },
  twitch: {
    name: 'Twitch', icon: '🎮', color: '#9146ff', accent: '#bf94ff',
    metrics: ['viewers', 'followers', 'subscribers', 'chatMessages', 'peakViewers', 'watchTime', 'retention']
  },
  discord: {
    name: 'Discord', icon: '💬', color: '#5865f2', accent: '#57f287',
    metrics: ['members', 'onlineMembers', 'messages', 'activeChannels', 'joins', 'leaves', 'boosts']
  },
  lemon8: {
    name: 'Lemon8', icon: '🍋', color: '#ffd700', accent: '#ff6b35',
    metrics: ['views', 'likes', 'comments', 'saves', 'followers', 'reach']
  },
  reddit: {
    name: 'Reddit', icon: '🤖', color: '#ff4500', accent: '#ff6314',
    metrics: ['upvotes', 'downvotes', 'comments', 'awards', 'reach', 'karma', 'subscribers']
  },
  redgifs: {
    name: 'RedGIFs', icon: '🔴', color: '#d32f2f', accent: '#ff5722',
    metrics: ['views', 'likes', 'shares', 'comments', 'reach']
  }
};

const RETENTION_INTERVALS = ['0-25%', '25-50%', '50-75%', '75-100%'];

function generateMockMetric(base, variance = 0.2) {
  return Math.floor(base * (1 + (Math.random() - 0.5) * variance));
}

function generateTimeSeries(points = 24, base = 1000) {
  return Array.from({ length: points }, (_, i) => ({
    time: new Date(Date.now() - (points - i) * 3600000).toISOString(),
    value: generateMockMetric(base, 0.4)
  }));
}

function generatePlatformData(platform) {
  const base = {
    tiktok: { views: 125000, likes: 8400, shares: 2100, comments: 890, followers: 45200, reach: 98000, retention: 68 },
    instagram: { impressions: 87000, reach: 62000, likes: 5200, comments: 340, saves: 1800, shares: 620, followers: 31500, retention: 74 },
    facebook: { reach: 43000, impressions: 78000, likes: 3100, comments: 210, shares: 890, views: 28000, followers: 18900 },
    twitch: { viewers: 1240, followers: 8700, subscribers: 320, chatMessages: 4500, peakViewers: 2100, watchTime: 8900, retention: 82 },
    discord: { members: 12400, onlineMembers: 890, messages: 3400, activeChannels: 18, joins: 45, leaves: 12, boosts: 8 },
    lemon8: { views: 34000, likes: 2100, comments: 180, saves: 890, followers: 6700, reach: 28000 },
    reddit: { upvotes: 4500, downvotes: 210, comments: 890, awards: 12, reach: 34000, karma: 18900, subscribers: 8900 },
    redgifs: { views: 89000, likes: 3400, shares: 1200, comments: 450, reach: 72000 }
  };
  return base[platform] || {};
}

const MiniChart = ({ data, color, height = 40 }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.value - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" opacity="0.8" />
    </svg>
  );
};

const MetricCard = ({ label, value, trend, color, timeSeries }) => {
  const trendColor = trend >= 0 ? '#22c55e' : '#ef4444';
  const formatted = typeof value === 'number'
    ? value >= 1000000 ? `${(value / 1000000).toFixed(1)}M`
      : value >= 1000 ? `${(value / 1000).toFixed(1)}K`
      : value.toString()
    : value;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 140
    }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{formatted}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: trendColor }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </span>
        <MiniChart data={timeSeries} color={color} />
      </div>
    </div>
  );
};

const RetentionBar = ({ data }) => {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60 }}>
      {data.map((val, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{val}%</div>
          <div style={{ width: '100%', height: (val / 100) * 44, background: colors[i], borderRadius: '4px 4px 0 0', minHeight: 4 }} />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{RETENTION_INTERVALS[i]}</div>
        </div>
      ))}
    </div>
  );
};

const PlatformPanel = ({ platformKey, isActive }) => {
  const platform = PLATFORMS[platformKey];
  const [metrics, setMetrics] = useState({});
  const [trends, setTrends] = useState({});
  const [timeSeries, setTimeSeries] = useState({});
  const [retentionData, setRetentionData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const refreshMetrics = useCallback(() => {
    const data = generatePlatformData(platformKey);
    setMetrics(data);
    const newTrends = {};
    const newSeries = {};
    Object.keys(data).forEach(key => {
      newTrends[key] = (Math.random() - 0.4) * 20;
      newSeries[key] = generateTimeSeries(24, data[key]);
    });
    setTrends(newTrends);
    setTimeSeries(newSeries);
    setRetentionData([
      generateMockMetric(95, 0.05),
      generateMockMetric(75, 0.1),
      generateMockMetric(55, 0.15),
      generateMockMetric(38, 0.2)
    ]);
    setLastUpdated(new Date());
  }, [platformKey]);

  useEffect(() => {
    if (isActive) {
      refreshMetrics();
      intervalRef.current = setInterval(refreshMetrics, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, refreshMetrics]);

  if (!isActive) return null;

  const hasRetention = platform.metrics.includes('retention');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{platform.icon}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{platform.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </div>
          </div>
        </div>
        <button onClick={refreshMetrics} style={{
          background: `${platform.accent}22`,
          border: `1px solid ${platform.accent}44`,
          borderRadius: 8,
          padding: '6px 14px',
          color: platform.accent,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600
        }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {Object.entries(metrics).map(([key, val]) => (
          key !== 'retention' && (
            <MetricCard
              key={key}
              label={key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              value={val}
              trend={trends[key] || 0}
              color={platform.accent}
              timeSeries={timeSeries[key] || []}
            />
          )
        ))}
      </div>

      {hasRetention && retentionData.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 16
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12, fontWeight: 600 }}>
            Audience Retention
          </div>
          <RetentionBar data={retentionData} />
        </div>
      )}
    </div>
  );
};

const AnalyticsDashboard = () => {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [globalMetrics, setGlobalMetrics] = useState({ totalReach: 0, totalFollowers: 0, avgEngagement: 0 });
  const [realtimeUpdates, setRealtimeUpdates] = useState([]);

  useEffect(() => {
    const update = () => {
      setGlobalMetrics({
        totalReach: generateMockMetric(450000, 0.05),
        totalFollowers: generateMockMetric(132000, 0.02),
        avgEngagement: parseFloat((Math.random() * 3 + 4).toFixed(2))
      });
      const platforms = Object.keys(PLATFORMS);
      const p = platforms[Math.floor(Math.random() * platforms.length)];
      setRealtimeUpdates(prev => [{
        platform: p,
        icon: PLATFORMS[p].icon,
        event: ['New follower', 'Post liked', 'Comment received', 'Share', 'New view'][Math.floor(Math.random() * 5)],
        time: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 9)]);
    };
    update();
    const id = setInterval(update, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#fff'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Social Analytics
            </h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              Real-time metrics across all platforms
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Total Reach</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa' }}>
                {(globalMetrics.totalReach / 1000).toFixed(0)}K
              </div>
            </div>
            <div style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Followers</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>
                {(globalMetrics.totalFollowers / 1000).toFixed(1)}K
              </div>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Avg Engagement</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>
                {globalMetrics.avgEngagement}%
              </div>
            </div>
          </div>
        </div>

        {/* Platform tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(PLATFORMS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setActivePlatform(key)}
              style={{
                background: activePlatform === key ? `${p.accent}22` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activePlatform === key ? p.accent : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10,
                padding: '8px 16px',
                color: activePlatform === key ? p.accent : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activePlatform === key ? 700 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
            >
              <span>{p.icon}</span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          {/* Main panel */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 20
          }}>
            {Object.keys(PLATFORMS).map(key => (
              <PlatformPanel key={key} platformKey={key} isActive={activePlatform === key} />
            ))}
          </div>

          {/* Live feed */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              Live Activity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 500 }}>
              {realtimeUpdates.map((u, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  opacity: 1 - i * 0.08,
                  fontSize: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{u.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{u.event}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{u.platform} · {u.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
};

export default AnalyticsDashboard;
