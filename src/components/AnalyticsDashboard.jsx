/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * AnalyticsDashboard.jsx
 * Updated: 2026-10-16
 * Real-time social media analytics + project tracking dashboard
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Platform configs ─────────────────────────────────────────────────────────
const SOCIAL_PLATFORMS = {
  tiktok:   { label: 'TikTok',    color: '#010101', accent: '#fe2c55', icon: '🎵' },
  instagram:{ label: 'Instagram', color: '#833ab4', accent: '#fd1d1d', icon: '📸' },
  facebook: { label: 'Facebook',  color: '#1877f2', accent: '#166fe5', icon: '👤' },
  twitch:   { label: 'Twitch',    color: '#9146ff', accent: '#7c3aed', icon: '🎮' },
  discord:  { label: 'Discord',   color: '#5865f2', accent: '#4f46e5', icon: '💬' },
  lemon8:   { label: 'Lemon8',    color: '#ffde00', accent: '#f59e0b', icon: '🍋' },
  reddit:   { label: 'Reddit',    color: '#ff4500', accent: '#ea580c', icon: '🤖' },
  redgifs:  { label: 'RedGIFs',   color: '#e63946', accent: '#dc2626', icon: '🎞️' },
};

const PROJECT_TYPES = {
  code:   { label: 'Coding',      icon: '💻', color: '#3b82f6' },
  game:   { label: 'Game Dev',    icon: '🎮', color: '#8b5cf6' },
  ar:     { label: 'AR / XR',     icon: '🥽', color: '#06b6d4' },
  vr:     { label: 'VR',          icon: '🌐', color: '#10b981' },
  '3d':   { label: '3D / Motion', icon: '🧊', color: '#f59e0b' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function pct(a, b) {
  return b === 0 ? '0%' : ((a / b) * 100).toFixed(1) + '%';
}

// Sparkline using inline SVG
function Sparkline({ data, color = '#3b82f6', height = 40 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 120;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  });
  const d = `M${pts.join(' L')}`;
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Stat card
function StatCard({ label, value, sub, delta, spark, color }) {
  const positive = delta > 0;
  return (
    <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)' }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {delta !== undefined && (
          <span style={{ fontSize: 13, fontWeight: 600, color: positive ? '#10b981' : '#ef4444' }}>
            {positive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {spark && <Sparkline data={spark} color={color || '#3b82f6'} />}
      </div>
    </div>
  );
}

// Progress bar
function Bar({ value, max = 100, color = '#3b82f6', label }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>}
      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

// ── Mock data generator ───────────────────────────────────────────────────────
function generateMockMetrics(platform) {
  const base = { tiktok: 1200000, instagram: 850000, facebook: 620000, twitch: 320000, discord: 45000, lemon8: 28000, reddit: 180000, redgifs: 95000 };
  const b = base[platform] || 50000;
  return {
    followers:  b + Math.floor(Math.random() * b * 0.1),
    views:      b * 12 + Math.floor(Math.random() * b),
    likes:      b * 3 + Math.floor(Math.random() * b * 0.5),
    comments:   Math.floor(b * 0.08 + Math.random() * 1000),
    shares:     Math.floor(b * 0.04 + Math.random() * 500),
    reach:      b * 8 + Math.floor(Math.random() * b * 2),
    retention:  40 + Math.random() * 45,
    engRate:    2.5 + Math.random() * 6,
    spark: Array.from({ length: 14 }, () => Math.random() * 100),
    viewSpark: Array.from({ length: 14 }, () => Math.random() * 100),
    deltaFollowers: (Math.random() - 0.3) * 10,
    deltaViews: (Math.random() - 0.2) * 15,
  };
}

function generateMockProject(type, idx) {
  const statuses = ['active', 'in_review', 'paused', 'shipped'];
  const names = {
    code: ['Auth Service', 'Payment Module', 'API Gateway', 'CLI Tool'],
    game: ['Open World RPG', 'Tower Defense', 'Racing Sim', 'Battle Royale'],
    ar:   ['AR Nav App', 'Spatial UI', 'Marker Tracker', 'Hand Tracking'],
    vr:   ['VR Showroom', 'Virtual Office', 'Escape Room', 'VR Gym'],
    '3d': ['Character Rig', 'Environment Kit', 'Particle FX', 'Cutscene Pack'],
  };
  return {
    id: `${type}-${idx}`,
    type,
    name: names[type][idx % names[type].length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    progress: Math.floor(Math.random() * 100),
    commits: Math.floor(Math.random() * 200),
    issues: Math.floor(Math.random() * 30),
    platform: ['Unreal', 'Unity', 'Godot', 'Custom'][Math.floor(Math.random() * 4)],
    updated: new Date(Date.now() - Math.random() * 7 * 86400000).toLocaleDateString(),
    achievements: Math.floor(Math.random() * 50),
    coverage: Math.floor(60 + Math.random() * 40),
  };
}

// ── Platform Detail Panel ─────────────────────────────────────────────────────
function PlatformPanel({ platform, metrics, cfg }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>{cfg.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--fg)' }}>{cfg.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 20, background: cfg.accent + '22', color: cfg.accent, fontWeight: 600 }}>LIVE</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatCard label="Followers" value={fmt(metrics.followers)} delta={metrics.deltaFollowers} spark={metrics.spark} color={cfg.accent} />
        <StatCard label="Total Views" value={fmt(metrics.views)} delta={metrics.deltaViews} spark={metrics.viewSpark} color={cfg.color} />
        <StatCard label="Reach" value={fmt(metrics.reach)} sub="last 30 days" />
        <StatCard label="Engagement" value={metrics.engRate.toFixed(1) + '%'} sub="avg per post" />
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <Bar value={metrics.retention} label={`Retention ${metrics.retention.toFixed(0)}%`} color={cfg.accent} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
          <div>👍 {fmt(metrics.likes)} likes</div>
          <div>💬 {fmt(metrics.comments)} comments</div>
          <div>🔁 {fmt(metrics.shares)} shares</div>
        </div>
      </div>
    </div>
  );
}

// ── Game connector badge ──────────────────────────────────────────────────────
const GAME_CONNECTORS = [
  { id: 'epic',     label: 'Epic / Unreal',    icon: '🎮', color: '#313131' },
  { id: 'sony',     label: 'PlayStation',       icon: '🎲', color: '#003087' },
  { id: 'microsoft',label: 'Xbox / MS Store',  icon: '🟩', color: '#107c10' },
  { id: 'ubisoft',  label: 'Ubisoft Connect',  icon: '🔷', color: '#0070f3' },
];

function ConnectorBadge({ c, connected, onToggle }) {
  return (
    <div
      onClick={() => onToggle(c.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderRadius: 10, cursor: 'pointer', userSelect: 'none',
        background: connected ? c.color + '22' : 'var(--card)',
        border: `1px solid ${connected ? c.color : 'var(--border)'}`,
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: 20 }}>{c.icon}</span>
      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{c.label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: connected ? '#10b981' : 'var(--muted)' }}>
        {connected ? '● Connected' : '○ Connect'}
      </span>
    </div>
  );
}

// ── Project Row ───────────────────────────────────────────────────────────────
const STATUS_COLORS = { active: '#10b981', in_review: '#f59e0b', paused: '#6b7280', shipped: '#3b82f6' };

function ProjectRow({ proj }) {
  const tc = PROJECT_TYPES[proj.type];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 20 }}>{tc?.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{proj.platform} · Updated {proj.updated}</div>
      </div>
      <div style={{ width: 100 }}>
        <Bar value={proj.progress} color={tc?.color || '#3b82f6'} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{proj.progress}%</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[proj.status], textTransform: 'capitalize', minWidth: 72, textAlign: 'right' }}>
        {proj.status.replace('_', ' ')}
      </span>
      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right', minWidth: 80 }}>
        <div>🏆 {proj.achievements} achv.</div>
        <div>🧪 {proj.coverage}% cov.</div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ onClose }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [metrics, setMetrics] = useState({});
  const [projects, setProjects] = useState([]);
  const [connectors, setConnectors] = useState({});
  const [tab, setTab] = useState('social');
  const [projFilter, setProjFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const intervalRef = useRef(null);

  // Initial load + real-time refresh every 30s
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const refresh = useCallback(() => {
    const m = {};
    Object.keys(SOCIAL_PLATFORMS).forEach(p => { m[p] = generateMockMetrics(p); });
    setMetrics(m);

    const projs = [];
    Object.keys(PROJECT_TYPES).forEach(type => {
      for (let i = 0; i < 4; i++) projs.push(generateMockProject(type, i));
    });
    setProjects(projs);
    setLastRefresh(Date.now());
  }, []);

  const toggleConnector = (id) => {
    setConnectors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cfg = SOCIAL_PLATFORMS[activePlatform];
  const m = metrics[activePlatform];

  const filteredProjects = projFilter === 'all' ? projects : projects.filter(p => p.type === projFilter);

  // Aggregate totals
  const totalFollowers = Object.values(metrics).reduce((s, m) => s + (m?.followers || 0), 0);
  const totalViews     = Object.values(metrics).reduce((s, m) => s + (m?.views || 0), 0);
  const totalReach     = Object.values(metrics).reduce((s, m) => s + (m?.reach || 0), 0);

  const styles = `
    :root { --card: #1e1e2e; --border: #2a2a40; --fg: #e2e8f0; --muted: #6b7280; --bg: #0f0f1a; }
    @media (prefers-color-scheme: light) { :root { --card: #ffffff; --border: #e5e7eb; --fg: #111827; --muted: #6b7280; --bg: #f8fafc; } }
  `;

  return (
    <>
      <style>{styles}</style>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'system-ui, sans-serif', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Analytics Dashboard</h1>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Last refresh: {new Date(lastRefresh).toLocaleTimeString()} · Real-time data
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', fontSize: 13 }}>
              ↻ Refresh
            </button>
            {onClose && (
              <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', fontSize: 13 }}>
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* Summary row */}
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Total Followers" value={fmt(totalFollowers)} delta={3.2} spark={Array.from({length:14},()=>Math.random()*100)} color="#3b82f6" />
          <StatCard label="Total Views" value={fmt(totalViews)} delta={8.1} spark={Array.from({length:14},()=>Math.random()*100)} color="#8b5cf6" />
          <StatCard label="Cross-Platform Reach" value={fmt(totalReach)} delta={5.6} spark={Array.from({length:14},()=>Math.random()*100)} color="#10b981" />
          <StatCard label="Active Projects" value={projects.filter(p=>p.status==='active').length} sub="across all types" />
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 0 }}>
          {[['social','📊 Social Media'],['projects','🛠 Projects'],['connectors','🔌 Connectors']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 20px', background: 'transparent', border: 'none',
              borderBottom: tab === t ? '3px solid #3b82f6' : '3px solid transparent',
              color: tab === t ? '#3b82f6' : 'var(--muted)', cursor: 'pointer', fontSize: 14, fontWeight: tab === t ? 700 : 400
            }}>{l}</button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {/* SOCIAL TAB */}
          {tab === 'social' && (
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
              {/* Platform list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(SOCIAL_PLATFORMS).map(([p, c]) => (
                  <button key={p} onClick={() => setActivePlatform(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                    background: activePlatform === p ? c.accent + '22' : 'transparent',
                    border: activePlatform === p ? `1px solid ${c.accent}` : '1px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{c.label}</div>
                      {metrics[p] && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(metrics[p].followers)} followers</div>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Platform detail */}
              {m && cfg && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <PlatformPanel platform={activePlatform} metrics={m} cfg={cfg} />

                  {/* Content breakdown */}
                  <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Content Performance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Bar value={m.retention} label={`Avg Retention: ${m.retention.toFixed(0)}%`} color={cfg.accent} />
                      <Bar value={m.engRate * 10} label={`Engagement Rate: ${m.engRate.toFixed(1)}%`} color="#3b82f6" />
                      <Bar value={Math.random() * 100} label="Click-through Rate: varies" color="#10b981" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PROJECTS TAB */}
          {tab === 'projects' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[['all','All'],['code','Coding'],['game','Game Dev'],['ar','AR/XR'],['vr','VR'],['3d','3D']].map(([k,l]) => (
                  <button key={k} onClick={() => setProjFilter(k)} style={{
                    padding: '7px 16px', borderRadius: 20, border: '1px solid var(--border)',
                    background: projFilter === k ? '#3b82f6' : 'transparent',
                    color: projFilter === k ? '#fff' : 'var(--fg)', cursor: 'pointer', fontSize: 13,
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                {filteredProjects.length === 0 && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>No projects</div>}
                {filteredProjects.map(p => <ProjectRow key={p.id} proj={p} />)}
              </div>
            </div>
          )}

          {/* CONNECTORS TAB */}
          {tab === 'connectors' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Game Platforms</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {GAME_CONNECTORS.map(c => (
                    <ConnectorBadge key={c.id} c={c} connected={!!connectors[c.id]} onToggle={toggleConnector} />
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Achievement Tracking</h3>
                <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <StatCard label="Total Achievements" value="1,248" sub="across platforms" />
                    <StatCard label="Games Tracked" value="84" sub="active" />
                    <StatCard label="Game Hours" value="3,120h" sub="lifetime" />
                    <StatCard label="Trophies" value="Gold 🏆" sub="rank" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
