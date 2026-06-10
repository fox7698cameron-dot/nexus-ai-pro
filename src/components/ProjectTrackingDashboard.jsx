// /home/user/nexus-ai-pro/src/components/ProjectTrackingDashboard.jsx | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

/**
 * Project Tracking Dashboard — Kanban board, achievement showcase, game progress,
 * and AR/VR/3D metrics panel with real-time Socket.IO updates.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Code2, Gamepad2, Layers, Box,
  Trophy, Star, Shield, Target,
  Clock, GitBranch, GitPullRequest, CheckCircle2,
  AlertCircle, Loader2, Wifi, WifiOff,
  ChevronDown, ChevronRight, RefreshCw,
  Cpu, Monitor, Smartphone, Headset,
  Plus, Trash2, Edit3, BarChart2, Activity,
  Zap, Package, Users
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { id: 'planning',    label: 'Planning',     color: 'blue' },
  { id: 'in-progress', label: 'In Progress',  color: 'yellow' },
  { id: 'testing',     label: 'Testing',      color: 'purple' },
  { id: 'done',        label: 'Done',         color: 'green' }
];

const PROJECT_TYPE_META = {
  'coding':     { label: 'Coding',    Icon: Code2,    color: 'cyan'    },
  'game-dev':   { label: 'Game Dev',  Icon: Gamepad2, color: 'orange'  },
  'ar-vr':      { label: 'AR/VR',     Icon: Headset,  color: 'violet'  },
  '3d-modeling':{ label: '3D Model',  Icon: Box,      color: 'rose'    }
};

const PLATFORM_BADGE_META = {
  epic:    { label: 'Epic',    bg: 'bg-gray-800',   text: 'text-white',      border: 'border-gray-600' },
  psn:     { label: 'PSN',     bg: 'bg-blue-900',   text: 'text-blue-100',   border: 'border-blue-700' },
  xbox:    { label: 'Xbox',    bg: 'bg-green-900',  text: 'text-green-100',  border: 'border-green-700' },
  ubisoft: { label: 'Ubisoft', bg: 'bg-indigo-900', text: 'text-indigo-100', border: 'border-indigo-700' },
  unreal:  { label: 'Unreal',  bg: 'bg-red-900',    text: 'text-red-100',    border: 'border-red-700' }
};

const BUILD_STATUS_META = {
  passing: { label: 'Passing', Icon: CheckCircle2, color: 'text-green-400' },
  failing: { label: 'Failing', Icon: AlertCircle,  color: 'text-red-400'   },
  pending: { label: 'Pending', Icon: Loader2,      color: 'text-yellow-400' },
  unknown: { label: 'Unknown', Icon: AlertCircle,  color: 'text-gray-400'  }
};

// ─── Theme Helpers ────────────────────────────────────────────────────────────

/**
 * Returns Tailwind class tokens based on the active theme.
 * @param {'dark'|'light'} theme
 */
function useThemeClasses(theme) {
  const dark = theme !== 'light';
  return {
    bg:          dark ? 'bg-gray-900'  : 'bg-gray-50',
    card:        dark ? 'bg-gray-800'  : 'bg-white',
    cardBorder:  dark ? 'border-gray-700' : 'border-gray-200',
    text:        dark ? 'text-gray-100' : 'text-gray-900',
    subtext:     dark ? 'text-gray-400' : 'text-gray-500',
    column:      dark ? 'bg-gray-800/60' : 'bg-gray-100',
    colHeader:   dark ? 'text-gray-300' : 'text-gray-700',
    badge:       dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700',
    input:       dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
    btn:         dark ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white',
    btnGhost:    dark ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Horizontal progress bar.
 * @param {{ value: number, max?: number, color?: string, label?: string }} props
 */
function ProgressBar({ value, max = 100, color = 'bg-indigo-500', label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1 text-xs">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Circular gauge SVG for polygon budget.
 * @param {{ used: number, total: number, size?: number }} props
 */
function PolygonGauge({ used, total, size = 80 }) {
  const pct    = total > 0 ? Math.min(1, used / total) : 0;
  const r      = (size - 10) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color  = pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : '#6366f1';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#374151" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        fill="#e5e7eb" fontSize="12" className="rotate-90 origin-center"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

/**
 * Platform badge pill.
 * @param {{ platform: string }} props
 */
function PlatformBadge({ platform }) {
  const meta = PLATFORM_BADGE_META[platform] ?? {
    label: platform, bg: 'bg-gray-700', text: 'text-gray-200', border: 'border-gray-600'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}>
      {meta.label}
    </span>
  );
}

/**
 * Single achievement card.
 * @param {{ achievement: object, tc: object }} props
 */
function AchievementCard({ achievement, tc }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${tc.card} ${tc.cardBorder}`}>
      {achievement.iconUrl
        ? <img src={achievement.iconUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
        : <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
      }
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold truncate ${tc.text}`}>{achievement.title}</p>
          <PlatformBadge platform={achievement.platform} />
        </div>
        <p className={`text-xs mt-0.5 line-clamp-2 ${tc.subtext}`}>{achievement.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Star className="w-3 h-3 text-yellow-400" />
          <span className="text-xs text-yellow-400 font-medium">{achievement.points} pts</span>
          {achievement.unlocked && achievement.unlockedAt && (
            <span className={`text-xs ${tc.subtext}`}>
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </span>
          )}
          {!achievement.unlocked && (
            <span className="text-xs text-gray-500 italic">Locked</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Single game progress card.
 * @param {{ game: object, tc: object }} props
 */
function GameProgressCard({ game, tc }) {
  return (
    <div className={`p-4 rounded-lg border ${tc.card} ${tc.cardBorder} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`font-semibold text-sm ${tc.text}`}>{game.title}</p>
          <PlatformBadge platform={game.platform} />
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Last played</p>
          <p className={`text-xs ${tc.subtext}`}>
            {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      <ProgressBar value={game.completion} label="Completion" color="bg-indigo-500" />

      <div className="flex items-center gap-4 text-xs">
        <span className={`flex items-center gap-1 ${tc.subtext}`}>
          <Clock className="w-3 h-3" />
          {Math.round((game.playtime ?? 0) / 60)}h {(game.playtime ?? 0) % 60}m
        </span>
        <span className={`flex items-center gap-1 ${tc.subtext}`}>
          <Trophy className="w-3 h-3 text-yellow-400" />
          {game.trophies} trophies
        </span>
      </div>
    </div>
  );
}

/**
 * AR/VR/3D metrics panel.
 * @param {{ metrics: object, tc: object }} props
 */
function ArVrMetricsPanel({ metrics, tc }) {
  if (!metrics) return null;

  const {
    polygonBudgetUsed  = 0,
    polygonBudgetTotal = 500000,
    textureMemoryMB    = 0,
    sceneObjectCount   = 0,
    targetPlatform     = '—',
    renderTargetFps    = 72
  } = metrics;

  const fpsPct = Math.min(100, (renderTargetFps / 120) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <PolygonGauge used={polygonBudgetUsed} total={polygonBudgetTotal} size={80} />
        <div className="space-y-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${tc.subtext}`}>Polygon Budget</p>
          <p className={`text-sm font-bold ${tc.text}`}>
            {polygonBudgetUsed.toLocaleString()} / {polygonBudgetTotal.toLocaleString()}
          </p>
          <p className={`text-xs ${tc.subtext}`}>Target: {targetPlatform}</p>
        </div>
      </div>

      <div className="space-y-2">
        <ProgressBar
          value={fpsPct}
          label={`FPS Target: ${renderTargetFps} fps`}
          color={renderTargetFps >= 90 ? 'bg-green-500' : renderTargetFps >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
        />
        <ProgressBar
          value={textureMemoryMB}
          max={512}
          label={`Texture Memory: ${textureMemoryMB} MB / 512 MB`}
          color="bg-violet-500"
        />
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className={`flex items-center gap-1 ${tc.subtext}`}>
          <Box className="w-3 h-3" />
          {sceneObjectCount.toLocaleString()} scene objects
        </span>
      </div>
    </div>
  );
}

/**
 * Coding metrics panel.
 * @param {{ metrics: object, tc: object }} props
 */
function CodingMetricsPanel({ metrics, tc }) {
  if (!metrics) return null;

  const buildMeta = BUILD_STATUS_META[metrics.buildStatus] ?? BUILD_STATUS_META.unknown;
  const BuildIcon = buildMeta.Icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BuildIcon className={`w-4 h-4 ${buildMeta.color}`} />
        <span className={`text-sm ${buildMeta.color} font-medium`}>Build {buildMeta.label}</span>
      </div>

      <ProgressBar value={metrics.testCoverage ?? 0} label="Test Coverage" color="bg-green-500" />

      <div className="flex flex-wrap gap-3 text-xs">
        <span className={`flex items-center gap-1 ${tc.subtext}`}>
          <GitBranch className="w-3 h-3" />
          {metrics.commitCount ?? 0} commits
        </span>
        <span className={`flex items-center gap-1 ${tc.subtext}`}>
          <GitPullRequest className="w-3 h-3" />
          {metrics.openPRs ?? 0} open PRs
        </span>
      </div>

      {metrics.locByLanguage && Object.keys(metrics.locByLanguage).length > 0 && (
        <div className="space-y-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${tc.subtext}`}>Lines of Code</p>
          {Object.entries(metrics.locByLanguage).map(([lang, loc]) => (
            <div key={lang} className="flex items-center justify-between text-xs">
              <span className={tc.subtext}>{lang}</span>
              <span className={`font-mono ${tc.text}`}>{loc.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Game dev metrics panel (milestones + build sizes).
 * @param {{ metrics: object, tc: object }} props
 */
function GameDevMetricsPanel({ metrics, tc }) {
  if (!metrics) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${tc.badge}`}>
          {metrics.engine ?? 'custom'}
        </span>
        {(metrics.platformTargets ?? []).map(pt => (
          <span key={pt} className={`text-xs px-2 py-0.5 rounded ${tc.badge}`}>{pt}</span>
        ))}
      </div>

      {(metrics.milestones ?? []).length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs font-semibold uppercase tracking-wide ${tc.subtext}`}>Milestones</p>
          {metrics.milestones.map(ms => (
            <div key={ms.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`truncate ${tc.text}`}>{ms.title}</span>
                {ms.done && <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />}
              </div>
              <ProgressBar
                value={ms.completion}
                color={ms.done ? 'bg-green-500' : 'bg-indigo-500'}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs">
        <span className={`flex items-center gap-1 ${tc.subtext}`}>
          <Package className="w-3 h-3" />
          {(metrics.assetCount ?? 0).toLocaleString()} assets
        </span>
      </div>
    </div>
  );
}

/**
 * Project card for the Kanban board.
 * @param {{ project: object, tc: object, onEdit: Function, onDelete: Function }} props
 */
function ProjectCard({ project, tc, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const typeMeta = PROJECT_TYPE_META[project.type] ?? { label: project.type, Icon: Code2, color: 'gray' };
  const TypeIcon = typeMeta.Icon;

  function renderMetrics() {
    if (!project.metrics) return null;
    if (project.type === 'coding')      return <CodingMetricsPanel  metrics={project.metrics} tc={tc} />;
    if (project.type === 'game-dev')    return <GameDevMetricsPanel  metrics={project.metrics} tc={tc} />;
    if (project.type === 'ar-vr')       return <ArVrMetricsPanel     metrics={project.metrics} tc={tc} />;
    if (project.type === '3d-modeling') return <ArVrMetricsPanel     metrics={project.metrics} tc={tc} />;
    return null;
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${tc.card} ${tc.cardBorder} transition-shadow hover:shadow-lg`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon className={`w-4 h-4 flex-shrink-0 text-${typeMeta.color}-400`} />
          <p className={`font-semibold text-sm truncate ${tc.text}`}>{project.name}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(project)} className={`p-1 rounded ${tc.btnGhost}`} title="Edit">
            <Edit3 className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(project.id)} className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-900/20" title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className={`text-xs line-clamp-2 ${tc.subtext}`}>{project.description}</p>
      )}

      {/* Type badge */}
      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-${typeMeta.color}-900/40 text-${typeMeta.color}-300 border border-${typeMeta.color}-800`}>
        {typeMeta.label}
      </span>

      {/* Expand / collapse metrics */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={`flex items-center gap-1 text-xs ${tc.subtext} hover:${tc.text} transition-colors`}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {expanded ? 'Hide metrics' : 'Show metrics'}
      </button>

      {expanded && (
        <div className={`pt-2 border-t ${tc.cardBorder}`}>
          {renderMetrics()}
        </div>
      )}
    </div>
  );
}

/**
 * Kanban column.
 * @param {{ column: object, projects: object[], tc: object, onEdit: Function, onDelete: Function }} props
 */
function KanbanColumn({ column, projects, tc, onEdit, onDelete }) {
  const colorMap = {
    blue:   'bg-blue-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    green:  'bg-green-500'
  };
  const dot = colorMap[column.color] ?? 'bg-gray-500';

  return (
    <div className={`flex-1 min-w-[220px] max-w-xs rounded-xl p-3 ${tc.column}`}>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <p className={`text-sm font-semibold ${tc.colHeader}`}>{column.label}</p>
        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${tc.badge}`}>{projects.length}</span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {projects.length === 0 && (
          <p className={`text-xs text-center py-4 ${tc.subtext}`}>No projects</p>
        )}
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} tc={tc} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Project Tracking Dashboard.
 * @param {{ theme?: 'dark'|'light' }} props
 */
export default function ProjectTrackingDashboard({ theme = 'dark' }) {
  const tc = useThemeClasses(theme);

  // ── State ──
  const [projects,     setProjects]     = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [gameProgress, setGameProgress] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [connected,    setConnected]    = useState(false);
  const [activeTab,    setActiveTab]    = useState('board');
  const [editProject,  setEditProject]  = useState(null);
  const [showNewForm,  setShowNewForm]  = useState(false);
  const [newProject,   setNewProject]   = useState({ name: '', description: '', type: 'coding', status: 'planning' });
  const [error,        setError]        = useState(null);

  const socketRef = useRef(null);

  // ── Fetch helpers ──
  const fetchProjects = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (err) {
      setError(`Failed to load projects: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Socket.IO real-time updates ──
  useEffect(() => {
    const socket = window.__SOCKET__;
    if (!socket) return;

    socketRef.current = socket;

    function onConnect()    { setConnected(true); }
    function onDisconnect() { setConnected(false); }

    function onProjectUpdate({ project }) {
      setProjects(prev => {
        const idx = prev.findIndex(p => p.id === project.id);
        if (idx === -1) return [project, ...prev];
        const next = [...prev];
        next[idx] = project;
        return next;
      });
    }

    function onProjectDelete({ projectId }) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }

    socket.on('connect',        onConnect);
    socket.on('disconnect',     onDisconnect);
    socket.on('project:update', onProjectUpdate);
    socket.on('project:delete', onProjectDelete);

    setConnected(socket.connected);

    return () => {
      socket.off('connect',        onConnect);
      socket.off('disconnect',     onDisconnect);
      socket.off('project:update', onProjectUpdate);
      socket.off('project:delete', onProjectDelete);
    };
  }, []);

  // ── Initial load ──
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // ── CRUD actions ──
  async function handleCreateProject(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(newProject)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setShowNewForm(false);
      setNewProject({ name: '', description: '', type: 'coding', status: 'planning' });
      // Socket.IO update will refresh state; fallback to manual fetch
      if (!socketRef.current?.connected) fetchProjects();
    } catch (err) {
      setError(`Create failed: ${err.message}`);
    }
  }

  async function handleDeleteProject(id) {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!socketRef.current?.connected) fetchProjects();
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    }
  }

  async function handleUpdateProject(id, patch) {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setEditProject(null);
      if (!socketRef.current?.connected) fetchProjects();
    } catch (err) {
      setError(`Update failed: ${err.message}`);
    }
  }

  // ── Kanban grouping ──
  const byStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = projects.filter(p => p.status === col.id);
    return acc;
  }, {});

  // ── Tabs ──
  const TABS = [
    { id: 'board',        label: 'Kanban Board',     Icon: BarChart2  },
    { id: 'achievements', label: 'Achievements',      Icon: Trophy     },
    { id: 'progress',     label: 'Game Progress',     Icon: Activity   }
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${tc.bg} ${tc.text} font-sans`}>
      {/* ── Header ── */}
      <header className={`sticky top-0 z-10 px-6 py-4 border-b ${tc.cardBorder} ${tc.card} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-6 h-6 text-indigo-400" />
          <h1 className="text-lg font-bold">Project Tracker</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time status */}
          <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${connected ? 'border-green-700 bg-green-900/30 text-green-400' : 'border-gray-700 bg-gray-800 text-gray-400'}`}>
            {connected
              ? <><Wifi className="w-3 h-3" /> Live</>
              : <><WifiOff className="w-3 h-3" /> Offline</>
            }
          </span>

          <button onClick={fetchProjects} className={`p-2 rounded-lg ${tc.btnGhost}`} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowNewForm(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${tc.btn}`}
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      {/* ── New project form ── */}
      {showNewForm && (
        <div className="mx-6 mt-4">
          <form onSubmit={handleCreateProject} className={`p-5 rounded-xl border ${tc.card} ${tc.cardBorder} space-y-4`}>
            <h2 className="font-semibold text-sm">New Project</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs mb-1 ${tc.subtext}`}>Name *</label>
                <input
                  required
                  value={newProject.name}
                  onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                  placeholder="My awesome project"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${tc.input}`}
                />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${tc.subtext}`}>Type *</label>
                <select
                  value={newProject.type}
                  onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${tc.input}`}
                >
                  {Object.entries(PROJECT_TYPE_META).map(([id, meta]) => (
                    <option key={id} value={id}>{meta.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${tc.subtext}`}>Status</label>
                <select
                  value={newProject.status}
                  onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${tc.input}`}
                >
                  {KANBAN_COLUMNS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${tc.subtext}`}>Description</label>
                <input
                  value={newProject.description}
                  onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
                  placeholder="Short description…"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${tc.input}`}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewForm(false)} className={`px-4 py-1.5 rounded-lg text-sm ${tc.btnGhost}`}>
                Cancel
              </button>
              <button type="submit" className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tc.btn}`}>
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editProject && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl border p-6 space-y-4 ${tc.card} ${tc.cardBorder}`}>
            <h2 className="font-semibold">Edit Project</h2>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs mb-1 ${tc.subtext}`}>Name</label>
                <input
                  value={editProject.name}
                  onChange={e => setEditProject(p => ({ ...p, name: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${tc.input}`}
                />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${tc.subtext}`}>Status</label>
                <select
                  value={editProject.status}
                  onChange={e => setEditProject(p => ({ ...p, status: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${tc.input}`}
                >
                  {KANBAN_COLUMNS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${tc.subtext}`}>Description</label>
                <input
                  value={editProject.description ?? ''}
                  onChange={e => setEditProject(p => ({ ...p, description: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${tc.input}`}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditProject(null)} className={`px-4 py-1.5 rounded-lg text-sm ${tc.btnGhost}`}>
                Cancel
              </button>
              <button
                onClick={() => handleUpdateProject(editProject.id, { name: editProject.name, status: editProject.status, description: editProject.description })}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tc.btn}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className={`px-6 pt-4 border-b ${tc.cardBorder}`}>
        <nav className="flex gap-1">
          {TABS.map(tab => {
            const TabIcon = tab.Icon;
            const active  = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  active
                    ? 'border-indigo-500 text-indigo-400'
                    : `border-transparent ${tc.subtext} hover:text-gray-300`
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Main content ── */}
      <main className="px-6 py-6">
        {/* Kanban Board */}
        {activeTab === 'board' && (
          <div>
            {loading
              ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
              : (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {KANBAN_COLUMNS.map(col => (
                    <KanbanColumn
                      key={col.id}
                      column={col}
                      projects={byStatus[col.id] ?? []}
                      tc={tc}
                      onEdit={setEditProject}
                      onDelete={handleDeleteProject}
                    />
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* Achievements tab */}
        {activeTab === 'achievements' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Achievement Showcase</h2>
              <div className="flex gap-2">
                {Object.keys(PLATFORM_BADGE_META).map(p => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
            </div>

            {achievements.length === 0
              ? (
                <div className={`text-center py-16 ${tc.subtext}`}>
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No achievements loaded.</p>
                  <p className="text-xs mt-1">Connect a platform to see achievements here.</p>
                </div>
              )
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {achievements.map(a => (
                    <AchievementCard key={`${a.platform}-${a.id}`} achievement={a} tc={tc} />
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* Game Progress tab */}
        {activeTab === 'progress' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Game Progress</h2>
            </div>

            {gameProgress.length === 0
              ? (
                <div className={`text-center py-16 ${tc.subtext}`}>
                  <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No game progress loaded.</p>
                  <p className="text-xs mt-1">Connect a platform to see game progress here.</p>
                </div>
              )
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gameProgress.map(g => (
                    <GameProgressCard key={`${g.platform}-${g.gameId}`} game={g} tc={tc} />
                  ))}
                </div>
              )
            }
          </div>
        )}
      </main>
    </div>
  );
}
