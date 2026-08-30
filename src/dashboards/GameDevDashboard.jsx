/**
 * @file GameDevDashboard.jsx
 * @description Game development and project tracking dashboard with Kanban board,
 *   build pipeline, platform connectors (Unreal Engine, Epic, PlayStation, Xbox,
 *   Ubisoft, Steam), achievement tracking, milestones, and bug tracker integration.
 * @date 2026-08-30
 * @module dashboards/GameDevDashboard
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @type {string} App accent colour. */
const ACCENT = '#6366f1';

/** @type {string} App background colour. */
const BG_BASE = '#0a0a0c';

/** @type {string} Card surface colour. */
const BG_CARD = '#111114';

/** @type {string} Subtle border. */
const BORDER = '#1e1e24';

/** @type {string} Success green. */
const GREEN  = '#22c55e';

/** @type {string} Warning amber. */
const AMBER  = '#f59e0b';

/** @type {string} Error red. */
const RED    = '#ef4444';

/**
 * @typedef {'Game Dev'|'AR/VR'|'3D Art'|'Coding'|'Mobile App'} ProjectType
 */

/** @type {Array<{type: ProjectType, color: string, icon: string}>} */
const PROJECT_TYPES = [
  { type: 'Game Dev',   color: '#a855f7', icon: '🎮' },
  { type: 'AR/VR',      color: '#06b6d4', icon: '🥽' },
  { type: '3D Art',     color: '#f97316', icon: '🎨' },
  { type: 'Coding',     color: ACCENT,    icon: '💻' },
  { type: 'Mobile App', color: '#22c55e', icon: '📱' },
];

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   icon: string,
 *   color: string,
 *   connected: boolean,
 *   lastSync: string,
 *   status: 'connected'|'disconnected'|'syncing'|'error',
 *   metrics: {builds?:number, players?:number, revenue?:string, members?:number}
 * }} PlatformConnector
 */

/** @type {PlatformConnector[]} Default connector definitions. */
const DEFAULT_CONNECTORS = [
  {
    id: 'unreal',       name: 'Unreal Engine',      icon: '⚡', color: '#0070f3',
    connected: true,    lastSync: '2 min ago',       status: 'connected',
    metrics: { builds: 14, players: 0 },
  },
  {
    id: 'epic',         name: 'Epic Games Store',   icon: '🏪', color: '#2d2d2d',
    connected: true,    lastSync: '8 min ago',       status: 'connected',
    metrics: { players: 24_310, revenue: '$12.4K' },
  },
  {
    id: 'playstation',  name: 'PlayStation (Sony)', icon: '🎮', color: '#00439c',
    connected: false,   lastSync: 'Never',           status: 'disconnected',
    metrics: { builds: 0 },
  },
  {
    id: 'xbox',         name: 'Xbox / Microsoft',   icon: '🟢', color: '#107c10',
    connected: true,    lastSync: '1 hr ago',        status: 'connected',
    metrics: { builds: 7, players: 8_820 },
  },
  {
    id: 'ubisoft',      name: 'Ubisoft Connect',    icon: '🔷', color: '#1278cd',
    connected: false,   lastSync: '3 days ago',      status: 'error',
    metrics: {},
  },
  {
    id: 'steam',        name: 'Steam',              icon: '🌀', color: '#1b2838',
    connected: true,    lastSync: '5 min ago',       status: 'connected',
    metrics: { players: 41_250, revenue: '$88.7K', builds: 22 },
  },
];

/**
 * @typedef {{
 *   id: string, title: string, type: ProjectType, progress: number,
 *   status: 'active'|'paused'|'complete',
 *   milestones: Array<{label:string, done:boolean}>,
 *   lastActivity: string,
 *   buildStatus: 'passing'|'failing'|'running'|'queued',
 *   bugs: {open:number, closed:number, critical:number}
 * }} Project
 */

/** @type {Project[]} Initial project list. */
const INITIAL_PROJECTS = [
  {
    id: 'p1', title: 'Nexus Realms', type: 'Game Dev', progress: 68,
    status: 'active', lastActivity: '2 min ago',
    buildStatus: 'passing',
    bugs: { open: 12, closed: 148, critical: 2 },
    milestones: [
      { label: 'Core engine', done: true },
      { label: 'World generation', done: true },
      { label: 'Multiplayer netcode', done: true },
      { label: 'Combat system', done: false },
      { label: 'Beta release', done: false },
    ],
  },
  {
    id: 'p2', title: 'Holo-Studio AR', type: 'AR/VR', progress: 42,
    status: 'active', lastActivity: '1 hr ago',
    buildStatus: 'running',
    bugs: { open: 7, closed: 34, critical: 1 },
    milestones: [
      { label: 'Tracking foundation', done: true },
      { label: 'UI overlay system', done: true },
      { label: 'Hand gestures', done: false },
      { label: 'Cloud sync', done: false },
    ],
  },
  {
    id: 'p3', title: 'Vertex Forge', type: '3D Art', progress: 89,
    status: 'active', lastActivity: '30 min ago',
    buildStatus: 'passing',
    bugs: { open: 3, closed: 77, critical: 0 },
    milestones: [
      { label: 'Sculpting tools', done: true },
      { label: 'Material editor', done: true },
      { label: 'Render pipeline', done: true },
      { label: 'Export formats', done: true },
      { label: 'Plugin marketplace', done: false },
    ],
  },
  {
    id: 'p4', title: 'NexusOS Core', type: 'Coding', progress: 55,
    status: 'active', lastActivity: '12 min ago',
    buildStatus: 'failing',
    bugs: { open: 21, closed: 203, critical: 4 },
    milestones: [
      { label: 'Architecture spec', done: true },
      { label: 'Auth system', done: true },
      { label: 'API gateway', done: false },
      { label: 'Dashboard', done: false },
    ],
  },
  {
    id: 'p5', title: 'Nexus Mobile', type: 'Mobile App', progress: 30,
    status: 'paused', lastActivity: '2 days ago',
    buildStatus: 'queued',
    bugs: { open: 5, closed: 18, critical: 0 },
    milestones: [
      { label: 'Design system', done: true },
      { label: 'Core navigation', done: false },
      { label: 'Push notifications', done: false },
    ],
  },
];

/**
 * @typedef {'TODO'|'In Progress'|'Done'} KanbanColumn
 */

/**
 * @typedef {{id:string, text:string, type:ProjectType, priority:'high'|'medium'|'low', project:string}} KanbanTask
 */

/** @type {Record<KanbanColumn, KanbanTask[]>} */
const INITIAL_TASKS = {
  'TODO': [
    { id: 't1', text: 'Implement save-state system',       type: 'Game Dev',   priority: 'high',   project: 'Nexus Realms' },
    { id: 't2', text: 'Design AR interaction model',        type: 'AR/VR',      priority: 'high',   project: 'Holo-Studio AR' },
    { id: 't3', text: 'Set up CI/CD for mobile builds',     type: 'Mobile App', priority: 'medium', project: 'Nexus Mobile' },
    { id: 't4', text: 'Write API auth docs',                type: 'Coding',     priority: 'low',    project: 'NexusOS Core' },
  ],
  'In Progress': [
    { id: 't5', text: 'Fix netcode desync bug (#892)',       type: 'Game Dev',   priority: 'high',   project: 'Nexus Realms' },
    { id: 't6', text: 'Optimise render pipeline ×2 perf',   type: '3D Art',     priority: 'medium', project: 'Vertex Forge' },
    { id: 't7', text: 'Integrate Steam achievement API',     type: 'Game Dev',   priority: 'medium', project: 'Nexus Realms' },
  ],
  'Done': [
    { id: 't8',  text: 'Core engine architecture',          type: 'Game Dev',   priority: 'high',   project: 'Nexus Realms' },
    { id: 't9',  text: 'Sculpting tool MVP',                type: '3D Art',     priority: 'medium', project: 'Vertex Forge' },
    { id: 't10', text: 'Auth system implementation',        type: 'Coding',     priority: 'high',   project: 'NexusOS Core' },
    { id: 't11', text: 'ARKit tracking integration',        type: 'AR/VR',      priority: 'medium', project: 'Holo-Studio AR' },
  ],
};

/**
 * @typedef {{id:string, game:string, title:string, desc:string, unlockedAt:string, rarity:'common'|'rare'|'epic'|'legendary'}} Achievement
 */

/** @type {Achievement[]} Recent achievements. */
const ACHIEVEMENTS = [
  { id: 'a1', game: 'Nexus Realms',    title: 'First Blood',       desc: 'Complete first combat tutorial', unlockedAt: '2026-08-29', rarity: 'common' },
  { id: 'a2', game: 'Nexus Realms',    title: 'World Builder',     desc: 'Generate 100 unique chunks',     unlockedAt: '2026-08-28', rarity: 'rare' },
  { id: 'a3', game: 'Vertex Forge',    title: 'Render God',        desc: 'Export a 4K scene in <2 min',    unlockedAt: '2026-08-27', rarity: 'epic' },
  { id: 'a4', game: 'Holo-Studio AR',  title: 'Spatial Pioneer',   desc: 'Track 10 simultaneous objects',  unlockedAt: '2026-08-26', rarity: 'legendary' },
  { id: 'a5', game: 'NexusOS Core',    title: '1K Commits',        desc: 'Reach 1,000 git commits',        unlockedAt: '2026-08-25', rarity: 'rare' },
];

/** @type {Record<string,string>} Rarity badge colours. */
const RARITY_COLORS = {
  common: '#6b7280', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the badge colour for a build status.
 * @param {'passing'|'failing'|'running'|'queued'} s
 * @returns {string}
 */
const buildColor = (s) => ({ passing: GREEN, failing: RED, running: AMBER, queued: '#555' }[s] || '#555');

/**
 * Returns the colour for a task priority.
 * @param {'high'|'medium'|'low'} p
 * @returns {string}
 */
const priorityColor = (p) => ({ high: RED, medium: AMBER, low: '#3b82f6' }[p] || '#555');

/**
 * Returns the colour and icon for a connector status.
 * @param {'connected'|'disconnected'|'syncing'|'error'} s
 * @returns {{color:string, icon:string}}
 */
const connectorMeta = (s) => ({
  connected:    { color: GREEN,   icon: '●' },
  disconnected: { color: '#444',  icon: '○' },
  syncing:      { color: AMBER,   icon: '◎' },
  error:        { color: RED,     icon: '⚠' },
}[s] || { color: '#444', icon: '○' });

/**
 * Returns colour for a project type.
 * @param {ProjectType} type
 * @returns {string}
 */
const typeColor = (type) => PROJECT_TYPES.find((t) => t.type === type)?.color || ACCENT;

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

class GameDevErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }
  componentDidCatch(error, info) {
    console.error('[GameDevDashboard] Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', color: RED }}>
          <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>GameDev Dashboard Error</p>
          <p style={{ fontSize: 13, color: '#999' }}>{this.state.errorMessage}</p>
          <button onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: 16, padding: '8px 20px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Renders a horizontal progress bar.
 * @param {{value:number, color?:string, showLabel?:boolean}} props
 */
const ProgressBar = ({ value, color = ACCENT, showLabel = true }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ flex: 1, height: 6, background: '#1a1a20', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, value)}%`,
        background: color, borderRadius: 3, transition: 'width 0.4s ease',
      }} />
    </div>
    {showLabel && <span style={{ fontSize: 11, color: '#666', minWidth: 30, textAlign: 'right' }}>{value}%</span>}
  </div>
);

/**
 * Renders a single platform connector card with status, last sync, and quick actions.
 * @param {{connector: PlatformConnector, onToggle: function, onSync: function}} props
 */
const ConnectorCard = ({ connector, onToggle, onSync }) => {
  const meta = connectorMeta(connector.status);
  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{connector.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#ddd' }}>{connector.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>Last sync: {connector.lastSync}</p>
          </div>
        </div>
        <span style={{ fontSize: 11, color: meta.color, fontWeight: 700 }}>
          {meta.icon} {connector.status.charAt(0).toUpperCase() + connector.status.slice(1)}
        </span>
      </div>

      {/* Metrics row */}
      {Object.keys(connector.metrics).length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {connector.metrics.builds  !== undefined && (
            <span style={{ fontSize: 11, color: '#666' }}>🔨 {connector.metrics.builds} builds</span>
          )}
          {connector.metrics.players !== undefined && (
            <span style={{ fontSize: 11, color: '#666' }}>👥 {connector.metrics.players.toLocaleString()} players</span>
          )}
          {connector.metrics.revenue !== undefined && (
            <span style={{ fontSize: 11, color: GREEN }}>💰 {connector.metrics.revenue}</span>
          )}
        </div>
      )}

      {/* Quick action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onSync(connector.id)}
          style={{
            flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
            background: `${ACCENT}18`, border: `1px solid ${ACCENT}44`,
            color: ACCENT, borderRadius: 6, cursor: 'pointer',
          }}>
          ↺ Sync
        </button>
        <button
          onClick={() => onToggle(connector.id)}
          style={{
            flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
            background: connector.connected ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${connector.connected ? RED + '44' : GREEN + '44'}`,
            color: connector.connected ? RED : GREEN,
            borderRadius: 6, cursor: 'pointer',
          }}>
          {connector.connected ? '✕ Disconnect' : '+ Connect'}
        </button>
      </div>
    </div>
  );
};

/**
 * Renders a single Kanban card.
 * @param {{task: KanbanTask}} props
 */
const KanbanCard = ({ task }) => {
  const typeInfo = PROJECT_TYPES.find((t) => t.type === task.type);
  return (
    <div style={{
      background: '#16161c', border: `1px solid ${BORDER}`, borderRadius: 8,
      padding: '10px 12px', marginBottom: 8,
    }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#ccc', lineHeight: 1.4 }}>{task.text}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: `${typeColor(task.type)}22`, color: typeColor(task.type), fontWeight: 600,
        }}>
          {typeInfo?.icon} {task.type}
        </span>
        <span style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
          background: `${priorityColor(task.priority)}18`, color: priorityColor(task.priority),
        }}>
          {task.priority}
        </span>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#444' }}>{task.project}</p>
    </div>
  );
};

/**
 * Renders a single achievement badge.
 * @param {{achievement: Achievement}} props
 */
const AchievementBadge = ({ achievement: ach }) => (
  <div style={{
    background: BG_CARD, border: `1px solid ${RARITY_COLORS[ach.rarity]}44`,
    borderRadius: 10, padding: '12px 14px',
    display: 'flex', gap: 12, alignItems: 'flex-start',
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
      background: `${RARITY_COLORS[ach.rarity]}22`,
      border: `1.5px solid ${RARITY_COLORS[ach.rarity]}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18,
    }}>
      🏆
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ddd' }}>{ach.title}</p>
        <span style={{
          fontSize: 9, padding: '1px 6px', borderRadius: 3, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          background: `${RARITY_COLORS[ach.rarity]}22`,
          color: RARITY_COLORS[ach.rarity],
        }}>
          {ach.rarity}
        </span>
      </div>
      <p style={{ margin: '2px 0', fontSize: 11, color: '#666' }}>{ach.desc}</p>
      <p style={{ margin: 0, fontSize: 10, color: '#444' }}>{ach.game} · {ach.unlockedAt}</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Build Pipeline SVG
// ---------------------------------------------------------------------------

/**
 * Renders a simple inline SVG build pipeline with stage status indicators.
 * @param {{status:'passing'|'failing'|'running'|'queued', projectName:string}} props
 */
const BuildPipelineDiagram = ({ status, projectName }) => {
  const stages = [
    { label: 'Source',  done: true  },
    { label: 'Build',   done: status === 'passing' || status === 'failing' },
    { label: 'Test',    done: status === 'passing' },
    { label: 'Package', done: status === 'passing' },
    { label: 'Deploy',  done: status === 'passing' },
  ];
  const W = 480, H = 64, stageW = W / stages.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label={`Build pipeline for ${projectName}`}>
      {stages.map((stage, i) => {
        const cx = stageW * i + stageW / 2;
        const isActive = !stage.done && status === 'running' && stages[i - 1]?.done;
        const isFailing = !stage.done && status === 'failing' && stages[i - 1]?.done;
        const color = stage.done ? GREEN : isActive ? AMBER : isFailing ? RED : '#333';
        return (
          <g key={stage.label}>
            {/* Connector line */}
            {i > 0 && (
              <line x1={stageW * i - 2} y1={32} x2={stageW * (i - 1) + stageW / 2 + 14} y2={32}
                stroke={stages[i - 1].done ? (stage.done ? GREEN : AMBER) : '#2a2a2a'}
                strokeWidth="2" />
            )}
            {/* Stage circle */}
            <circle cx={cx} cy={32} r={13} fill={`${color}22`}
              stroke={color} strokeWidth="1.5" />
            {/* Check / dot */}
            <text x={cx} y={36.5} textAnchor="middle" fontSize="12" fill={color}>
              {stage.done ? '✓' : isActive ? '…' : isFailing ? '✕' : '○'}
            </text>
            {/* Label */}
            <text x={cx} y={58} textAnchor="middle" fontSize="9.5" fill="#555">
              {stage.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * GameDevDashboard
 *
 * Self-contained game development and project management dashboard.
 * Hooks into `window.nexusSocket` when available for real-time build
 * status events (`gamedev:build`, `gamedev:task`).  No credentials are
 * embedded — all platform tokens live server-side.
 *
 * @returns {React.ReactElement}
 */
const GameDevDashboard = () => {
  const [projects,      setProjects]    = useState(INITIAL_PROJECTS);
  const [connectors,    setConnectors]  = useState(DEFAULT_CONNECTORS);
  const [tasks,         setTasks]       = useState(INITIAL_TASKS);
  const [selectedProj,  setSelectedProj] = useState(INITIAL_PROJECTS[0].id);
  const [activeSection, setActiveSection] = useState('overview');
  const [filterType,    setFilterType]  = useState('All');
  const [error,         setError]       = useState(null);
  const intervalRef = useRef(null);

  // -------------------------------------------------------------------------
  // Real-time build status simulation / Socket.IO
  // -------------------------------------------------------------------------

  /**
   * Toggles a project's build status to simulate CI activity.
   */
  const tickBuilds = useCallback(() => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.buildStatus !== 'passing' && p.buildStatus !== 'failing') return p;
        if (Math.random() < 0.15) {
          return { ...p, buildStatus: Math.random() > 0.3 ? 'passing' : 'failing', lastActivity: 'just now' };
        }
        return p;
      })
    );
  }, []);

  useEffect(() => {
    let socketBound = false;
    try {
      if (typeof window !== 'undefined' && window.nexusSocket) {
        const sock = window.nexusSocket;
        sock.on('gamedev:build', (payload) => {
          if (!payload?.projectId) return;
          setProjects((prev) =>
            prev.map((p) => p.id === payload.projectId
              ? { ...p, buildStatus: payload.status, lastActivity: 'just now' }
              : p
            )
          );
        });
        sock.on('gamedev:task', (payload) => {
          if (!payload?.task || !payload?.column) return;
          setTasks((prev) => {
            const col = payload.column;
            return { ...prev, [col]: [...(prev[col] || []), payload.task] };
          });
        });
        sock.emit('gamedev:subscribe');
        socketBound = true;
      }
    } catch (err) {
      console.warn('[GameDevDashboard] Socket binding failed:', err);
    }

    if (!socketBound) {
      intervalRef.current = setInterval(tickBuilds, 20_000);
    }

    return () => {
      if (socketBound && window.nexusSocket) {
        try {
          window.nexusSocket.off('gamedev:build');
          window.nexusSocket.off('gamedev:task');
          window.nexusSocket.emit('gamedev:unsubscribe');
        } catch (_) {}
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tickBuilds]);

  // -------------------------------------------------------------------------
  // Connector actions
  // -------------------------------------------------------------------------

  /**
   * Toggles the connected state of a platform connector.
   * @param {string} id
   */
  const handleToggleConnector = useCallback((id) => {
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, connected: !c.connected, status: c.connected ? 'disconnected' : 'connected' }
          : c
      )
    );
  }, []);

  /**
   * Triggers a sync for a platform connector.
   * @param {string} id
   */
  const handleSyncConnector = useCallback((id) => {
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'syncing' } : c))
    );
    // Simulate sync completion after 2 seconds.
    setTimeout(() => {
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: c.connected ? 'connected' : 'disconnected', lastSync: 'just now' }
            : c
        )
      );
    }, 2_000);
  }, []);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const activeProject = projects.find((p) => p.id === selectedProj) || projects[0];

  const filteredProjects = filterType === 'All'
    ? projects
    : projects.filter((p) => p.type === filterType);

  const totalTasks = Object.values(tasks).flat().length;
  const doneTasks   = tasks['Done']?.length || 0;
  const activeTasks = tasks['In Progress']?.length || 0;

  const openBugs     = projects.reduce((acc, p) => acc + p.bugs.open, 0);
  const criticalBugs = projects.reduce((acc, p) => acc + p.bugs.critical, 0);
  const connectedPlatforms = connectors.filter((c) => c.connected).length;

  // -------------------------------------------------------------------------
  // Shared styles
  // -------------------------------------------------------------------------

  const s = {
    root: {
      background: BG_BASE, minHeight: '100vh',
      color: '#e2e2ea',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '20px 16px 60px', boxSizing: 'border-box',
    },
    header: {
      display: 'flex', flexWrap: 'wrap', gap: 12,
      alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
    },
    title: { fontSize: 22, fontWeight: 700, margin: 0, color: '#fff' },
    navRow: { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
    navBtn: (active) => ({
      padding: '6px 14px', borderRadius: 8,
      border: `1px solid ${active ? ACCENT : BORDER}`,
      background: active ? `${ACCENT}22` : 'transparent',
      color: active ? ACCENT : '#555',
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
    }),
    card: {
      background: BG_CARD, border: `1px solid ${BORDER}`,
      borderRadius: 14, padding: '18px 20px', marginBottom: 16,
    },
    cardTitle: { fontSize: 13, fontWeight: 600, color: '#888', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    statsRow: { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    statCard: (color) => ({
      background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: '14px 16px', flex: '1 1 120px', minWidth: 110,
    }),
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 },
    filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
    filterBtn: (active, color) => ({
      padding: '4px 12px', borderRadius: 12,
      border: `1px solid ${active ? color : BORDER}`,
      background: active ? `${color}22` : 'transparent',
      color: active ? color : '#555',
      fontSize: 11, fontWeight: 600, cursor: 'pointer',
    }),
    errorBox: {
      background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444',
      borderRadius: 8, padding: '10px 14px', marginBottom: 16,
      color: '#fca5a5', fontSize: 12,
    },
    kanbanCol: {
      flex: '1 1 220px', minWidth: 200,
      background: '#0e0e12', border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: '12px 12px 6px',
    },
    kanbanColHeader: { fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#aaa' },
  };

  // -------------------------------------------------------------------------
  // Section renderers
  // -------------------------------------------------------------------------

  const renderOverview = () => (
    <>
      {/* Summary KPI row */}
      <div style={s.statsRow}>
        {[
          { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, color: ACCENT },
          { label: 'Platforms Connected', value: connectedPlatforms, color: GREEN },
          { label: 'Tasks In Progress', value: activeTasks, color: AMBER },
          { label: 'Open Bugs', value: openBugs, color: criticalBugs > 0 ? RED : '#bbb' },
          { label: 'Critical Bugs', value: criticalBugs, color: RED },
          { label: 'Tasks Done', value: doneTasks, color: GREEN },
        ].map(({ label, value, color }) => (
          <div key={label} style={s.statCard()}>
            <p style={{ margin: 0, fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Selected project detail */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <p style={s.cardTitle}>Project Focus</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {projects.map((p) => (
              <button key={p.id} onClick={() => setSelectedProj(p.id)}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${selectedProj === p.id ? typeColor(p.type) : BORDER}`,
                  background: selectedProj === p.id ? `${typeColor(p.type)}22` : 'transparent',
                  color: selectedProj === p.id ? typeColor(p.type) : '#555',
                }}>
                {p.title}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>{activeProject.title}</h2>
            <span style={{ fontSize: 12, color: typeColor(activeProject.type), fontWeight: 600 }}>
              {PROJECT_TYPES.find(t => t.type === activeProject.type)?.icon} {activeProject.type}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 700,
              background: `${buildColor(activeProject.buildStatus)}22`,
              color: buildColor(activeProject.buildStatus),
            }}>
              Build: {activeProject.buildStatus}
            </span>
            <span style={{ fontSize: 11, color: '#555' }}>Activity: {activeProject.lastActivity}</span>
          </div>
        </div>

        <p style={{ margin: '0 0 6px', fontSize: 12, color: '#666' }}>Overall progress</p>
        <ProgressBar value={activeProject.progress} color={typeColor(activeProject.type)} />

        {/* Milestones */}
        <p style={{ ...s.cardTitle, marginTop: 18 }}>Milestones</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeProject.milestones.map((ms, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: ms.done ? `${GREEN}22` : '#1a1a22',
                border: `1.5px solid ${ms.done ? GREEN : BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: ms.done ? GREEN : '#444',
              }}>
                {ms.done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 13, color: ms.done ? '#888' : '#ccc',
                textDecoration: ms.done ? 'line-through' : 'none' }}>
                {ms.label}
              </span>
            </div>
          ))}
        </div>

        {/* Build pipeline */}
        <p style={{ ...s.cardTitle, marginTop: 18 }}>Build Pipeline</p>
        <BuildPipelineDiagram status={activeProject.buildStatus} projectName={activeProject.title} />

        {/* Bug tracker summary */}
        <p style={{ ...s.cardTitle, marginTop: 18 }}>Bug Tracker</p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Open',     value: activeProject.bugs.open,     color: AMBER },
            { label: 'Critical', value: activeProject.bugs.critical,  color: RED   },
            { label: 'Closed',   value: activeProject.bugs.closed,    color: GREEN },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: `${color}12`, border: `1px solid ${color}33`,
              borderRadius: 8, padding: '8px 16px', textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color }}>{value}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderProjects = () => (
    <>
      <div style={s.filterRow}>
        {['All', ...PROJECT_TYPES.map(t => t.type)].map((type) => {
          const info = PROJECT_TYPES.find(t => t.type === type);
          const color = info?.color || ACCENT;
          return (
            <button key={type} onClick={() => setFilterType(type)}
              style={s.filterBtn(filterType === type, color)}>
              {info?.icon || '🗂'} {type}
            </button>
          );
        })}
      </div>

      <div style={s.grid2}>
        {filteredProjects.map((project) => (
          <div key={project.id} style={{
            background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px',
            borderLeft: `3px solid ${typeColor(project.type)}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#ddd' }}>{project.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: typeColor(project.type) }}>
                  {PROJECT_TYPES.find(t => t.type === project.type)?.icon} {project.type}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                  background: `${buildColor(project.buildStatus)}18`,
                  color: buildColor(project.buildStatus),
                }}>
                  {project.buildStatus}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#444' }}>{project.lastActivity}</p>
              </div>
            </div>

            <ProgressBar value={project.progress} color={typeColor(project.type)} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#555' }}>
              <span>✓ {project.milestones.filter(m => m.done).length}/{project.milestones.length} milestones</span>
              <span style={{ color: project.bugs.critical > 0 ? RED : '#555' }}>
                🐛 {project.bugs.open} open · {project.bugs.critical} critical
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderConnectors = () => (
    <div style={s.grid3}>
      {connectors.map((c) => (
        <ConnectorCard key={c.id} connector={c}
          onToggle={handleToggleConnector} onSync={handleSyncConnector} />
      ))}
    </div>
  );

  /** @type {Array<KanbanColumn>} */
  const COLUMNS = ['TODO', 'In Progress', 'Done'];
  const COL_COLORS = { 'TODO': '#555', 'In Progress': AMBER, 'Done': GREEN };

  const renderKanban = () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {COLUMNS.map((col) => (
        <div key={col} style={s.kanbanCol}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ ...s.kanbanColHeader, color: COL_COLORS[col], margin: 0 }}>
              {col}
            </p>
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 8,
              background: `${COL_COLORS[col]}22`, color: COL_COLORS[col], fontWeight: 700,
            }}>
              {tasks[col]?.length || 0}
            </span>
          </div>
          {(tasks[col] || []).map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </div>
      ))}
    </div>
  );

  const renderAchievements = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        {Object.entries(RARITY_COLORS).map(([rarity, color]) => (
          <span key={rarity} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 10,
            background: `${color}18`, color, fontWeight: 700,
            textTransform: 'capitalize',
          }}>
            {rarity}: {ACHIEVEMENTS.filter(a => a.rarity === rarity).length}
          </span>
        ))}
      </div>
      {ACHIEVEMENTS.map((ach) => (
        <AchievementBadge key={ach.id} achievement={ach} />
      ))}
    </div>
  );

  const renderBuildPipelines = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {projects.map((project) => (
        <div key={project.id} style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#ddd' }}>{project.title}</p>
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 700,
              background: `${buildColor(project.buildStatus)}18`, color: buildColor(project.buildStatus),
            }}>
              {project.buildStatus.toUpperCase()}
            </span>
          </div>
          <BuildPipelineDiagram status={project.buildStatus} projectName={project.title} />
        </div>
      ))}
    </div>
  );

  const SECTIONS = [
    { id: 'overview',      label: '📊 Overview'    },
    { id: 'projects',      label: '📁 Projects'    },
    { id: 'kanban',        label: '📋 Kanban'      },
    { id: 'connectors',    label: '🔌 Connectors'  },
    { id: 'builds',        label: '🔨 Pipelines'   },
    { id: 'achievements',  label: '🏆 Achievements' },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <GameDevErrorBoundary>
      <div style={s.root}>

        {/* ---- Header ---- */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Game Dev Dashboard</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555' }}>
              Project tracking · Build pipelines · Platform connectors
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: GREEN }}>● {connectedPlatforms}/{connectors.length} platforms</span>
            <span style={{ fontSize: 12, color: criticalBugs > 0 ? RED : '#555' }}>
              🐛 {criticalBugs} critical
            </span>
          </div>
        </div>

        {/* ---- Error banner ---- */}
        {error && (
          <div style={s.errorBox}>
            {error}
            <button onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 700 }}>
              ×
            </button>
          </div>
        )}

        {/* ---- Navigation ---- */}
        <div style={s.navRow}>
          {SECTIONS.map(({ id, label }) => (
            <button key={id} style={s.navBtn(activeSection === id)}
              onClick={() => setActiveSection(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* ---- Section content ---- */}
        {activeSection === 'overview'     && renderOverview()}
        {activeSection === 'projects'     && renderProjects()}
        {activeSection === 'kanban'       && renderKanban()}
        {activeSection === 'connectors'   && renderConnectors()}
        {activeSection === 'builds'       && renderBuildPipelines()}
        {activeSection === 'achievements' && renderAchievements()}

      </div>
    </GameDevErrorBoundary>
  );
};

export default GameDevDashboard;
