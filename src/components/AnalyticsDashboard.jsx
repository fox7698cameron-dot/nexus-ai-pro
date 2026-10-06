// File: src/components/AnalyticsDashboard.jsx | Updated: 2026-10-06
// Calls /api/analytics/* endpoints for live data; mock data is used until those endpoints exist.

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        '#0a0a0a',
  card:      '#111111',
  cardHover: '#161616',
  border:    '#222222',
  border2:   '#2a2a2a',
  text:      '#e8e8e8',
  textMuted: '#888888',
  textDim:   '#555555',
  accent:    '#7c6af7',
  accentDim: '#4a3fa0',
  green:     '#22c55e',
  red:       '#ef4444',
  yellow:    '#eab308',
  blue:      '#3b82f6',
  orange:    '#f97316',
  pink:      '#ec4899',
  cyan:      '#06b6d4',
};

// ─── Style helpers ─────────────────────────────────────────────────────────────
const s = {
  card: {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: '16px 20px',
  },
  label: {
    fontSize: 11,
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
  },
  value: {
    fontSize: 22,
    fontWeight: 700,
    color: T.text,
    lineHeight: 1.2,
  },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  col: { display: 'flex', flexDirection: 'column', gap: 4 },
};

// ─── Mock data (replace with /api/analytics/* calls) ──────────────────────────
const MOCK_SOCIAL = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: T.pink,
    followers: 482_300,
    followerTrend: +2840,
    views30d: 3_210_000,
    likes30d: 184_000,
    comments30d: 9_200,
    retention: 67.4,
    topContent: { title: 'Night coding session', views: 420_000 },
    sparkline: [12, 18, 15, 22, 30, 28, 35],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: '#e1306c',
    followers: 127_500,
    followerTrend: +630,
    views30d: 890_000,
    likes30d: 54_000,
    comments30d: 3_100,
    retention: 52.1,
    topContent: { title: 'Studio setup tour', views: 120_000 },
    sparkline: [8, 10, 9, 14, 13, 17, 16],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👥',
    color: '#1877f2',
    followers: 68_200,
    followerTrend: -120,
    views30d: 310_000,
    likes30d: 12_000,
    comments30d: 1_800,
    retention: 38.7,
    topContent: { title: 'Dev Q&A livestream', views: 42_000 },
    sparkline: [6, 5, 7, 6, 8, 7, 6],
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: '🎮',
    color: '#9147ff',
    followers: 34_100,
    followerTrend: +410,
    views30d: 512_000,
    likes30d: 28_000,
    comments30d: 15_400,
    retention: 74.2,
    topContent: { title: 'Unreal Engine 5 build', views: 88_000 },
    sparkline: [20, 22, 19, 25, 30, 28, 34],
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '💬',
    color: '#5865f2',
    followers: 12_840,
    followerTrend: +215,
    views30d: 0,
    likes30d: 0,
    comments30d: 48_200,
    retention: null,
    topContent: { title: '#game-dev channel', views: null },
    sparkline: [3, 4, 4, 5, 6, 7, 8],
  },
  {
    id: 'lemon8',
    name: 'Lemon8',
    icon: '🍋',
    color: '#f5c518',
    followers: 8_920,
    followerTrend: +340,
    views30d: 124_000,
    likes30d: 8_600,
    comments30d: 720,
    retention: 61.3,
    topContent: { title: 'XR dev workflow', views: 18_000 },
    sparkline: [2, 3, 4, 4, 5, 6, 7],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '🤖',
    color: '#ff4500',
    followers: 5_640,
    followerTrend: +88,
    views30d: 380_000,
    likes30d: 22_400,
    comments30d: 4_100,
    retention: 43.8,
    topContent: { title: 'VR optimization tips [OC]', views: 72_000 },
    sparkline: [10, 14, 9, 18, 22, 19, 24],
  },
  {
    id: 'redgifs',
    name: 'RedGIFs',
    icon: '🎬',
    color: T.red,
    followers: 3_280,
    followerTrend: +54,
    views30d: 96_000,
    likes30d: 5_200,
    comments30d: 320,
    retention: 88.1,
    topContent: { title: 'Physics sim demo loop', views: 24_000 },
    sparkline: [4, 5, 6, 5, 8, 9, 10],
  },
];

const MOCK_CODING = [
  { id: 'c1', name: 'nexus-ai-pro', language: 'TypeScript', status: 'active', commits: 34, coverage: 82.4, openIssues: 7, lastCommit: '2m ago' },
  { id: 'c2', name: 'ml-pipeline-v2', language: 'Python', status: 'review', commits: 12, coverage: 91.1, openIssues: 2, lastCommit: '1h ago' },
  { id: 'c3', name: 'orbit-server', language: 'Go', status: 'active', commits: 58, coverage: 78.6, openIssues: 11, lastCommit: '45m ago' },
  { id: 'c4', name: 'shader-playground', language: 'GLSL', status: 'planning', commits: 3, coverage: 0, openIssues: 0, lastCommit: '2d ago' },
  { id: 'c5', name: 'retrodb', language: 'Rust', status: 'done', commits: 201, coverage: 95.2, openIssues: 0, lastCommit: '1w ago' },
];

const MOCK_GAMEDEV = [
  { id: 'g1', name: 'Project NOVA', engine: 'Unreal 5.4', platform: 'PC / PS5', buildStatus: 'passing', fps: 144, assetCount: 1842, milestone: 'Alpha', milestoneProgress: 68 },
  { id: 'g2', name: 'Echoes of Ether', engine: 'Unity 6', platform: 'Mobile', buildStatus: 'failing', fps: 60, assetCount: 490, milestone: 'Pre-alpha', milestoneProgress: 34 },
  { id: 'g3', name: 'Dungeon Rogue X', engine: 'Godot 4.3', platform: 'PC', buildStatus: 'passing', fps: 120, assetCount: 724, milestone: 'Beta', milestoneProgress: 85 },
];

const MOCK_XRPROJECTS = [
  { id: 'x1', name: 'VoidSpace VR', renderEngine: 'Unreal 5.4', polyCount: '2.4M', textureMem: '4.2 GB', targetDevice: 'PCVR', optScore: 87 },
  { id: 'x2', name: 'AR Workbench', renderEngine: 'RealityKit', polyCount: '310K', textureMem: '512 MB', targetDevice: 'Vision Pro', optScore: 94 },
  { id: 'x3', name: 'Quest Realmcraft', renderEngine: 'Unity 6', polyCount: '820K', textureMem: '1.1 GB', targetDevice: 'Quest 3', optScore: 76 },
];

const MOCK_CONNECTORS = [
  { id: 'ue', name: 'Unreal Engine', icon: '⚙️', status: 'connected', detail1: { label: 'Project', value: 'Project NOVA' }, detail2: { label: 'Version', value: '5.4.2' }, detail3: { label: 'Open BPs', value: 23 } },
  { id: 'egs', name: 'Epic Games Store', icon: '🏪', status: 'connected', detail1: { label: 'Build', value: 'v0.9.1-alpha' }, detail2: { label: 'Submission', value: 'In review' }, detail3: { label: 'Last push', value: '3d ago' } },
  { id: 'psn', name: 'PlayStation', icon: '🎮', status: 'connected', detail1: { label: 'Cert status', value: 'Pending' }, detail2: { label: 'Trophies', value: 42 }, detail3: { label: 'SDK', value: 'PS5 8.0' } },
  { id: 'xbox', name: 'Xbox / GDK', icon: '🟩', status: 'connected', detail1: { label: 'Achievements', value: 58 }, detail2: { label: 'GDK', value: '2024.10' }, detail3: { label: 'XSTS', value: 'Active' } },
  { id: 'ubi', name: 'Ubisoft Connect', icon: '🔷', status: 'warning', detail1: { label: 'Sync', value: 'Partial' }, detail2: { label: 'Actions', value: 31 }, detail3: { label: 'Last sync', value: '6h ago' } },
];

const MOCK_ACHIEVEMENTS = [
  { id: 'a1', icon: '🏆', name: 'First Ship', desc: 'Ship your first game to a platform store', progress: 100, unlocked: '2025-03-14', platform: 'Epic' },
  { id: 'a2', icon: '⭐', name: 'Platinum Dev', desc: 'Achieve 100% trophy set in a shipped PS5 title', progress: 72, unlocked: null, platform: 'PlayStation' },
  { id: 'a3', icon: '🔥', name: '100K Reach', desc: 'Reach 100K views in a single 30-day window', progress: 100, unlocked: '2026-01-08', platform: 'TikTok' },
  { id: 'a4', icon: '🦾', name: 'XR Pioneer', desc: 'Ship an XR app to Apple Vision Pro', progress: 45, unlocked: null, platform: 'Apple' },
  { id: 'a5', icon: '🎯', name: '90% Coverage', desc: 'Maintain 90%+ test coverage for 30 days', progress: 100, unlocked: '2026-07-22', platform: 'GitHub' },
  { id: 'a6', icon: '🚀', name: '1M Views', desc: 'Cumulative 1M views across all platforms', progress: 88, unlocked: null, platform: 'Multi' },
  { id: 'a7', icon: '🎮', name: 'Cross-Platform', desc: 'Publish on PC, PlayStation and Xbox', progress: 60, unlocked: null, platform: 'Multi' },
  { id: 'a8', icon: '💡', name: 'Open Source Hero', desc: '500+ GitHub stars on any single repo', progress: 100, unlocked: '2026-09-01', platform: 'GitHub' },
];

// ─── Utility functions ─────────────────────────────────────────────────────────
const fmt = {
  num: (n) => {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  },
  pct: (n) => (n == null ? '—' : `${n.toFixed(1)}%`),
  trend: (n) => {
    if (n == null) return null;
    if (n > 0) return { label: `+${fmt.num(n)}`, color: T.green, arrow: '▲' };
    if (n < 0) return { label: fmt.num(n), color: T.red, arrow: '▼' };
    return { label: '—', color: T.textMuted, arrow: '→' };
  },
};

const STATUS_COLOR = {
  planning: T.textMuted,
  active:   T.green,
  review:   T.yellow,
  done:     T.accent,
  passing:  T.green,
  failing:  T.red,
  warning:  T.yellow,
  connected: T.green,
};

// ─── Sparkline (SVG, no external deps) ────────────────────────────────────────
function Sparkline({ data = [], color = T.accent, width = 80, height = 30 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [
    i * step,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${(data.length - 1) * step},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = T.accent, height = 5 }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ background: T.border, borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || T.textMuted;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}22`, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>{children}</h2>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: T.textMuted }}>{sub}</p>}
    </div>
  );
}

// ─── LiveMetricBar ────────────────────────────────────────────────────────────
function LiveMetricBar({ metrics }) {
  return (
    <div style={{
      display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
      background: '#0d0d0d', borderBottom: `1px solid ${T.border}`,
      padding: '10px 24px', fontSize: 12,
    }}>
      <span style={{ color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        ⬤ <span style={{ color: T.green }}>LIVE</span>
      </span>
      {[
        { label: 'Total reach today', value: fmt.num(metrics.reachToday), color: T.cyan },
        { label: 'Total engagement', value: fmt.num(metrics.engagementToday), color: T.accent },
        { label: 'Active projects', value: metrics.activeProjects, color: T.green },
        { label: 'Last sync', value: metrics.lastSync, color: T.textMuted },
      ].map((m) => (
        <span key={m.label} style={{ color: T.textMuted }}>
          {m.label}:{' '}
          <span style={{ color: m.color, fontWeight: 700 }}>{m.value}</span>
        </span>
      ))}
    </div>
  );
}

// ─── TabNav ───────────────────────────────────────────────────────────────────
function TabNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, padding: '0 24px', flexWrap: 'wrap' }}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${isActive ? T.accent : 'transparent'}`,
              color: isActive ? T.text : T.textMuted,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              padding: '12px 16px',
              transition: 'color 0.2s',
              outline: 'none',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── PlatformCard ─────────────────────────────────────────────────────────────
function PlatformCard({ platform }) {
  const trend = fmt.trend(platform.followerTrend);
  const engagement = platform.views30d > 0
    ? (((platform.likes30d + platform.comments30d) / platform.views30d) * 100).toFixed(2)
    : '—';

  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{platform.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{platform.name}</div>
            {trend && (
              <div style={{ fontSize: 11, color: trend.color, fontWeight: 600 }}>
                {trend.arrow} {trend.label} / 7d
              </div>
            )}
          </div>
        </div>
        <Sparkline data={platform.sparkline} color={platform.color} />
      </div>

      {/* Primary metric */}
      <div>
        <div style={s.label}>Followers / Subscribers</div>
        <div style={{ ...s.value, color: platform.color }}>{fmt.num(platform.followers)}</div>
      </div>

      {/* Grid metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={s.label}>30d Views / Reach</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{fmt.num(platform.views30d)}</div>
        </div>
        <div>
          <div style={s.label}>Engagement Rate</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{engagement}{engagement !== '—' ? '%' : ''}</div>
        </div>
        <div>
          <div style={s.label}>Retention (50%+)</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: platform.retention > 60 ? T.green : T.yellow }}>
            {fmt.pct(platform.retention)}
          </div>
        </div>
        <div>
          <div style={s.label}>Comments 30d</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{fmt.num(platform.comments30d)}</div>
        </div>
      </div>

      {/* Top content */}
      {platform.topContent.title && (
        <div style={{ background: '#0a0a0a', borderRadius: 8, padding: '8px 12px', border: `1px solid ${T.border}` }}>
          <div style={s.label}>Top Content</div>
          <div style={{ fontSize: 12, color: T.text, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {platform.topContent.title}
          </div>
          {platform.topContent.views != null && (
            <div style={{ fontSize: 11, color: T.textMuted }}>{fmt.num(platform.topContent.views)} views</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CodingProjectCard ────────────────────────────────────────────────────────
function CodingProjectCard({ project }) {
  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{project.name}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{project.language}</div>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><div style={s.label}>Commits / week</div><div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{project.commits}</div></div>
        <div><div style={s.label}>Open Issues</div><div style={{ fontSize: 18, fontWeight: 700, color: project.openIssues > 5 ? T.yellow : T.text }}>{project.openIssues}</div></div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={s.label}>Test Coverage</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: project.coverage > 80 ? T.green : T.yellow }}>{project.coverage > 0 ? `${project.coverage}%` : 'N/A'}</span>
        </div>
        {project.coverage > 0 && (
          <ProgressBar value={project.coverage} color={project.coverage > 80 ? T.green : T.yellow} />
        )}
      </div>
      <div style={{ fontSize: 11, color: T.textDim }}>Last commit: {project.lastCommit}</div>
    </div>
  );
}

// ─── GameProjectCard ──────────────────────────────────────────────────────────
function GameProjectCard({ project }) {
  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{project.name}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{project.engine} · {project.platform}</div>
        </div>
        <StatusBadge status={project.buildStatus} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div><div style={s.label}>FPS bench</div><div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{project.fps}</div></div>
        <div><div style={s.label}>Assets</div><div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{fmt.num(project.assetCount)}</div></div>
        <div><div style={s.label}>Phase</div><div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{project.milestone}</div></div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={s.label}>Milestone Progress</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{project.milestoneProgress}%</span>
        </div>
        <ProgressBar value={project.milestoneProgress} color={T.accent} />
      </div>
    </div>
  );
}

// ─── XRProjectCard ────────────────────────────────────────────────────────────
function XRProjectCard({ project }) {
  const scoreColor = project.optScore > 85 ? T.green : project.optScore > 65 ? T.yellow : T.red;
  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{project.name}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{project.renderEngine}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.cyan, background: `${T.cyan}22`, padding: '2px 8px', borderRadius: 20 }}>
          {project.targetDevice}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><div style={s.label}>Poly Count</div><div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{project.polyCount}</div></div>
        <div><div style={s.label}>Texture Mem</div><div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{project.textureMem}</div></div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={s.label}>Optimization Score</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{project.optScore}/100</span>
        </div>
        <ProgressBar value={project.optScore} color={scoreColor} />
      </div>
    </div>
  );
}

// ─── ConnectorCard ────────────────────────────────────────────────────────────
function ConnectorCard({ connector }) {
  const statusColor = STATUS_COLOR[connector.status] || T.textMuted;
  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{connector.icon}</span>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{connector.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>{connector.status}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
        {[connector.detail1, connector.detail2, connector.detail3].map((d) => (
          <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: T.textMuted }}>{d.label}</span>
            <span style={{ color: T.text, fontWeight: 600 }}>{String(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AchievementCard ──────────────────────────────────────────────────────────
function AchievementCard({ achievement }) {
  const done = achievement.progress >= 100;
  return (
    <div style={{ ...s.card, opacity: done ? 1 : 0.85, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28, filter: done ? 'none' : 'grayscale(60%)' }}>{achievement.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: done ? T.text : T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {achievement.name}
          </div>
          <div style={{ fontSize: 10, color: T.textDim }}>{achievement.platform}</div>
        </div>
        {done && <span style={{ fontSize: 14 }}>✅</span>}
      </div>
      <div style={{ fontSize: 11, color: T.textMuted }}>{achievement.desc}</div>
      <ProgressBar value={achievement.progress} color={done ? T.green : T.accent} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textDim }}>
        <span>{achievement.progress}% complete</span>
        {achievement.unlocked && <span>Unlocked {achievement.unlocked}</span>}
      </div>
    </div>
  );
}

// ─── Loading / Error overlays ─────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
      <div style={{ fontSize: 32, animation: 'spin 1s linear infinite' }}>⟳</div>
      <div style={{ color: T.textMuted, fontSize: 14 }}>Loading analytics…</div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 12 }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ color: T.red, fontSize: 14, fontWeight: 700 }}>Failed to load analytics</div>
      <div style={{ color: T.textMuted, fontSize: 12, maxWidth: 360, textAlign: 'center' }}>{error}</div>
      <button
        onClick={onRetry}
        style={{ marginTop: 8, padding: '8px 20px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
      >
        Retry
      </button>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ social, coding, liveMetrics }) {
  const totalFollowers = social.reduce((s, p) => s + p.followers, 0);
  const totalViews = social.reduce((s, p) => s + p.views30d, 0);
  const avgRetention = (() => {
    const tracked = social.filter((p) => p.retention != null);
    return tracked.reduce((s, p) => s + p.retention, 0) / tracked.length;
  })();
  const activeProjects = coding.filter((p) => p.status === 'active').length;

  const stats = [
    { label: 'Total Followers', value: fmt.num(totalFollowers), icon: '👥', color: T.blue },
    { label: '30d Views', value: fmt.num(totalViews), icon: '👁️', color: T.cyan },
    { label: 'Avg Retention', value: fmt.pct(avgRetention), icon: '📊', color: T.accent },
    { label: 'Active Projects', value: activeProjects, icon: '🚧', color: T.green },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {stats.map((st) => (
          <div key={st.label} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>{st.icon}</span>
            <div>
              <div style={s.label}>{st.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: st.color }}>{st.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform breakdown */}
      <div>
        <SectionTitle sub="Across all tracked platforms">Platform Snapshot</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {social.slice(0, 4).map((p) => (
            <PlatformCard key={p.id} platform={p} />
          ))}
        </div>
      </div>

      {/* Coding overview */}
      <div>
        <SectionTitle sub="Active software projects">Coding Projects</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {coding.filter((p) => p.status === 'active' || p.status === 'review').map((p) => (
            <CodingProjectCard key={p.id} project={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Social Tab ───────────────────────────────────────────────────────────────
function SocialTab({ social }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionTitle sub="Real-time metrics across all social platforms — /api/analytics/social">
        Social Media Analytics
      </SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {social.map((p) => (
          <PlatformCard key={p.id} platform={p} />
        ))}
      </div>
    </div>
  );
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────
function ProjectsTab({ coding, gamedev, xr }) {
  const [subTab, setSubTab] = useState('coding');

  const subTabs = [
    { id: 'coding', label: 'Coding', icon: '💻' },
    { id: 'gamedev', label: 'Game Dev', icon: '🎮' },
    { id: 'xr', label: 'AR/VR/3D', icon: '🥽' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
        {subTabs.map((tab) => {
          const isActive = tab.id === subTab;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                background: isActive ? `${T.accent}22` : 'none',
                border: 'none',
                borderBottom: `2px solid ${isActive ? T.accent : 'transparent'}`,
                color: isActive ? T.accent : T.textMuted,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                padding: '8px 14px',
                borderRadius: '6px 6px 0 0',
                outline: 'none',
                transition: 'all 0.2s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {subTab === 'coding' && (
        <div>
          <SectionTitle sub="Software projects tracked via /api/analytics/projects/coding">Software Projects</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {coding.map((p) => <CodingProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {subTab === 'gamedev' && (
        <div>
          <SectionTitle sub="Game projects tracked via /api/analytics/projects/gamedev">Game Development</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {gamedev.map((p) => <GameProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {subTab === 'xr' && (
        <div>
          <SectionTitle sub="XR/3D projects tracked via /api/analytics/projects/xr">AR / VR / 3D Projects</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {xr.map((p) => <XRProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GameDev Tab ──────────────────────────────────────────────────────────────
function GameDevTab({ connectors }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionTitle sub="Platform connector status from /api/analytics/gamedev/connectors">
        Game Dev Connectors
      </SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {connectors.map((c) => <ConnectorCard key={c.id} connector={c} />)}
      </div>

      {/* Combined status summary */}
      <div style={{ ...s.card }}>
        <div style={{ marginBottom: 14, ...s.label }}>Platform Health Summary</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {connectors.map((c) => {
            const statusColor = STATUS_COLOR[c.status] || T.textMuted;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: T.text }}>{c.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>{c.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Achievements Tab ─────────────────────────────────────────────────────────
function AchievementsTab({ achievements }) {
  const unlocked = achievements.filter((a) => a.progress >= 100).length;
  const total = achievements.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionTitle sub={`${unlocked}/${total} unlocked · /api/analytics/achievements`}>
        Achievement Tracker
      </SectionTitle>

      {/* Summary bar */}
      <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: T.accent }}>{unlocked}<span style={{ fontSize: 18, color: T.textMuted }}>/{total}</span></div>
          <div style={s.label}>Achievements Unlocked</div>
        </div>
        <div style={{ flex: 1 }}>
          <ProgressBar value={unlocked} max={total} color={T.accent} height={8} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{Math.round((unlocked / total) * 100)}%</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {achievements.map((a) => <AchievementCard key={a.id} achievement={a} />)}
      </div>
    </div>
  );
}

// ─── Main AnalyticsDashboard ──────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState({
    reachToday: 0,
    engagementToday: 0,
    activeProjects: 0,
    lastSync: 'syncing…',
  });

  const wsRef = useRef(null);
  const pollRef = useRef(null);

  // Simulate fetch from /api/analytics/dashboard
  const fetchData = useCallback(async () => {
    try {
      // In production this calls /api/analytics/dashboard
      // For now we resolve mock data immediately
      await new Promise((r) => setTimeout(r, 600));

      // Uncomment for real API:
      // const res = await fetch('/api/analytics/dashboard');
      // if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // const json = await res.json();

      const mockResult = {
        social: MOCK_SOCIAL,
        coding: MOCK_CODING,
        gamedev: MOCK_GAMEDEV,
        xr: MOCK_XRPROJECTS,
        connectors: MOCK_CONNECTORS,
        achievements: MOCK_ACHIEVEMENTS,
      };

      setData(mockResult);
      setError(null);

      // Derive live metrics
      const totalReach = MOCK_SOCIAL.reduce((s, p) => s + Math.floor(p.views30d / 30), 0);
      const totalEng = MOCK_SOCIAL.reduce((s, p) => s + Math.floor((p.likes30d + p.comments30d) / 30), 0);
      const active = MOCK_CODING.filter((p) => p.status === 'active').length;
      setLiveMetrics({
        reachToday: totalReach + Math.floor(Math.random() * 500),
        engagementToday: totalEng + Math.floor(Math.random() * 50),
        activeProjects: active,
        lastSync: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket via Socket.IO for real-time pushes
  const initWebSocket = useCallback(() => {
    try {
      if (typeof window === 'undefined' || !window.io) return;

      const socket = window.io('/analytics', { transports: ['websocket'], reconnectionAttempts: 5 });

      socket.on('connect', () => {
        console.info('[AnalyticsDashboard] WebSocket connected');
      });

      socket.on('metrics:update', (payload) => {
        setLiveMetrics((prev) => ({
          ...prev,
          ...payload,
          lastSync: new Date().toLocaleTimeString(),
        }));
      });

      socket.on('data:refresh', () => {
        fetchData();
      });

      socket.on('disconnect', () => {
        console.info('[AnalyticsDashboard] WebSocket disconnected');
      });

      wsRef.current = socket;
    } catch (e) {
      // Socket.IO not available; fall back to polling only
      console.warn('[AnalyticsDashboard] Socket.IO unavailable, polling only.', e);
    }
  }, [fetchData]);

  // Mount: initial fetch + poll + WebSocket
  useEffect(() => {
    fetchData();
    initWebSocket();

    pollRef.current = setInterval(() => {
      fetchData();
    }, 30_000);

    return () => {
      clearInterval(pollRef.current);
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [fetchData, initWebSocket]);

  const TABS = [
    { id: 'overview',      label: 'Overview',     icon: '📊' },
    { id: 'social',        label: 'Social',        icon: '📱' },
    { id: 'projects',      label: 'Projects',      icon: '🗂️' },
    { id: 'gamedev',       label: 'Game Dev',      icon: '🕹️' },
    { id: 'achievements',  label: 'Achievements',  icon: '🏆' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${T.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
            📡 Analytics Dashboard
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: T.textMuted }}>nexus-ai-pro · real-time · /api/analytics/*</p>
        </div>
        <button
          onClick={fetchData}
          title="Force refresh"
          style={{
            background: T.border,
            border: `1px solid ${T.border2}`,
            color: T.textMuted,
            cursor: 'pointer',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            outline: 'none',
          }}
        >
          ↻ Refresh
        </button>
      </header>

      {/* Live metric bar */}
      <LiveMetricBar metrics={liveMetrics} />

      {/* Tab navigation */}
      <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* Content area */}
      <main style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {loading && <LoadingState />}
        {!loading && error && <ErrorState error={error} onRetry={fetchData} />}
        {!loading && !error && data && (
          <>
            {activeTab === 'overview' && (
              <OverviewTab social={data.social} coding={data.coding} liveMetrics={liveMetrics} />
            )}
            {activeTab === 'social' && (
              <SocialTab social={data.social} />
            )}
            {activeTab === 'projects' && (
              <ProjectsTab coding={data.coding} gamedev={data.gamedev} xr={data.xr} />
            )}
            {activeTab === 'gamedev' && (
              <GameDevTab connectors={data.connectors} />
            )}
            {activeTab === 'achievements' && (
              <AchievementsTab achievements={data.achievements} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
