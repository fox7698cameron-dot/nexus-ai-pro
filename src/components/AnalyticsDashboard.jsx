/**
 * src/components/AnalyticsDashboard.jsx
 * Nexus AI Pro - Social Media Analytics Dashboard
 * Real-time metrics: TikTok, Instagram, Facebook, Twitch, Discord,
 *   Lemon8, Reddit, RedGIFs
 * Created: 2026-07-26
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Users, MessageSquare,
  Play, Star, Radio, Activity, BarChart3, RefreshCw,
  Zap, Globe, Video, Image, Share2, Bell, Clock,
  ChevronUp, ChevronDown, Filter, Download, Calendar,
} from 'lucide-react';

// ── Platform definitions ────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'tiktok', name: 'TikTok', color: '#010101', accent: '#69C9D0',
    secondaryAccent: '#EE1D52', icon: '🎵',
    metrics: ['views', 'likes', 'followers', 'reach', 'retention', 'shares', 'comments'],
  },
  {
    id: 'instagram', name: 'Instagram', color: '#E4405F', accent: '#FCAF45',
    secondaryAccent: '#833AB4', icon: '📸',
    metrics: ['likes', 'reach', 'impressions', 'storyViews', 'followers', 'saves', 'profileVisits'],
  },
  {
    id: 'facebook', name: 'Facebook', color: '#1877F2', accent: '#42B72A',
    secondaryAccent: '#E41E3F', icon: '👤',
    metrics: ['pageLikes', 'reach', 'engagement', 'postImpressions', 'videoViews', 'shares'],
  },
  {
    id: 'twitch', name: 'Twitch', color: '#9147FF', accent: '#00D4FF',
    secondaryAccent: '#FF6905', icon: '🎮',
    metrics: ['concurrentViewers', 'followers', 'subscribers', 'clipViews', 'vodViews', 'chatMessages'],
  },
  {
    id: 'discord', name: 'Discord', color: '#5865F2', accent: '#57F287',
    secondaryAccent: '#ED4245', icon: '💬',
    metrics: ['members', 'onlineMembers', 'messages', 'boosts', 'serverActivity', 'newJoins'],
  },
  {
    id: 'lemon8', name: 'Lemon8', color: '#FFD700', accent: '#FF6B35',
    secondaryAccent: '#4CAF50', icon: '🍋',
    metrics: ['likes', 'comments', 'reach', 'followers', 'saves', 'shares'],
  },
  {
    id: 'reddit', name: 'Reddit', color: '#FF4500', accent: '#FF6314',
    secondaryAccent: '#46D160', icon: '🤖',
    metrics: ['postKarma', 'commentKarma', 'upvotes', 'awardReceived', 'postViews', 'subscribers'],
  },
  {
    id: 'redgifs', name: 'RedGIFs', color: '#E91E63', accent: '#FF5722',
    secondaryAccent: '#9C27B0', icon: '🎞️',
    metrics: ['views', 'likes', 'followers', 'shares', 'topGifViews', 'totalGifs'],
  },
];

const METRIC_LABELS = {
  views: 'Views', likes: 'Likes', followers: 'Followers', reach: 'Reach',
  retention: 'Retention %', shares: 'Shares', comments: 'Comments',
  impressions: 'Impressions', storyViews: 'Story Views', saves: 'Saves',
  profileVisits: 'Profile Visits', pageLikes: 'Page Likes', engagement: 'Engagement',
  postImpressions: 'Post Impressions', videoViews: 'Video Views',
  concurrentViewers: 'Live Viewers', subscribers: 'Subscribers',
  clipViews: 'Clip Views', vodViews: 'VOD Views', chatMessages: 'Chat Messages',
  members: 'Members', onlineMembers: 'Online', messages: 'Messages',
  boosts: 'Boosts', serverActivity: 'Activity Score', newJoins: 'New Joins',
  postKarma: 'Post Karma', commentKarma: 'Comment Karma', upvotes: 'Upvotes',
  awardReceived: 'Awards', postViews: 'Post Views', topGifViews: 'Top GIF Views',
  totalGifs: 'Total GIFs', awardReceiving: 'Awards',
};

const TIME_RANGES = [
  { id: '1h', label: '1H' }, { id: '24h', label: '24H' },
  { id: '7d', label: '7D' }, { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
];

// ── Simulated real-time data generator ─────────────────────────────
function generateMetrics(platformId, range) {
  const seed = platformId.charCodeAt(0) * 31;
  const base = {
    tiktok:    { views: 2840000, likes: 184000, followers: 342000, reach: 1200000, retention: 78, shares: 42000, comments: 18000 },
    instagram: { likes: 92000, reach: 680000, impressions: 1100000, storyViews: 245000, followers: 128000, saves: 31000, profileVisits: 54000 },
    facebook:  { pageLikes: 67000, reach: 420000, engagement: 8400, postImpressions: 890000, videoViews: 156000, shares: 12400 },
    twitch:    { concurrentViewers: 4200, followers: 89000, subscribers: 3400, clipViews: 540000, vodViews: 128000, chatMessages: 84000 },
    discord:   { members: 24000, onlineMembers: 3800, messages: 142000, boosts: 18, serverActivity: 92, newJoins: 340 },
    lemon8:    { likes: 18400, comments: 2300, reach: 94000, followers: 31000, saves: 7400, shares: 5200 },
    reddit:    { postKarma: 142000, commentKarma: 84000, upvotes: 28000, awardReceived: 184, postViews: 640000, subscribers: 12000 },
    redgifs:   { views: 8400000, likes: 184000, followers: 92000, shares: 34000, topGifViews: 2800000, totalGifs: 1240 },
  };

  const platformBase = base[platformId] || {};
  const multiplier = { '1h': 0.04, '24h': 1, '7d': 7, '30d': 30, '90d': 90 }[range] || 1;

  return Object.fromEntries(
    Object.entries(platformBase).map(([k, v]) => {
      const variation = 1 + (Math.sin(Date.now() / 10000 + seed) * 0.08);
      return [k, Math.round(v * (k === 'retention' ? 1 : multiplier) * variation)];
    })
  );
}

function generateHistory(platformId, metric, points = 24) {
  const seed = platformId.charCodeAt(0) + metric.charCodeAt(0);
  return Array.from({ length: points }, (_, i) => ({
    t: i,
    v: Math.round(1000 + Math.sin((i + seed) * 0.4) * 400 + Math.random() * 200),
  }));
}

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Sparkline mini chart ────────────────────────────────────────────
function Sparkline({ data, color = '#60a5fa', width = 80, height = 30 }) {
  if (!data?.length) return null;
  const vals = data.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <polyline
        points={`0,${height} ${pts} ${width},${height}`}
        fill={color} fillOpacity="0.08" stroke="none"
      />
    </svg>
  );
}

// ── MetricCard ──────────────────────────────────────────────────────
function MetricCard({ label, value, prev, suffix = '', color }) {
  const pct = prev ? Math.round(((value - prev) / prev) * 100) : 0;
  const up = pct >= 0;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px', minWidth: 110,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
        {fmtNum(value)}{suffix}
      </div>
      {prev != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, marginTop: 2,
          color: up ? '#4ade80' : '#f87171' }}>
          {up ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {Math.abs(pct)}% vs prev
        </div>
      )}
    </div>
  );
}

// ── PlatformCard ────────────────────────────────────────────────────
function PlatformCard({ platform, data, prev, range, selected, onSelect }) {
  const totalEngagement = (data.likes || 0) + (data.comments || 0) + (data.shares || 0)
    + (data.views || 0) + (data.reach || 0);
  const primaryMetric = platform.metrics[0];
  const primaryVal = data[primaryMetric] || 0;
  const sparkData = generateHistory(platform.id, primaryMetric);

  return (
    <div
      onClick={() => onSelect(platform.id)}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${platform.color}22, ${platform.accent}11)`
          : 'var(--surface)',
        border: `2px solid ${selected ? platform.accent : 'var(--border)'}`,
        borderRadius: 14, padding: '16px', cursor: 'pointer',
        transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{platform.icon}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 15 }}>{platform.name}</span>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#4ade80', boxShadow: '0 0 6px #4ade80',
        }} title="Live" />
      </div>

      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
        {fmtNum(primaryVal)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
        {METRIC_LABELS[primaryMetric]}
      </div>

      <Sparkline data={sparkData} color={platform.accent} width={120} height={28} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {platform.metrics.slice(1, 4).map(m => (
          <div key={m} style={{
            background: `${platform.accent}18`, borderRadius: 6,
            padding: '3px 8px', fontSize: 11, color: 'var(--text-2)',
          }}>
            {METRIC_LABELS[m]}: {fmtNum(data[m] || 0)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PlatformDetail ──────────────────────────────────────────────────
function PlatformDetail({ platform, data, prev, range }) {
  const history = generateHistory(platform.id, platform.metrics[0], 48);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{platform.icon}</span>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-1)', fontSize: 18, fontWeight: 700 }}>{platform.name}</h3>
          <span style={{ fontSize: 12, color: '#4ade80' }}>● Live</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={{
            padding: '5px 12px', borderRadius: 8,
            background: `${platform.accent}22`, border: `1px solid ${platform.accent}44`,
            color: platform.accent, fontSize: 12, cursor: 'pointer',
          }}>
            <Download size={11} style={{ marginRight: 4 }} /> Export
          </button>
        </div>
      </div>

      {/* Trend chart placeholder */}
      <div style={{
        background: 'var(--bg)', borderRadius: 10, padding: '16px',
        marginBottom: 20, height: 80, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="100%" height="60" preserveAspectRatio="none" viewBox={`0 0 ${history.length - 1} 100`}>
          <defs>
            <linearGradient id={`grad-${platform.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={platform.accent} stopOpacity="0.4" />
              <stop offset="100%" stopColor={platform.accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polyline
            points={history.map((d, i) => `${i},${100 - ((d.v - 600) / 800) * 100}`).join(' ')}
            fill="none" stroke={platform.accent} strokeWidth="2"
          />
          <polygon
            points={`0,100 ${history.map((d, i) => `${i},${100 - ((d.v - 600) / 800) * 100}`).join(' ')} ${history.length - 1},100`}
            fill={`url(#grad-${platform.id})`}
          />
        </svg>
      </div>

      {/* All metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
        {platform.metrics.map(m => (
          <MetricCard
            key={m}
            label={METRIC_LABELS[m]}
            value={data[m] || 0}
            prev={prev?.[m]}
            suffix={m === 'retention' ? '%' : ''}
            color={platform.accent}
          />
        ))}
      </div>

      {/* Retention / reach bar if applicable */}
      {data.retention != null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-2)' }}>
            <span>Average Retention</span>
            <span style={{ fontWeight: 700, color: platform.accent }}>{data.retention}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${data.retention}%`, height: '100%',
              background: `linear-gradient(90deg, ${platform.color}, ${platform.accent})`,
              borderRadius: 4,
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overview stats bar ──────────────────────────────────────────────
function OverviewBar({ allData, platforms }) {
  const totalViews = platforms.reduce((s, p) => s + (allData[p.id]?.views || allData[p.id]?.reach || 0), 0);
  const totalEngagement = platforms.reduce((s, p) =>
    s + (allData[p.id]?.likes || 0) + (allData[p.id]?.comments || 0) + (allData[p.id]?.shares || 0), 0);
  const totalFollowers = platforms.reduce((s, p) => s + (allData[p.id]?.followers || allData[p.id]?.members || 0), 0);

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 12, marginBottom: 20,
    }}>
      {[
        { label: 'Total Reach', value: totalViews, icon: <Eye size={16} />, color: '#60a5fa' },
        { label: 'Total Engagement', value: totalEngagement, icon: <Heart size={16} />, color: '#f472b6' },
        { label: 'Total Audience', value: totalFollowers, icon: <Users size={16} />, color: '#34d399' },
        { label: 'Platforms Live', value: platforms.length, icon: <Activity size={16} />, color: '#a78bfa', raw: true },
      ].map(stat => (
        <div key={stat.label} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${stat.color}22`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: stat.color,
          }}>
            {stat.icon}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
              {stat.raw ? stat.value : fmtNum(stat.value)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main AnalyticsDashboard ─────────────────────────────────────────
export default function AnalyticsDashboard({ theme = 'dark' }) {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [range, setRange] = useState('24h');
  const [allData, setAllData] = useState({});
  const [prevData, setPrevData] = useState({});
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [filter, setFilter] = useState('');
  const intervalRef = useRef(null);

  const refresh = useCallback(() => {
    const next = {};
    for (const p of PLATFORMS) next[p.id] = generateMetrics(p.id, range);
    setPrevData(allData);
    setAllData(next);
    setLastUpdate(Date.now());
  }, [range, allData]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 15000);
    return () => clearInterval(intervalRef.current);
  }, [range]);

  const filtered = PLATFORMS.filter(p =>
    !filter || p.name.toLowerCase().includes(filter.toLowerCase())
  );
  const activePlatform = PLATFORMS.find(p => p.id === selectedPlatform);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '0 0 40px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>
            📊 Social Analytics
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
            Real-time cross-platform metrics · Updated {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Time range selector */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
            {TIME_RANGES.map(t => (
              <button key={t.id} onClick={() => setRange(t.id)} style={{
                padding: '5px 12px', borderRadius: 7, border: 'none',
                background: range === t.id ? 'var(--accent)' : 'transparent',
                color: range === t.id ? '#fff' : 'var(--text-2)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>{t.label}</button>
            ))}
          </div>
          <button onClick={refresh} style={{
            padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Overview bar */}
      <OverviewBar allData={allData} platforms={PLATFORMS} />

      {/* Platform grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Platforms</h3>
          <input
            placeholder="Filter…" value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-1)', fontSize: 13, width: 160,
            }}
          />
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12,
        }}>
          {filtered.map(p => (
            <PlatformCard
              key={p.id}
              platform={p}
              data={allData[p.id] || {}}
              prev={prevData[p.id]}
              range={range}
              selected={selectedPlatform === p.id}
              onSelect={setSelectedPlatform}
            />
          ))}
        </div>
      </div>

      {/* Detail view */}
      {activePlatform && allData[activePlatform.id] && (
        <PlatformDetail
          platform={activePlatform}
          data={allData[activePlatform.id]}
          prev={prevData[activePlatform.id]}
          range={range}
        />
      )}
    </div>
  );
}
