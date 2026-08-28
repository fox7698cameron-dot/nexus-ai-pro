/**
 * src/dashboards/ProjectDashboard.jsx
 * Nexus AI Pro — Real-Time Project Tracking Dashboard
 * Coding, Game Dev (2D/3D/AR/VR), Achievement tracking
 * Game engine plugins: Unreal, Epic, Sony/PSN, Xbox/Microsoft, Ubisoft
 * Date: 2026-08-28
 */
import React, { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPE_ICONS = {
  web: '🌐', mobile: '📱', desktop: '🖥️', game_2d: '🕹️', game_3d: '🎮',
  ar: '📡', vr: '🥽', xr: '🔮', ai_ml: '🤖', api: '⚙️', data: '📊',
  blockchain: '⛓️', plugin: '🔌', other: '📦',
};

const STATUS_COLORS = {
  todo:        'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review:      'bg-purple-100 text-purple-700',
  done:        'bg-green-100 text-green-700',
  blocked:     'bg-red-100 text-red-700',
};

const PLATFORM_ICONS = {
  pc: '🪟', macos: '🍎', linux: '🐧', ps: '🎯', xbox: '🟩',
  nintendo: '🔴', ios: '📱', android: '🤖', web: '🌐', quest: '🥽',
};

// ── Progress bar ────────────────────────────────────────────────────────────
function ProgressBar({ value = 0, color = 'bg-indigo-500' }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

// ── Project card ────────────────────────────────────────────────────────────
function ProjectCard({ project, onSelect }) {
  const icon  = PROJECT_TYPE_ICONS[project.type] || '📦';
  const color = project.progress >= 80 ? 'bg-green-500' : project.progress >= 40 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div
      onClick={() => onSelect(project)}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</h3>
            <p className="text-xs text-gray-400">{project.type?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          project.status === 'active'   ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
          project.status === 'paused'   ? 'bg-yellow-100 text-yellow-700' :
          project.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
        }`}>
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{project.description}</p>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={color} />
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
        {project.engine && <span>🎮 {project.engine}</span>}
        <span>📝 {project.linesOfCode?.toLocaleString() || 0} LOC</span>
        <span>🔀 {project.commits || 0} commits</span>
        {project.testCoverage > 0 && <span>🛡️ {project.testCoverage}%</span>}
      </div>

      {project.platforms?.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {project.platforms.map(p => (
            <span key={p} className="text-sm" title={p}>{PLATFORM_ICONS[p] || '📦'}</span>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-400">
        Last active: {project.lastActivityAt ? new Date(project.lastActivityAt).toLocaleDateString() : '—'}
      </div>
    </div>
  );
}

// ── Achievement badge ────────────────────────────────────────────────────────
function AchievementBadge({ achievement, unlocked }) {
  return (
    <div className={`rounded-xl p-3 border text-center transition ${
      unlocked
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
        : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-40 grayscale'
    }`}>
      <div className="text-3xl mb-1">{achievement.icon}</div>
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{achievement.name}</p>
      <p className="text-xs text-gray-400 mt-0.5">{achievement.description}</p>
      {unlocked && achievement.unlockedAt && (
        <p className="text-xs text-yellow-600 mt-1">{new Date(achievement.unlockedAt).toLocaleDateString()}</p>
      )}
      <p className={`text-xs font-bold mt-1 ${unlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
        {achievement.points}pts
      </p>
    </div>
  );
}

// ── Game connector status ──────────────────────────────────────────────────
function GameConnectors({ connectors = [] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">🎮 Game Engine &amp; Store Connectors</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {connectors.map(c => (
          <div key={c.id} className={`rounded-xl p-3 border text-center ${
            c.available
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 opacity-60'
          }`}>
            <div className="text-2xl mb-1">{c.icon}</div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.name}</p>
            <p className={`text-xs mt-1 ${c.available ? 'text-green-600' : 'text-gray-400'}`}>
              {c.available ? '✅ Connected' : '⚫ Not set'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Task board ────────────────────────────────────────────────────────────
function TaskBoard({ tasks = [], onUpdateStatus }) {
  const columns = ['todo', 'in_progress', 'review', 'done', 'blocked'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto">
      {columns.map(col => (
        <div key={col} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 min-w-[180px]">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wide">
            {col.replace(/_/g, ' ')}
            <span className="ml-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-1.5 text-xs">
              {tasks.filter(t => t.status === col).length}
            </span>
          </h4>
          <div className="space-y-2">
            {tasks.filter(t => t.status === col).map(task => (
              <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{task.title}</p>
                {task.labels?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {task.labels.map(l => (
                      <span key={l} className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded px-1">
                        {l}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1 capitalize">{task.priority} priority</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Project Dashboard ─────────────────────────────────────────────────
export default function ProjectDashboard({ userId, socket }) {
  const [projects,      setProjects]      = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [tasks,         setTasks]         = useState([]);
  const [achievements,  setAchievements]  = useState({ list: [], unlocked: [], progress: {} });
  const [connectors,    setConnectors]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('projects');
  const [showCreate,    setShowCreate]    = useState(false);
  const [newProject,    setNewProject]    = useState({ name: '', type: 'web', description: '', platforms: [] });

  const token = () => localStorage.getItem('nexus:token');

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/achievements', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setAchievements(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch('/api/connectors?category=gaming', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchTasks = useCallback(async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchProjects(), fetchAchievements(), fetchConnectors()])
      .finally(() => setLoading(false));

    const interval = setInterval(fetchProjects, 30_000);
    if (socket) {
      socket.on('project:update', (p) => {
        setProjects(prev => prev.map(x => x.id === p.id ? p : x));
        if (selected?.id === p.id) setSelected(p);
      });
    }
    return () => {
      clearInterval(interval);
      if (socket) socket.off('project:update');
    };
  }, [fetchProjects, fetchAchievements, fetchConnectors, socket]);

  const selectProject = (p) => {
    setSelected(p);
    setTab('tasks');
    fetchTasks(p.id);
  };

  const createProject = async () => {
    if (!newProject.name) return;
    try {
      const res = await fetch('/api/projects', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(newProject),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => [data.project, ...prev]);
        setShowCreate(false);
        setNewProject({ name: '', type: 'web', description: '', platforms: [] });
      }
    } catch (e) { console.error(e); }
  };

  // Summary stats
  const total    = projects.length;
  const active   = projects.filter(p => p.status === 'active').length;
  const avgProgress = total ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / total) : 0;
  const totalLoc = projects.reduce((s, p) => s + (p.linesOfCode || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚀 Project Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time coding &amp; game development tracking</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: total,            icon: '📦' },
          { label: 'Active',         value: active,           icon: '🟢' },
          { label: 'Avg Progress',   value: `${avgProgress}%`, icon: '📈' },
          { label: 'Total LOC',      value: totalLoc.toLocaleString(), icon: '💻' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">{s.icon} {s.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Achievement progress */}
      {achievements.progress?.total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-gray-700 dark:text-gray-200">🏆 Achievements</p>
            <p className="text-sm text-gray-400">{achievements.progress.unlocked}/{achievements.progress.total} · {achievements.progress.points}pts</p>
          </div>
          <ProgressBar value={achievements.progress.percent || 0} color="bg-yellow-400" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {[['projects','📦 Projects'], ['tasks','📋 Tasks'], ['achievements','🏆 Achievements'], ['connectors','🔌 Connectors']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`pb-2 border-b-2 text-sm font-medium transition whitespace-nowrap ${
                tab === id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Projects grid */}
      {tab === 'projects' && (
        loading ? (
          <div className="text-center py-12 text-gray-400">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📦</div>
            <p className="font-semibold">No projects yet</p>
            <p className="text-sm">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map(p => <ProjectCard key={p.id} project={p} onSelect={selectProject} />)}
          </div>
        )
      )}

      {/* Tasks board */}
      {tab === 'tasks' && (
        selected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelected(null); setTab('projects'); }} className="text-indigo-600 text-sm">← Back</button>
              <h2 className="font-semibold text-gray-900 dark:text-white">{selected.name}</h2>
            </div>
            <TaskBoard tasks={tasks} />
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Select a project to view its task board</p>
        )
      )}

      {/* Achievements */}
      {tab === 'achievements' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {achievements.list?.map(a => {
            const unlocked = achievements.unlocked?.find(u => u.id === a.id);
            return <AchievementBadge key={a.id} achievement={unlocked || a} unlocked={Boolean(unlocked)} />;
          })}
        </div>
      )}

      {/* Game connectors */}
      {tab === 'connectors' && <GameConnectors connectors={connectors} />}

      {/* Create project modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Project</h2>
            <input
              type="text"
              placeholder="Project name"
              value={newProject.name}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            />
            <select
              value={newProject.type}
              onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            >
              {Object.entries(PROJECT_TYPE_ICONS).map(([k, icon]) => (
                <option key={k} value={k}>{icon} {k.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <textarea
              placeholder="Description (optional)"
              value={newProject.description}
              onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProject.name}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
