// src/components/ProjectTracker.jsx
// Nexus AI Pro — Project Tracking Dashboard (Coding, Game Dev, AR/VR/3D)
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Plus, Trash2, Edit3, CheckCircle, Circle,
  Clock, GitBranch, Target, BarChart3, Cpu, Box, Gamepad2,
  Layers, Globe, Monitor, Smartphone, Rocket, RefreshCw,
  ChevronRight, Play, Pause, AlertCircle, TrendingUp, Calendar
} from 'lucide-react';

const TYPE_CONFIG = {
  coding:  { label: 'Coding',       icon: Cpu,       color: 'text-blue-400',   bg: 'bg-blue-900/20',   border: 'border-blue-700'   },
  game:    { label: 'Game Dev',      icon: Gamepad2,  color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-700' },
  ar:      { label: 'AR',            icon: Layers,    color: 'text-cyan-400',   bg: 'bg-cyan-900/20',   border: 'border-cyan-700'   },
  vr:      { label: 'VR',            icon: Box,       color: 'text-pink-400',   bg: 'bg-pink-900/20',   border: 'border-pink-700'   },
  xr:      { label: 'XR / Mixed',    icon: Layers,    color: 'text-fuchsia-400',bg: 'bg-fuchsia-900/20',border: 'border-fuchsia-700'},
  '3d':    { label: '3D / Spatial',  icon: Box,       color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-700' },
  mobile:  { label: 'Mobile',        icon: Smartphone,color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-700'  },
  web:     { label: 'Web',           icon: Globe,     color: 'text-sky-400',    bg: 'bg-sky-900/20',    border: 'border-sky-700'    },
  desktop: { label: 'Desktop',       icon: Monitor,   color: 'text-gray-300',   bg: 'bg-gray-800',      border: 'border-gray-600'   },
  api:     { label: 'API / Backend', icon: Rocket,    color: 'text-teal-400',   bg: 'bg-teal-900/20',   border: 'border-teal-700'   },
};

const STATUS_CONFIG = {
  planning:    { label: 'Planning',     color: 'text-gray-400',   dot: 'bg-gray-400'    },
  in_progress: { label: 'In Progress',  color: 'text-blue-400',   dot: 'bg-blue-400'    },
  review:      { label: 'Review',       color: 'text-yellow-400', dot: 'bg-yellow-400'  },
  on_hold:     { label: 'On Hold',      color: 'text-orange-400', dot: 'bg-orange-400'  },
  completed:   { label: 'Completed',    color: 'text-green-400',  dot: 'bg-green-400'   },
  cancelled:   { label: 'Cancelled',    color: 'text-red-400',    dot: 'bg-red-400'     },
};

function apiHeaders() {
  const token = localStorage.getItem('nexus:accessToken');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function ProgressBar({ value, color = '#6366f1' }) {
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ProjectCard({ project, onSelect, onDelete, selected }) {
  const type   = TYPE_CONFIG[project.type]   || TYPE_CONFIG.coding;
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const Icon   = type.icon;

  return (
    <div
      className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        selected ? 'border-indigo-500 bg-gray-800' : `${type.border} ${type.bg} hover:brightness-110`
      }`}
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={18} className={type.color} />
          <span className="font-semibold text-white text-sm">{project.name}</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(project.id); }}
          className="text-gray-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <p className="text-gray-400 text-xs mb-3 line-clamp-2">{project.description || 'No description'}</p>

      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Progress</span>
          <span className={type.color}>{project.progress ?? 0}%</span>
        </div>
        <ProgressBar value={project.progress ?? 0} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className={status.color}>{status.label}</span>
        </div>
        <span className="text-gray-600">{new Date(project.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate }) {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [type,        setType]        = useState('coding');
  const [repoUrl,     setRepoUrl]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ name, description, type, repoUrl }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      onCreate(data.project);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-white font-bold text-lg mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Project name" required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />

          <select
            value={type} onChange={e => setType(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
          >
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key} className="bg-gray-900">{cfg.label}</option>
            ))}
          </select>

          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)" rows={3}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm resize-none"
          />

          <input
            type="url" value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
            placeholder="Repository URL (optional)"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectDetail({ project, onUpdate }) {
  const [detail,        setDetail]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [newTask,       setNewTask]       = useState('');
  const [newMilestone,  setNewMilestone]  = useState('');
  const [addingTask,    setAddingTask]    = useState(false);

  const type   = TYPE_CONFIG[project.type]   || TYPE_CONFIG.coding;
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/projects/${project.id}`, { headers: apiHeaders() });
      if (resp.ok) setDetail(await resp.json());
    } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    setAddingTask(true);
    try {
      await fetch(`/api/projects/${project.id}/tasks`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ title: newTask }),
      });
      setNewTask('');
      fetchDetail();
    } finally { setAddingTask(false); }
  };

  const toggleTask = async (task) => {
    const next = task.status === 'completed' ? 'todo' : 'completed';
    await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify({ status: next }),
    });
    fetchDetail();
  };

  const changeStatus = async (newStatus) => {
    await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdate?.({ ...project, status: newStatus });
    fetchDetail();
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <RefreshCw size={24} className="text-indigo-400 animate-spin" />
    </div>
  );

  const Icon = type.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`border ${type.border} ${type.bg} rounded-xl p-5`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Icon size={24} className={type.color} />
            <div>
              <h2 className="text-xl font-bold text-white">{project.name}</h2>
              <p className="text-gray-400 text-sm">{type.label}</p>
            </div>
          </div>
          <select
            value={project.status}
            onChange={e => changeStatus(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k} className="bg-gray-900">{v.label}</option>
            ))}
          </select>
        </div>

        {project.description && (
          <p className="text-gray-400 text-sm mb-3">{project.description}</p>
        )}

        <div className="mb-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Overall Progress</span>
            <span className={type.color}>{detail?.project?.progress ?? 0}%</span>
          </div>
          <ProgressBar value={detail?.project?.progress ?? 0} />
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-400" /> Tasks
          <span className="text-gray-500 text-xs ml-auto">
            {detail?.tasks?.filter(t => t.status === 'completed').length}/{detail?.tasks?.length || 0} done
          </span>
        </h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add a task…"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <button
            onClick={addTask} disabled={addingTask || !newTask.trim()}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {addingTask ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </div>

        <div className="space-y-2">
          {(detail?.tasks || []).map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => toggleTask(task)}
            >
              {task.status === 'completed'
                ? <CheckCircle size={18} className="text-green-400 shrink-0" />
                : <Circle size={18} className="text-gray-500 shrink-0" />
              }
              <span className={`text-sm flex-1 ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                {task.title}
              </span>
              {task.priority === 'high' && <AlertCircle size={14} className="text-red-400 shrink-0" />}
            </div>
          ))}
          {!detail?.tasks?.length && (
            <p className="text-gray-500 text-sm text-center py-4">No tasks yet — add one above</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      {detail?.commits?.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <GitBranch size={16} className="text-indigo-400" /> Recent Commits
          </h3>
          <div className="space-y-2">
            {detail.commits.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-2 hover:bg-gray-800 rounded-lg">
                <code className="text-xs text-indigo-400 font-mono shrink-0 mt-0.5">{c.sha?.slice(0, 7)}</code>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm truncate">{c.message}</p>
                  <p className="text-gray-500 text-xs">{c.branch} · {new Date(c.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProjectTracker() {
  const [projects,      setProjects]      = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [showCreate,    setShowCreate]    = useState(false);
  const [filter,        setFilter]        = useState('all');
  const [typeFilter,    setTypeFilter]    = useState('all');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (filter     !== 'all') params.set('status', filter);

      const resp = await fetch(`/api/projects?${params}`, { headers: apiHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setProjects(data.projects || []);
      }
    } finally { setLoading(false); }
  }, [filter, typeFilter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen size={28} className="text-indigo-400" />
            Projects
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} · Coding, Game Dev, AR/VR/3D
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProjects}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-400' : 'text-gray-300'} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
          {['all', 'in_progress', 'planning', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                filter === s ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
          {['all', 'coding', 'game', 'ar', 'vr', '3d', 'web', 'mobile'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                typeFilter === t ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'all' ? 'All Types' : TYPE_CONFIG[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project list */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen size={48} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No projects yet</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-indigo-400 text-sm hover:text-indigo-300">
                Create your first project
              </button>
            </div>
          ) : (
            projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                selected={selected?.id === project.id}
                onSelect={setSelected}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Detail pane */}
        <div className="lg:col-span-2">
          {selected ? (
            <ProjectDetail project={selected} onUpdate={(updated) => {
              setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
              setSelected(prev => ({ ...prev, ...updated }));
            }} />
          ) : (
            <div className="flex items-center justify-center h-64 border border-dashed border-gray-700 rounded-xl">
              <div className="text-center">
                <ChevronRight size={32} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500">Select a project to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}
