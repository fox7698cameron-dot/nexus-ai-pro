// ================================================
// NEXUS AI PRO - Project Dashboard
// File: src/components/ProjectDashboard.jsx
// Updated: 2026-07-01
// Tracks: web, mobile, desktop, game, VR/AR/XR,
//         backend, fullstack, AI/ML, devops
// Real-time updates via Socket.IO
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Plus, ChevronRight, Check, Clock, Pause,
  Archive, Trash2, Edit3, X, Loader2, RefreshCw,
  Globe, Smartphone, Monitor, Gamepad2, Glasses, Server,
  Layers, BrainCircuit, GitBranch, AlertTriangle, Star,
  Calendar, Tag, MoreVertical, CheckSquare, Circle,
} from 'lucide-react';

const PROJECT_TYPES = [
  { id: 'web',       label: 'Web App',       icon: Globe },
  { id: 'mobile',    label: 'Mobile',        icon: Smartphone },
  { id: 'desktop',   label: 'Desktop',       icon: Monitor },
  { id: 'game_2d',   label: '2D Game',       icon: Gamepad2 },
  { id: 'game_3d',   label: '3D Game',       icon: Gamepad2 },
  { id: 'vr',        label: 'VR',            icon: Glasses },
  { id: 'ar',        label: 'AR',            icon: Glasses },
  { id: 'xr',        label: 'XR / Mixed',    icon: Glasses },
  { id: 'backend',   label: 'Backend',       icon: Server },
  { id: 'fullstack', label: 'Full Stack',    icon: Layers },
  { id: 'ai_ml',     label: 'AI / ML',       icon: BrainCircuit },
  { id: 'devops',    label: 'DevOps',        icon: GitBranch },
  { id: 'library',   label: 'Library / SDK', icon: FolderOpen },
  { id: 'other',     label: 'Other',         icon: FolderOpen },
];

const STATUS_META = {
  planning:  { label: 'Planning',   color: 'text-gray-500',  bg: 'bg-gray-100 dark:bg-gray-700',   icon: Circle },
  active:    { label: 'Active',     color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: Check },
  paused:    { label: 'Paused',     color: 'text-yellow-600',bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Pause },
  review:    { label: 'In Review',  color: 'text-blue-600',  bg: 'bg-blue-100 dark:bg-blue-900/30',  icon: Star },
  completed: { label: 'Completed',  color: 'text-purple-600',bg: 'bg-purple-100 dark:bg-purple-900/30', icon: CheckSquare },
  archived:  { label: 'Archived',   color: 'text-gray-400',  bg: 'bg-gray-100 dark:bg-gray-800',   icon: Archive },
};

function typeIcon(typeId) {
  const t = PROJECT_TYPES.find(p => p.id === typeId);
  return t ? t.icon : FolderOpen;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.planning;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
      <Icon size={10} /> {meta.label}
    </span>
  );
}

function MilestoneRow({ ms, onToggle }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <button onClick={() => onToggle(ms.id, ms.status)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ms.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'}`}>
        {ms.status === 'completed' && <Check size={11} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${ms.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{ms.title}</p>
        {ms.due_date && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Calendar size={10} /> {new Date(ms.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <StatusBadge status={ms.status} />
    </div>
  );
}

function ProjectCard({ project, isSelected, onClick, onDelete }) {
  const TypeIcon = typeIcon(project.type);
  const meta = STATUS_META[project.status] || STATUS_META.planning;
  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-2 rounded-lg ${meta.bg} ${meta.color} flex-shrink-0`}>
            <TypeIcon size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{project.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{PROJECT_TYPES.find(t => t.id === project.type)?.label || project.type}</p>
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(project.id); }}
          className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <StatusBadge status={project.status} />
        {project.tech_stack?.length > 0 && (
          <div className="flex gap-1">
            {project.tech_stack.slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                {t}
              </span>
            ))}
            {project.tech_stack.length > 3 && <span className="text-xs text-gray-400">+{project.tech_stack.length - 3}</span>}
          </div>
        )}
      </div>
      {project.description && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{project.description}</p>
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'web', description: '', tech_stack: '', status: 'planning', repository_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('nexus_access_token');
      const payload = {
        ...form,
        tech_stack: form.tech_stack.split(',').map(s => s.trim()).filter(Boolean),
      };
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');
      onCreate(data.project);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Project</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Awesome Project" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(STATUS_META).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tech Stack (comma-separated)</label>
            <input value={form.tech_stack} onChange={e => setForm(p => ({ ...p, tech_stack: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="React, Node.js, PostgreSQL" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repository URL</label>
            <input value={form.repository_url} onChange={e => setForm(p => ({ ...p, repository_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://github.com/org/repo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description of the project..." />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDashboard({ socket }) {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newMilestone, setNewMilestone] = useState('');

  const token = () => localStorage.getItem('nexus_access_token');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMilestones = useCallback(async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setMilestones(d.milestones || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (!selected) return;
    fetchMilestones(selected.id);
  }, [selected, fetchMilestones]);

  useEffect(() => {
    if (!socket) return;
    const onCreated = p => setProjects(prev => [p, ...prev]);
    const onUpdated = p => setProjects(prev => prev.map(x => x.id === p.id ? p : x));
    const onDeleted = ({ projectId }) => { setProjects(prev => prev.filter(x => x.id !== projectId)); if (selected?.id === projectId) setSelected(null); };
    const onMs = ms => setMilestones(prev => [...prev, ms]);
    const onMsUp = ms => setMilestones(prev => prev.map(x => x.id === ms.id ? ms : x));
    socket.on('project:created', onCreated);
    socket.on('project:updated', onUpdated);
    socket.on('project:deleted', onDeleted);
    socket.on('milestone:created', onMs);
    socket.on('milestone:updated', onMsUp);
    return () => {
      socket.off('project:created', onCreated);
      socket.off('project:updated', onUpdated);
      socket.off('project:deleted', onDeleted);
      socket.off('milestone:created', onMs);
      socket.off('milestone:updated', onMsUp);
    };
  }, [socket, selected]);

  const deleteProject = async (id) => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setProjects(p => p.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const updateStatus = async (projectId, status) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { const d = await res.json(); setProjects(p => p.map(x => x.id === projectId ? d.project : x)); if (selected?.id === projectId) setSelected(d.project); }
  };

  const addMilestone = async () => {
    if (!newMilestone.trim() || !selected) return;
    const res = await fetch(`/api/projects/${selected.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ title: newMilestone.trim() }),
    });
    if (res.ok) { const d = await res.json(); setMilestones(p => [...p, d.milestone]); setNewMilestone(''); }
  };

  const toggleMilestone = async (msId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const res = await fetch(`/api/projects/${selected.id}/milestones/${msId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) { const d = await res.json(); setMilestones(p => p.map(x => x.id === msId ? d.milestone : x)); }
  };

  const filtered = projects.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const progress = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderOpen size={20} className="text-blue-500" /> Projects
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''} · Real-time tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchProjects} disabled={loading} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          <option value="all">All Types</option>
          {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_META).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Project list */}
        <div className="w-80 flex-shrink-0 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-600">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No projects yet</p>
              <button onClick={() => setShowNew(true)} className="mt-2 text-blue-500 text-sm hover:underline">Create one</button>
            </div>
          ) : filtered.map(p => (
            <ProjectCard key={p.id} project={p} isSelected={selected?.id === p.id}
              onClick={() => setSelected(p)} onDelete={deleteProject} />
          ))}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="space-y-6 max-w-2xl">
              {/* Project header */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selected.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {PROJECT_TYPES.find(t => t.id === selected.type)?.label}
                    </p>
                    {selected.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{selected.description}</p>}
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                {selected.tech_stack?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selected.tech_stack.map(t => (
                      <span key={t} className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded-full">
                        <Tag size={9} /> {t}
                      </span>
                    ))}
                  </div>
                )}

                {selected.repository_url && (
                  <a href={selected.repository_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-blue-500 hover:underline">
                    <GitBranch size={11} /> {selected.repository_url}
                  </a>
                )}

                {/* Status controls */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {Object.entries(STATUS_META).map(([id, m]) => (
                    <button key={id} onClick={() => updateStatus(selected.id, id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selected.status === id ? `${m.bg} ${m.color}` : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Milestones</h3>
                  <span className="text-xs text-gray-500">{completedMilestones}/{milestones.length} completed</span>
                </div>
                {milestones.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {milestones.map(ms => <MilestoneRow key={ms.id} ms={ms} onToggle={toggleMilestone} />)}
                </div>
                <div className="flex gap-2 mt-4">
                  <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addMilestone()}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add milestone…" />
                  <button onClick={addMilestone} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <FolderOpen size={48} className="mb-3 opacity-40" />
              <p className="text-sm">Select a project to view details</p>
            </div>
          )}
        </div>
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={p => { setProjects(prev => [p, ...prev]); setSelected(p); }} />}
    </div>
  );
}
