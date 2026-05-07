// GameDashboard.jsx — 2026-05-07

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Plug, Box, Timer, BarChart2,
  Plus, RefreshCw, CheckCircle2, Lock, Loader2,
  ChevronRight, Activity, Cpu, Layers, Clock,
} from 'lucide-react';

// ─── Enum-style constants (mirror server side) ───────────────────────────────

const PROJECT_TYPES = Object.freeze({
  GAME:    'game',
  APP:     'app',
  AR_VR:   'ar-vr',
  THREE_D: '3d',
  CODING:  'coding',
});

const STATUS_CODES = Object.freeze({
  ACTIVE:    'active',
  PAUSED:    'paused',
  COMPLETED: 'completed',
  ARCHIVED:  'archived',
  CANCELLED: 'cancelled',
});

const PLATFORM_IDS = Object.freeze({
  UNREAL:      'unreal',
  EPIC_GAMES:  'epic_games',
  PLAYSTATION: 'playstation',
  XBOX:        'xbox',
  UBISOFT:     'ubisoft',
});

const ACHIEVEMENT_RARITY = Object.freeze({
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  EPIC:      'epic',
  LEGENDARY: 'legendary',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_BADGE_COLORS = {
  [PROJECT_TYPES.GAME]:    'bg-purple-500/20 text-purple-300 border-purple-500/40',
  [PROJECT_TYPES.APP]:     'bg-blue-500/20   text-blue-300   border-blue-500/40',
  [PROJECT_TYPES.AR_VR]:   'bg-cyan-500/20   text-cyan-300   border-cyan-500/40',
  [PROJECT_TYPES.THREE_D]: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  [PROJECT_TYPES.CODING]:  'bg-green-500/20  text-green-300  border-green-500/40',
};

const RARITY_COLORS = {
  [ACHIEVEMENT_RARITY.COMMON]:    'border-gray-400  text-gray-300',
  [ACHIEVEMENT_RARITY.UNCOMMON]:  'border-green-400 text-green-300',
  [ACHIEVEMENT_RARITY.RARE]:      'border-blue-400  text-blue-300',
  [ACHIEVEMENT_RARITY.EPIC]:      'border-purple-400 text-purple-300',
  [ACHIEVEMENT_RARITY.LEGENDARY]: 'border-yellow-400 text-yellow-300',
};

const PLATFORM_META = {
  [PLATFORM_IDS.UNREAL]:      { label: 'Unreal / Epic',      icon: '🎮', color: 'border-gray-500'   },
  [PLATFORM_IDS.EPIC_GAMES]:  { label: 'Epic Games Store',   icon: '🎮', color: 'border-gray-500'   },
  [PLATFORM_IDS.PLAYSTATION]: { label: 'PlayStation Network', icon: '🕹️', color: 'border-blue-600'  },
  [PLATFORM_IDS.XBOX]:        { label: 'Xbox / Game Pass',    icon: '🎯', color: 'border-green-600' },
  [PLATFORM_IDS.UBISOFT]:     { label: 'Ubisoft Connect',     icon: '🔵', color: 'border-blue-400'  },
};

const STATUS_PILL = {
  [STATUS_CODES.ACTIVE]:    'bg-green-500/20 text-green-300',
  [STATUS_CODES.PAUSED]:    'bg-yellow-500/20 text-yellow-300',
  [STATUS_CODES.COMPLETED]: 'bg-blue-500/20  text-blue-300',
  [STATUS_CODES.ARCHIVED]:  'bg-gray-500/20  text-gray-400',
  [STATUS_CODES.CANCELLED]: 'bg-red-500/20   text-red-400',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ percent, className = '' }) {
  const pct = Math.max(0, Math.min(100, percent ?? 0));
  const color = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-purple-500';
  return (
    <div className={`w-full bg-white/10 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: PROJECT_TYPES.GAME, description: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreate(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Project Name</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Game"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Type</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              {Object.values(PROJECT_TYPES).map(t => (
                <option key={t} value={t} className="bg-gray-800">{t.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Short project description…"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  const typeCls   = TYPE_BADGE_COLORS[project.type]   ?? 'bg-gray-500/20 text-gray-300';
  const statusCls = STATUS_PILL[project.status]        ?? 'bg-gray-500/20 text-gray-400';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:bg-white/8 transition group">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-white font-semibold text-base truncate">{project.name}</h3>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${statusCls}`}>{project.status}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${typeCls}`}>{project.type.toUpperCase()}</span>
        {project.platforms.map(p => (
          <span key={p} className="text-base" title={PLATFORM_META[p]?.label ?? p}>
            {PLATFORM_META[p]?.icon ?? '🔗'}
          </span>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <ProgressBar percent={project.progress} />
      </div>
      {project.milestone && (
        <p className="text-xs text-cyan-400 truncate">Milestone: {project.milestone}</p>
      )}
      <p className="text-xs text-gray-500">Updated {fmtDate(project.updatedAt)}</p>
    </div>
  );
}

function AchievementCard({ achievement }) {
  const isLocked = !!achievement.locked;
  const rareCls  = RARITY_COLORS[achievement.rarity] ?? 'border-gray-400 text-gray-300';

  return (
    <div className={`relative border rounded-2xl p-4 flex flex-col gap-2 transition
      ${isLocked ? 'bg-white/2 border-white/5 opacity-50 grayscale' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}
    >
      {isLocked && (
        <div className="absolute top-3 right-3">
          <Lock size={14} className="text-gray-600" />
        </div>
      )}
      <div className="flex items-center gap-3">
        {!isLocked
          ? <CheckCircle2 size={22} className="text-yellow-400 shrink-0" />
          : <Trophy size={22} className="text-gray-600 shrink-0" />}
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{achievement.name}</p>
          <p className="text-gray-400 text-xs truncate">{achievement.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className={`text-xs border px-2 py-0.5 rounded-full capitalize ${rareCls}`}>{achievement.rarity}</span>
        <span className="text-xs text-yellow-400 font-medium">{achievement.xp} XP</span>
      </div>
      {achievement.awardedAt && (
        <p className="text-xs text-gray-500">{fmtDate(achievement.awardedAt)}</p>
      )}
    </div>
  );
}

function PlatformCard({ platformId, connection, onConnect, onSync, syncing }) {
  const meta      = PLATFORM_META[platformId] ?? { label: platformId, icon: '🔗', color: 'border-gray-500' };
  const connected = !!connection;

  return (
    <div className={`bg-white/5 border ${meta.color} rounded-2xl p-5 flex flex-col gap-3`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{meta.icon}</span>
        <div>
          <p className="text-white font-semibold">{meta.label}</p>
          <p className={`text-xs ${connected ? 'text-green-400' : 'text-gray-500'}`}>
            {connected ? 'Connected' : 'Not connected'}
          </p>
        </div>
      </div>
      {connected && connection.lastSync && (
        <p className="text-xs text-gray-400">Last synced: {fmtDate(connection.lastSync)}</p>
      )}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onConnect(platformId)}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition
            ${connected
              ? 'border border-red-500/40 text-red-400 hover:bg-red-500/10'
              : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
        {connected && (
          <button
            onClick={() => onSync(platformId)}
            disabled={syncing}
            className="px-3 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition disabled:opacity-50"
            title="Sync achievements"
          >
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function ArVrMetricsCard({ project }) {
  const metrics = project.arvrMetrics ?? {};
  const rows = [
    { label: 'Polygon Target',    value: metrics.polygonTarget    ?? '—', icon: <Layers size={14} /> },
    { label: 'Polygon Count',     value: metrics.polygonCount     ?? '—', icon: <Layers size={14} /> },
    { label: 'Render Time (ms)',  value: metrics.renderTime       ?? '—', icon: <Cpu size={14}    /> },
    { label: 'Asset Count',       value: metrics.assetCount       ?? '—', icon: <Box size={14}    /> },
    { label: 'Scene Complexity',  value: metrics.sceneComplexity  ?? '—', icon: <Activity size={14}/> },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
      <h3 className="text-white font-semibold truncate">{project.name}</h3>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-400">{r.icon}{r.label}</span>
            <span className="text-white font-medium">{String(r.value)}</span>
          </div>
        ))}
      </div>
      <ProgressBar percent={project.progress} className="mt-1" />
      <p className="text-xs text-gray-500 text-right">{project.progress}% complete</p>
    </div>
  );
}

function LiveSessionPanel({ activeSession, stats }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeSession?.startTime) return;
    const start = new Date(activeSession.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
        <Timer size={40} />
        <p className="text-lg font-medium">No active session</p>
        <p className="text-sm">Start a tracking session from your project.</p>
      </div>
    );
  }

  const metrics = [
    { label: 'Elapsed',          value: fmtDuration(elapsed),                   icon: <Clock size={16} />    },
    { label: 'Lines Changed',    value: activeSession.linesChanged ?? 0,         icon: <Activity size={16} /> },
    { label: 'Commits',          value: activeSession.commits ?? 0,              icon: <ChevronRight size={16}/>},
    { label: 'Tasks Completed',  value: stats?.tasks_done ?? 0,                  icon: <CheckCircle2 size={16}/>},
    { label: 'Total Hours',      value: `${stats?.total_hours?.toFixed(1) ?? 0}h`, icon: <Timer size={16} />  },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
        <h3 className="text-white font-semibold">Live Session</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-white/5 rounded-xl p-3 flex flex-col gap-1">
            <span className="flex items-center gap-1 text-gray-400 text-xs">{m.icon}{m.label}</span>
            <span className="text-white font-bold text-xl">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardPanel({ projects }) {
  const topProjects = [...projects]
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 10);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <BarChart2 size={18} className="text-yellow-400" /> Top Projects by Completion
        </h3>
      </div>
      {topProjects.length === 0 && (
        <p className="text-gray-500 text-sm p-5">No projects yet.</p>
      )}
      <ul className="divide-y divide-white/5">
        {topProjects.map((p, i) => (
          <li key={p.projectId} className="px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition">
            <span className={`text-sm font-bold w-5 shrink-0 ${i < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
              #{i + 1}
            </span>
            <span className="flex-1 text-white text-sm truncate">{p.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_BADGE_COLORS[p.type] ?? ''}`}>
              {p.type}
            </span>
            <div className="w-24 hidden sm:block">
              <ProgressBar percent={p.progress} />
            </div>
            <span className="text-sm font-semibold text-purple-300 w-10 text-right shrink-0">
              {p.progress}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'projects',     label: 'Projects',        Icon: Gamepad2  },
  { id: 'achievements', label: 'Achievements',     Icon: Trophy    },
  { id: 'platforms',    label: 'Platforms',        Icon: Plug      },
  { id: 'arvr',         label: 'AR/VR/3D',         Icon: Box       },
  { id: 'session',      label: 'Live Session',     Icon: Timer     },
  { id: 'leaderboard',  label: 'Leaderboard',      Icon: BarChart2 },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function GameDashboard({ userId, authToken, socket, darkMode = true, userRole = 'user' }) {
  const [activeTab,    setActiveTab]    = useState('projects');
  const [projects,     setProjects]     = useState([]);
  const [achievements, setAchievements] = useState({ unlocked: [], locked: [], xp: 0, level: 1 });
  const [platforms,    setPlatforms]    = useState({});
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStats,  setSessionStats]  = useState(null);
  const [syncingPlatform, setSyncingPlatform] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [toast,   setToast]             = useState(null);

  // Load initial data
  useEffect(() => {
    if (!userId || !authToken) return;
    const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

    const fetchAll = async () => {
      try {
        const [projRes, achRes, platRes] = await Promise.all([
          fetch(`/api/gaming/projects?userId=${encodeURIComponent(userId)}`, { headers }),
          fetch(`/api/gaming/achievements/${encodeURIComponent(userId)}`, { headers }),
          fetch(`/api/gaming/platforms/${encodeURIComponent(userId)}`, { headers }),
        ]);
        if (projRes.ok) setProjects(await projRes.json());
        if (achRes.ok)  setAchievements(await achRes.json());
        if (platRes.ok) setPlatforms(await platRes.json());
      } catch (err) {
        console.error('[GameDashboard] Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId, authToken]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onProgress = ({ projectId, percent, milestone }) => {
      setProjects(prev =>
        prev.map(p => p.projectId === projectId ? { ...p, progress: percent, milestone } : p)
      );
    };

    const onAchievement = ({ achievement }) => {
      setAchievements(prev => ({
        ...prev,
        unlocked: [...prev.unlocked, achievement],
        locked:   prev.locked.filter(a => a.id !== achievement.id),
      }));
      showToast(`Achievement unlocked: ${achievement.name}`, 'success');
    };

    const onSessionUpdate = ({ projectId, stats }) => {
      setSessionStats(stats);
      setActiveSession(prev => prev?.projectId === projectId ? { ...prev, ...stats } : prev);
    };

    socket.on('game:progress',        onProgress);
    socket.on('game:achievement',      onAchievement);
    socket.on('game:session:update',   onSessionUpdate);

    return () => {
      socket.off('game:progress',       onProgress);
      socket.off('game:achievement',     onAchievement);
      socket.off('game:session:update',  onSessionUpdate);
    };
  }, [socket]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleCreateProject = useCallback(async (formData) => {
    try {
      const res = await fetch('/api/gaming/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const project = await res.json();
      setProjects(prev => [project, ...prev]);
      showToast(`Project "${project.name}" created!`, 'success');
    } catch (err) {
      console.error('[GameDashboard] Create project error:', err);
      showToast('Failed to create project', 'error');
    }
  }, [userId, authToken, showToast]);

  const handlePlatformConnect = useCallback(async (platformId) => {
    const isConnected = !!platforms[platformId];
    if (isConnected) {
      setPlatforms(prev => { const n = { ...prev }; delete n[platformId]; return n; });
      showToast(`Disconnected from ${PLATFORM_META[platformId]?.label ?? platformId}`, 'info');
      return;
    }
    try {
      const res = await fetch(`/api/gaming/platforms/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, platformId }),
      });
      if (!res.ok) throw new Error('Failed to connect');
      const data = await res.json();
      if (data.oauthUrl) {
        window.open(data.oauthUrl, '_blank', 'width=600,height=700');
        showToast('Opened OAuth window — complete sign-in to connect.', 'info');
      } else {
        setPlatforms(prev => ({ ...prev, [platformId]: { ...data, lastSync: null } }));
        showToast(`Connected to ${PLATFORM_META[platformId]?.label ?? platformId}`, 'success');
      }
    } catch (err) {
      console.error('[GameDashboard] Platform connect error:', err);
      showToast('Connection failed', 'error');
    }
  }, [userId, authToken, platforms, showToast]);

  const handlePlatformSync = useCallback(async (platformId) => {
    setSyncingPlatform(platformId);
    try {
      const res = await fetch(`/api/gaming/platforms/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, platformId }),
      });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      setPlatforms(prev => ({
        ...prev,
        [platformId]: { ...prev[platformId], lastSync: new Date().toISOString() },
      }));
      if (data.results?.length) {
        setAchievements(prev => ({
          ...prev,
          unlocked: [...prev.unlocked, ...data.results.filter(r => r.awarded).map(r => r.achievement)],
        }));
      }
      showToast(`Synced ${data.synced ?? 0} achievements from ${PLATFORM_META[platformId]?.label ?? platformId}`, 'success');
    } catch (err) {
      console.error('[GameDashboard] Sync error:', err);
      showToast('Sync failed', 'error');
    } finally {
      setSyncingPlatform(null);
    }
  }, [userId, authToken, showToast]);

  const arvrProjects = projects.filter(p => p.type === PROJECT_TYPES.AR_VR || p.type === PROJECT_TYPES.THREE_D);

  const base = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${base}`}>
        <Loader2 size={36} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${base}`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-700 text-white'
          : toast.type === 'error'   ? 'bg-red-700 text-white'
          : 'bg-gray-700 text-white'}`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Gamepad2 size={26} className="text-purple-400" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Game Dev Tracker</h1>
            <p className="text-xs text-gray-400">Nexus AI Pro — {userRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-full">
            Lv.{achievements.level} · {achievements.xp} XP
          </span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-white/10 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition
                ${activeTab === id
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-white/20'}`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">My Projects</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
              >
                <Plus size={16} /> New Project
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
                <p>No projects yet. Create your first one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(p => <ProjectCard key={p.projectId} project={p} />)}
              </div>
            )}
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Achievements</h2>
              <div className="text-sm text-gray-400">
                {achievements.unlocked.length} / {achievements.unlocked.length + achievements.locked.length} unlocked
              </div>
            </div>
            <h3 className="text-base font-semibold text-yellow-400 flex items-center gap-2">
              <Trophy size={16} /> Unlocked
            </h3>
            {achievements.unlocked.length === 0
              ? <p className="text-gray-500 text-sm">No achievements yet. Start a project!</p>
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {achievements.unlocked.map(a => <AchievementCard key={a.id} achievement={a} />)}
                </div>
              )
            }
            <h3 className="text-base font-semibold text-gray-500 flex items-center gap-2 pt-4">
              <Lock size={16} /> Locked
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {achievements.locked.map(a => <AchievementCard key={a.id} achievement={a} />)}
            </div>
          </div>
        )}

        {/* PLATFORMS TAB */}
        {activeTab === 'platforms' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Platform Connections</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(PLATFORM_IDS).map(pid => (
                <PlatformCard
                  key={pid}
                  platformId={pid}
                  connection={platforms[pid] ?? null}
                  onConnect={handlePlatformConnect}
                  onSync={handlePlatformSync}
                  syncing={syncingPlatform === pid}
                />
              ))}
            </div>
          </div>
        )}

        {/* AR/VR/3D TAB */}
        {activeTab === 'arvr' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">AR / VR / 3D Projects</h2>
            {arvrProjects.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Box size={40} className="mx-auto mb-3 opacity-30" />
                <p>No AR/VR or 3D projects found.</p>
                <p className="text-sm mt-1">Create a project with type <code className="text-cyan-400">ar-vr</code> or <code className="text-orange-400">3d</code>.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {arvrProjects.map(p => <ArVrMetricsCard key={p.projectId} project={p} />)}
              </div>
            )}
          </div>
        )}

        {/* LIVE SESSION TAB */}
        {activeTab === 'session' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Live Dev Session</h2>
            <LiveSessionPanel activeSession={activeSession} stats={sessionStats} />
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Leaderboard</h2>
            <LeaderboardPanel projects={projects} />
          </div>
        )}

      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
