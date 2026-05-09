// Copyright © 2025-2026 Cameron Fox
// Licensed under the Apache License, Version 2.0
// File: src/dashboards/ProjectTracker.jsx
// Last updated: 2026-05-09

import { useState, useEffect, useCallback } from 'react';

const TYPE_ICONS = { coding: '💻', game: '🎮', ar: '📱', vr: '🥽', '3d': '🎲' };
const FILTER_TABS = ['All', 'Coding', 'Game', 'AR', 'VR', '3D'];
const STATUSES = ['active', 'paused', 'completed'];
const ENGINES = ['Unity', 'Unreal', 'Godot', 'CryEngine', 'GameMaker', 'Other'];
const PLATFORMS = ['PC', 'Console', 'Mobile', 'VR'];
const AR_DEVICES = ['HoloLens', 'ARKit (iOS)', 'ARCore (Android)', 'Magic Leap', 'Other'];
const VR_DEVICES = ['Meta Quest', 'SteamVR', 'PlayStation VR', 'Apple Vision Pro', 'Other'];
const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'C#', 'C++', 'Rust', 'Go', 'Swift', 'Kotlin', 'Other'];

const API = '/api/projects';
const getToken = () => localStorage.getItem('nexus_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const BLANK = { name: '', type: 'coding', description: '', platform: '', engine: '', language: '', status: 'active', progress: 0 };

function ProjectModal({ project, onSave, onClose }) {
  const [form, setForm] = useState(project || BLANK);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isGameLike = ['game'].includes(form.type);
  const isARVR = ['ar', 'vr'].includes(form.type);

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Project Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My awesome project" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(TYPE_ICONS).map(([t, icon]) => (
                  <option key={t} value={t}>{icon} {t.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description..." />
          </div>
          {form.type === 'coding' && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Language</label>
              <select value={form.language} onChange={e => set('language', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select language</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}
          {isGameLike && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Engine</label>
                <select value={form.engine} onChange={e => set('engine', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select engine</option>
                  {ENGINES.map(eng => <option key={eng} value={eng}>{eng}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Platform</label>
                <select value={form.platform} onChange={e => set('platform', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select platform</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          )}
          {isARVR && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Engine</label>
                <select value={form.engine} onChange={e => set('engine', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select engine</option>
                  {ENGINES.map(eng => <option key={eng} value={eng}>{eng}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Target Device</label>
                <select value={form.platform} onChange={e => set('platform', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select device</option>
                  {(form.type === 'ar' ? AR_DEVICES : VR_DEVICES).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Progress: {form.progress}%</label>
            <input type="range" min={0} max={100} value={form.progress}
              onChange={e => set('progress', Number(e.target.value))}
              className="w-full accent-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {project ? 'Save Changes' : 'Create Project'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { active: 'bg-green-900 text-green-300', paused: 'bg-yellow-900 text-yellow-300', completed: 'bg-blue-900 text-blue-300' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-700 text-gray-300'}`}>{status}</span>;
}

function ProjectCard({ project, onEdit, onDelete, onProgressChange }) {
  const [progress, setProgress] = useState(project.progress ?? 0);
  const [editing, setEditing] = useState(false);

  const commitProgress = async val => {
    setEditing(false);
    if (val === project.progress) return;
    onProgressChange(project.id, val);
  };

  const icon = TYPE_ICONS[project.type] || '📁';
  const isGameLike = project.type === 'game';
  const isARVR = ['ar', 'vr'].includes(project.type);

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:bg-gray-750 transition-colors border border-gray-700">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">{icon}</span>
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{project.name}</h3>
            <span className="text-gray-400 text-xs uppercase">{project.type}</span>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>
      {project.description && <p className="text-gray-400 text-xs line-clamp-2">{project.description}</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        {project.language && <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{project.language}</span>}
        {(isGameLike || isARVR) && project.engine && <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{project.engine}</span>}
        {(isGameLike || isARVR) && project.platform && <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{project.platform}</span>}
        {project.commits != null && <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">🔀 {project.commits} commits</span>}
        {Array.isArray(project.tasks) && <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">✅ {project.tasks.length} tasks</span>}
        {Array.isArray(project.milestones) && <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">🏁 {project.milestones.length} milestones</span>}
      </div>
      <div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Progress</span>
          {editing ? (
            <input type="number" min={0} max={100} value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              onBlur={() => commitProgress(progress)}
              onKeyDown={e => e.key === 'Enter' && commitProgress(progress)}
              className="w-14 bg-gray-700 text-white text-xs rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
              autoFocus />
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-blue-400 hover:text-blue-300 tabular-nums">
              {progress}%
            </button>
          )}
        </div>
        <ProgressBar value={progress} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onEdit(project)}
          className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg py-1.5 transition-colors">
          Edit
        </button>
        <button onClick={() => onDelete(project.id)}
          className="flex-1 text-xs bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded-lg py-1.5 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

export default function ProjectTracker({ user }) {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | 'new' | project object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      const typeParam = filter !== 'All' ? `?type=${filter.toLowerCase()}` : '';
      const res = await fetch(`${API}${typeParam}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchProjects();
    const id = setInterval(fetchProjects, 15000);
    return () => clearInterval(id);
  }, [fetchProjects]);

  const handleSave = async form => {
    try {
      const isEdit = form.id != null;
      const url = isEdit ? `${API}/${form.id}` : API;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModal(null);
      await fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this project?')) return;
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjects(p => p.filter(proj => proj.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleProgressChange = async (id, progress) => {
    try {
      const project = projects.find(p => p.id === id);
      if (!project) return;
      const res = await fetch(`${API}/${id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ ...project, progress }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjects(ps => ps.map(p => p.id === id ? { ...p, progress } : p));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Project Tracker</h1>
            {user && <p className="text-gray-400 text-sm">Welcome, {user.name || user.email}</p>}
          </div>
          <button onClick={() => setModal('new')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            + New Project
          </button>
        </div>

        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === tab ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              {tab !== 'All' && TYPE_ICONS[tab.toLowerCase()]} {tab}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm flex justify-between">
            <span>Error: {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">&times;</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
            <span className="text-5xl">📂</span>
            <p className="text-lg">No projects found</p>
            <button onClick={() => setModal('new')} className="text-blue-400 hover:text-blue-300 text-sm underline">Create your first project</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p}
                onEdit={proj => setModal(proj)}
                onDelete={handleDelete}
                onProgressChange={handleProgressChange} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ProjectModal
          project={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)} />
      )}
    </div>
  );
}
