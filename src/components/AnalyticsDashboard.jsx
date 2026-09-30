// Created: 2026-09-30
// AnalyticsDashboard.jsx — Nexus AI Pro
// Comprehensive social media + project analytics dashboard
// Real-time updates via Socket.io | Pure SVG charts | Tailwind layout

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Platform config ────────────────────────────────────────────────────────

const PLATFORMS = {
  tiktok: {
    label: 'TikTok',
    primary: '#ff0050',
    bg: '#010101',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.03a8.16 8.16 0 004.77 1.52V7.11a4.85 4.85 0 01-1-.42z" />
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    primary: '#E1306C',
    bg: '#833AB4',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    primary: '#1877F2',
    bg: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  twitch: {
    label: 'Twitch',
    primary: '#9146FF',
    bg: '#9146FF',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
      </svg>
    ),
  },
  discord: {
    label: 'Discord',
    primary: '#5865F2',
    bg: '#5865F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  lemon8: {
    label: 'Lemon8',
    primary: '#FFE033',
    bg: '#FFE033',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#000" fontWeight="bold">L8</text>
      </svg>
    ),
  },
  reddit: {
    label: 'Reddit',
    primary: '#FF4500',
    bg: '#FF4500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  redgifs: {
    label: 'RedGIFs',
    primary: '#E8001D',
    bg: '#E8001D',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
  },
};

// ─── Demo data generators ────────────────────────────────────────────────────

function generateTimeSeries(points, base, variance, trend = 0) {
  const result = [];
  let current = base;
  for (let i = 0; i < points; i++) {
    current = Math.max(0, current + trend + (Math.random() - 0.5) * variance);
    result.push(Math.round(current));
  }
  return result;
}

function generatePlatformData(timeRange) {
  const pointsMap = { '24h': 24, '7d': 7, '30d': 30, '90d': 90 };
  const pts = pointsMap[timeRange] || 7;

  return {
    tiktok: {
      followers: 284_500,
      followerDelta: +3200,
      views: 1_420_000,
      likes: 87_400,
      reach: 2_100_000,
      retention: 68.4,
      engagementRate: 6.15,
      series: generateTimeSeries(pts, 48000, 12000, 800),
    },
    instagram: {
      followers: 127_300,
      followerDelta: +890,
      views: 342_000,
      likes: 24_600,
      reach: 510_000,
      retention: 54.2,
      engagementRate: 4.87,
      series: generateTimeSeries(pts, 11000, 3500, 200),
    },
    facebook: {
      followers: 56_800,
      followerDelta: -120,
      views: 98_000,
      likes: 5_400,
      reach: 180_000,
      retention: 42.1,
      engagementRate: 2.31,
      series: generateTimeSeries(pts, 3200, 900, -30),
    },
    twitch: {
      followers: 18_900,
      followerDelta: +410,
      views: 64_000,
      likes: 9_800,
      reach: 74_000,
      retention: 78.9,
      engagementRate: 15.3,
      series: generateTimeSeries(pts, 2100, 700, 50),
    },
    discord: {
      followers: 9_420,
      followerDelta: +310,
      views: 0,
      likes: 0,
      reach: 9_420,
      retention: 91.2,
      engagementRate: 22.4,
      series: generateTimeSeries(pts, 315, 80, 10),
    },
    lemon8: {
      followers: 34_100,
      followerDelta: +2100,
      views: 210_000,
      likes: 18_700,
      reach: 310_000,
      retention: 61.7,
      engagementRate: 8.93,
      series: generateTimeSeries(pts, 7000, 2200, 350),
    },
    reddit: {
      followers: 12_600,
      followerDelta: +540,
      views: 88_000,
      likes: 7_100,
      reach: 160_000,
      retention: 49.8,
      engagementRate: 8.07,
      series: generateTimeSeries(pts, 2900, 1100, 70),
    },
    redgifs: {
      followers: 8_300,
      followerDelta: +190,
      views: 520_000,
      likes: 31_200,
      reach: 540_000,
      retention: 55.6,
      engagementRate: 5.99,
      series: generateTimeSeries(pts, 17000, 5500, 100),
    },
  };
}

const DEMO_PROJECTS = [
  {
    id: 'proj-001',
    name: 'Nexus AI Core Engine',
    type: 'coding',
    language: 'TypeScript',
    status: 'active',
    progress: 72,
    commits: 847,
    linesChanged: 28_400,
    lastActivity: '2 hours ago',
    description: 'Multi-model AI orchestration layer with streaming support',
  },
  {
    id: 'proj-002',
    name: 'Galactic Siege',
    type: 'game',
    engine: 'Unity',
    status: 'active',
    progress: 38,
    commits: 214,
    linesChanged: 11_700,
    lastActivity: '1 day ago',
    description: 'Real-time strategy game with procedurally generated maps',
  },
  {
    id: 'proj-003',
    name: 'AR Spatial Mapper',
    type: 'ar-vr',
    engine: 'WebXR / Three.js',
    status: 'in-review',
    progress: 91,
    commits: 423,
    linesChanged: 16_200,
    lastActivity: '4 hours ago',
    description: '3D spatial mapping overlay for real-world environments',
  },
  {
    id: 'proj-004',
    name: 'Nexus Mobile SDK',
    type: 'coding',
    language: 'React Native',
    status: 'active',
    progress: 55,
    commits: 312,
    linesChanged: 9_800,
    lastActivity: '30 minutes ago',
    description: 'Cross-platform SDK for Nexus AI Pro mobile integrations',
  },
  {
    id: 'proj-005',
    name: 'VR Training Hub',
    type: 'ar-vr',
    engine: 'Unreal Engine 5',
    status: 'planning',
    progress: 12,
    commits: 28,
    linesChanged: 2_100,
    lastActivity: '3 days ago',
    description: 'Immersive VR onboarding and skill-development environment',
  },
  {
    id: 'proj-006',
    name: 'Dungeon Crawler 3D',
    type: 'game',
    engine: 'Godot 4',
    status: 'active',
    progress: 61,
    commits: 503,
    linesChanged: 19_500,
    lastActivity: '6 hours ago',
    description: 'Procedural 3D dungeon crawler with AI-driven enemy behavior',
  },
];

// ─── Helper utilities ────────────────────────────────────────────────────────

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatDelta(n) {
  if (n === 0) return '0';
  return (n > 0 ? '+' : '') + formatNumber(Math.abs(n));
}

function timeLabels(range) {
  const now = new Date();
  if (range === '24h') {
    return Array.from({ length: 24 }, (_, i) => {
      const h = new Date(now - (23 - i) * 3600 * 1000);
      return h.getHours() + ':00';
    });
  }
  if (range === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86400 * 1000);
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
  }
  if (range === '30d') {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * 86400 * 1000);
      return (d.getMonth() + 1) + '/' + d.getDate();
    });
  }
  // 90d — label every 10th
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(now - (89 - i) * 86400 * 1000);
    return i % 10 === 0 ? (d.getMonth() + 1) + '/' + d.getDate() : '';
  });
}

// ─── SVG Line/Area Chart ─────────────────────────────────────────────────────

function LineChart({ series, color, labels, height = 120, showGrid = true, filled = true }) {
  const W = 600;
  const H = height;
  const PAD = { top: 8, right: 8, bottom: 28, left: 42 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  const scaleX = (i) => PAD.left + (i / (series.length - 1)) * chartW;
  const scaleY = (v) => PAD.top + chartH - ((v - min) / range) * chartH;

  const pts = series.map((v, i) => [scaleX(i), scaleY(v)]);
  const linePath = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1][0]},${PAD.top + chartH} L${pts[0][0]},${PAD.top + chartH} Z`;

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount }, (_, i) => min + (range / (tickCount - 1)) * i);

  // Label sampling — show at most 8 labels to avoid crowding
  const labelStep = Math.max(1, Math.floor(labels.length / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {showGrid && yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={scaleY(tick)}
            x2={PAD.left + chartW} y2={scaleY(tick)}
            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
          />
          <text
            x={PAD.left - 6} y={scaleY(tick) + 4}
            fontSize="10" fill="currentColor" fillOpacity="0.45"
            textAnchor="end" fontFamily="system-ui, sans-serif"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatNumber(tick)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      {filled && (
        <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      )}

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Last point dot */}
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="4" fill={color} stroke="var(--surface)" strokeWidth="2"
      />

      {/* X axis labels */}
      {labels.map((label, i) => {
        if (!label || i % labelStep !== 0) return null;
        return (
          <text
            key={i}
            x={scaleX(i)} y={H - 4}
            fontSize="9" fill="currentColor" fillOpacity="0.4"
            textAnchor="middle" fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Multi-series overlay chart ──────────────────────────────────────────────

function MultiLineChart({ seriesMap, labels, height = 180 }) {
  const W = 700;
  const H = height;
  const PAD = { top: 12, right: 16, bottom: 32, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allVals = Object.values(seriesMap).flat();
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  const len = Object.values(seriesMap)[0]?.length || 1;
  const scaleX = (i) => PAD.left + (i / (len - 1)) * chartW;
  const scaleY = (v) => PAD.top + chartH - ((v - min) / range) * chartH;

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount }, (_, i) => min + (range / (tickCount - 1)) * i);
  const labelStep = Math.max(1, Math.floor(labels.length / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      {/* Grid */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={scaleY(tick)}
            x2={PAD.left + chartW} y2={scaleY(tick)}
            stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
          />
          <text
            x={PAD.left - 6} y={scaleY(tick) + 4}
            fontSize="10" fill="currentColor" fillOpacity="0.4"
            textAnchor="end" fontFamily="system-ui, sans-serif"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatNumber(tick)}
          </text>
        </g>
      ))}

      {/* Series lines */}
      {Object.entries(seriesMap).map(([key, data]) => {
        const color = PLATFORMS[key]?.primary || '#888';
        const pts = data.map((v, i) => [scaleX(i), scaleY(v)]);
        const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
        return (
          <path key={key} d={path} fill="none" stroke={color} strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" strokeOpacity="0.85" />
        );
      })}

      {/* X labels */}
      {labels.map((label, i) => {
        if (!label || i % labelStep !== 0) return null;
        return (
          <text key={i} x={scaleX(i)} y={H - 6}
            fontSize="9" fill="currentColor" fillOpacity="0.38"
            textAnchor="middle" fontFamily="system-ui, sans-serif">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Radial progress ring ────────────────────────────────────────────────────

function ProgressRing({ value, max = 100, color, size = 48, strokeWidth = 4 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const offset = circ * (1 - pct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth={strokeWidth} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Bar chart (horizontal) ──────────────────────────────────────────────────

function HorizontalBarChart({ data, color }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '80px', fontSize: '11px', opacity: 0.6,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            flexShrink: 0, textAlign: 'right',
          }}>
            {item.label}
          </span>
          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(128,128,128,0.12)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(item.value / maxVal) * 100}%`,
              background: color,
              borderRadius: '4px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: '11px', opacity: 0.55, width: '40px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatNumber(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Metric tile ─────────────────────────────────────────────────────────────

function MetricTile({ label, value, delta, color, subtitle }) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0 || delta === undefined;
  return (
    <div className="metric-tile">
      <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {delta !== undefined && (
        <div style={{
          fontSize: '11px', marginTop: '3px',
          color: isNeutral ? undefined : isPositive ? '#22c55e' : '#ef4444',
          opacity: isNeutral ? 0.45 : 0.8,
        }}>
          {isNeutral ? '—' : (isPositive ? '▲ ' : '▼ ') + formatNumber(Math.abs(delta))}
          {subtitle && <span style={{ opacity: 0.5, marginLeft: '4px' }}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Platform card ────────────────────────────────────────────────────────────

function PlatformCard({ platformKey, data, labels, selected, onSelect, metric }) {
  const platform = PLATFORMS[platformKey];
  const metricValue = data[metric];

  return (
    <button
      onClick={() => onSelect(platformKey)}
      className={`platform-card ${selected ? 'platform-card--selected' : ''}`}
      style={{
        '--platform-color': platform.primary,
        textAlign: 'left', cursor: 'pointer',
        border: selected ? `1.5px solid ${platform.primary}` : undefined,
      }}
      aria-pressed={selected}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: platform.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: platformKey === 'lemon8' ? '#000' : '#fff', flexShrink: 0,
        }}>
          {platform.icon}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{platform.label}</div>
          <div style={{ fontSize: '11px', opacity: 0.45 }}>
            {formatNumber(data.followers)} followers
          </div>
        </div>
        <div style={{
          marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
          color: data.followerDelta >= 0 ? '#22c55e' : '#ef4444',
          opacity: 0.85,
        }}>
          {formatDelta(data.followerDelta)}
        </div>
      </div>

      {/* Mini chart */}
      <div style={{ marginBottom: '10px' }}>
        <LineChart
          series={data.series}
          color={platform.primary}
          labels={labels}
          height={64}
          showGrid={false}
          filled={true}
        />
      </div>

      {/* Key stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div className="mini-stat">
          <div style={{ fontSize: '10px', opacity: 0.45 }}>Engagement</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: platform.primary }}>
            {data.engagementRate.toFixed(1)}%
          </div>
        </div>
        <div className="mini-stat">
          <div style={{ fontSize: '10px', opacity: 0.45 }}>Retention</div>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>{data.retention.toFixed(1)}%</div>
        </div>
        <div className="mini-stat">
          <div style={{ fontSize: '10px', opacity: 0.45 }}>Views</div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{formatNumber(data.views)}</div>
        </div>
        <div className="mini-stat">
          <div style={{ fontSize: '10px', opacity: 0.45 }}>Reach</div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{formatNumber(data.reach)}</div>
        </div>
      </div>
    </button>
  );
}

// ─── Project card ────────────────────────────────────────────────────────────

const PROJECT_TYPE_META = {
  coding: { label: 'Code', color: '#38bdf8', icon: '⌨' },
  game: { label: 'Game Dev', color: '#a78bfa', icon: '🎮' },
  'ar-vr': { label: 'AR/VR/3D', color: '#34d399', icon: '🥽' },
};

const PROJECT_STATUS_META = {
  active: { label: 'Active', color: '#22c55e' },
  'in-review': { label: 'In Review', color: '#f59e0b' },
  planning: { label: 'Planning', color: '#94a3b8' },
  paused: { label: 'Paused', color: '#ef4444' },
};

function ProjectCard({ project }) {
  const typeMeta = PROJECT_TYPE_META[project.type] || PROJECT_TYPE_META.coding;
  const statusMeta = PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.active;

  return (
    <div className="project-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: typeMeta.color + '22',
          border: `1px solid ${typeMeta.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          {typeMeta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.5 }}>
            {project.language || project.engine}
          </div>
        </div>
        <span style={{
          fontSize: '10px', padding: '2px 8px', borderRadius: '99px', flexShrink: 0,
          background: statusMeta.color + '22',
          color: statusMeta.color,
          fontWeight: 600, letterSpacing: '0.03em',
        }}>
          {statusMeta.label}
        </span>
      </div>

      <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '10px', lineHeight: 1.4 }}>
        {project.description}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>
          <span>Progress</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{project.progress}%</span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(128,128,128,0.15)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            background: typeMeta.color,
            width: `${project.progress}%`,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {[
          { label: 'Commits', value: project.commits.toLocaleString() },
          { label: 'Lines Δ', value: formatNumber(project.linesChanged) },
          { label: 'Last active', value: project.lastActivity },
        ].map((stat) => (
          <div key={stat.label}>
            <div style={{ fontSize: '10px', opacity: 0.4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{stat.label}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Connection status badge ──────────────────────────────────────────────────

function ConnectionBadge({ status }) {
  const cfg = {
    connected: { color: '#22c55e', label: 'Live' },
    connecting: { color: '#f59e0b', label: 'Connecting…' },
    disconnected: { color: '#ef4444', label: 'Offline' },
    demo: { color: '#94a3b8', label: 'Demo data' },
  }[status] || { color: '#94a3b8', label: status };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', opacity: 0.7 }}>
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: cfg.color,
        boxShadow: status === 'connected' ? `0 0 0 3px ${cfg.color}33` : 'none',
      }} />
      {cfg.label}
    </span>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportCSV(platformData, timeRange) {
  const rows = [['Platform', 'Followers', 'Follower Delta', 'Views', 'Likes', 'Reach', 'Retention %', 'Engagement %']];
  Object.entries(platformData).forEach(([key, data]) => {
    rows.push([
      PLATFORMS[key]?.label || key,
      data.followers,
      data.followerDelta,
      data.views,
      data.likes,
      data.reach,
      data.retention,
      data.engagementRate,
    ]);
  });
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexus-analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(platformData, timeRange) {
  const payload = {
    exportedAt: new Date().toISOString(),
    timeRange,
    platforms: platformData,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexus-analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TIME_RANGES = ['24h', '7d', '30d', '90d'];
const METRIC_OPTIONS = [
  { key: 'views', label: 'Views' },
  { key: 'likes', label: 'Likes' },
  { key: 'reach', label: 'Reach' },
  { key: 'followers', label: 'Followers' },
];
const SECTION_TABS = ['Overview', 'Social', 'Projects', 'Combined'];

function AnalyticsDashboard({ darkMode = false, user = null }) {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set(['tiktok', 'instagram', 'facebook']));
  const [platformData, setPlatformData] = useState(() => generatePlatformData('7d'));
  const [wsStatus, setWsStatus] = useState('demo');
  const [activeSection, setActiveSection] = useState('Overview');
  const [projectFilter, setProjectFilter] = useState('all');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [liveFlash, setLiveFlash] = useState(null);

  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const exportMenuRef = useRef(null);

  // ── WebSocket connection
  const connectWS = useCallback(() => {
    // Avoid double-connecting
    if (wsRef.current && wsRef.current.readyState < 2) return;

    setWsStatus('connecting');

    try {
      // Attempt socket.io or raw WS; falls back to demo mode on failure
      const wsUrl = typeof window !== 'undefined'
        ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/analytics'
        : null;

      if (!wsUrl) {
        setWsStatus('demo');
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        ws.send(JSON.stringify({ type: 'subscribe', timeRange }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'analytics_update' && msg.data) {
            setPlatformData((prev) => {
              const next = { ...prev };
              Object.entries(msg.data).forEach(([key, delta]) => {
                if (next[key]) {
                  next[key] = { ...next[key], ...delta };
                }
              });
              return next;
            });
            setLastUpdated(new Date());
            setLiveFlash(Date.now());
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        setWsStatus('demo');
        ws.close();
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          setWsStatus('disconnected');
          // retry after 5 s
          retryRef.current = setTimeout(() => {
            if (document.visibilityState !== 'hidden') connectWS();
          }, 5000);
        }
      };
    } catch {
      setWsStatus('demo');
    }
  }, [timeRange]);

  useEffect(() => {
    connectWS();
    return () => {
      clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWS]);

  // ── Regenerate demo data when time range changes
  useEffect(() => {
    const fresh = generatePlatformData(timeRange);
    setPlatformData(fresh);
    setLastUpdated(new Date());
    // Re-subscribe if connected
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', timeRange }));
    }
  }, [timeRange]);

  // ── Simulate live ticks in demo mode
  useEffect(() => {
    if (wsStatus !== 'demo') return;
    const id = setInterval(() => {
      setPlatformData((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          const tick = Math.round((Math.random() - 0.45) * 500);
          const newSeries = [...next[key].series];
          newSeries[newSeries.length - 1] = Math.max(0, newSeries[newSeries.length - 1] + tick);
          next[key] = {
            ...next[key],
            series: newSeries,
            views: Math.max(0, next[key].views + Math.round((Math.random() - 0.4) * 200)),
          };
        });
        return next;
      });
      setLastUpdated(new Date());
      setLiveFlash(Date.now());
    }, 4000);
    return () => clearInterval(id);
  }, [wsStatus]);

  // ── Close export menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const labels = timeLabels(timeRange);

  const togglePlatform = (key) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Aggregate totals
  const totals = Object.values(platformData).reduce(
    (acc, d) => ({
      followers: acc.followers + d.followers,
      views: acc.views + d.views,
      likes: acc.likes + d.likes,
      reach: acc.reach + d.reach,
    }),
    { followers: 0, views: 0, likes: 0, reach: 0 }
  );

  const avgEngagement = (
    Object.values(platformData).reduce((a, d) => a + d.engagementRate, 0) /
    Object.keys(platformData).length
  ).toFixed(2);

  const avgRetention = (
    Object.values(platformData).reduce((a, d) => a + d.retention, 0) /
    Object.keys(platformData).length
  ).toFixed(1);

  const filteredProjects =
    projectFilter === 'all'
      ? DEMO_PROJECTS
      : DEMO_PROJECTS.filter((p) => p.type === projectFilter);

  const combinedSeriesMap = {};
  Array.from(selectedPlatforms).forEach((key) => {
    combinedSeriesMap[key] = platformData[key]?.series || [];
  });

  // Engagement bar chart data
  const engagementBars = Object.entries(platformData)
    .map(([key, d]) => ({ label: PLATFORMS[key]?.label || key, value: d.engagementRate }))
    .sort((a, b) => b.value - a.value);

  return (
    <div
      className={`analytics-root ${darkMode ? 'analytics-dark' : 'analytics-light'}`}
      data-theme={darkMode ? 'dark' : 'light'}
    >
      <style>{`
        .analytics-root {
          --bg: #f8f9fc;
          --surface: #ffffff;
          --surface2: #f1f3f8;
          --border: rgba(0,0,0,0.08);
          --text: #0f1117;
          --text-muted: rgba(15,17,23,0.5);
          --accent: #6366f1;
          --accent-muted: rgba(99,102,241,0.12);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          font-size: 14px;
          color: var(--text);
          background: var(--bg);
          min-height: 100vh;
        }
        .analytics-root.analytics-dark,
        .analytics-root[data-theme="dark"] {
          --bg: #0b0d12;
          --surface: #141720;
          --surface2: #1c2030;
          --border: rgba(255,255,255,0.07);
          --text: #e8eaf2;
          --text-muted: rgba(232,234,242,0.45);
          --accent: #818cf8;
          --accent-muted: rgba(129,140,248,0.12);
        }
        .analytics-root *,
        .analytics-root *::before,
        .analytics-root *::after { box-sizing: border-box; }
        .analytics-root button {
          background: none;
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          border-radius: 8px;
          padding: 6px 14px;
          transition: background 0.15s, border-color 0.15s;
        }
        .analytics-root button:hover { background: var(--surface2); }
        .analytics-root button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .analytics-root button.active {
          background: var(--accent-muted);
          border-color: var(--accent);
          color: var(--accent);
          font-weight: 600;
        }
        .dashboard-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          position: sticky;
          top: 0;
          z-index: 40;
          flex-wrap: wrap;
        }
        .dashboard-title {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-spacer { flex: 1; }
        .section-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border);
          padding: 0 20px;
          background: var(--surface);
          overflow-x: auto;
        }
        .section-tab {
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          border: none;
          border-bottom: 2px solid transparent;
          border-radius: 0;
          cursor: pointer;
          background: none;
          color: var(--text-muted);
          white-space: nowrap;
          transition: color 0.15s, border-color 0.15s;
        }
        .section-tab:hover { color: var(--text); background: none; }
        .section-tab.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
          background: none;
        }
        .dashboard-body {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .summary-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .summary-card .label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .summary-card .value {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .summary-card .sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .platform-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .platform-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
        }
        .platform-card:hover {
          border-color: var(--platform-color, var(--accent));
          box-shadow: 0 2px 16px rgba(0,0,0,0.06);
        }
        .platform-card--selected {
          box-shadow: 0 0 0 1px var(--platform-color, var(--accent));
        }
        .mini-stat {
          padding: 6px 8px;
          background: var(--surface2);
          border-radius: 7px;
        }
        .metric-tile {
          padding: 14px 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        .chart-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 20px;
        }
        .chart-card-title {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.7;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .project-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .project-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          transition: box-shadow 0.2s;
        }
        .project-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
        }
        .filter-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          align-items: center;
        }
        .export-menu-wrap {
          position: relative;
        }
        .export-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          min-width: 160px;
          z-index: 100;
          overflow: hidden;
        }
        .export-menu button {
          width: 100%;
          border: none;
          border-radius: 0;
          text-align: left;
          padding: 10px 16px;
          font-size: 13px;
        }
        .export-menu button:hover { background: var(--surface2); }
        .legend-dot {
          width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0;
        }
        .flash-indicator {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          margin-left: 4px;
          animation: pulse-dot 1s ease-out;
        }
        @keyframes pulse-dot {
          0% { opacity: 1; transform: scale(1.5); }
          100% { opacity: 0.6; transform: scale(1); }
        }
        @media (max-width: 640px) {
          .dashboard-header { padding: 12px 16px; }
          .dashboard-body { padding: 16px; }
          .platform-grid { grid-template-columns: 1fr 1fr; }
          .summary-grid { grid-template-columns: repeat(3, 1fr); }
          .project-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 400px) {
          .platform-grid { grid-template-columns: 1fr; }
          .summary-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Nexus Analytics
        </div>

        <ConnectionBadge status={wsStatus} />
        {liveFlash && <span key={liveFlash} className="flash-indicator" />}

        <div className="header-spacer" />

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        {/* Time range */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {TIME_RANGES.map((r) => (
            <button key={r} className={timeRange === r ? 'active' : ''} onClick={() => setTimeRange(r)}
              style={{ padding: '4px 10px', fontSize: '12px' }}>
              {r}
            </button>
          ))}
        </div>

        {/* Export */}
        <div className="export-menu-wrap" ref={exportMenuRef}>
          <button onClick={() => setExportMenuOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          {exportMenuOpen && (
            <div className="export-menu">
              <button onClick={() => { exportCSV(platformData, timeRange); setExportMenuOpen(false); }}>
                Download CSV
              </button>
              <button onClick={() => { exportJSON(platformData, timeRange); setExportMenuOpen(false); }}>
                Download JSON
              </button>
            </div>
          )}
        </div>

        {user && (
          <div style={{ fontSize: '12px', opacity: 0.5, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name || user.email || 'User'}
          </div>
        )}
      </header>

      {/* ── Section tabs ── */}
      <div className="section-tabs" role="tablist">
        {SECTION_TABS.map((tab) => (
          <button key={tab} role="tab" aria-selected={activeSection === tab}
            className={`section-tab ${activeSection === tab ? 'active' : ''}`}
            onClick={() => setActiveSection(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <main className="dashboard-body">

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
        {activeSection === 'Overview' && (
          <>
            {/* Summary tiles */}
            <div className="summary-grid">
              {[
                { label: 'Total Followers', value: formatNumber(totals.followers), color: 'var(--accent)', sub: 'across all platforms' },
                { label: 'Total Views', value: formatNumber(totals.views), color: '#38bdf8', sub: `last ${timeRange}` },
                { label: 'Total Likes', value: formatNumber(totals.likes), color: '#f472b6', sub: `last ${timeRange}` },
                { label: 'Total Reach', value: formatNumber(totals.reach), color: '#34d399', sub: `last ${timeRange}` },
                { label: 'Avg Engagement', value: avgEngagement + '%', color: '#fb923c', sub: 'all platforms' },
                { label: 'Avg Retention', value: avgRetention + '%', color: '#a78bfa', sub: 'all platforms' },
              ].map((item) => (
                <div key={item.label} className="summary-card">
                  <div className="label">{item.label}</div>
                  <div className="value" style={{ color: item.color }}>{item.value}</div>
                  <div className="sub">{item.sub}</div>
                </div>
              ))}
            </div>

            {/* Engagement by platform */}
            <div className="chart-card">
              <div className="chart-card-title">
                <span>Engagement Rate by Platform</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>% engagement</span>
              </div>
              <HorizontalBarChart
                data={engagementBars.map((d) => ({ label: d.label, value: d.value }))}
                color="var(--accent)"
              />
            </div>

            {/* Retention rings */}
            <div className="chart-card">
              <div className="chart-card-title">
                <span>Audience Retention</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>% retained</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {Object.entries(platformData).map(([key, data]) => {
                  const platform = PLATFORMS[key];
                  return (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '56px' }}>
                      <div style={{ position: 'relative' }}>
                        <ProgressRing value={data.retention} max={100} color={platform.primary} size={52} strokeWidth={4.5} />
                        <div style={{
                          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                          fontSize: '10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        }}>
                          {data.retention.toFixed(0)}%
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.5, textAlign: 'center' }}>{platform.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ══ SOCIAL ════════════════════════════════════════════════════════ */}
        {activeSection === 'Social' && (
          <>
            {/* Metric selector */}
            <div className="filter-bar">
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>Metric:</span>
              {METRIC_OPTIONS.map((m) => (
                <button key={m.key}
                  className={selectedMetric === m.key ? 'active' : ''}
                  onClick={() => setSelectedMetric(m.key)}
                  style={{ padding: '4px 12px', fontSize: '12px' }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Platform cards */}
            <div className="platform-grid">
              {Object.keys(PLATFORMS).map((key) => (
                <PlatformCard
                  key={key}
                  platformKey={key}
                  data={platformData[key]}
                  labels={labels}
                  selected={selectedPlatforms.has(key)}
                  onSelect={togglePlatform}
                  metric={selectedMetric}
                />
              ))}
            </div>

            {/* Detailed metrics for selected platforms */}
            {selectedPlatforms.size > 0 && (
              <div className="chart-card">
                <div className="chart-card-title">
                  <span>Detailed Metrics — Selected Platforms</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                  {Array.from(selectedPlatforms).map((key) => {
                    const data = platformData[key];
                    const platform = PLATFORMS[key];
                    return (
                      <div key={key} style={{
                        padding: '12px', borderRadius: '10px',
                        border: `1px solid ${platform.primary}33`,
                        background: platform.primary + '0a',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <span style={{ color: platform.primary, lineHeight: 0 }}>{platform.icon}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{platform.label}</span>
                        </div>
                        {[
                          ['Views', formatNumber(data.views)],
                          ['Likes', formatNumber(data.likes)],
                          ['Reach', formatNumber(data.reach)],
                          ['Followers', formatNumber(data.followers)],
                          ['Engagement', data.engagementRate.toFixed(2) + '%'],
                          ['Retention', data.retention.toFixed(1) + '%'],
                        ].map(([label, val]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span style={{ opacity: 0.5 }}>{label}</span>
                            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ PROJECTS ══════════════════════════════════════════════════════ */}
        {activeSection === 'Projects' && (
          <>
            <div className="filter-bar">
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>Filter:</span>
              {[
                { key: 'all', label: 'All' },
                { key: 'coding', label: 'Code' },
                { key: 'game', label: 'Game Dev' },
                { key: 'ar-vr', label: 'AR/VR/3D' },
              ].map((f) => (
                <button key={f.key}
                  className={projectFilter === f.key ? 'active' : ''}
                  onClick={() => setProjectFilter(f.key)}
                  style={{ padding: '4px 12px', fontSize: '12px' }}>
                  {f.label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="project-grid">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Project summary */}
            <div className="chart-card" style={{ marginTop: '20px' }}>
              <div className="chart-card-title"><span>Project Activity Summary</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                {Object.entries(PROJECT_TYPE_META).map(([type, meta]) => {
                  const typeProjects = DEMO_PROJECTS.filter((p) => p.type === type);
                  const avgProgress = Math.round(typeProjects.reduce((a, p) => a + p.progress, 0) / typeProjects.length);
                  const totalCommits = typeProjects.reduce((a, p) => a + p.commits, 0);
                  return (
                    <div key={type} style={{
                      padding: '12px', borderRadius: '10px',
                      background: meta.color + '12',
                      border: `1px solid ${meta.color}30`,
                    }}>
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{meta.icon}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: meta.color }}>{meta.label}</div>
                      <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>{typeProjects.length} projects</div>
                      <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>Avg progress: {avgProgress}%</div>
                      <div style={{ fontSize: '11px', opacity: 0.6 }}>{totalCommits.toLocaleString()} commits</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ══ COMBINED ══════════════════════════════════════════════════════ */}
        {activeSection === 'Combined' && (
          <>
            {/* Platform toggles */}
            <div className="filter-bar">
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>Platforms:</span>
              {Object.keys(PLATFORMS).map((key) => {
                const platform = PLATFORMS[key];
                const active = selectedPlatforms.has(key);
                return (
                  <button key={key}
                    onClick={() => togglePlatform(key)}
                    style={{
                      padding: '4px 10px', fontSize: '11px',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      borderColor: active ? platform.primary : undefined,
                      background: active ? platform.primary + '18' : undefined,
                      color: active ? platform.primary : undefined,
                    }}>
                    <span className="legend-dot" style={{ background: platform.primary }} />
                    {platform.label}
                  </button>
                );
              })}
            </div>

            {/* Multi-line chart */}
            <div className="chart-card">
              <div className="chart-card-title">
                <span>Combined Activity — {timeRange}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {Array.from(selectedPlatforms).map((key) => (
                    <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', opacity: 0.7 }}>
                      <span className="legend-dot" style={{ background: PLATFORMS[key].primary }} />
                      {PLATFORMS[key].label}
                    </span>
                  ))}
                </div>
              </div>
              <MultiLineChart seriesMap={combinedSeriesMap} labels={labels} height={200} />
            </div>

            {/* Per-platform sparklines */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {Array.from(selectedPlatforms).map((key) => {
                const data = platformData[key];
                const platform = PLATFORMS[key];
                return (
                  <div key={key} className="chart-card" style={{ marginBottom: 0 }}>
                    <div className="chart-card-title" style={{ marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: platform.primary }}>
                        {platform.icon}
                        <span style={{ color: 'var(--text)', opacity: 0.7 }}>{platform.label}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {data.engagementRate.toFixed(1)}% eng.
                      </span>
                    </div>
                    <LineChart
                      series={data.series}
                      color={platform.primary}
                      labels={labels}
                      height={80}
                      showGrid={false}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', opacity: 0.5 }}>
                      <span>{formatNumber(data.views)} views</span>
                      <span>{formatNumber(data.followers)} followers</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aggregate totals row */}
            <div className="chart-card">
              <div className="chart-card-title"><span>Aggregated Totals — All Platforms</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Followers', value: totals.followers, color: 'var(--accent)' },
                  { label: 'Views', value: totals.views, color: '#38bdf8' },
                  { label: 'Likes', value: totals.likes, color: '#f472b6' },
                  { label: 'Reach', value: totals.reach, color: '#34d399' },
                ].map((item) => (
                  <MetricTile
                    key={item.label}
                    label={item.label}
                    value={formatNumber(item.value)}
                    color={item.color}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AnalyticsDashboard;
