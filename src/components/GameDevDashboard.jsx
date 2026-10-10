/**
 * GameDevDashboard.jsx
 * Real-time game / AR / VR / 3D project tracking with connectors for
 * Unreal Engine, Epic Games Store, Sony PlayStation, Microsoft Xbox,
 * Ubisoft Connect — plus achievement and game-progress tracking.
 * Updated: 2026-10-10
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Platform connectors ───────────────────────────────────────────────────────
const GAME_PLATFORMS = {
  unreal:    { name: 'Unreal Engine',    icon: '⚙️',  color: '#0073d1', category: 'engine' },
  epic:      { name: 'Epic Games Store', icon: '🎮',  color: '#2D5BE3', category: 'store'  },
  playstation:{ name: 'PlayStation',     icon: '🕹️',  color: '#003087', category: 'console'},
  xbox:      { name: 'Xbox / Game Pass', icon: '🟢',  color: '#107C10', category: 'console'},
  ubisoft:   { name: 'Ubisoft Connect',  icon: '🎯',  color: '#0C3577', category: 'store'  },
  steam:     { name: 'Steam',            icon: '♨️',  color: '#1B2838', category: 'store'  },
  ios_game:  { name: 'Apple Arcade',     icon: '🍎',  color: '#555',    category: 'mobile' },
  android_g: { name: 'Google Play Games',icon: '▶️',  color: '#34A853', category: 'mobile' },
};

const PROJECT_TYPES = {
  game_2d:   { label: '2D Game',    icon: '🕹️'  },
  game_3d:   { label: '3D Game',    icon: '🎮'  },
  ar:        { label: 'AR',         icon: '🥽'  },
  vr:        { label: 'VR',         icon: '🌐'  },
  xr:        { label: 'XR / Mixed', icon: '🔮'  },
  engine:    { label: 'Engine/SDK', icon: '⚙️'  },
  plugin:    { label: 'Plugin/Mod', icon: '🔌'  },
  asset:     { label: '3D Asset',   icon: '📦'  },
};

const STATUS_COLORS = {
  planning:   'bg-gray-600 text-gray-200',
  development:'bg-blue-700 text-blue-100',
  alpha:      'bg-yellow-700 text-yellow-100',
  beta:       'bg-orange-700 text-orange-100',
  gold:       'bg-green-700 text-green-100',
  live:       'bg-emerald-600 text-emerald-100',
  maintenance:'bg-purple-700 text-purple-100',
};

// ── Seed demo projects ────────────────────────────────────────────────────────
function seedProjects() {
  return [
    {
      id: 'proj-1',
      name: 'Nexus VR Worlds',
      type: 'vr',
      engine: 'unreal',
      platforms: ['playstation', 'steam'],
      status: 'beta',
      progress: 72,
      team: 8,
      budgetSpent: 340000,
      budgetTotal: 500000,
      milestones: [
        { title: 'Concept', done: true,  date: '2025-01-15' },
        { title: 'Prototype', done: true,  date: '2025-04-10' },
        { title: 'Alpha',   done: true,  date: '2025-08-01' },
        { title: 'Beta',    done: false, date: '2026-02-28' },
        { title: 'Gold',    done: false, date: '2026-06-30' },
      ],
      achievements: { total: 50, implemented: 37, qaTested: 29 },
      commits: 1842,
      bugs: { open: 34, critical: 5 },
      buildStatus: 'passing',
      lastBuild: new Date().toISOString(),
    },
    {
      id: 'proj-2',
      name: 'AR Street Racer',
      type: 'ar',
      engine: 'unreal',
      platforms: ['ios_game', 'android_g'],
      status: 'alpha',
      progress: 45,
      team: 5,
      budgetSpent: 95000,
      budgetTotal: 200000,
      milestones: [
        { title: 'Concept',   done: true,  date: '2025-06-01' },
        { title: 'Prototype', done: true,  date: '2025-09-15' },
        { title: 'Alpha',     done: false, date: '2026-03-01' },
        { title: 'Beta',      done: false, date: '2026-07-01' },
      ],
      achievements: { total: 30, implemented: 12, qaTested: 8 },
      commits: 634,
      bugs: { open: 61, critical: 12 },
      buildStatus: 'failing',
      lastBuild: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: 'proj-3',
      name: 'Nexus Tactics 3D',
      type: 'game_3d',
      engine: 'unreal',
      platforms: ['epic', 'xbox', 'playstation'],
      status: 'live',
      progress: 100,
      team: 12,
      budgetSpent: 1_200_000,
      budgetTotal: 1_100_000,
      milestones: [
        { title: 'Concept',   done: true, date: '2024-01-10' },
        { title: 'Prototype', done: true, date: '2024-05-20' },
        { title: 'Alpha',     done: true, date: '2024-10-01' },
        { title: 'Beta',      done: true, date: '2025-02-14' },
        { title: 'Gold',      done: true, date: '2025-05-30' },
      ],
      achievements: { total: 80, implemented: 80, qaTested: 80 },
      commits: 6_320,
      bugs: { open: 8, critical: 0 },
      buildStatus: 'passing',
      lastBuild: new Date(Date.now() - 86400_000).toISOString(),
    },
  ];
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = 'bg-blue-500', label }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      {label && <div className="flex justify-between text-xs text-gray-400"><span>{label}</span><span>{pct}%</span></div>}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Achievement tracker ───────────────────────────────────────────────────────
function AchievementTracker({ data }) {
  const impPct  = Math.round((data.implemented / data.total) * 100);
  const qaPct   = Math.round((data.qaTested   / data.total) * 100);
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-3">
      <div className="text-sm font-semibold text-gray-200">🏆 Achievement Progress</div>
      <div className="flex gap-4 text-center">
        <div className="flex-1">
          <div className="text-2xl font-bold text-yellow-400">{data.total}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-blue-400">{data.implemented}</div>
          <div className="text-xs text-gray-400">Built</div>
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-green-400">{data.qaTested}</div>
          <div className="text-xs text-gray-400">QA Tested</div>
        </div>
      </div>
      <ProgressBar value={impPct} label="Implementation" color="bg-blue-500" />
      <ProgressBar value={qaPct}  label="QA Coverage"    color="bg-green-500" />
    </div>
  );
}

// ── Milestone timeline ────────────────────────────────────────────────────────
function MilestoneTimeline({ milestones }) {
  return (
    <div className="flex flex-col gap-2">
      {milestones.map((m, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
            m.done ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}>
            {m.done ? '✓' : i + 1}
          </div>
          <div className={m.done ? 'text-gray-300 line-through' : 'text-white'}>{m.title}</div>
          <div className="ml-auto text-xs text-gray-500">{m.date}</div>
        </div>
      ))}
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onSelect, selected }) {
  const type     = PROJECT_TYPES[project.type] || { label: project.type, icon: '📁' };
  const budget   = Math.round((project.budgetSpent / project.budgetTotal) * 100);
  const overBudget = project.budgetSpent > project.budgetTotal;
  return (
    <div
      onClick={() => onSelect(project.id)}
      className={`rounded-xl p-4 border cursor-pointer transition-all ${
        selected ? 'border-blue-500 bg-gray-700' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-white text-sm">{project.name}</div>
          <div className="text-xs text-gray-400">{type.icon} {type.label} · {GAME_PLATFORMS[project.engine]?.name}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status] || 'bg-gray-700 text-gray-300'}`}>
          {project.status.toUpperCase()}
        </span>
      </div>

      <ProgressBar value={project.progress} label="Overall Progress" color="bg-purple-500" />

      <div className="flex gap-4 mt-3 text-xs text-gray-400">
        <span>👥 {project.team}</span>
        <span>🔨 {project.commits.toLocaleString()} commits</span>
        <span className={project.bugs.critical > 0 ? 'text-red-400' : 'text-green-400'}>
          🐛 {project.bugs.open} bugs
        </span>
        <span className={`${project.buildStatus === 'passing' ? 'text-green-400' : 'text-red-400'}`}>
          CI {project.buildStatus === 'passing' ? '✓' : '✗'}
        </span>
      </div>

      <div className={`mt-2 text-xs ${overBudget ? 'text-red-400' : 'text-gray-400'}`}>
        Budget: ${(project.budgetSpent/1000).toFixed(0)}K / ${(project.budgetTotal/1000).toFixed(0)}K
        {overBudget && ' ⚠ Over budget'}
      </div>
    </div>
  );
}

// ── Platform connector status ─────────────────────────────────────────────────
function ConnectorGrid({ activePlatforms }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="text-sm font-semibold text-gray-200 mb-3">🔌 Platform Connectors</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(GAME_PLATFORMS).map(([id, plat]) => {
          const connected = activePlatforms?.includes(id);
          return (
            <div
              key={id}
              className={`rounded-lg p-2 border text-xs flex items-center gap-2 ${
                connected ? 'border-green-700 bg-green-900/20' : 'border-gray-700 bg-gray-900/50'
              }`}
            >
              <span>{plat.icon}</span>
              <div>
                <div className="font-medium text-gray-200">{plat.name}</div>
                <div className={connected ? 'text-green-400' : 'text-gray-500'}>
                  {connected ? '● Connected' : '○ Not connected'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GameDevDashboard({ socket }) {
  const [projects, setProjects]     = useState(seedProjects);
  const [selectedId, setSelectedId] = useState('proj-1');
  const [activeTab, setActiveTab]   = useState('overview');
  const [showNew, setShowNew]       = useState(false);
  const [newProj, setNewProj]       = useState({ name: '', type: 'game_3d', engine: 'unreal', platforms: [] });
  const timerRef = useRef(null);

  // Simulate live build-status updates
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setProjects(prev => prev.map(p => ({
        ...p,
        commits: p.commits + Math.floor(Math.random() * 2),
      })));
    }, 15_000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setProjects(prev => prev.map(p => p.id === data.projectId ? { ...p, ...data } : p));
    };
    socket.on('gamedev:update', handler);
    return () => socket.off('gamedev:update', handler);
  }, [socket]);

  const project = projects.find(p => p.id === selectedId);

  function handleAddProject(e) {
    e.preventDefault();
    if (!newProj.name.trim()) return;
    const created = {
      ...newProj,
      id: `proj-${Date.now()}`,
      status: 'planning',
      progress: 0,
      team: 1,
      budgetSpent: 0,
      budgetTotal: 100000,
      milestones: [{ title: 'Concept', done: false, date: '' }],
      achievements: { total: 10, implemented: 0, qaTested: 0 },
      commits: 0,
      bugs: { open: 0, critical: 0 },
      buildStatus: 'passing',
      lastBuild: new Date().toISOString(),
    };
    setProjects(prev => [...prev, created]);
    setSelectedId(created.id);
    setShowNew(false);
    setNewProj({ name: '', type: 'game_3d', engine: 'unreal', platforms: [] });
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Game Dev Tracker</h2>
          <p className="text-xs text-gray-400">Real-time project & achievement tracking</p>
        </div>
        <button
          onClick={() => setShowNew(v => !v)}
          className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* New project form */}
      {showNew && (
        <form onSubmit={handleAddProject} className="bg-gray-800 rounded-xl p-4 border border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Project Name</label>
            <input
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 focus:outline-none focus:border-blue-500"
              placeholder="My Awesome Game"
              value={newProj.name}
              onChange={e => setNewProj(v => ({ ...v, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 focus:outline-none"
              value={newProj.type}
              onChange={e => setNewProj(v => ({ ...v, type: e.target.value }))}
            >
              {Object.entries(PROJECT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Primary Engine</label>
            <select
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 focus:outline-none"
              value={newProj.engine}
              onChange={e => setNewProj(v => ({ ...v, engine: e.target.value }))}
            >
              {Object.entries(GAME_PLATFORMS).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium">
              Create
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project list */}
        <div className="flex flex-col gap-3">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} selected={p.id === selectedId} onSelect={setSelectedId} />
          ))}
        </div>

        {/* Project detail */}
        {project && (
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Tab bar */}
            <div className="flex gap-2 border-b border-gray-700 pb-2">
              {['overview','milestones','achievements','connectors'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm px-3 py-1.5 rounded-lg capitalize transition-colors ${
                    activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="flex flex-col gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{project.name}</h3>
                      <div className="text-sm text-gray-400">
                        {PROJECT_TYPES[project.type]?.icon} {PROJECT_TYPES[project.type]?.label} ·{' '}
                        {GAME_PLATFORMS[project.engine]?.name}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
                      {project.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Team',     val: project.team + ' devs',      icon: '👥' },
                      { label: 'Commits',  val: project.commits.toLocaleString(), icon: '🔨' },
                      { label: 'Open Bugs',val: project.bugs.open,            icon: '🐛' },
                      { label: 'CI Build', val: project.buildStatus,          icon: '🔧' },
                    ].map(({ label, val, icon }) => (
                      <div key={label} className="bg-gray-700 rounded-lg p-3 text-center">
                        <div className="text-lg">{icon}</div>
                        <div className="text-sm font-semibold text-white">{val}</div>
                        <div className="text-xs text-gray-400">{label}</div>
                      </div>
                    ))}
                  </div>
                  <ProgressBar value={project.progress} label="Overall Progress" color="bg-purple-500" />
                  <div className="mt-2">
                    <ProgressBar
                      value={project.budgetSpent}
                      max={project.budgetTotal}
                      label="Budget Utilization"
                      color={project.budgetSpent > project.budgetTotal ? 'bg-red-500' : 'bg-yellow-500'}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {project.platforms.map(pid => (
                      <span key={pid} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                        {GAME_PLATFORMS[pid]?.icon} {GAME_PLATFORMS[pid]?.name}
                      </span>
                    ))}
                  </div>
                </div>

                {project.bugs.critical > 0 && (
                  <div className="bg-red-900/20 border border-red-700 rounded-xl p-3 text-sm text-red-300">
                    ⚠️ <strong>{project.bugs.critical} critical bug{project.bugs.critical > 1 ? 's' : ''}</strong> require immediate attention.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'milestones' && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="text-sm font-semibold text-gray-200 mb-4">📅 Milestones</div>
                <MilestoneTimeline milestones={project.milestones} />
              </div>
            )}

            {activeTab === 'achievements' && (
              <AchievementTracker data={project.achievements} />
            )}

            {activeTab === 'connectors' && (
              <ConnectorGrid activePlatforms={project.platforms} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
