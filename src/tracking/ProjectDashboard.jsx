import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Code2, Gamepad2, Box, Layers,
  CheckCircle2, PauseCircle, XCircle, Archive,
  GitCommit, Bug, Users, User,
  Trophy, Award, Filter, Plus,
  LayoutGrid, LayoutList, RefreshCw, Search,
  Wifi, WifiOff, Eye, Monitor,
  BarChart3, Activity, Zap, X,
  Clock, AlertCircle, ChevronDown,
  Cpu, Rocket, Target, Star,
  Smartphone, GitPullRequest,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// THEME COLORS
// ─────────────────────────────────────────────────────────────────
const getColors = (theme) => {
  const d = theme === 'dark';
  return {
    bg:         d ? '#07111f' : '#eef2f7',
    surface:    d ? '#0d1b2e' : '#ffffff',
    surface2:   d ? '#122034' : '#f5f8fc',
    surface3:   d ? '#182840' : '#eaf0f8',
    border:     d ? '#1c3354' : '#d8e4f0',
    text:       d ? '#d8eaf8' : '#0c1929',
    textMuted:  d ? '#6e92b0' : '#3d5a76',
    textSubtle: d ? '#2e4d6a' : '#8fb0cc',
    accent:     '#5b6cf9',
    accentHover:d ? '#818cf8' : '#4338ca',
    accentBg:   d ? 'rgba(91,108,249,0.13)' : 'rgba(91,108,249,0.07)',
    success:    '#22c55e',
    successBg:  d ? 'rgba(34,197,94,0.13)' : 'rgba(34,197,94,0.08)',
    warning:    '#f59e0b',
    warningBg:  d ? 'rgba(245,158,11,0.13)' : 'rgba(245,158,11,0.08)',
    danger:     '#ef4444',
    dangerBg:   d ? 'rgba(239,68,68,0.13)' : 'rgba(239,68,68,0.08)',
    info:       '#3b82f6',
    infoBg:     d ? 'rgba(59,130,246,0.13)' : 'rgba(59,130,246,0.08)',
    shadow:     d ? '0 4px 28px rgba(0,0,0,0.5)' : '0 4px 28px rgba(0,0,0,0.07)',
    shadowSm:   d ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.05)',
    inputBg:    d ? '#0d1b2e' : '#f0f5fb',
  };
};

// ─────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────
const now = Date.now();
const ago = (ms) => new Date(now - ms).toISOString();

const MOCK_PROJECTS = [
  {
    id: 'p1', name: 'NexusCore API', type: 'coding', status: 'active', stage: 'in-progress',
    description: 'Core REST API powering the Nexus AI platform with multi-tenant support.',
    progress: 68, language: 'TypeScript',
    techStack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
    team: [
      { id: 'u1', name: 'Alex Chen',    initials: 'AC', color: '#6366f1' },
      { id: 'u2', name: 'Blake Kim',    initials: 'BK', color: '#22c55e' },
      { id: 'u3', name: 'Casey Davis',  initials: 'CD', color: '#f59e0b' },
      { id: 'u4', name: 'Drew Park',    initials: 'DP', color: '#3b82f6' },
    ],
    commitsToday: 14, commitsWeek: 67, buildStatus: 'passing',
    linesOfCode: 24850, openIssues: 8,
    milestones: { total: 5, completed: 3, current: 'Auth System' },
    lastUpdated: ago(2 * 3600000), vrPlatforms: [], engine: null,
  },
  {
    id: 'p2', name: 'CyberRealms Online', type: 'game', status: 'active', stage: 'in-progress',
    description: 'Open-world MMO built on Unreal Engine 5 with procedural terrain generation.',
    progress: 45, language: 'C++',
    techStack: ['Unreal Engine 5', 'C++', 'Blueprints', 'Perforce'],
    team: [
      { id: 'u2', name: 'Blake Kim',    initials: 'BK', color: '#22c55e' },
      { id: 'u5', name: 'Eva Russo',    initials: 'ER', color: '#ec4899' },
      { id: 'u6', name: 'Finn Müller',  initials: 'FM', color: '#8b5cf6' },
      { id: 'u7', name: 'Grace Yao',    initials: 'GY', color: '#06b6d4' },
      { id: 'u8', name: 'Hugo Silva',   initials: 'HS', color: '#f97316' },
    ],
    commitsToday: 9, commitsWeek: 41, buildStatus: 'passing',
    linesOfCode: 182400, openIssues: 23,
    milestones: { total: 8, completed: 3, current: 'World Gen Beta' },
    lastUpdated: ago(45 * 60000), vrPlatforms: [], engine: 'unreal',
  },
  {
    id: 'p3', name: 'HoloWorld AR', type: 'arvr', status: 'active', stage: 'review',
    description: 'Cross-platform AR experience using WebXR with spatial mapping and hand tracking.',
    progress: 78, language: 'JavaScript',
    techStack: ['WebXR', 'Three.js', 'A-Frame', 'Node.js', 'Blender'],
    team: [
      { id: 'u1', name: 'Alex Chen',    initials: 'AC', color: '#6366f1' },
      { id: 'u5', name: 'Eva Russo',    initials: 'ER', color: '#ec4899' },
      { id: 'u9', name: 'Iris Nakamura',initials: 'IN', color: '#10b981' },
    ],
    commitsToday: 6, commitsWeek: 29, buildStatus: 'passing',
    linesOfCode: 31700, openIssues: 4,
    milestones: { total: 4, completed: 3, current: 'Release Candidate' },
    lastUpdated: ago(3 * 3600000),
    vrPlatforms: ['meta-quest', 'apple-vision-pro', 'hololens'],
    engine: null,
  },
  {
    id: 'p4', name: 'DataForge CLI', type: 'coding', status: 'completed', stage: 'done',
    description: 'High-performance data transformation CLI written in Rust with Go bindings.',
    progress: 100, language: 'Rust',
    techStack: ['Rust', 'Go', 'WASM', 'GitHub Actions'],
    team: [
      { id: 'u3', name: 'Casey Davis',  initials: 'CD', color: '#f59e0b' },
      { id: 'u4', name: 'Drew Park',    initials: 'DP', color: '#3b82f6' },
    ],
    commitsToday: 0, commitsWeek: 2, buildStatus: 'passing',
    linesOfCode: 19200, openIssues: 0,
    milestones: { total: 5, completed: 5, current: 'v2.0 shipped' },
    lastUpdated: ago(5 * 86400000), vrPlatforms: [], engine: null,
  },
  {
    id: 'p5', name: 'NexusChat SDK', type: 'coding', status: 'active', stage: 'review',
    description: 'Real-time messaging SDK with E2E encryption for web, iOS, and Android.',
    progress: 55, language: 'JavaScript',
    techStack: ['JavaScript', 'Python', 'Socket.IO', 'WebRTC', 'Swift', 'Kotlin'],
    team: [
      { id: 'u1', name: 'Alex Chen',    initials: 'AC', color: '#6366f1' },
      { id: 'u6', name: 'Finn Müller',  initials: 'FM', color: '#8b5cf6' },
      { id: 'u8', name: 'Hugo Silva',   initials: 'HS', color: '#f97316' },
    ],
    commitsToday: 11, commitsWeek: 53, buildStatus: 'failing',
    linesOfCode: 41300, openIssues: 17,
    milestones: { total: 6, completed: 3, current: 'iOS Parity' },
    lastUpdated: ago(1 * 3600000), vrPlatforms: [], engine: null,
  },
  {
    id: 'p6', name: 'PixelKingdom', type: 'game', status: 'paused', stage: 'backlog',
    description: 'Retro-style 2D RPG crafted in Godot 4 with procedurally generated dungeons.',
    progress: 22, language: 'GDScript',
    techStack: ['Godot 4', 'GDScript', 'Aseprite'],
    team: [
      { id: 'u7', name: 'Grace Yao',    initials: 'GY', color: '#06b6d4' },
      { id: 'u9', name: 'Iris Nakamura',initials: 'IN', color: '#10b981' },
    ],
    commitsToday: 0, commitsWeek: 3, buildStatus: 'pending',
    linesOfCode: 8600, openIssues: 12,
    milestones: { total: 4, completed: 0, current: 'Combat Demo' },
    lastUpdated: ago(3 * 86400000), vrPlatforms: [], engine: 'godot',
  },
  {
    id: 'p7', name: 'Nexus VR Studio', type: 'arvr', status: 'active', stage: 'in-progress',
    description: 'Immersive VR collaboration environment built on Unity XR for remote teams.',
    progress: 61, language: 'C#',
    techStack: ['Unity XR', 'C#', 'OpenXR', 'Photon', 'Maya'],
    team: [
      { id: 'u2', name: 'Blake Kim',    initials: 'BK', color: '#22c55e' },
      { id: 'u5', name: 'Eva Russo',    initials: 'ER', color: '#ec4899' },
      { id: 'u6', name: 'Finn Müller',  initials: 'FM', color: '#8b5cf6' },
      { id: 'u7', name: 'Grace Yao',    initials: 'GY', color: '#06b6d4' },
    ],
    commitsToday: 7, commitsWeek: 38, buildStatus: 'pending',
    linesOfCode: 56200, openIssues: 9,
    milestones: { total: 5, completed: 3, current: 'Multi-user Sync' },
    lastUpdated: ago(4 * 3600000),
    vrPlatforms: ['meta-quest', 'steamvr', 'psvr'],
    engine: 'unity',
  },
  {
    id: 'p8', name: 'CodePilot AI', type: 'general', status: 'paused', stage: 'backlog',
    description: 'AI-powered code review and suggestion engine using transformer models.',
    progress: 35, language: 'Python',
    techStack: ['Python', 'PyTorch', 'FastAPI', 'Redis', 'Kubernetes'],
    team: [
      { id: 'u3', name: 'Casey Davis',  initials: 'CD', color: '#f59e0b' },
      { id: 'u4', name: 'Drew Park',    initials: 'DP', color: '#3b82f6' },
      { id: 'u8', name: 'Hugo Silva',   initials: 'HS', color: '#f97316' },
    ],
    commitsToday: 0, commitsWeek: 7, buildStatus: 'failing',
    linesOfCode: 14900, openIssues: 21,
    milestones: { total: 6, completed: 2, current: 'Model Fine-tune' },
    lastUpdated: ago(2 * 86400000), vrPlatforms: [], engine: null,
  },
  {
    id: 'p9', name: 'UnrealViz Pro', type: 'arvr', status: 'active', stage: 'in-progress',
    description: 'Architectural visualization tool for Unreal Engine VR walkthroughs.',
    progress: 52, language: 'C++',
    techStack: ['Unreal Engine 5', 'C++', 'Blueprints', 'Blender', 'Substance'],
    team: [
      { id: 'u5', name: 'Eva Russo',    initials: 'ER', color: '#ec4899' },
      { id: 'u9', name: 'Iris Nakamura',initials: 'IN', color: '#10b981' },
    ],
    commitsToday: 5, commitsWeek: 22, buildStatus: 'passing',
    linesOfCode: 37800, openIssues: 6,
    milestones: { total: 4, completed: 2, current: 'RT Lighting Pass' },
    lastUpdated: ago(6 * 3600000),
    vrPlatforms: ['steamvr', 'meta-quest'],
    engine: 'unreal',
  },
];

const MOCK_COMMITS = [
  { id: 'c1', hash: 'a3f9b12', message: 'feat: add OAuth2 middleware', author: 'AC', project: 'NexusCore API',     time: ago(8  * 60000) },
  { id: 'c2', hash: 'b7d4e51', message: 'fix: terrain LOD transition',  author: 'BK', project: 'CyberRealms',      time: ago(14 * 60000) },
  { id: 'c3', hash: 'c2a8f73', message: 'chore: update WebXR polyfill', author: 'ER', project: 'HoloWorld AR',      time: ago(21 * 60000) },
  { id: 'c4', hash: 'd6e1c90', message: 'perf: batch socket emissions',  author: 'AC', project: 'NexusChat SDK',    time: ago(35 * 60000) },
  { id: 'c5', hash: 'e5b3d44', message: 'feat: hand tracking gestures',  author: 'IN', project: 'HoloWorld AR',     time: ago(47 * 60000) },
  { id: 'c6', hash: 'f0c7a29', message: 'fix: physics jitter in combat', author: 'GY', project: 'CyberRealms',      time: ago(58 * 60000) },
  { id: 'c7', hash: 'g1d5f83', message: 'refactor: VR locomotion system',author: 'FM', project: 'Nexus VR Studio', time: ago(72 * 60000) },
  { id: 'c8', hash: 'h4a2e61', message: 'docs: update API endpoint spec', author: 'DP', project: 'NexusCore API',  time: ago(91 * 60000) },
  { id: 'c9', hash: 'i9c6b07', message: 'test: add integration coverage', author: 'CD', project: 'NexusCore API', time: ago(105 * 60000) },
  { id: 'c10',hash: 'j2f8d35', message: 'feat: multi-user voice rooms',  author: 'BK', project: 'Nexus VR Studio', time: ago(118 * 60000) },
];

const ENGINE_CONNECTORS = [
  { id: 'unreal', name: 'Unreal Engine 5', version: '5.4.1', icon: Cpu,   color: '#0472d4' },
  { id: 'unity',  name: 'Unity 2023 LTS',  version: '2023.3', icon: Layers, color: '#222c37' },
  { id: 'godot',  name: 'Godot 4.x',       version: '4.2.2', icon: Box,   color: '#478cbf' },
];

const VR_PLATFORMS = [
  { id: 'meta-quest',       name: 'Meta Quest',      icon: Smartphone, color: '#0064e1' },
  { id: 'steamvr',          name: 'SteamVR',         icon: Monitor,    color: '#00adee' },
  { id: 'psvr',             name: 'PlayStation VR2', icon: Activity,   color: '#003791' },
  { id: 'apple-vision-pro', name: 'Apple Vision Pro',icon: Eye,        color: '#555555' },
  { id: 'hololens',         name: 'HoloLens 2',      icon: Target,     color: '#0078d4' },
];

const ACHIEVEMENT_DEFS = [
  { id: 'first-launch', name: 'First Launch',    desc: 'Created your first project',         icon: Rocket,        color: '#6366f1', xp: 50,
    condition: (p) => p.length > 0 },
  { id: 'shipped-3',    name: 'Shipping Pro',    desc: 'Shipped 3 or more projects',          icon: Zap,           color: '#22c55e', xp: 150,
    condition: (p) => p.filter(x => x.status === 'completed').length >= 3 },
  { id: 'commits-100',  name: 'Century Club',    desc: 'A project hit 100+ commits this week',icon: GitCommit,     color: '#f59e0b', xp: 200,
    condition: (p) => p.some(x => x.commitsWeek >= 100) },
  { id: 'big-team',     name: 'Team Captain',    desc: 'Led a project with 5+ members',       icon: Users,         color: '#3b82f6', xp: 100,
    condition: (p) => p.some(x => x.team.length >= 5) },
  { id: 'loc-50k',      name: 'Code Machine',    desc: 'Crossed 50K lines of code',           icon: Code2,         color: '#8b5cf6', xp: 300,
    condition: (p) => p.reduce((s, x) => s + x.linesOfCode, 0) >= 50000 },
  { id: 'multi-type',   name: 'Renaissance Dev', desc: 'Active in 3+ different project types',icon: Star,          color: '#ec4899', xp: 250,
    condition: (p) => new Set(p.filter(x => x.status === 'active').map(x => x.type)).size >= 3 },
  { id: 'no-issues',    name: 'Bug Squasher',    desc: 'A project has zero open issues',      icon: Bug,           color: '#10b981', xp: 150,
    condition: (p) => p.some(x => x.openIssues === 0 && x.status === 'completed') },
  { id: 'vr-pioneer',   name: 'VR Pioneer',      desc: 'Shipped an AR/VR project',            icon: Eye,           color: '#06b6d4', xp: 200,
    condition: (p) => p.some(x => x.type === 'arvr' && x.status !== 'archived') },
];

const TECH_OPTIONS = {
  coding:  ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'C++', 'Swift', 'Java', 'C#', 'Ruby', 'Kotlin', 'Dart', 'Docker', 'Kubernetes'],
  game:    ['Unreal Engine 5', 'Unity', 'Godot 4', 'C++', 'C#', 'GDScript', 'Blueprints', 'Perforce', 'Git LFS'],
  arvr:    ['WebXR', 'Unity XR', 'Unreal VR', 'Three.js', 'A-Frame', 'OpenXR', 'Blender', 'Maya', 'Substance'],
  general: ['Docker', 'Kubernetes', 'Terraform', 'AWS', 'Azure', 'GCP', 'Python', 'Go', 'FastAPI', 'Redis'],
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function formatTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function getTypeIcon(type) {
  return { coding: Code2, game: Gamepad2, arvr: Eye, general: Layers }[type] || Layers;
}

function getTypeColor(type) {
  return { coding: '#6366f1', game: '#22c55e', arvr: '#06b6d4', general: '#f59e0b' }[type] || '#8b5cf6';
}

function getTypeLabel(type) {
  return { coding: 'Coding', game: 'Game Dev', arvr: 'AR/VR/3D', general: 'General' }[type] || type;
}

function getStatusColor(status, c) {
  return { active: c.success, paused: c.warning, completed: c.accent, archived: c.textMuted }[status] || c.textMuted;
}

function getStatusBg(status, c) {
  return { active: c.successBg, paused: c.warningBg, completed: c.accentBg, archived: 'transparent' }[status] || c.surface3;
}

function getBuildColor(status, c) {
  return { passing: c.success, failing: c.danger, pending: c.warning }[status] || c.textMuted;
}

function getBuildIcon(status) {
  return { passing: CheckCircle2, failing: XCircle, pending: Clock }[status] || Clock;
}

async function apiFetch(url, fallback) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────
function AvatarStack({ members, size = 26, colors }) {
  const visible = members.slice(0, 5);
  const overflow = members.length - visible.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((m, i) => (
        <div key={m.id} title={m.name} style={{
          width: size, height: size, borderRadius: '50%',
          background: m.color, border: `2px solid ${colors.surface}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: '#fff',
          marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i,
          cursor: 'default', flexShrink: 0,
        }}>
          {m.initials}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: colors.surface3, border: `2px solid ${colors.surface}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: colors.textMuted,
          marginLeft: -8, flexShrink: 0,
        }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}

function TechBadge({ label, colors }) {
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 4,
      background: colors.surface3, border: `1px solid ${colors.border}`,
      fontSize: 10, color: colors.textMuted, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function BuildBadge({ status, colors }) {
  const Icon = getBuildIcon(status);
  const color = getBuildColor(status, colors);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 4,
      background: status === 'passing' ? colors.successBg : status === 'failing' ? colors.dangerBg : colors.warningBg,
      fontSize: 10, color, fontWeight: 600,
    }}>
      <Icon size={10} />
      {status}
    </span>
  );
}

function StatusBadge({ status, colors }) {
  const icons = { active: CheckCircle2, paused: PauseCircle, completed: CheckCircle2, archived: Archive };
  const Icon = icons[status] || Activity;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 20,
      background: getStatusBg(status, colors),
      fontSize: 10, color: getStatusColor(status, colors), fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      <Icon size={10} />
      {status}
    </span>
  );
}

function ProgressBar({ value, height = 5, color, colors }) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = color || colors.accent;
  return (
    <div style={{ width: '100%', height, background: colors.surface3, borderRadius: height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: height,
        background: pct === 100
          ? `linear-gradient(90deg, ${colors.success}, #16a34a)`
          : `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PROJECT CARD (List View)
// ─────────────────────────────────────────────────────────────────
function ProjectCard({ project: p, colors, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const TypeIcon = getTypeIcon(p.type);
  const typeColor = getTypeColor(p.type);

  return (
    <div
      onClick={() => onSelect(p)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colors.surface,
        border: `1px solid ${hovered ? colors.accent + '60' : colors.border}`,
        borderRadius: 12, padding: '16px 18px',
        cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? `0 0 0 1px ${colors.accent}30, ${colors.shadowSm}` : colors.shadowSm,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: `${typeColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TypeIcon size={18} color={typeColor} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{getTypeLabel(p.type)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={p.status} colors={colors} />
          <BuildBadge status={p.buildStatus} colors={colors} />
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: colors.textMuted }}>Progress</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: colors.accent }}>{p.progress}%</span>
        </div>
        <ProgressBar value={p.progress} colors={colors} />
      </div>

      {/* Tech Stack */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {p.techStack.slice(0, 4).map(t => <TechBadge key={t} label={t} colors={colors} />)}
        {p.techStack.length > 4 && (
          <span style={{ fontSize: 10, color: colors.textSubtle, padding: '2px 0', alignSelf: 'center' }}>
            +{p.techStack.length - 4}
          </span>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
        <StatPill icon={GitCommit} label={`${p.commitsToday} today`} colors={colors} />
        <StatPill icon={GitCommit} label={`${p.commitsWeek} wk`}    colors={colors} />
        <StatPill icon={Code2}     label={fmtNum(p.linesOfCode) + ' LOC'} colors={colors} />
        <StatPill icon={Bug}       label={`${p.openIssues} issues`}  colors={colors}
          color={p.openIssues > 10 ? colors.warning : undefined} />
      </div>

      {/* Milestone */}
      <div style={{
        background: colors.surface2, borderRadius: 7, padding: '7px 10px',
        marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={12} color={colors.accent} />
          <span style={{ fontSize: 11, color: colors.textMuted }}>Milestone:</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{p.milestones.current}</span>
        </div>
        <span style={{ fontSize: 10, color: colors.accent, fontWeight: 700 }}>
          {p.milestones.completed}/{p.milestones.total}
        </span>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvatarStack members={p.team} colors={colors} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} color={colors.textSubtle} />
          <span style={{ fontSize: 10, color: colors.textSubtle }}>{formatTimeAgo(p.lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, colors, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon size={11} color={color || colors.textMuted} />
      <span style={{ fontSize: 11, color: color || colors.textMuted }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// KANBAN BOARD
// ─────────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { id: 'backlog',     label: 'Backlog',     color: '#64748b' },
  { id: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'review',      label: 'Review',      color: '#f59e0b' },
  { id: 'done',        label: 'Done',        color: '#22c55e' },
];

function KanbanCard({ project: p, colors, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const TypeIcon = getTypeIcon(p.type);
  const typeColor = getTypeColor(p.type);
  return (
    <div
      onClick={() => onSelect(p)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colors.surface, borderRadius: 9,
        border: `1px solid ${hovered ? colors.accent + '50' : colors.border}`,
        padding: '12px 13px', cursor: 'pointer', marginBottom: 8,
        boxShadow: hovered ? colors.shadowSm : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <div style={{ width: 24, height: 24, borderRadius: 5, background: `${typeColor}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <TypeIcon size={12} color={typeColor} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </span>
      </div>
      <ProgressBar value={p.progress} height={3} colors={colors} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <AvatarStack members={p.team} size={20} colors={colors} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <BuildBadge status={p.buildStatus} colors={colors} />
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({ projects, colors, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, minHeight: 300 }}>
      {KANBAN_COLS.map(col => {
        const cards = projects.filter(p => p.stage === col.id);
        return (
          <div key={col.id} style={{
            background: colors.surface2, borderRadius: 10,
            border: `1px solid ${colors.border}`, padding: '12px 10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{col.label}</span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                background: `${col.color}22`, color: col.color,
              }}>
                {cards.length}
              </span>
            </div>
            {cards.map(p => <KanbanCard key={p.id} project={p} colors={colors} onSelect={onSelect} />)}
            {cards.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: colors.textSubtle, fontSize: 11 }}>
                No projects
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STATS ROW
// ─────────────────────────────────────────────────────────────────
function StatsRow({ projects, colors }) {
  const totalCommits = projects.reduce((s, p) => s + p.commitsWeek, 0);
  const totalLOC    = projects.reduce((s, p) => s + p.linesOfCode, 0);
  const active      = projects.filter(p => p.status === 'active').length;
  const completed   = projects.filter(p => p.status === 'completed').length;

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: Layers,    color: colors.accent },
    { label: 'Active',         value: active,           icon: Activity,  color: colors.success },
    { label: 'Completed',      value: completed,        icon: CheckCircle2, color: '#22c55e' },
    { label: 'Commits / Week', value: fmtNum(totalCommits), icon: GitCommit, color: colors.warning },
    { label: 'Total LOC',      value: fmtNum(totalLOC), icon: Code2,     color: '#8b5cf6' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${s.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <s.icon size={16} color={s.color} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────────────────────────
const TYPE_OPTS     = [['all', 'All Types'], ['coding', 'Coding'], ['game', 'Game Dev'], ['arvr', 'AR/VR/3D'], ['general', 'General']];
const STATUS_OPTS   = [['all', 'All Status'], ['active', 'Active'], ['paused', 'Paused'], ['completed', 'Completed'], ['archived', 'Archived']];

function FilterPill({ value, options, onChange, colors }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: 7, padding: '5px 26px 5px 10px', fontSize: 12,
          color: colors.text, cursor: 'pointer', outline: 'none',
        }}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown size={12} color={colors.textMuted} style={{ position: 'absolute', right: 7, pointerEvents: 'none' }} />
    </div>
  );
}

function FilterBar({ filters, onChange, projects, colors }) {
  const languages = [...new Set(projects.map(p => p.language))].filter(Boolean);
  const langOpts  = [['all', 'All Languages'], ...languages.map(l => [l, l])];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: colors.textMuted }}>
        <Filter size={13} />
        <span style={{ fontSize: 12 }}>Filter:</span>
      </div>
      <FilterPill value={filters.type}     options={TYPE_OPTS}   onChange={v => onChange({ ...filters, type: v })}     colors={colors} />
      <FilterPill value={filters.status}   options={STATUS_OPTS} onChange={v => onChange({ ...filters, status: v })}   colors={colors} />
      <FilterPill value={filters.language} options={langOpts}    onChange={v => onChange({ ...filters, language: v })} colors={colors} />
      <button
        onClick={() => onChange({ type: 'all', status: 'all', language: 'all' })}
        style={{
          background: 'none', border: `1px solid ${colors.border}`, borderRadius: 7,
          padding: '5px 10px', fontSize: 11, color: colors.textMuted, cursor: 'pointer',
        }}
      >
        Reset
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// REAL-TIME PANEL
// ─────────────────────────────────────────────────────────────────
function RealTimePanel({ socket, projects, colors }) {
  const [commits, setCommits] = useState(MOCK_COMMITS);
  const [collaborators, setCollaborators] = useState([
    { id: 'u1', name: 'Alex Chen',    initials: 'AC', color: '#6366f1', project: 'NexusCore API' },
    { id: 'u2', name: 'Blake Kim',    initials: 'BK', color: '#22c55e', project: 'CyberRealms' },
    { id: 'u5', name: 'Eva Russo',    initials: 'ER', color: '#ec4899', project: 'HoloWorld AR' },
  ]);
  const [liveBuilds, setLiveBuilds] = useState(
    projects.slice(0, 4).map(p => ({ id: p.id, name: p.name, status: p.buildStatus, time: p.lastUpdated }))
  );
  const connected = !!socket;

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data) => {
      if (data.type === 'commit') {
        setCommits(prev => [data.commit, ...prev].slice(0, 10));
      } else if (data.type === 'build') {
        setLiveBuilds(prev => prev.map(b => b.id === data.projectId ? { ...b, status: data.status, time: new Date().toISOString() } : b));
      } else if (data.type === 'user') {
        setCollaborators(prev => {
          const exists = prev.find(u => u.id === data.user.id);
          if (exists) return prev;
          return [...prev, data.user].slice(0, 8);
        });
      }
    };
    socket.on('project:update', handleUpdate);
    return () => socket.off('project:update', handleUpdate);
  }, [socket]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px',
        background: connected ? colors.successBg : colors.surface3,
        borderRadius: 7, border: `1px solid ${connected ? colors.success + '30' : colors.border}`,
      }}>
        {connected ? <Wifi size={13} color={colors.success} /> : <WifiOff size={13} color={colors.textMuted} />}
        <span style={{ fontSize: 11, color: connected ? colors.success : colors.textMuted, fontWeight: 600 }}>
          {connected ? 'Live — Socket.IO connected' : 'Showing cached data (no socket)'}
        </span>
      </div>

      {/* Active Collaborators */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Now ({collaborators.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {collaborators.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: u.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff',
                }}>{u.initials}</div>
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 8, height: 8, borderRadius: '50%', background: colors.success,
                  border: `1.5px solid ${colors.surface}`,
                }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{u.name}</div>
                <div style={{ fontSize: 10, color: colors.textMuted }}>{u.project}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Build Feed */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Build Status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {liveBuilds.map(b => {
            const Icon = getBuildIcon(b.status);
            const color = getBuildColor(b.status, colors);
            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 8px', background: colors.surface2, borderRadius: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={11} color={color} />
                  <span style={{ fontSize: 11, color: colors.text }}>{b.name}</span>
                </div>
                <span style={{ fontSize: 10, color: colors.textSubtle }}>{formatTimeAgo(b.time)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Commits */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent Commits
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
          {commits.map(c => (
            <div key={c.id} style={{ padding: '6px 8px', background: colors.surface2, borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <code style={{ fontSize: 10, color: colors.accent }}>{c.hash}</code>
                <span style={{ fontSize: 9, color: colors.textSubtle }}>{formatTimeAgo(c.time)}</span>
              </div>
              <div style={{ fontSize: 11, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.message}
              </div>
              <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{c.project}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ENGINE CONNECTOR PANEL
// ─────────────────────────────────────────────────────────────────
function EngineConnectorPanel({ colors }) {
  const [connStatus, setConnStatus] = useState({ unreal: false, unity: true, godot: false });
  const [connecting, setConnecting] = useState({});

  const toggle = async (id) => {
    setConnecting(prev => ({ ...prev, [id]: true }));
    await new Promise(r => setTimeout(r, 900));
    setConnStatus(prev => ({ ...prev, [id]: !prev[id] }));
    setConnecting(prev => ({ ...prev, [id]: false }));
  };

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Engine Connectors
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ENGINE_CONNECTORS.map(eng => {
          const connected = connStatus[eng.id];
          const busy = connecting[eng.id];
          return (
            <div key={eng.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', background: colors.surface2,
              border: `1px solid ${connected ? colors.success + '40' : colors.border}`,
              borderRadius: 9,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: connected ? colors.successBg : colors.surface3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <eng.icon size={15} color={connected ? colors.success : colors.textMuted} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{eng.name}</div>
                  <div style={{ fontSize: 10, color: colors.textMuted }}>v{eng.version}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: connected ? colors.success : colors.textMuted, fontWeight: 600 }}>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
                <button
                  onClick={() => toggle(eng.id)}
                  disabled={busy}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
                    background: connected ? colors.dangerBg : colors.accentBg,
                    border: `1px solid ${connected ? colors.danger + '40' : colors.accent + '40'}`,
                    color: connected ? colors.danger : colors.accent,
                    opacity: busy ? 0.6 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  {busy ? '...' : connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// AR/VR TRACKER
// ─────────────────────────────────────────────────────────────────
function ARVRTracker({ projects, colors }) {
  const vrProjects = projects.filter(p => p.type === 'arvr');

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        VR/AR Platform Support
      </div>
      {vrProjects.length === 0 && (
        <div style={{ color: colors.textSubtle, fontSize: 12, padding: '12px 0' }}>No AR/VR projects.</div>
      )}
      {vrProjects.map(p => (
        <div key={p.id} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={12} color={getTypeColor('arvr')} />
            {p.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {VR_PLATFORMS.map(platform => {
              const supported = p.vrPlatforms.includes(platform.id);
              return (
                <div key={platform.id} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 9px', borderRadius: 6, fontSize: 10,
                  background: supported ? `${platform.color}18` : colors.surface3,
                  border: `1px solid ${supported ? platform.color + '40' : colors.border}`,
                  color: supported ? platform.color : colors.textSubtle,
                  fontWeight: supported ? 700 : 400,
                }}>
                  <platform.icon size={10} />
                  {platform.name}
                  {supported && <CheckCircle2 size={9} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, padding: '10px 12px', background: colors.surface2, borderRadius: 8, border: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 6 }}>Coverage Overview</div>
        {VR_PLATFORMS.map(platform => {
          const count = projects.filter(p => p.vrPlatforms.includes(platform.id)).length;
          return (
            <div key={platform.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <platform.icon size={10} color={count > 0 ? platform.color : colors.textSubtle} />
              <span style={{ fontSize: 10, color: colors.textMuted, flex: 1 }}>{platform.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? platform.color : colors.textSubtle }}>
                {count} project{count !== 1 ? 's' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ACHIEVEMENT PANEL
// ─────────────────────────────────────────────────────────────────
function AchievementPanel({ projects, colors }) {
  const unlocked = ACHIEVEMENT_DEFS.filter(a => a.condition(projects));
  const locked   = ACHIEVEMENT_DEFS.filter(a => !a.condition(projects));
  const totalXP  = unlocked.reduce((s, a) => s + a.xp, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Achievements
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Star size={12} color={colors.warning} />
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.warning }}>{totalXP} XP</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Trophy size={13} color={colors.accent} />
        <span style={{ fontSize: 11, color: colors.textMuted }}>
          {unlocked.length} / {ACHIEVEMENT_DEFS.length} unlocked
        </span>
        <div style={{ flex: 1 }}>
          <ProgressBar value={(unlocked.length / ACHIEVEMENT_DEFS.length) * 100} height={4} colors={colors} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...unlocked, ...locked].map(a => {
          const isUnlocked = unlocked.includes(a);
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              background: isUnlocked ? `${a.color}12` : colors.surface2,
              border: `1px solid ${isUnlocked ? a.color + '35' : colors.border}`,
              borderRadius: 8, opacity: isUnlocked ? 1 : 0.5,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                background: isUnlocked ? `${a.color}25` : colors.surface3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <a.icon size={15} color={isUnlocked ? a.color : colors.textSubtle} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isUnlocked ? colors.text : colors.textMuted }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 10, color: colors.textSubtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.desc}
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: isUnlocked ? a.color : colors.textSubtle, flexShrink: 0 }}>
                +{a.xp} XP
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CREATE PROJECT MODAL
// ─────────────────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onSubmit, colors }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', techStack: [], teamInput: '' });
  const [customTech, setCustomTech] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const techOptions = TECH_OPTIONS[form.type] || [];

  const toggleTech = (t) => setForm(prev => ({
    ...prev,
    techStack: prev.techStack.includes(t) ? prev.techStack.filter(x => x !== t) : [...prev.techStack, t],
  }));

  const addCustomTech = () => {
    if (customTech.trim() && !form.techStack.includes(customTech.trim())) {
      setForm(prev => ({ ...prev, techStack: [...prev.techStack, customTech.trim()] }));
      setCustomTech('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        id: `p${Date.now()}`,
        status: 'active',
        stage: 'backlog',
        progress: 0,
        commitsToday: 0, commitsWeek: 0,
        buildStatus: 'pending',
        linesOfCode: 0, openIssues: 0,
        milestones: { total: 1, completed: 0, current: 'Kickoff' },
        team: [],
        vrPlatforms: [],
        engine: null,
        lastUpdated: new Date().toISOString(),
        language: form.techStack[0] || '',
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 13,
    background: colors.inputBg, border: `1px solid ${colors.border}`,
    color: colors.text, outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = { fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 5, display: 'block',
    textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: 14, padding: '24px 26px', width: 520, maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: colors.shadow,
      }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.accentBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} color={colors.accent} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>New Project</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Project Name *</label>
            <input style={inputStyle} placeholder="e.g. NexusCore v2" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          {/* Type */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Project Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[['coding', 'Coding', Code2], ['game', 'Game Dev', Gamepad2], ['arvr', 'AR/VR/3D', Eye], ['general', 'General', Layers]].map(([v, l, Icon]) => (
                <button
                  key={v} type="button"
                  onClick={() => setForm(p => ({ ...p, type: v, techStack: [] }))}
                  style={{
                    padding: '8px 6px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    background: form.type === v ? colors.accentBg : colors.surface2,
                    border: `1px solid ${form.type === v ? colors.accent : colors.border}`,
                    color: form.type === v ? colors.accent : colors.textMuted,
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={16} />
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 68, fontFamily: 'inherit' }}
              placeholder="Brief project description..." value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          {/* Tech Stack */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Tech Stack</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {techOptions.map(t => {
                const sel = form.techStack.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTech(t)} style={{
                    padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                    background: sel ? colors.accentBg : colors.surface2,
                    border: `1px solid ${sel ? colors.accent : colors.border}`,
                    color: sel ? colors.accent : colors.textMuted, fontWeight: sel ? 700 : 400,
                    transition: 'all 0.12s',
                  }}>
                    {t}
                  </button>
                );
              })}
            </div>
            {/* Custom tech input */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Add custom technology..."
                value={customTech} onChange={e => setCustomTech(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTech())} />
              <button type="button" onClick={addCustomTech} style={{
                padding: '8px 12px', borderRadius: 7, background: colors.accentBg,
                border: `1px solid ${colors.accent + '50'}`, color: colors.accent, cursor: 'pointer', fontSize: 13,
              }}>
                <Plus size={14} />
              </button>
            </div>
            {form.techStack.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {form.techStack.map(t => (
                  <span key={t} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                    background: colors.accentBg, borderRadius: 5, fontSize: 11, color: colors.accent,
                  }}>
                    {t}
                    <X size={9} style={{ cursor: 'pointer' }} onClick={() => toggleTech(t)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
              background: colors.dangerBg, borderRadius: 7, marginBottom: 12,
              border: `1px solid ${colors.danger + '30'}`,
            }}>
              <AlertCircle size={13} color={colors.danger} />
              <span style={{ fontSize: 12, color: colors.danger }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              background: 'none', border: `1px solid ${colors.border}`, color: colors.textMuted,
            }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={{
              padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
              background: colors.accent, border: 'none', color: '#fff',
              opacity: submitting ? 0.7 : 1, transition: 'opacity 0.15s',
            }}>
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SIDE PANEL TABS
// ─────────────────────────────────────────────────────────────────
const SIDE_TABS = [
  { id: 'live',     label: 'Live Feed',  icon: Activity },
  { id: 'engines',  label: 'Engines',    icon: Cpu },
  { id: 'arvr',     label: 'AR/VR',      icon: Eye },
  { id: 'achieve',  label: 'Achievements', icon: Trophy },
];

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function ProjectDashboard({
  theme = 'dark',
  socket,
  userId,
  onCreateProject,
  onProjectSelect,
}) {
  const colors = getColors(theme);

  const [projects, setProjects]       = useState(MOCK_PROJECTS);
  const [loading, setLoading]         = useState(false);
  const [view, setView]               = useState('list');
  const [sideTab, setSideTab]         = useState('live');
  const [filters, setFilters]         = useState({ type: 'all', status: 'all', language: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate]   = useState(false);

  // Fetch projects from API with mock fallback
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch('/api/projects', MOCK_PROJECTS).then(data => {
      if (!cancelled) {
        setProjects(Array.isArray(data) ? data : MOCK_PROJECTS);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Socket: project updates
  useEffect(() => {
    if (!socket) return;
    const handle = (data) => {
      if (data.project) {
        setProjects(prev => prev.map(p => p.id === data.project.id ? { ...p, ...data.project } : p));
      }
    };
    socket.on('project:update', handle);
    return () => socket.off('project:update', handle);
  }, [socket]);

  const filteredProjects = projects.filter(p => {
    if (filters.type     !== 'all' && p.type     !== filters.type)     return false;
    if (filters.status   !== 'all' && p.status   !== filters.status)   return false;
    if (filters.language !== 'all' && p.language !== filters.language) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCreateProject = useCallback(async (data) => {
    const created = onCreateProject ? await onCreateProject(data) : data;
    const newProject = created || data;
    setProjects(prev => [newProject, ...prev]);
  }, [onCreateProject]);

  const handleProjectSelect = useCallback((project) => {
    if (onProjectSelect) onProjectSelect(project);
  }, [onProjectSelect]);

  const refresh = () => {
    setLoading(true);
    apiFetch('/api/projects', MOCK_PROJECTS).then(data => {
      setProjects(Array.isArray(data) ? data : MOCK_PROJECTS);
      setLoading(false);
    });
  };

  return (
    <div style={{
      background: colors.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: colors.text,
    }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 24px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: colors.accentBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${colors.accent}40`,
            }}>
              <BarChart3 size={20} color={colors.accent} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.text, lineHeight: 1 }}>
                Project Dashboard
              </h1>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                Nexus AI Pro — {userId ? `User ${userId}` : 'Enterprise'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} color={colors.textMuted} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                style={{
                  paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                  borderRadius: 8, background: colors.surface, border: `1px solid ${colors.border}`,
                  color: colors.text, fontSize: 12, outline: 'none', width: 180,
                }}
              />
            </div>

            {/* View Toggle */}
            <div style={{ display: 'flex', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {[['list', LayoutList, 'List'], ['kanban', LayoutGrid, 'Kanban']].map(([v, Icon, label]) => (
                <button key={v} onClick={() => setView(v)} title={label} style={{
                  padding: '6px 10px', cursor: 'pointer', border: 'none',
                  background: view === v ? colors.accentBg : 'transparent',
                  color: view === v ? colors.accent : colors.textMuted,
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button onClick={refresh} title="Refresh" style={{
              width: 33, height: 33, borderRadius: 8, border: `1px solid ${colors.border}`,
              background: colors.surface, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.textMuted,
            }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            {/* New Project */}
            <button onClick={() => setShowCreate(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, background: colors.accent, border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 2px 8px ${colors.accent}55`,
            }}>
              <Plus size={14} /> New Project
            </button>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <StatsRow projects={projects} colors={colors} />

        {/* ── MAIN LAYOUT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

          {/* LEFT: Projects */}
          <div>
            <FilterBar filters={filters} onChange={setFilters} projects={projects} colors={colors} />

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: colors.textMuted, fontSize: 14 }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                <div>Loading projects…</div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: colors.textMuted }}>
                <AlertCircle size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>No projects match your filters.</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Try resetting filters or creating a new project.</div>
              </div>
            ) : view === 'list' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {filteredProjects.map(p => (
                  <ProjectCard key={p.id} project={p} colors={colors} onSelect={handleProjectSelect} />
                ))}
              </div>
            ) : (
              <KanbanBoard projects={filteredProjects} colors={colors} onSelect={handleProjectSelect} />
            )}
          </div>

          {/* RIGHT: Side Panel */}
          <div style={{
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: 12, overflow: 'hidden', position: 'sticky', top: 20,
          }}>
            {/* Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${colors.border}` }}>
              {SIDE_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSideTab(tab.id)}
                  title={tab.label}
                  style={{
                    padding: '10px 4px', border: 'none', cursor: 'pointer',
                    background: sideTab === tab.id ? colors.accentBg : 'transparent',
                    color: sideTab === tab.id ? colors.accent : colors.textMuted,
                    borderBottom: sideTab === tab.id ? `2px solid ${colors.accent}` : '2px solid transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    fontSize: 9, fontWeight: 600, transition: 'all 0.15s',
                  }}
                >
                  <tab.icon size={14} />
                  {tab.label.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div style={{ padding: 14, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
              {sideTab === 'live'    && <RealTimePanel    socket={socket} projects={projects} colors={colors} />}
              {sideTab === 'engines' && <EngineConnectorPanel colors={colors} />}
              {sideTab === 'arvr'    && <ARVRTracker       projects={projects} colors={colors} />}
              {sideTab === 'achieve' && <AchievementPanel  projects={projects} colors={colors} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <CreateProjectModal
          colors={colors}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateProject}
        />
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
