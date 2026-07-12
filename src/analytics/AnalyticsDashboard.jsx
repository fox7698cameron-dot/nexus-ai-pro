// src/analytics/AnalyticsDashboard.jsx
// 2026-07-12 | Real-time social analytics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Users, Share2,
  Play, Clock, BarChart3, Activity, RefreshCw, Download,
  Filter, Calendar, ChevronDown, ArrowUp, ArrowDown
} from 'lucide-react';

const PLATFORMS = {
  tiktok: { name: 'TikTok', color: '#010101', accent: '#FE2C55', icon: '🎵', bg: 'from-gray-900 to-pink-900' },
  instagram: { name: 'Instagram', color: '#833AB4', accent: '#FD1D1D', icon: '📸', bg: 'from-purple-600 to-pink-600' },
  facebook: { name: 'Facebook', color: '#1877F2', accent: '#42B72A', icon: '📘', bg: 'from-blue-600 to-blue-800' },
  twitch: { name: 'Twitch', color: '#9146FF', accent: '#772CE8', icon: '🎮', bg: 'from-purple-700 to-purple-900' },
  discord: { name: 'Discord', color: '#5865F2', accent: '#EB459E', icon: '💬', bg: 'from-indigo-600 to-purple-700' },
  lemon8: { name: 'Lemon8', color: '#FFB800', accent: '#FF6B35', icon: '🍋', bg: 'from-yellow-400 to-orange-500' },
  reddit: { name: 'Reddit', color: '#FF4500', accent: '#FF6534', icon: '🤖', bg: 'from-orange-600 to-red-700' },
  redgifs: { name: 'RedGIFs', color: '#FF2626', accent: '#FF6B6B', icon: '🎬', bg: 'from-red-600 to-red-900' },
};

const TIME_RANGES = [
  { label: '24h', value: '24h', ms: 86400000 },
  { label: '7d', value: '7d', ms: 604800000 },
  { label: '30d', value: '30d', ms: 2592000000 },
  { label: '90d', value: '90d', ms: 7776000000 },
];

function generateMetrics(platform, seed = 1) {
  const base = seed * 1000;
  return {
    views: Math.floor(base * 12.4 + Math.random() * base * 5),
    likes: Math.floor(base * 2.1 + Math.random() * base * 0.8),
    reach: Math.floor(base * 18.7 + Math.random() * base * 7),
    retention: parseFloat((45 + Math.random() * 40).toFixed(1)),
    engagement: parseFloat((2.5 + Math.random() * 8).toFixed(2)),
    shares: Math.floor(base * 0.4 + Math.random() * base * 0.2),
    followers: Math.floor(base * 50 + Math.random() * base * 20),
    followerGrowth: parseFloat((-2 + Math.random() * 15).toFixed(2)),
    avgWatchTime: parseFloat((10 + Math.random() * 120).toFixed(1)),
    impressions: Math.floor(base * 22 + Math.random() * base * 10),
    comments: Math.floor(base * 0.3 + Math.random() * base * 0.15),
    saves: Math.floor(base * 0.2 + Math.random() * base * 0.1),
    clicks: Math.floor(base * 0.8 + Math.random() * base * 0.4),
    ctr: parseFloat((0.5 + Math.random() * 5).toFixed(2)),
  };
}

function generateTimeSeriesData(range, platformSeed) {
  const points = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 12;
  return Array.from({ length: points }, (_, i) => ({
    label: range === '24h' ? `${i}:00` : range === '90d' ? `W${i + 1}` : `Day ${i + 1}`,
    views: Math.floor(platformSeed * 1000 + Math.random() * platformSeed * 2000 * Math.sin(i / 4 + 1)),
    likes: Math.floor(platformSeed * 200 + Math.random() * platformSeed * 400),
    reach: Math.floor(platformSeed * 1500 + Math.random() * platformSeed * 3000),
  }));
}

function MetricCard({ label, value, change, icon: Icon, color, format = 'number' }) {
  const isPositive = change >= 0;
  const formattedValue = format === 'percent'
    ? `${value}%`
    : format === 'time'
      ? `${value}s`
      : value >= 1000000
        ? `${(value / 1000000).toFixed(1)}M`
        : value >= 1000
          ? `${(value / 1000).toFixed(1)}K`
          : value.toLocaleString();

  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="metric-value">{formattedValue}</div>
      <div className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        <span>{Math.abs(change).toFixed(1)}%</span>
        <span className="metric-period">vs last period</span>
      </div>
    </div>
  );
}

function MiniChart({ data, color }) {
  const max = Math.max(...data.map(d => d.views));
  const width = 100;
  const height = 40;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.views / max) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mini-chart" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function PlatformCard({ platform, data, metrics, isSelected, onClick, timeRange }) {
  const cfg = PLATFORMS[platform];
  const timeSeries = generateTimeSeriesData(timeRange, Object.keys(PLATFORMS).indexOf(platform) + 1);

  return (
    <div
      className={`platform-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className={`platform-header bg-gradient-to-r ${cfg.bg}`}>
        <div className="platform-identity">
          <span className="platform-icon">{cfg.icon}</span>
          <div>
            <div className="platform-name">{cfg.name}</div>
            <div className="platform-followers">{(metrics.followers / 1000).toFixed(1)}K followers</div>
          </div>
        </div>
        <div className={`follower-growth ${metrics.followerGrowth >= 0 ? 'positive' : 'negative'}`}>
          {metrics.followerGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(metrics.followerGrowth)}%
        </div>
      </div>

      <div className="platform-metrics">
        <div className="platform-stat">
          <Eye size={12} />
          <span>{metrics.views >= 1000000 ? `${(metrics.views / 1000000).toFixed(1)}M` : `${(metrics.views / 1000).toFixed(1)}K`}</span>
          <label>Views</label>
        </div>
        <div className="platform-stat">
          <Heart size={12} />
          <span>{metrics.likes >= 1000 ? `${(metrics.likes / 1000).toFixed(1)}K` : metrics.likes}</span>
          <label>Likes</label>
        </div>
        <div className="platform-stat">
          <Users size={12} />
          <span>{metrics.reach >= 1000000 ? `${(metrics.reach / 1000000).toFixed(1)}M` : `${(metrics.reach / 1000).toFixed(1)}K`}</span>
          <label>Reach</label>
        </div>
        <div className="platform-stat">
          <Clock size={12} />
          <span>{metrics.retention}%</span>
          <label>Retention</label>
        </div>
      </div>

      <div className="platform-chart">
        <MiniChart data={timeSeries} color={cfg.accent} />
      </div>

      <div className="platform-footer">
        <span className="engagement-badge" style={{ color: cfg.accent }}>
          {metrics.engagement}% engagement
        </span>
        <span className="ctr-badge">
          {metrics.ctr}% CTR
        </span>
      </div>
    </div>
  );
}

function RetentionCurve({ data, color }) {
  const width = 400;
  const height = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / 100) * height;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="retention-curve" preserveAspectRatio="none">
      <defs>
        <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#retGrad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnalyticsDashboard({ locale = 'en-US' }) {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [timeRange, setTimeRange] = useState('7d');
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [metricsMap, setMetricsMap] = useState({});
  const [topContent, setTopContent] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [activePlatforms, setActivePlatforms] = useState(Object.keys(PLATFORMS));
  const intervalRef = useRef(null);

  const refreshMetrics = useCallback(() => {
    const map = {};
    Object.keys(PLATFORMS).forEach((p, i) => {
      map[p] = generateMetrics(p, i + 1);
    });
    setMetricsMap(map);
    setLastUpdated(Date.now());
    setTopContent(Array.from({ length: 5 }, (_, i) => ({
      id: i,
      title: ['Dance Challenge Video', 'Product Review', 'Tutorial Stream', 'Comedy Skit', 'Travel Vlog'][i],
      views: Math.floor(50000 + Math.random() * 500000),
      engagement: parseFloat((3 + Math.random() * 12).toFixed(1)),
      platform: Object.keys(PLATFORMS)[Math.floor(Math.random() * Object.keys(PLATFORMS).length)],
      trend: Math.random() > 0.3 ? 'up' : 'down',
    })));
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(refreshMetrics, 15000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive, refreshMetrics]);

  const selected = metricsMap[selectedPlatform] || generateMetrics(selectedPlatform, 1);
  const cfg = PLATFORMS[selectedPlatform];
  const retentionCurve = Array.from({ length: 20 }, (_, i) => {
    const x = i / 19;
    return Math.max(5, selected.retention * Math.exp(-x * 2) + Math.random() * 5);
  });

  const totalViews = activePlatforms.reduce((sum, p) => sum + (metricsMap[p]?.views || 0), 0);
  const totalReach = activePlatforms.reduce((sum, p) => sum + (metricsMap[p]?.reach || 0), 0);
  const avgEngagement = activePlatforms.length
    ? activePlatforms.reduce((sum, p) => sum + (metricsMap[p]?.engagement || 0), 0) / activePlatforms.length
    : 0;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div>
          <h1 className="dashboard-title">Social Analytics</h1>
          <p className="dashboard-subtitle">Real-time metrics across all platforms</p>
        </div>
        <div className="analytics-controls">
          <div className="time-range-selector">
            {TIME_RANGES.map(r => (
              <button
                key={r.value}
                className={`range-btn ${timeRange === r.value ? 'active' : ''}`}
                onClick={() => setTimeRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            className={`live-toggle ${isLive ? 'active' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            <Activity size={14} />
            {isLive ? 'LIVE' : 'Paused'}
          </button>
          <button className="icon-btn" onClick={refreshMetrics}>
            <RefreshCw size={16} />
          </button>
          <button className="icon-btn">
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="analytics-summary">
        <div className="summary-stat">
          <Eye size={18} />
          <div>
            <div className="summary-value">
              {totalViews >= 1000000 ? `${(totalViews / 1000000).toFixed(1)}M` : `${(totalViews / 1000).toFixed(0)}K`}
            </div>
            <div className="summary-label">Total Views</div>
          </div>
        </div>
        <div className="summary-stat">
          <Users size={18} />
          <div>
            <div className="summary-value">
              {totalReach >= 1000000 ? `${(totalReach / 1000000).toFixed(1)}M` : `${(totalReach / 1000).toFixed(0)}K`}
            </div>
            <div className="summary-label">Total Reach</div>
          </div>
        </div>
        <div className="summary-stat">
          <TrendingUp size={18} />
          <div>
            <div className="summary-value">{avgEngagement.toFixed(1)}%</div>
            <div className="summary-label">Avg Engagement</div>
          </div>
        </div>
        <div className="summary-stat">
          <Clock size={18} />
          <div>
            <div className="summary-value">
              {new Date(lastUpdated).toLocaleTimeString()}
            </div>
            <div className="summary-label">Last Updated</div>
          </div>
        </div>
      </div>

      <div className="platforms-grid">
        {Object.entries(PLATFORMS).map(([key, platform]) => (
          <PlatformCard
            key={key}
            platform={key}
            data={platform}
            metrics={metricsMap[key] || generateMetrics(key, Object.keys(PLATFORMS).indexOf(key) + 1)}
            isSelected={selectedPlatform === key}
            onClick={() => setSelectedPlatform(key)}
            timeRange={timeRange}
          />
        ))}
      </div>

      {selected && (
        <div className="platform-detail">
          <div className="detail-header" style={{ borderColor: cfg.accent }}>
            <h2>{cfg.icon} {cfg.name} — Detailed Metrics</h2>
          </div>

          <div className="metrics-grid">
            <MetricCard label="Views" value={selected.views} change={8.3} icon={Eye} color={cfg.accent} />
            <MetricCard label="Likes" value={selected.likes} change={12.1} icon={Heart} color={cfg.accent} />
            <MetricCard label="Reach" value={selected.reach} change={5.7} icon={Users} color={cfg.accent} />
            <MetricCard label="Shares" value={selected.shares} change={-2.4} icon={Share2} color={cfg.accent} />
            <MetricCard label="Avg Watch" value={selected.avgWatchTime} change={3.2} icon={Play} color={cfg.accent} format="time" />
            <MetricCard label="Retention" value={selected.retention} change={1.8} icon={Clock} color={cfg.accent} format="percent" />
            <MetricCard label="Impressions" value={selected.impressions} change={9.4} icon={BarChart3} color={cfg.accent} />
            <MetricCard label="CTR" value={selected.ctr} change={0.3} icon={TrendingUp} color={cfg.accent} format="percent" />
          </div>

          <div className="retention-section">
            <h3>Retention Curve</h3>
            <RetentionCurve data={retentionCurve} color={cfg.accent} />
            <div className="retention-labels">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      <div className="top-content-section">
        <h2>Top Performing Content</h2>
        <table className="content-table">
          <thead>
            <tr>
              <th>Content</th>
              <th>Platform</th>
              <th>Views</th>
              <th>Engagement</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {topContent.map(item => (
              <tr key={item.id}>
                <td className="content-title">{item.title}</td>
                <td>
                  <span className="platform-badge">
                    {PLATFORMS[item.platform]?.icon} {PLATFORMS[item.platform]?.name}
                  </span>
                </td>
                <td>{item.views >= 1000000 ? `${(item.views / 1000000).toFixed(1)}M` : `${(item.views / 1000).toFixed(0)}K`}</td>
                <td>{item.engagement}%</td>
                <td className={item.trend === 'up' ? 'trend-up' : 'trend-down'}>
                  {item.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .analytics-dashboard { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
        .analytics-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .dashboard-title { font-size: 1.75rem; font-weight: 700; margin: 0; }
        .dashboard-subtitle { color: #888; margin: 0.25rem 0 0; font-size: 0.875rem; }
        .analytics-controls { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .time-range-selector { display: flex; background: var(--bg-secondary, #1a1a1a); border-radius: 8px; overflow: hidden; }
        .range-btn { padding: 0.4rem 0.75rem; border: none; background: transparent; cursor: pointer; font-size: 0.8rem; color: #888; transition: all 0.2s; }
        .range-btn.active { background: var(--accent, #7c3aed); color: white; }
        .live-toggle { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 0.8rem; color: #888; }
        .live-toggle.active { background: #10b981; color: white; border-color: #10b981; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
        .analytics-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .summary-stat { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: var(--bg-secondary, #1a1a1a); border-radius: 12px; border: 1px solid #222; }
        .summary-value { font-size: 1.25rem; font-weight: 700; }
        .summary-label { font-size: 0.75rem; color: #888; margin-top: 0.1rem; }
        .platforms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .platform-card { border-radius: 12px; overflow: hidden; border: 2px solid transparent; cursor: pointer; background: var(--bg-secondary, #1a1a1a); transition: all 0.2s; }
        .platform-card:hover { border-color: #444; transform: translateY(-2px); }
        .platform-card.selected { border-color: #7c3aed; box-shadow: 0 0 20px rgba(124,58,237,0.3); }
        .platform-header { padding: 1rem; display: flex; justify-content: space-between; align-items: center; }
        .platform-identity { display: flex; align-items: center; gap: 0.75rem; }
        .platform-icon { font-size: 1.5rem; }
        .platform-name { font-weight: 700; font-size: 1rem; color: white; }
        .platform-followers { font-size: 0.75rem; color: rgba(255,255,255,0.7); }
        .follower-growth { display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 6px; }
        .follower-growth.positive { background: rgba(16,185,129,0.2); color: #10b981; }
        .follower-growth.negative { background: rgba(239,68,68,0.2); color: #ef4444; }
        .platform-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; padding: 0.75rem; }
        .platform-stat { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; font-size: 0.8rem; }
        .platform-stat span { font-weight: 600; }
        .platform-stat label { color: #888; font-size: 0.7rem; }
        .platform-chart { padding: 0 0.75rem; height: 48px; }
        .mini-chart { width: 100%; height: 100%; }
        .platform-footer { display: flex; justify-content: space-between; padding: 0.5rem 0.75rem; font-size: 0.75rem; border-top: 1px solid #222; }
        .engagement-badge, .ctr-badge { font-weight: 600; }
        .ctr-badge { color: #888; }
        .platform-detail { background: var(--bg-secondary, #1a1a1a); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #222; }
        .detail-header { border-left: 3px solid; padding-left: 0.75rem; margin-bottom: 1rem; }
        .detail-header h2 { margin: 0; font-size: 1.1rem; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
        .metric-card { background: var(--bg-tertiary, #111); border-radius: 10px; padding: 0.875rem; border: 1px solid #222; }
        .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
        .metric-label { font-size: 0.75rem; color: #888; }
        .metric-value { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.25rem; }
        .metric-change { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; }
        .metric-change.positive { color: #10b981; }
        .metric-change.negative { color: #ef4444; }
        .metric-period { color: #666; font-size: 0.7rem; }
        .retention-section h3 { margin: 0 0 0.75rem; font-size: 0.95rem; color: #888; }
        .retention-curve { width: 100%; height: 80px; display: block; }
        .retention-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: #666; margin-top: 0.25rem; }
        .top-content-section h2 { margin-bottom: 1rem; font-size: 1.1rem; }
        .content-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .content-table th { text-align: left; padding: 0.5rem 1rem; color: #888; font-weight: 500; border-bottom: 1px solid #222; }
        .content-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #111; }
        .content-title { font-weight: 500; }
        .platform-badge { font-size: 0.8rem; padding: 0.2rem 0.5rem; background: #222; border-radius: 4px; }
        .trend-up { color: #10b981; }
        .trend-down { color: #ef4444; }
        .icon-btn { background: transparent; border: 1px solid #333; border-radius: 6px; padding: 0.4rem; cursor: pointer; color: #888; display: flex; align-items: center; }
        @media (prefers-color-scheme: light) {
          .analytics-summary, .platform-card, .platform-detail, .metric-card { background: #f4f4f5; }
          .content-table th, .content-table td { border-color: #e4e4e7; }
        }
        @media (max-width: 640px) {
          .analytics-header { flex-direction: column; }
          .platforms-grid { grid-template-columns: 1fr 1fr; }
          .metrics-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
