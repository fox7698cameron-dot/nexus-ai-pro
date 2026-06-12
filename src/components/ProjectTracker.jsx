// src/components/ProjectTracker.jsx
// 2026-06-12 | Real-time project tracking: coding, game dev, AR/VR/3D + achievements
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, CheckCircle, Circle, Clock, Trophy, Gamepad2,
  Code, Box, Smartphone, Globe, Target, Star, Flame,
  ChevronDown, ChevronRight, Activity, Trash2, Edit3, Save
} from 'lucide-react';

const TYPE_META = {
  coding: { icon: Code, label: 'Coding', color: 'text-blue-400' },
  game: { icon: Gamepad2, label: 'Game Dev', color: 'text-purple-400' },
  ar_vr: { icon: Box, label: 'AR/VR', color: 'text-green-400' },
  '3d': { icon: Box, label: '3D', color: 'text-yellow-400' },
  mobile: { icon: Smartphone, label: 'Mobile', color: 'text-pink-400' },
  web: { icon: Globe, label: 'Web', color: 'text-cyan-400' },
  desktop: { icon: Code, label: 'Desktop', color: 'text-orange-400' },
  other: { icon: Target, label: 'Other', color: 'text-gray-400' }
};

const STATUS_COLORS = {
  active: 'text-green-400 bg-green-400/10 border-green-500/30',
  completed: 'text-blue-400 bg-blue-400/10 border-blue-500/30',
  paused: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30'
};

const MILESTONE_STATUS_COLORS = {
  todo: 'text-gray-400',
  in_progress: 'text-yellow-400',
  review: 'text-blue-400',
  done: 'text-green-400'
};

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{
          width: `${value}%`,
          background: value >= 100 ? '#22c55e' : value >= 70 ? '#3b82f6' : value >= 40 ? '#eab308' : '#ef4444'
        }}
      />
    </div>
  );
}

function AchievementBadge({ achievement, onUnlock }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      achievement.unlocked
        ? 'border-yellow-500/40 bg-yellow-500/5'
        : 'border-gray-700 bg-gray-900 opacity-60'
    }`}>
      <span className="text-2xl">{achievement.icon || '🏆'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${achievement.unlocked ? 'text-yellow-300' : 'text-gray-300'}`}>
          {achievement.name}
        </p>
        {achievement.description && (
          <p className="text-xs text-gray-500 truncate">{achievement.description}</p>
        )}
        {achievement.points > 0 && (
          <span className="text-xs text-yellow-500">{achievement.points} pts</span>
        )}
      </div>
      {!achievement.unlocked && (
        <button
          onClick={() => onUnlock(achievement.id)}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300"
        >
          Unlock
        </button>
      )}
      {achievement.unlocked && (
        <Trophy size={16} className="text-yellow-400 flex-shrink-0" />
      )}
    </div>
  );
}

function ProjectCard({ project, onSelect, onDelete, selected }) {
  const meta = TYPE_META[project.type] || TYPE_META.other;
  const Icon = meta.icon;

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all ${
        selected ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'
      }`}
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className={meta.color} />
          <span className="font-semibold text-white text-sm truncate">{project.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
            {project.status}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            className="text-gray-600 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <ProgressBar value={project.progress || 0} />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{project.progress || 0}% complete</span>
        {project.milestones?.length > 0 && (
          <span>{project.milestones.filter(m => m.status === 'done').length}/{project.milestones.length} milestones</span>
        )}
      </div>

      {project.engine && (
        <p className="text-xs text-gray-500 mt-2">Engine: {project.engine}</p>
      )}
      {project.platforms?.length > 0 && (
        <p className="text-xs text-gray-500">Platforms: {project.platforms.join(', ')}</p>
      )}
    </div>
  );
}

function NewProjectForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: 'coding', description: '', engine: '', platforms: [], tags: []
  });

  const gameEngines = ['unreal', 'unity', 'godot', 'custom', 'other'];
  const gamePlatforms = ['epic', 'sony_psn', 'microsoft_xbox', 'ubisoft_connect', 'steam'];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-white">New Project</h3>
      <input
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        placeholder="Project name"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
      />
      <select
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        value={form.type}
        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
      >
        {Object.entries(TYPE_META).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
      {form.type === 'game' && (
        <>
          <select
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            value={form.engine}
            onChange={e => setForm(f => ({ ...f, engine: e.target.value }))}
          >
            <option value="">Select engine...</option>
            {gameEngines.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Target Platforms</p>
            <div className="flex flex-wrap gap-2">
              {gamePlatforms.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    platforms: f.platforms.includes(p)
                      ? f.platforms.filter(x => x !== p)
                      : [...f.platforms, p]
                  }))}
                  className={`text-xs px-2 py-1 rounded-lg border transition ${
                    form.platforms.includes(p)
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-gray-700 text-gray-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <textarea
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none h-20"
        placeholder="Description (optional)"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(form)}
          disabled={!form.name.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm py-2 rounded-lg font-medium transition"
        >
          Create Project
        </button>
        <button
          onClick={onCancel}
          className="px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm py-2 rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ProjectTracker({ token }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [expandedSections, setExpandedSections] = useState({ milestones: true, achievements: true });
  const [loading, setLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Real-time refresh every 10s
  useEffect(() => {
    const id = setInterval(fetchProjects, 10000);
    return () => clearInterval(id);
  }, [fetchProjects]);

  async function createProject(form) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify(form)
    });
    if (res.ok) {
      const p = await res.json();
      setProjects(prev => [p, ...prev]);
      setShowNewForm(false);
    }
  }

  async function deleteProject(id) {
    await fetch(`/api/projects/${id}`, { method: 'DELETE', headers });
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) setSelectedProject(null);
  }

  async function updateProgress(id, progress) {
    const res = await fetch(`/api/projects/${id}/progress`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ progress })
    });
    if (res.ok) {
      const data = await res.json();
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      setSelectedProject(prev => prev?.id === id ? { ...prev, ...data } : prev);
    }
  }

  async function addMilestone() {
    if (!newMilestone.trim() || !selectedProject) return;
    const res = await fetch(`/api/projects/${selectedProject.id}/milestones`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: newMilestone, status: 'todo' })
    });
    if (res.ok) {
      const ms = await res.json();
      const updated = { ...selectedProject, milestones: [...(selectedProject.milestones || []), ms] };
      setSelectedProject(updated);
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      setNewMilestone('');
    }
  }

  async function updateMilestoneStatus(msId, status) {
    const res = await fetch(`/api/projects/${selectedProject.id}/milestones/${msId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const updated = await res.json();
      const newMs = selectedProject.milestones.map(m => m.id === msId ? updated : m);
      const updatedProject = { ...selectedProject, milestones: newMs };
      setSelectedProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    }
  }

  async function unlockAchievement(achievementId) {
    const res = await fetch(`/api/projects/${selectedProject.id}/achievements/${achievementId}/unlock`, {
      method: 'PUT',
      headers
    });
    if (res.ok) {
      const updated = await res.json();
      const newAchs = selectedProject.achievements.map(a => a.id === achievementId ? updated : a);
      setSelectedProject(prev => ({ ...prev, achievements: newAchs }));
    }
  }

  function toggleSection(key) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const totalAchievements = selectedProject?.achievements?.length || 0;
  const unlockedAchievements = selectedProject?.achievements?.filter(a => a.unlocked).length || 0;
  const doneMilestones = selectedProject?.milestones?.filter(m => m.status === 'done').length || 0;

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-950 text-white overflow-hidden">
      {/* Sidebar: project list */}
      <div className="md:w-72 flex-shrink-0 flex flex-col border-r border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-400" />
              <h1 className="font-bold">Project Tracker</h1>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-lg font-medium transition"
          >
            <Plus size={14} /> New Project
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {showNewForm && (
            <NewProjectForm onSave={createProject} onCancel={() => setShowNewForm(false)} />
          )}
          {loading && projects.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">Loading...</p>
          )}
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={setSelectedProject}
              onDelete={deleteProject}
              selected={selectedProject?.id === p.id}
            />
          ))}
          {!loading && projects.length === 0 && !showNewForm && (
            <p className="text-center text-gray-500 text-sm py-8">No projects yet. Create one!</p>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto">
        {!selectedProject ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Target size={40} className="mx-auto mb-3 opacity-30" />
              <p>Select a project to view details</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Project header */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedProject.name}</h2>
                  <p className="text-sm text-gray-400 capitalize">{selectedProject.type} project</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border ${STATUS_COLORS[selectedProject.status] || STATUS_COLORS.active}`}>
                  {selectedProject.status}
                </span>
              </div>
              {selectedProject.description && (
                <p className="text-sm text-gray-400 mt-2">{selectedProject.description}</p>
              )}
            </div>

            {/* Progress */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Overall Progress</span>
                <span className="text-lg font-bold text-white">{selectedProject.progress || 0}%</span>
              </div>
              <ProgressBar value={selectedProject.progress || 0} />
              <input
                type="range"
                min="0"
                max="100"
                value={selectedProject.progress || 0}
                onChange={e => updateProgress(selectedProject.id, parseInt(e.target.value))}
                className="w-full mt-3 accent-blue-500"
              />
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                  <p className="text-xs text-gray-500">Milestones</p>
                  <p className="text-sm font-bold text-white">{doneMilestones}/{selectedProject.milestones?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Achievements</p>
                  <p className="text-sm font-bold text-white">{unlockedAchievements}/{totalAchievements}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Engine</p>
                  <p className="text-sm font-bold text-white capitalize">{selectedProject.engine || '—'}</p>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('milestones')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-800 transition"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-yellow-400" />
                  <span className="font-medium text-sm">Milestones</span>
                  <span className="text-xs text-gray-500">({selectedProject.milestones?.length || 0})</span>
                </div>
                {expandedSections.milestones ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedSections.milestones && (
                <div className="px-4 pb-4 space-y-2">
                  {selectedProject.milestones?.map(ms => (
                    <div key={ms.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      <button
                        onClick={() => updateMilestoneStatus(ms.id, ms.status === 'done' ? 'todo' : 'done')}
                        className={MILESTONE_STATUS_COLORS[ms.status]}
                      >
                        {ms.status === 'done' ? <CheckCircle size={16} /> : <Circle size={16} />}
                      </button>
                      <span className={`flex-1 text-sm ${ms.status === 'done' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {ms.title}
                      </span>
                      <select
                        value={ms.status}
                        onChange={e => updateMilestoneStatus(ms.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="text-xs bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-gray-300"
                      >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      placeholder="Add milestone..."
                      value={newMilestone}
                      onChange={e => setNewMilestone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addMilestone()}
                    />
                    <button onClick={addMilestone} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Achievements */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('achievements')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-800 transition"
              >
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-400" />
                  <span className="font-medium text-sm">Achievements</span>
                  {unlockedAchievements > 0 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                      {unlockedAchievements} unlocked
                    </span>
                  )}
                </div>
                {expandedSections.achievements ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedSections.achievements && (
                <div className="px-4 pb-4 space-y-2">
                  {selectedProject.achievements?.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-3">No achievements yet</p>
                  )}
                  {selectedProject.achievements?.map(a => (
                    <AchievementBadge key={a.id} achievement={a} onUnlock={unlockAchievement} />
                  ))}
                </div>
              )}
            </div>

            {/* Game platform integrations */}
            {selectedProject.type === 'game' && selectedProject.platforms?.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 size={14} className="text-purple-400" />
                  <span className="text-sm font-medium">Platform Integrations</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.platforms.map(p => (
                    <span key={p} className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-gray-300 capitalize">
                      {p.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
