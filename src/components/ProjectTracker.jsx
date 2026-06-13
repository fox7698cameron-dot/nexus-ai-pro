// ================================================
// NEXUS AI PRO - Project Tracker
// Updated: 2026-06-13
// ------------------------------------------------
// Types: coding, game, ar_vr, 3d, mobile, web, desktop
// Features: milestones, commit tracking, real-time
// Game platforms: Epic, PlayStation, Xbox, Ubisoft, Steam
// Achievement & progress tracking
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder, FolderOpen, Plus, Edit3, Trash2, CheckCircle,
  Circle, Clock, GitBranch, GitCommit, Trophy, Gamepad2,
  Box, Smartphone, Monitor, Globe, Cpu, Zap,
  BarChart3, AlertCircle, RefreshCw, ChevronRight,
  Star, Award, TrendingUp, Code
} from 'lucide-react';

const TYPE_ICONS = {
  coding:  Code,
  game:    Gamepad2,
  ar_vr:   Box,
  '3d':    Box,
  mobile:  Smartphone,
  web:     Globe,
  desktop: Monitor,
  other:   Folder,
};

const TYPE_COLORS = {
  coding:  'text-blue-400',
  game:    'text-purple-400',
  ar_vr:   'text-pink-400',
  '3d':    'text-orange-400',
  mobile:  'text-emerald-400',
  web:     'text-cyan-400',
  desktop: 'text-yellow-400',
  other:   'text-gray-400',
};

const PLATFORM_ICONS = {
  epic:        '🎮',
  playstation: '🎮',
  xbox:        '🎮',
  ubisoft:     '🎮',
  steam:       '🎮',
  nintendo:    '🎮',
  gog:         '🎮',
};

async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  const res = await fetch(`/api/projects${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Progress bar ──────────────────────────────────
function ProgressBar({ value, color = 'bg-indigo-500' }) {
  return (
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ── Project card ──────────────────────────────────
function ProjectCard({ project, onSelect, onDelete }) {
  const Icon  = TYPE_ICONS[project.type] || Folder;
  const color = TYPE_COLORS[project.type] || 'text-gray-400';
  const statusColors = {
    active:    'text-emerald-400 bg-emerald-900',
    paused:    'text-yellow-400 bg-yellow-900',
    completed: 'text-blue-400 bg-blue-900',
    archived:  'text-gray-400 bg-gray-800',
  };

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-500 transition-all cursor-pointer group"
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon size={20} className={color} />
          <div>
            <div className="text-white font-semibold text-sm">{project.name}</div>
            <div className="text-gray-500 text-xs capitalize">{project.type.replace('_',' ')}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[project.status] || statusColors.active}`}>
            {project.status}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {project.description && (
        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span className="text-gray-300">{project.progress}%</span>
        </div>
        <ProgressBar
          value={project.progress}
          color={project.progress >= 100 ? 'bg-emerald-500' : project.progress >= 60 ? 'bg-blue-500' : 'bg-indigo-500'}
        />
      </div>

      {project.engine && (
        <div className="mt-3 text-xs text-gray-500">
          Engine: <span className="text-gray-300">{project.engine}</span>
        </div>
      )}
    </div>
  );
}

// ── New project form ──────────────────────────────
function NewProjectForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', type: 'coding', engine: '', platform: '', repoUrl: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Project name required');
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onSave(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-gray-400 text-xs block mb-1">Project Name *</label>
        <input value={form.name} onChange={set('name')} required placeholder="My Awesome Project"
          className="w-full bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white rounded-lg px-3 py-2 text-sm outline-none" />
      </div>
      <div>
        <label className="text-gray-400 text-xs block mb-1">Type *</label>
        <select value={form.type} onChange={set('type')}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
          {Object.keys(TYPE_ICONS).map(t => (
            <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>
          ))}
        </select>
      </div>
      {(form.type === 'game' || form.type === 'ar_vr' || form.type === '3d') && (
        <div>
          <label className="text-gray-400 text-xs block mb-1">Game Engine</label>
          <select value={form.engine} onChange={set('engine')}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
            <option value="">Select engine...</option>
            <option value="Unreal Engine 5">Unreal Engine 5</option>
            <option value="Unity">Unity</option>
            <option value="Godot">Godot</option>
            <option value="Blender">Blender</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
      )}
      <div>
        <label className="text-gray-400 text-xs block mb-1">Repository URL</label>
        <input value={form.repoUrl} onChange={set('repoUrl')} placeholder="https://github.com/..."
          className="w-full bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white rounded-lg px-3 py-2 text-sm outline-none" />
      </div>
      <div>
        <label className="text-gray-400 text-xs block mb-1">Description</label>
        <textarea value={form.description} onChange={set('description')} placeholder="Brief project description..."
          rows={2}
          className="w-full bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white rounded-lg px-3 py-2 text-sm outline-none resize-none" />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={12} /> {error}
        </div>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold">
          {loading ? 'Creating...' : 'Create Project'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Game achievements panel ───────────────────────
function AchievementsPanel() {
  const [accounts, setAccounts] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/game/accounts'),
      apiFetch('/game/achievements'),
    ]).then(([accs, ach]) => {
      setAccounts(accs.accounts || []);
      setAchievements(ach.achievements || []);
      setStats(ach.stats || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-500 text-sm text-center py-8">Loading achievements...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',    value: stats.total    || 0, icon: Trophy },
          { label: 'Unlocked', value: stats.unlocked || 0, icon: Award  },
          { label: 'Points',   value: stats.totalPoints || 0, icon: Star },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
            <s.icon size={16} className="text-indigo-400 mx-auto mb-1" />
            <div className="text-white font-bold">{s.value}</div>
            <div className="text-gray-500 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {achievements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Trophy size={40} className="mx-auto mb-3 text-gray-700" />
          <p>No achievements yet. Connect a game platform to get started.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {achievements.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
              a.unlocked ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 opacity-60'
            }`}>
              {a.unlocked ? <Award size={16} className="text-yellow-400" /> : <Circle size={16} className="text-gray-600" />}
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{a.achievementName}</div>
                <div className="text-gray-500 text-xs">{a.gameId} · {a.points} pts</div>
              </div>
              {a.unlockedAt && (
                <div className="text-gray-500 text-xs whitespace-nowrap">
                  {new Date(a.unlockedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────
export default function ProjectTracker({ socket }) {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [filterType, setFilterType] = useState('all');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const [proj, st] = await Promise.all([
        apiFetch('/'),
        apiFetch('/stats/overview').catch(() => ({})),
      ]);
      setProjects(proj.projects || []);
      setStats(st);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Socket.IO real-time
  useEffect(() => {
    if (!socket) return;
    const handler = () => loadProjects();
    socket.on('project:created', handler);
    socket.on('project:updated', handler);
    socket.on('commit:pushed', handler);
    return () => {
      socket.off('project:created', handler);
      socket.off('project:updated', handler);
      socket.off('commit:pushed', handler);
    };
  }, [socket, loadProjects]);

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/${id}`, { method: 'DELETE' });
      setProjects(v => v.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProjects = filterType === 'all'
    ? projects
    : projects.filter(p => p.type === filterType);

  const tabs = [
    { id: 'projects',     label: 'Projects',     icon: Folder },
    { id: 'achievements', label: 'Achievements',  icon: Trophy },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Project Tracker</h1>
          <p className="text-gray-400 text-sm mt-1">
            {stats.total || 0} projects · {stats.commits?.total || 0} commits · {stats.avgProgress || 0}% avg progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadProjects} className="text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Stats row */}
      {Object.keys(stats.byType || {}).length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            All ({stats.total || 0})
          </button>
          {Object.entries(stats.byType || {}).map(([type, count]) => {
            const Icon = TYPE_ICONS[type] || Folder;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterType === type ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={10} />
                {type.replace('_',' ')} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* New project modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-4">New Project</h2>
            <NewProjectForm
              onSave={project => { setProjects(v => [project, ...v]); setShowNew(false); }}
              onCancel={() => setShowNew(false)}
            />
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-gray-800 bg-opacity-40 rounded-2xl border border-gray-700 border-dashed">
            <Code size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg font-medium">No projects yet</p>
            <p className="text-gray-500 text-sm mt-2 mb-6">Create your first project to start tracking</p>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold"
            >
              <Plus size={16} /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={setSelected}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}

      {activeTab === 'achievements' && <AchievementsPanel />}
    </div>
  );
}
