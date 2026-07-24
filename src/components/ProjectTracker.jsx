// src/components/ProjectTracker.jsx
// 2026-07-24 | Nexus AI Pro - Real-time Project Tracker UI
// Coding, game dev, AR/VR, 3D, mobile, web, desktop projects

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Rocket, Gamepad2, Cpu, Smartphone, Globe, Monitor, Box, Trophy, CheckCircle2, Circle, BarChart3, Clock, Play } from 'lucide-react';

const PROJECT_TYPE_ICONS = {
  coding: <Cpu size={16} />,
  game_dev: <Gamepad2 size={16} />,
  ar_vr: <Box size={16} />,
  '3d': <Box size={16} />,
  mobile: <Smartphone size={16} />,
  web: <Globe size={16} />,
  desktop: <Monitor size={16} />,
};

const STATUS_COLORS = {
  planning: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  review: 'bg-yellow-500',
  testing: 'bg-orange-500',
  deployed: 'bg-green-500',
  archived: 'bg-gray-600',
};

const STATUS_LABELS = {
  planning: 'Planning',
  in_progress: 'In Progress',
  review: 'Review',
  testing: 'Testing',
  deployed: 'Deployed',
  archived: 'Archived',
};

function ProgressBar({ value, color = 'bg-blue-500' }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function ProjectCard({ project, onSelect }) {
  const completedMs = project.milestones?.filter(m => m.completed).length ?? 0;
  const totalMs = project.milestones?.length ?? 0;

  return (
    <div
      className="bg-gray-800 rounded-xl border border-gray-700 p-4 cursor-pointer hover:border-blue-500/50 transition-colors"
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-blue-400">{PROJECT_TYPE_ICONS[project.type] || <Rocket size={16} />}</span>
          <h3 className="font-semibold text-white text-sm">{project.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[project.status]}`} />
          <span className="text-xs text-gray-400">{STATUS_LABELS[project.status]}</span>
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Progress</span>
          <span className="text-white font-medium">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>

      {totalMs > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {completedMs}/{totalMs} milestones
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        {project.engine && <span>🎮 {project.engine}</span>}
        {project.metrics?.testCoverage > 0 && <span>✅ {project.metrics.testCoverage}% coverage</span>}
        {project.achievements?.length > 0 && (
          <span className="flex items-center gap-0.5">
            <Trophy size={10} className="text-yellow-400" />
            {project.achievements.length}
          </span>
        )}
      </div>
    </div>
  );
}

function NewProjectModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    type: 'coding',
    engine: '',
    description: '',
    tags: '',
  });

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-lg font-bold text-white mb-4">New Project</h2>
        <div className="space-y-3">
          <input
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Project name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <select
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            <option value="coding">Coding</option>
            <option value="game_dev">Game Development</option>
            <option value="ar_vr">AR / VR</option>
            <option value="3d">3D Project</option>
            <option value="mobile">Mobile App</option>
            <option value="web">Web App</option>
            <option value="desktop">Desktop App</option>
          </select>
          {form.type === 'game_dev' && (
            <select
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none"
              value={form.engine}
              onChange={e => setForm(f => ({ ...f, engine: e.target.value }))}
            >
              <option value="">Select engine…</option>
              <option value="UNREAL">Unreal Engine</option>
              <option value="UNITY">Unity</option>
              <option value="GODOT">Godot</option>
              <option value="BLENDER">Blender</option>
              <option value="THREEJS">Three.js</option>
              <option value="BABYLONJS">Babylon.js</option>
            </select>
          )}
          <textarea
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Description (optional)"
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <input
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Tags (comma-separated)"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectTracker({ socket }) {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem('nexus:accessToken');
    if (!token) { setLoading(false); return; }
    const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('subscribe:projects');
    socket.on('project:created', ({ project }) => setProjects(p => [...p, project]));
    socket.on('project:updated', ({ projectId, progress, status }) => {
      setProjects(p => p.map(proj => proj.id === projectId ? { ...proj, progress, status } : proj));
    });
    socket.on('project:achievement', ({ projectId, achievement }) => {
      setProjects(p => p.map(proj =>
        proj.id === projectId
          ? { ...proj, achievements: [...(proj.achievements || []), achievement] }
          : proj
      ));
    });
    return () => { socket.off('project:created'); socket.off('project:updated'); socket.off('project:achievement'); };
  }, [socket]);

  const handleCreate = async (formData) => {
    const token = localStorage.getItem('nexus:accessToken');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      const project = await res.json();
      setProjects(p => [...p, project]);
    }
    setShowNew(false);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Rocket size={22} className="text-purple-400" />
            Projects
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading projects…</div>
      ) : !projects.length ? (
        <div className="text-center py-12 text-gray-400">
          <Rocket size={32} className="mx-auto mb-3 opacity-30" />
          <p>No projects yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onSelect={setSelected} />
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onSave={handleCreate} onClose={() => setShowNew(false)} />}
    </div>
  );
}

export default ProjectTracker;
