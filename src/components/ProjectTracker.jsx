/**
 * ProjectTracker.jsx
 * Nexus AI Pro — Real-time Project Tracker
 * Date: 2026-08-27
 * Covers: Software / Coding, Game Dev, AR/VR, 3D Projects
 * Connectors: Unreal Engine, Epic Games, Sony, Microsoft, Ubisoft Connect
 * Achievement & game progress tracking, real-time metrics
 * Platforms: Linux, Windows, macOS, iOS, Android, Electron
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Project types ─────────────────────────────────────────────────────────────
const PROJECT_TYPES = {
  coding:  { label: 'Software Dev', emoji: '💻', color: '#6366f1' },
  game:    { label: 'Game Dev',     emoji: '🎮', color: '#22c55e' },
  arvr:    { label: 'AR / VR',      emoji: '🥽', color: '#a855f7' },
  project3d: { label: '3D Projects',  emoji: '🧊', color: '#06b6d4' },
};

// ── Platform connectors ───────────────────────────────────────────────────────
const CONNECTORS = {
  unreal:    { label: 'Unreal Engine',   emoji: '🎯', color: '#0e1128', status: 'connected' },
  epic:      { label: 'Epic Games Store',emoji: '🛒', color: '#2d2d2d', status: 'connected' },
  sony:      { label: 'PlayStation',     emoji: '🎮', color: '#00439c', status: 'connected' },
  microsoft: { label: 'Xbox / MS',       emoji: '🟩', color: '#107c10', status: 'connected' },
  ubisoft:   { label: 'Ubisoft Connect', emoji: '🔵', color: '#0070d1', status: 'disconnected' },
};

// ── Status options ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['planning', 'in-progress', 'review', 'completed', 'on-hold'];
const STATUS_COLORS  = {
  planning:    '#94a3b8',
  'in-progress':'#6366f1',
  review:      '#eab308',
  completed:   '#22c55e',
  'on-hold':   '#f97316',
};

// ── Sample data ───────────────────────────────────────────────────────────────
function buildSampleProjects() {
  return [
    {
      id: 'proj-001',
      name: 'Nexus AI Core v3',
      type: 'coding',
      status: 'in-progress',
      progress: 68,
      tasks: 24,
      tasksDone: 16,
      commits: 342,
      linesChanged: 18_450,
      lastActivity: Date.now() - 120_000,
      connectors: [],
      achievements: [],
      tags: ['TypeScript', 'React', 'Node.js'],
      dueDate: '2026-10-15',
    },
    {
      id: 'proj-002',
      name: 'Shadow Realms — UE5',
      type: 'game',
      status: 'in-progress',
      progress: 42,
      tasks: 80,
      tasksDone: 34,
      commits: 156,
      linesChanged: 94_200,
      lastActivity: Date.now() - 600_000,
      connectors: ['unreal', 'epic', 'sony', 'microsoft'],
      achievements: [
        { id: 'ach-001', title: 'First Playable Build', unlocked: true, points: 500 },
        { id: 'ach-002', title: 'Alpha Release',         unlocked: false, points: 1000 },
        { id: 'ach-003', title: 'Beta Milestone',        unlocked: false, points: 2000 },
      ],
      tags: ['C++', 'Blueprint', 'UE5', 'Open World'],
      dueDate: '2027-03-01',
    },
    {
      id: 'proj-003',
      name: 'AR Navigation Overlay',
      type: 'arvr',
      status: 'planning',
      progress: 12,
      tasks: 30,
      tasksDone: 4,
      commits: 28,
      linesChanged: 6_100,
      lastActivity: Date.now() - 3_600_000,
      connectors: ['microsoft'],
      achievements: [],
      tags: ['Swift', 'ARKit', 'Metal', 'RealityKit'],
      dueDate: '2026-12-01',
    },
    {
      id: 'proj-004',
      name: 'Nexus 3D Asset Pack',
      type: 'project3d',
      status: 'review',
      progress: 85,
      tasks: 12,
      tasksDone: 10,
      commits: 0,
      linesChanged: 0,
      lastActivity: Date.now() - 7_200_000,
      connectors: ['unreal'],
      achievements: [
        { id: 'ach-010', title: '100 Assets Created', unlocked: true, points: 300 },
      ],
      tags: ['Blender', 'Houdini', 'USD', 'glTF'],
      dueDate: '2026-09-01',
    },
  ];
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)  return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function formatNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, color = '#6366f1' }) {
  return (
    <div style={{ background: '#334155', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, value)}%`,
        height: '100%',
        background: color,
        borderRadius: 4,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

// ── Achievement Badge ──────────────────────────────────────────────────────────
function AchievementBadge({ ach }) {
  return (
    <div title={`${ach.points} pts`} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: ach.unlocked ? '#22c55e22' : '#334155',
      color: ach.unlocked ? '#22c55e' : '#64748b',
      border: `1px solid ${ach.unlocked ? '#22c55e44' : '#475569'}`,
    }}>
      {ach.unlocked ? '🏆' : '🔒'} {ach.title}
    </div>
  );
}

// ── Connector Badge ───────────────────────────────────────────────────────────
function ConnectorBadge({ connectorKey }) {
  const c = CONNECTORS[connectorKey];
  if (!c) return null;
  return (
    <div title={c.label} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 8,
      fontSize: 11,
      background: c.status === 'connected' ? '#1e3a5f' : '#2a1a1a',
      color: c.status === 'connected' ? '#60a5fa' : '#ef4444',
      border: `1px solid ${c.status === 'connected' ? '#3b82f644' : '#ef444444'}`,
    }}>
      {c.emoji} {c.label}
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onStatusChange }) {
  const ptype = PROJECT_TYPES[project.type] || PROJECT_TYPES.coding;
  const statusColor = STATUS_COLORS[project.status] || '#94a3b8';

  return (
    <div style={styles.projectCard}>
      {/* Card header */}
      <div style={styles.cardHeader}>
        <span style={{ fontSize: 24 }}>{ptype.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {ptype.label} · Due {project.dueDate} · {relativeTime(project.lastActivity)}
          </div>
        </div>
        <select
          value={project.status}
          onChange={e => onStatusChange(project.id, e.target.value)}
          style={{ ...styles.statusSelect, color: statusColor, borderColor: statusColor + '44' }}
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
          <span>Progress</span>
          <span style={{ color: ptype.color, fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={ptype.color} />
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
          {project.tasksDone} / {project.tasks} tasks complete
        </div>
      </div>

      {/* Metrics row */}
      <div style={styles.metricsRow}>
        {[
          { label: 'Commits',  value: formatNum(project.commits) },
          { label: 'Lines',    value: formatNum(project.linesChanged) },
          { label: 'Tasks',    value: `${project.tasksDone}/${project.tasks}` },
        ].map(m => (
          <div key={m.label} style={styles.metricChip}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div style={styles.tagRow}>
          {project.tags.map(tag => (
            <span key={tag} style={styles.tag}>{tag}</span>
          ))}
        </div>
      )}

      {/* Connectors */}
      {project.connectors.length > 0 && (
        <div style={styles.connectorRow}>
          {project.connectors.map(ck => <ConnectorBadge key={ck} connectorKey={ck} />)}
        </div>
      )}

      {/* Achievements */}
      {project.achievements.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Achievements</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {project.achievements.map(a => <AchievementBadge key={a.id} ach={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Connector Status Panel ─────────────────────────────────────────────────────
function ConnectorStatusPanel() {
  return (
    <div style={styles.connectorPanel}>
      <div style={styles.panelTitle}>🔗 Platform Connectors</div>
      {Object.entries(CONNECTORS).map(([k, c]) => (
        <div key={k} style={styles.connectorRow2}>
          <span style={{ fontSize: 18 }}>{c.emoji}</span>
          <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0' }}>{c.label}</span>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 8,
            fontWeight: 600,
            background: c.status === 'connected' ? '#052e16' : '#450a0a',
            color: c.status === 'connected' ? '#22c55e' : '#ef4444',
          }}>
            {c.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProjectTracker() {
  const [projects, setProjects] = useState(buildSampleProjects());
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('lastActivity');
  const [lastTick, setLastTick] = useState(Date.now());
  const intervalRef = useRef(null);

  // Real-time live update tick
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setLastTick(Date.now());
      setProjects(prev => prev.map(p => {
        if (p.status !== 'in-progress') return p;
        return {
          ...p,
          lastActivity: Date.now() - randomBetween(0, 60_000),
          commits: p.commits + (Math.random() > 0.7 ? 1 : 0),
        };
      }));
    }, 10_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleStatusChange = useCallback((id, newStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  }, []);

  const filtered = projects
    .filter(p => filter === 'all' || p.type === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'lastActivity') return b.lastActivity - a.lastActivity;
      if (sortBy === 'progress')     return b.progress - a.progress;
      if (sortBy === 'name')         return a.name.localeCompare(b.name);
      return 0;
    });

  const totalTasks = projects.reduce((s, p) => s + p.tasks, 0);
  const doneTasks  = projects.reduce((s, p) => s + p.tasksDone, 0);
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🚀 Project Tracker</h1>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {projects.length} projects · {doneTasks}/{totalTasks} tasks · Avg {avgProgress}% complete · Live
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={styles.select}>
            <option value="lastActivity">Latest Activity</option>
            <option value="progress">Progress</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Type filters */}
      <div style={styles.filterRow}>
        {[{ key: 'all', label: 'All', emoji: '📁' }, ...Object.entries(PROJECT_TYPES).map(([k, v]) => ({ key: k, ...v }))].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ ...styles.filterBtn, ...(filter === f.key ? styles.filterBtnActive : {}) }}>
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      <div style={styles.mainGrid}>
        {/* Project cards */}
        <div style={styles.cardsArea}>
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onStatusChange={handleStatusChange} />
          ))}
          {filtered.length === 0 && (
            <div style={{ color: '#64748b', padding: 32, textAlign: 'center' }}>
              No projects match your filter.
            </div>
          )}
        </div>

        {/* Side panel */}
        <div>
          <ConnectorStatusPanel />
        </div>
      </div>
    </div>
  );
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    background: '#0f172a',
    minHeight: '100vh',
    color: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: 20,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  searchInput: {
    padding: '8px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
  },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterBtn: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 13,
  },
  filterBtnActive: { background: '#6366f1', borderColor: '#6366f1', color: '#fff' },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 260px',
    gap: 20,
  },
  cardsArea: { display: 'flex', flexDirection: 'column', gap: 16 },
  projectCard: {
    background: '#1e293b',
    borderRadius: 16,
    padding: 20,
    border: '1px solid #334155',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  statusSelect: {
    background: 'transparent',
    border: '1px solid',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  metricsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 10,
  },
  metricChip: {
    background: '#0f172a',
    borderRadius: 8,
    padding: '8px 12px',
    textAlign: 'center',
    minWidth: 70,
  },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: {
    padding: '2px 8px',
    borderRadius: 4,
    background: '#1e3a5f',
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: 600,
  },
  connectorRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  connectorPanel: {
    background: '#1e293b',
    borderRadius: 12,
    border: '1px solid #334155',
    overflow: 'hidden',
    position: 'sticky',
    top: 20,
  },
  panelTitle: {
    padding: '12px 16px',
    borderBottom: '1px solid #334155',
    fontWeight: 600,
    fontSize: 14,
    color: '#f1f5f9',
  },
  connectorRow2: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderBottom: '1px solid #0f172a',
  },
};
