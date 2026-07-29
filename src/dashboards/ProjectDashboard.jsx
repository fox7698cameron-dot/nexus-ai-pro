/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Project tracking dashboard: coding, game dev, AR/VR, 3D projects
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Folder, Plus, Clock, Code, Gamepad2,
  Layers, Smartphone, Globe, Activity,
  Trash2, ChevronRight, Target
} from 'lucide-react';

const TYPE_ICONS = {
  coding:     { icon: Code,      label: 'Coding',       color: 'text-blue-400' },
  game_dev:   { icon: Gamepad2,  label: 'Game Dev',     color: 'text-purple-400' },
  ar_vr:      { icon: Layers,    label: 'AR/VR',        color: 'text-cyan-400' },
  '3d_art':   { icon: Layers,    label: '3D Art',       color: 'text-orange-400' },
  mobile_app: { icon: Smartphone,label: 'Mobile App',   color: 'text-green-400' },
  web_app:    { icon: Globe,     label: 'Web App',      color: 'text-yellow-400' },
  desktop_app:{ icon: Activity,  label: 'Desktop App',  color: 'text-pink-400' },
  ai_ml:      { icon: Code,      label: 'AI/ML',        color: 'text-rose-400' }
};

const STATUS_COLORS = {
  planning:    'bg-gray-700 text-gray-300',
  active:      'bg-blue-900 text-blue-300',
  in_review:   'bg-yellow-900 text-yellow-300',
  completed:   'bg-green-900 text-green-300',
  paused:      'bg-orange-900 text-orange-300',
  cancelled:   'bg-red-900 text-red-300'
};

const PRIORITY_COLORS = {
  low:      'text-gray-400',
  medium:   'text-yellow-400',
  high:     'text-orange-400',
  critical: 'text-red-400'
};

function ProgressBar({ value, color = 'bg-blue-500' }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5">
      <div
        className={`${color} h-1.5 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(100, value || 0)}%` }}
      />
    </div>
  );
}

function ProjectCard({ project, onSelect, onDelete, selected }) {
  const typeInfo = TYPE_ICONS[project.type] || {};
  const TypeIcon = typeInfo.icon || Folder;

  return (
    <div
      className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-all ${
        selected ? 'border-blue-500 shadow-lg shadow-blue-900/20' : 'border-gray-700 hover:border-gray-600'
      }`}
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeIcon size={16} className={typeInfo.color || 'text-gray-400'} />
          <span className="font-semibold text-white text-sm truncate max-w-[150px]">{project.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status] || 'bg-gray-700 text-gray-300'}`}>
            {project.status}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            className="text-gray-600 hover:text-red-400 transition-colors ml-1"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Progress</span>
          <span className="text-white font-semibold">{project.progress || 0}%</span>
        </div>
        <ProgressBar
          value={project.progress}
          color={project.progress === 100 ? 'bg-green-500' : project.progress > 50 ? 'bg-blue-500' : 'bg-purple-500'}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock size={10} /> {project.loggedHours || 0}h logged
        </span>
        <span className={`flex items-center gap-1 font-medium ${PRIORITY_COLORS[project.priority] || ''}`}>
          <Target size={10} /> {project.priority}
        </span>
      </div>

      {project.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {project.techStack.slice(0, 3).map(t => (
            <span key={t} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{t}</span>
          ))}
          {project.techStack.length > 3 && (
            <span className="text-xs text-gray-500">+{project.techStack.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

function NewProjectModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', type: 'coding', description: '', techStack: '', priority: 'medium',
    estimatedHours: '', tags: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg border border-gray-700">
        <h2 className="text-lg font-bold mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Project name"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {Object.entries(TYPE_ICONS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {['low', 'medium', 'high', 'critical'].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <input
            value={form.techStack}
            onChange={e => setForm(f => ({ ...f, techStack: e.target.value }))}
            placeholder="Tech stack (comma separated)"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="number"
            value={form.estimatedHours}
            onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))}
            placeholder="Estimated hours (optional)"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg py-2 text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDashboard({ authToken }) {
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logHours, setLogHours] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);

      const [projRes, sumRes] = await Promise.all([
        fetch(`/api/projects?${params}`, { headers }),
        fetch('/api/projects/summary', { headers })
      ]);
      if (projRes.ok) setProjects((await projRes.json()).projects || []);
      if (sumRes.ok) setSummary(await sumRes.json());
    } finally {
      setLoading(false);
    }
  }, [authToken, filterType, filterStatus]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async (data) => {
    const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify(data) });
    if (res.ok) {
      await fetchProjects();
      setShowModal(false);
    }
  };

  const deleteProject = async (id) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE', headers });
    if (selected?.id === id) setSelected(null);
    await fetchProjects();
  };

  const handleLogHours = async () => {
    if (!selected || !logHours) return;
    await fetch(`/api/projects/${selected.id}/hours`, {
      method: 'POST', headers,
      body: JSON.stringify({ hours: Number(logHours) })
    });
    setLogHours('');
    await fetchProjects();
  };

  const handleAddMilestone = async () => {
    if (!selected || !milestoneTitle) return;
    await fetch(`/api/projects/${selected.id}/milestones`, {
      method: 'POST', headers,
      body: JSON.stringify({ title: milestoneTitle })
    });
    setMilestoneTitle('');
    // Refresh selected project detail
    const res = await fetch(`/api/projects/${selected.id}`, { headers });
    if (res.ok) {
      const detail = await res.json();
      setSelected({ ...selected, ...detail.project });
    }
  };

  const filteredProjects = projects.filter(p => {
    if (filterType && p.type !== filterType) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Folder className="text-purple-400" size={24} />
            Project Tracker
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time tracking for coding, game dev, AR/VR &amp; 3D projects</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase font-medium mb-1">Total Projects</div>
            <div className="text-3xl font-bold text-white">{summary.total}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase font-medium mb-1">Active</div>
            <div className="text-3xl font-bold text-blue-400">{summary.byStatus?.active || 0}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase font-medium mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-400">{summary.byStatus?.completed || 0}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase font-medium mb-1">Total Hours</div>
            <div className="text-3xl font-bold text-purple-400">{summary.totalHours?.toFixed(1) || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5"
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_ICONS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5"
        >
          <option value="">All Statuses</option>
          {['planning', 'active', 'in_review', 'completed', 'paused', 'cancelled'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <span className="text-gray-400 text-sm self-center ml-auto">{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project grid */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-16 text-gray-500">Loading projects…</div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <Folder size={48} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">No projects yet. Create your first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProjects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={selected?.id === p.id}
                  onSelect={setSelected}
                  onDelete={deleteProject}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h2 className="font-bold text-white mb-1">{selected.name}</h2>
                <p className="text-gray-400 text-sm mb-3">{selected.description || 'No description'}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white">{TYPE_ICONS[selected.type]?.label || selected.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-semibold">{selected.progress || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Logged</span>
                    <span className="text-white">{selected.loggedHours || 0}h</span>
                  </div>
                  {selected.estimatedHours && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estimated</span>
                      <span className="text-white">{selected.estimatedHours}h</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Log hours */}
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1">
                  <Clock size={13} /> Log Time
                </h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={logHours}
                    onChange={e => setLogHours(e.target.value)}
                    placeholder="Hours"
                    min="0.25"
                    step="0.25"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleLogHours}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Log
                  </button>
                </div>
              </div>

              {/* Milestone */}
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1">
                  <Target size={13} /> Add Milestone
                </h3>
                <div className="flex gap-2">
                  <input
                    value={milestoneTitle}
                    onChange={e => setMilestoneTitle(e.target.value)}
                    placeholder="Milestone title"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddMilestone}
                    className="bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
              <ChevronRight size={32} className="mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-sm">Select a project to view details</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NewProjectModal onSave={createProject} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
