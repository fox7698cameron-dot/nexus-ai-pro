/**
 * src/components/GameDevTracker.jsx
 * Real-time project tracking for coding, game development, AR/VR/3D projects.
 * Connectors: Unreal/Epic Games, Sony, Microsoft, Ubisoft.
 * Achievement and game progress tracking.
 * Created: 2026-10-14
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Rocket, Cpu, Plus, ChevronRight, CheckCircle, Circle, Clock,
  Users, GitBranch, Star, Trophy, Zap, Box, Layers, Globe, Play,
  BarChart3, Calendar, Code, Camera, Sparkles, Settings, RefreshCw,
  TrendingUp, AlertCircle, Lock, Loader2, Database
} from 'lucide-react';

const PROJECT_TYPES = [
  { id: 'game-2d',    label: '2D Game',      icon: Gamepad2, color: '#6366f1', tags: ['Unity', 'Godot', 'Phaser'] },
  { id: 'game-3d',    label: '3D Game',      icon: Box,      color: '#8b5cf6', tags: ['Unreal', 'Unity', 'Godot'] },
  { id: 'vr',         label: 'VR',           icon: Camera,   color: '#ec4899', tags: ['Unreal', 'Unity', 'OpenXR'] },
  { id: 'ar',         label: 'AR',           icon: Sparkles, color: '#f59e0b', tags: ['ARKit', 'ARCore', 'Lens Studio'] },
  { id: '3d-art',     label: '3D Art',       icon: Layers,   color: '#22c55e', tags: ['Blender', 'Maya', 'ZBrush'] },
  { id: 'code',       label: 'Coding',       icon: Code,     color: '#38bdf8', tags: ['Web', 'Mobile', 'CLI'] },
  { id: 'app',        label: 'App',          icon: Rocket,   color: '#34d399', tags: ['iOS', 'Android', 'Cross-platform'] },
  { id: 'engine',     label: 'Game Engine',  icon: Cpu,      color: '#f97316', tags: ['C++', 'Vulkan', 'OpenGL'] }
];

const CONNECTORS = [
  { id: 'unreal',    name: 'Unreal Engine',      icon: '🎮', color: '#0070f3', publisher: 'Epic Games', connected: false },
  { id: 'epic',      name: 'Epic Games Store',   icon: '🏪', color: '#0070f3', publisher: 'Epic',        connected: false },
  { id: 'sony',      name: 'PlayStation Network', icon: '🕹️', color: '#003087', publisher: 'Sony',        connected: false },
  { id: 'xbox',      name: 'Xbox Game Studio',   icon: '🟩', color: '#107c10', publisher: 'Microsoft',   connected: false },
  { id: 'ubisoft',   name: 'Ubisoft Connect',    icon: '🎲', color: '#0f86d7', publisher: 'Ubisoft',     connected: false },
  { id: 'steam',     name: 'Steam',              icon: '💨', color: '#1b2838', publisher: 'Valve',        connected: false },
  { id: 'unity',     name: 'Unity Cloud',        icon: '⬛', color: '#222c37', publisher: 'Unity Tech',   connected: false },
  { id: 'godot',     name: 'Godot Engine',       icon: '🤖', color: '#478cbf', publisher: 'Open Source',  connected: true  }
];

const TASK_STATUSES = ['backlog', 'todo', 'in-progress', 'review', 'done'];
const STATUS_COLORS = { backlog: '#64748b', todo: '#6366f1', 'in-progress': '#f59e0b', review: '#ec4899', done: '#22c55e' };

const defaultProjects = [
  {
    id: 'p1', name: 'Neon Racer 3D', type: 'game-3d', engine: 'Unreal 5.4',
    platform: ['Windows', 'PS5', 'Xbox Series X'], progress: 62,
    status: 'in-progress', team: 4, deadline: '2027-03-15',
    tasks: [
      { id: 't1', title: 'Level design — City', status: 'done', priority: 'high' },
      { id: 't2', title: 'Physics system', status: 'in-progress', priority: 'high' },
      { id: 't3', title: 'AI opponents', status: 'todo', priority: 'medium' },
      { id: 't4', title: 'Multiplayer sync', status: 'backlog', priority: 'high' }
    ],
    achievements: [
      { id: 'a1', name: 'First Win', icon: '🏆', description: 'Win your first race', unlocked: 1250 },
      { id: 'a2', name: 'Speed Demon', icon: '⚡', description: 'Reach 300km/h', unlocked: 830 },
      { id: 'a3', name: 'Collector', icon: '🎁', description: 'Unlock all cars', unlocked: 210 }
    ]
  },
  {
    id: 'p2', name: 'VR Galaxy Explorer', type: 'vr', engine: 'Unity 2024',
    platform: ['Quest 3', 'PSVR2', 'SteamVR'], progress: 34,
    status: 'in-progress', team: 2, deadline: '2027-06-30',
    tasks: [
      { id: 't5', title: 'Locomotion system', status: 'in-progress', priority: 'high' },
      { id: 't6', title: 'Hand tracking', status: 'review', priority: 'high' },
      { id: 't7', title: 'Procedural planets', status: 'todo', priority: 'medium' }
    ],
    achievements: [
      { id: 'a4', name: 'First Light', icon: '🌟', description: 'Visit first star system', unlocked: 450 },
      { id: 'a5', name: 'Voyager', icon: '🚀', description: 'Travel 1 light year', unlocked: 120 }
    ]
  },
  {
    id: 'p3', name: 'Nexus Mobile App', type: 'app', engine: 'React Native',
    platform: ['iOS', 'Android'], progress: 85,
    status: 'review', team: 3, deadline: '2026-12-01',
    tasks: [
      { id: 't8', title: 'Push notifications', status: 'done', priority: 'high' },
      { id: 't9', title: 'Biometric auth', status: 'review', priority: 'high' },
      { id: 't10', title: 'App store submission', status: 'todo', priority: 'high' }
    ],
    achievements: []
  }
];

const ProgressBar = ({ value, color = '#6366f1' }) => (
  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
  </div>
);

const ProjectCard = ({ project, onClick, selected }) => {
  const type = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  const TypeIcon = type.icon;
  const doneTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
  const totalTasks = project.tasks?.length || 1;
  return (
    <div onClick={onClick}
      className={`rounded-xl p-4 border cursor-pointer transition-all duration-200 ${
        selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
      }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${type.color}20` }}>
            <TypeIcon size={16} style={{ color: type.color }} />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{project.name}</div>
            <div className="text-xs text-slate-500">{type.label} · {project.engine}</div>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium`}
          style={{ backgroundColor: `${STATUS_COLORS[project.status]}20`, color: STATUS_COLORS[project.status] }}>
          {project.status}
        </span>
      </div>
      <ProgressBar value={project.progress} color={type.color} />
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>{project.progress}% complete</span>
        <span>{doneTasks}/{totalTasks} tasks</span>
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
        <Users size={10} /> {project.team}
        <Calendar size={10} className="ml-1" /> {project.deadline}
        {project.platform?.slice(0, 2).map(p => (
          <span key={p} className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">{p}</span>
        ))}
      </div>
    </div>
  );
};

const KanbanBoard = ({ tasks, onUpdateTask }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
    {TASK_STATUSES.map(status => (
      <div key={status} className="space-y-2">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
          <span className="text-xs font-medium text-slate-400 capitalize">{status.replace('-', ' ')}</span>
          <span className="text-xs text-slate-600">{tasks.filter(t => t.status === status).length}</span>
        </div>
        {tasks.filter(t => t.status === status).map(task => (
          <div key={task.id}
            className="bg-slate-800 rounded-lg p-2 border border-slate-700/50 hover:border-slate-600 cursor-pointer transition-colors"
            onClick={() => onUpdateTask?.(task.id, task.status === 'done' ? 'todo' : 'done')}>
            <div className="text-xs text-slate-300">{task.title}</div>
            <span className={`text-xs mt-1 inline-block ${task.priority === 'high' ? 'text-red-400' : 'text-slate-500'}`}>
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const AchievementPanel = ({ achievements }) => (
  <div className="space-y-2">
    {achievements.map(a => (
      <div key={a.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <span className="text-2xl">{a.icon}</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{a.name}</div>
          <div className="text-xs text-slate-400">{a.description}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-yellow-400">{(a.unlocked || 0).toLocaleString()}</div>
          <div className="text-xs text-slate-500">unlocked</div>
        </div>
      </div>
    ))}
    {achievements.length === 0 && (
      <div className="text-center py-4 text-slate-500 text-sm">No achievements defined yet</div>
    )}
  </div>
);

export function GameDevTracker({ userRole = 'user' }) {
  const [projects, setProjects] = useState(defaultProjects);
  const [selectedId, setSelectedId] = useState('p1');
  const [activeTab, setActiveTab] = useState('overview');
  const [connectors, setConnectors] = useState(CONNECTORS);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', type: 'game-3d', engine: '', platform: [] });
  const [loading, setLoading] = useState(false);

  const selected = projects.find(p => p.id === selectedId);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        if (data.projects?.length) setProjects(data.projects);
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const createProject = async () => {
    if (!newProject.name) return;
    const proj = {
      id: `p${Date.now()}`,
      ...newProject,
      progress: 0,
      status: 'todo',
      team: 1,
      deadline: '',
      tasks: [],
      achievements: []
    };
    setProjects(prev => [...prev, proj]);
    setSelectedId(proj.id);
    setShowNewProject(false);
    try {
      await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proj) });
    } catch (_) {}
  };

  const updateTask = (taskId, newStatus) => {
    setProjects(prev => prev.map(p => p.id === selectedId ? {
      ...p,
      tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t),
      progress: Math.round((p.tasks.filter(t => t.id === taskId ? newStatus === 'done' : t.status === 'done').length / p.tasks.length) * 100)
    } : p));
  };

  const toggleConnector = (connId) => {
    setConnectors(prev => prev.map(c => c.id === connId ? { ...c, connected: !c.connected } : c));
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="text-indigo-400" size={28} /> Project Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">Game dev, AR/VR, coding & 3D project management</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadProjects} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-400">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* New project form */}
      {showNewProject && (
        <div className="bg-slate-900/80 rounded-2xl border border-indigo-500/30 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">New Project</h3>
          <input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
            placeholder="Project name" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PROJECT_TYPES.map(pt => {
              const PtIcon = pt.icon;
              return (
                <button key={pt.id} onClick={() => setNewProject(p => ({ ...p, type: pt.id }))}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${
                    newProject.type === pt.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-400'
                  }`}>
                  <PtIcon size={14} style={{ color: pt.color }} /> {pt.label}
                </button>
              );
            })}
          </div>
          <input value={newProject.engine} onChange={e => setNewProject(p => ({ ...p, engine: e.target.value }))}
            placeholder="Engine / Framework" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
          <div className="flex gap-3">
            <button onClick={createProject} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors">
              Create Project
            </button>
            <button onClick={() => setShowNewProject(false)} className="flex-1 bg-slate-800 text-slate-400 py-2.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Projects ({projects.length})</h2>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} selected={selectedId === p.id} onClick={() => setSelectedId(p.id)} />
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {['overview', 'tasks', 'achievements', 'connectors'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>{tab}</button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                    <p className="text-slate-400 text-sm">{selected.engine} · {selected.platform?.join(', ')}</p>
                  </div>
                  <span className="text-2xl font-bold text-white">{selected.progress}%</span>
                </div>
                <ProgressBar value={selected.progress} color={PROJECT_TYPES.find(t => t.id === selected.type)?.color || '#6366f1'} />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-xl font-bold text-white">{selected.tasks?.filter(t => t.status === 'done').length || 0}</div>
                    <div className="text-xs text-slate-400">Tasks Done</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-xl font-bold text-white">{selected.team || 1}</div>
                    <div className="text-xs text-slate-400">Team Members</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-xl font-bold text-white">{selected.achievements?.reduce((s, a) => s + (a.unlocked || 0), 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-400">Achievements</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Kanban Board</h3>
                <KanbanBoard tasks={selected.tasks || []} onUpdateTask={updateTask} />
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" /> Achievements & Progress
                </h3>
                <AchievementPanel achievements={selected.achievements || []} />
              </div>
            )}

            {activeTab === 'connectors' && (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Platform Connectors</h3>
                <div className="space-y-3">
                  {connectors.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{c.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-white">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.publisher}</div>
                        </div>
                      </div>
                      <button onClick={() => toggleConnector(c.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          c.connected
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                        }`}>
                        {c.connected ? '● Connected' : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-3">
                  Connectors sync project data, achievements, and analytics. OAuth credentials managed via secure environment variables.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GameDevTracker;
