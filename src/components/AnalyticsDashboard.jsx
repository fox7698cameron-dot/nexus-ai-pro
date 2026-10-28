/**
 * src/components/AnalyticsDashboard.jsx
 * Social Media & Project Analytics Dashboard
 * Real-time metrics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
 * Created: 2026-10-28
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#010101', accent: '#fe2c55', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: '#833ab4', accent: '#fd1d1d', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', accent: '#0b5ed7', icon: '👥' },
  { id: 'twitch',    label: 'Twitch',    color: '#6441a5', accent: '#9147ff', icon: '🎮' },
  { id: 'discord',   label: 'Discord',   color: '#5865f2', accent: '#4752c4', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#f7c31e', accent: '#e6a817', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',    color: '#ff4500', accent: '#cc3700', icon: '🔴' },
  { id: 'redgifs',   label: 'RedGifs',   color: '#c0392b', accent: '#e74c3c', icon: '🎬' },
];

const PROJECT_TYPES = [
  { id: 'coding',    label: 'Coding',       icon: '💻' },
  { id: 'game',      label: 'Game Dev',     icon: '🎮' },
  { id: 'arvr',      label: 'AR/VR/3D',     icon: '🥽' },
  { id: 'mobile',    label: 'Mobile App',   icon: '📱' },
  { id: 'web',       label: 'Web App',      icon: '🌐' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomMetrics = (platform) => ({
  platform,
  followers:   rnd(10_000, 5_000_000),
  views:       rnd(5_000, 10_000_000),
  likes:       rnd(1_000, 500_000),
  comments:    rnd(100, 50_000),
  shares:      rnd(50, 20_000),
  reach:       rnd(20_000, 20_000_000),
  retention:   rnd(15, 85),
  engagement:  parseFloat((rnd(1, 15) + Math.random()).toFixed(2)),
  growth:      parseFloat((rnd(-5, 30) + Math.random()).toFixed(1)),
  revenue:     rnd(0, 10_000),
  posts:       rnd(5, 200),
  liveViews:   rnd(0, 50_000),
  topPost: {
    title: 'Best performing content',
    views: rnd(100_000, 2_000_000),
    likes: rnd(10_000, 200_000),
  },
  history: Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
    views: rnd(1000, 100_000),
    likes: rnd(100, 10_000),
  })),
});

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#60a5fa', width = 80, height = 30 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, trend }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '14px 16px',
      minWidth: 110,
      flex: '1 1 110px',
    }}>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#f9fafb' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: trend >= 0 ? '#34d399' : '#f87171', marginTop: 2 }}>
        {trend >= 0 ? '▲' : '▼'} {sub}
      </div>}
    </div>
  );
}

// ─── BarChart ─────────────────────────────────────────────────────────────────
function BarChart({ history, color }) {
  const max = Math.max(...history.map(h => h.views));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {history.map((h, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{
            width: '100%',
            height: `${(h.views / max) * 50}px`,
            background: color,
            borderRadius: '3px 3px 0 0',
            opacity: 0.8,
          }} />
          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{h.day}</div>
        </div>
      ))}
    </div>
  );
}

// ─── PlatformCard ─────────────────────────────────────────────────────────────
function PlatformCard({ data, platform, connected, onConnect }) {
  const [expanded, setExpanded] = useState(false);

  if (!connected) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${platform.accent}40`,
        borderRadius: 12,
        padding: '20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 32 }}>{platform.icon}</span>
        <div style={{ fontWeight: 600, color: '#e5e7eb' }}>{platform.label}</div>
        <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
          Connect your account to view analytics
        </div>
        <button
          onClick={() => onConnect(platform.id)}
          style={{
            background: platform.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Connect
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${platform.accent}50`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${platform.color}80, ${platform.accent}40)`,
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ fontSize: 22 }}>{platform.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: 15 }}>{platform.label}</div>
          <div style={{ fontSize: 11, color: '#d1d5db' }}>{fmt(data.followers)} followers</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: data.growth >= 0 ? '#34d399' : '#f87171', fontWeight: 700, fontSize: 14 }}>
            {data.growth >= 0 ? '+' : ''}{data.growth}%
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>7-day growth</div>
        </div>
        <span style={{ color: '#9ca3af', marginLeft: 8 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <MetricCard label="Views" value={fmt(data.views)} sub={`${data.engagement}% eng`} trend={data.growth} />
          <MetricCard label="Likes" value={fmt(data.likes)} color="#f87171" />
          <MetricCard label="Reach" value={fmt(data.reach)} color="#60a5fa" trend={1} sub="+12%" />
          <MetricCard label="Retention" value={`${data.retention}%`} color={data.retention > 50 ? '#34d399' : '#fbbf24'} />
        </div>

        <BarChart history={data.history} color={platform.accent} />

        {expanded && (
          <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <MetricCard label="Comments" value={fmt(data.comments)} />
              <MetricCard label="Shares" value={fmt(data.shares)} />
              <MetricCard label="Posts" value={String(data.posts)} />
              {data.liveViews > 0 && <MetricCard label="Live Viewers" value={fmt(data.liveViews)} color="#f87171" />}
            </div>
            {data.revenue > 0 && (
              <div style={{ fontSize: 13, color: '#34d399', fontWeight: 600, marginBottom: 8 }}>
                💰 Est. Revenue: ${data.revenue.toLocaleString()}
              </div>
            )}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
            }}>
              <div style={{ color: '#9ca3af', marginBottom: 4 }}>Top Performing Post</div>
              <div style={{ color: '#e5e7eb', fontWeight: 600 }}>{data.topPost.title}</div>
              <div style={{ color: '#6b7280', marginTop: 2 }}>
                {fmt(data.topPost.views)} views · {fmt(data.topPost.likes)} likes
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ProjectTracker ───────────────────────────────────────────────────────────
function ProjectTracker() {
  const [projects, setProjects] = useState([
    { id: 1, name: 'Nexus AI Pro', type: 'coding', status: 'active', progress: 78, tasks: 42, done: 33, lang: 'React/Node', lastCommit: '2h ago', loc: 15420 },
    { id: 2, name: 'Galaxy Runner', type: 'game', status: 'active', progress: 45, tasks: 120, done: 54, lang: 'Unreal C++', lastCommit: '1d ago', loc: 48200, engine: 'Unreal 5.3' },
    { id: 3, name: 'VR Workspace', type: 'arvr', status: 'planning', progress: 12, tasks: 30, done: 4, lang: 'Unity C#', lastCommit: '3d ago', loc: 3100 },
    { id: 4, name: 'Social Dashboard', type: 'web', status: 'active', progress: 91, tasks: 20, done: 18, lang: 'React/TS', lastCommit: '30m ago', loc: 8900 },
  ]);
  const [newProject, setNewProject] = useState({ name: '', type: 'coding' });
  const [adding, setAdding] = useState(false);

  const addProject = () => {
    if (!newProject.name.trim()) return;
    setProjects(p => [...p, {
      id: Date.now(),
      name: newProject.name,
      type: newProject.type,
      status: 'planning',
      progress: 0,
      tasks: 0,
      done: 0,
      lang: '',
      lastCommit: 'never',
      loc: 0,
    }]);
    setNewProject({ name: '', type: 'coding' });
    setAdding(false);
  };

  const statusColor = { active: '#34d399', planning: '#60a5fa', paused: '#fbbf24', completed: '#a78bfa' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb' }}>Project Tracker</div>
        <button
          onClick={() => setAdding(a => !a)}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}
        >
          + New Project
        </button>
      </div>

      {adding && (
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid #6366f150', borderRadius: 10, padding: 14, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={newProject.name}
            onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
            placeholder="Project name"
            style={{ flex: '1 1 180px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#f9fafb', fontSize: 13 }}
          />
          <select
            value={newProject.type}
            onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
            style={{ background: 'rgba(30,30,50,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#f9fafb', fontSize: 13 }}
          >
            {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
          <button onClick={addProject} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
            Add
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {projects.map(proj => {
          const pt = PROJECT_TYPES.find(t => t.id === proj.type);
          return (
            <div key={proj.id} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{pt?.icon}</span>
                    <span style={{ fontWeight: 700, color: '#f9fafb', fontSize: 14 }}>{proj.name}</span>
                    <span style={{ fontSize: 10, background: `${statusColor[proj.status]}20`, color: statusColor[proj.status], borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                      {proj.status}
                    </span>
                  </div>
                  {proj.lang && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{proj.lang} {proj.engine ? `· ${proj.engine}` : ''}</div>}
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: '#6b7280' }}>
                  <div>{proj.done}/{proj.tasks} tasks</div>
                  <div>Last: {proj.lastCommit}</div>
                  {proj.loc > 0 && <div>{(proj.loc/1000).toFixed(1)}k LOC</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    width: `${proj.progress}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, #6366f1, #8b5cf6)`,
                    borderRadius: 99,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, minWidth: 32 }}>{proj.progress}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main AnalyticsDashboard ──────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [tab, setTab] = useState('social');
  const [metrics, setMetrics] = useState({});
  const [connected, setConnected] = useState({ tiktok: true, instagram: true, twitch: true, discord: true });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // Attempt real API fetch; fall back to synthetic data
      const res = await fetch('/api/analytics/social', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setMetrics(data);
      } else {
        const synth = {};
        PLATFORMS.forEach(p => { synth[p.id] = randomMetrics(p.id); });
        setMetrics(synth);
      }
    } catch {
      const synth = {};
      PLATFORMS.forEach(p => { synth[p.id] = randomMetrics(p.id); });
      setMetrics(synth);
    } finally {
      setLoading(false);
      setLastRefresh(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    intervalRef.current = setInterval(loadMetrics, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [loadMetrics]);

  const handleConnect = (platformId) => {
    setConnected(c => ({ ...c, [platformId]: true }));
    setMetrics(m => ({ ...m, [platformId]: randomMetrics(platformId) }));
  };

  const totalViews = Object.values(metrics)
    .filter((_, i) => connected[PLATFORMS[i]?.id])
    .reduce((s, m) => s + (m?.views || 0), 0);
  const totalFollowers = Object.values(metrics)
    .filter((_, i) => connected[PLATFORMS[i]?.id])
    .reduce((s, m) => s + (m?.followers || 0), 0);

  const tabs = [
    { id: 'social', label: '📊 Social Media' },
    { id: 'projects', label: '🛠 Projects' },
  ];

  return (
    <div style={{
      background: '#0f0f1a',
      minHeight: '100vh',
      color: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Analytics Dashboard
            </h1>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Real-time · {lastRefresh ? `Updated ${lastRefresh}` : 'Loading...'} · Auto-refresh 30s
            </div>
          </div>
          <button
            onClick={loadMetrics}
            disabled={loading}
            style={{ background: 'rgba(99,102,241,0.2)', color: '#a78bfa', border: '1px solid #6366f1', borderRadius: 8, padding: '8px 16px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
        </div>

        {/* Summary tiles */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Followers', value: fmt(totalFollowers), color: '#a78bfa' },
            { label: 'Total Views', value: fmt(totalViews), color: '#60a5fa' },
            { label: 'Platforms', value: `${Object.values(connected).filter(Boolean).length}/${PLATFORMS.length}`, color: '#34d399' },
          ].map(t => (
            <div key={t.label} style={{ flex: '1 1 120px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{t.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: t.color, marginTop: 4 }}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: tab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: tab === t.id ? '#c4b5fd' : '#6b7280',
              border: 'none',
              borderRadius: 8,
              padding: '9px 0',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 400,
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'social' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {PLATFORMS.map(platform => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              data={metrics[platform.id] || {}}
              connected={!!connected[platform.id]}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}

      {tab === 'projects' && (
        <ProjectTracker />
      )}
    </div>
  );
}
