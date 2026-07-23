// src/dashboards/ProjectDashboard.jsx
// 2026-07-23 | Nexus AI Pro - Project Tracking Dashboard
// Supports: Coding, Game Dev, AR/VR/3D | Real-time | Multi-platform

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Gamepad2, Code, Box, Plus, Trash2, Edit3, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, Play, Pause, Archive,
  TrendingUp, BarChart3, Target, Shield, Zap, Globe,
  ChevronDown, ChevronRight, Star, Activity, Cpu, Layers,
  GitBranch, Settings, Upload, Download, Users, Bug
} from 'lucide-react';

const PROJECT_TYPE_CONFIG = {
  coding: { label: 'Coding', icon: Code, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300' },
  game_dev: { label: 'Game Dev', icon: Gamepad2, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300' },
  ar_vr_3d: { label: 'AR/VR/3D', icon: Box, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-800 dark:text-pink-300' },
  app_dev: { label: 'App Dev', icon: Layers, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', badge: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' },
  web: { label: 'Web', icon: Globe, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-300' },
  ai_ml: { label: 'AI/ML', icon: Cpu, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300' },
};

const STATUS_CONFIG = {
  planning: { label: 'Planning', icon: Clock, color: 'text-gray-500', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  in_progress: { label: 'In Progress', icon: Play, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300' },
  on_hold: { label: 'On Hold', icon: Pause, color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300' },
  review: { label: 'Review', icon: Shield, color: 'text-purple-600', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-600', badge: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' },
  archived: { label: 'Archived', icon: Archive, color: 'text-gray-400', badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

const PUBLISHER_ICONS = {
  epic_games: '🎮', sony_playstation: '🎮', microsoft_xbox: '🪟',
  ubisoft_connect: '🦅', steam: '🎮', apple_arcade: '🍎', google_play: '▶️',
};

const ENGINE_ICONS = { unreal: '🔴', unity: '⬛', godot: '🔵', custom: '⚙️' };

function ProgressBar({ value, color = 'bg-indigo-500', label }) {
  return (
    <div className="space-y-1">
      {label && <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>{label}</span><span>{value}%</span></div>}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function ProjectCard({ project, onSelect, onStatusChange, onDelete }) {
  const typeConfig = PROJECT_TYPE_CONFIG[project.type] || PROJECT_TYPE_CONFIG.coding;
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md transition-all hover:border-indigo-200 dark:hover:border-indigo-700"
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${typeConfig.bg}`}>
            <TypeIcon size={20} className={typeConfig.color} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{project.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeConfig.badge}`}>{typeConfig.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusConfig.badge}`}>
                <StatusIcon size={10} />
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(project.id); }}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {project.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{project.description}</p>
      )}

      <ProgressBar value={project.progress || 0} label="Progress" />

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{project.coveragePercent || 0}%</div>
          <div className="text-gray-400">Coverage</div>
        </div>
        <div>
          <div className={`font-bold ${project.buildStatus === 'success' ? 'text-green-600' : project.buildStatus === 'failed' ? 'text-red-600' : 'text-gray-400'}`}>
            {project.buildStatus || 'N/A'}
          </div>
          <div className="text-gray-400">Build</div>
        </div>
        <div>
          <div className="font-bold text-gray-900 dark:text-white">
            {project.linesOfCode ? `${(project.linesOfCode / 1000).toFixed(1)}K` : '0'}
          </div>
          <div className="text-gray-400">Lines</div>
        </div>
      </div>

      {(project.publisherConnectors?.length > 0 || project.engine) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {project.engine && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {ENGINE_ICONS[project.engine] || '⚙️'} {project.engine}
            </span>
          )}
          {project.publisherConnectors?.map(p => (
            <span key={p} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {PUBLISHER_ICONS[p] || '🎮'} {p.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ project, builds, achievements, tasks, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('overview');
  const tabs = ['overview', 'tasks', 'builds', 'achievements'];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full sm:rounded-2xl sm:max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{project.description}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">×</button>
        </div>

        <div className="flex border-b border-gray-100 dark:border-gray-700 px-6">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{project.progress || 0}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Progress</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${project.coveragePercent >= 80 ? 'text-green-600' : project.coveragePercent >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{project.coveragePercent || 0}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coverage</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${project.buildStatus === 'success' ? 'text-green-600' : project.buildStatus === 'failed' ? 'text-red-600' : 'text-gray-400'}`}>{project.buildStatus || '—'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last Build</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.filter(t => t.status === 'completed').length}/{tasks.length}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tasks Done</div>
                </div>
              </div>

              <ProgressBar value={project.progress || 0} label="Overall Progress" color="bg-indigo-500" />
              <ProgressBar value={project.coveragePercent || 0} label="Test Coverage" color={project.coveragePercent >= 80 ? 'bg-green-500' : project.coveragePercent >= 60 ? 'bg-amber-500' : 'bg-red-500'} />

              {project.targetPlatforms?.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Target Platforms</div>
                  <div className="flex flex-wrap gap-2">
                    {project.targetPlatforms.map(p => (
                      <span key={p} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">{p.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Activity size={32} className="mx-auto mb-2 opacity-50" /><p>No tasks yet</p></div>
              ) : tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'completed' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{task.title}</div>
                    {task.description && <div className="text-xs text-gray-400 truncate">{task.description}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-300'}`}>{task.priority}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'builds' && (
            <div className="space-y-3">
              {builds.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Cpu size={32} className="mx-auto mb-2 opacity-50" /><p>No builds recorded</p></div>
              ) : builds.map(build => (
                <div key={build.id} className={`p-4 rounded-xl border ${build.status === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : build.status === 'failed' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${build.status === 'success' ? 'text-green-700 dark:text-green-400' : build.status === 'failed' ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>{build.status?.toUpperCase()}</span>
                      <span className="text-xs text-gray-400">#{build.buildNumber || '?'}</span>
                      {build.platform && <span className="text-xs text-gray-400">· {build.platform}</span>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(build.timestamp).toLocaleString()}</span>
                  </div>
                  {build.errors?.length > 0 && (
                    <div className="text-xs text-red-600 dark:text-red-400"><Bug size={12} className="inline mr-1" />{build.errors.length} error(s)</div>
                  )}
                  {build.coveragePercent !== undefined && (
                    <div className="mt-2"><ProgressBar value={build.coveragePercent} label="Coverage" /></div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-3">
              {achievements.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Star size={32} className="mx-auto mb-2 opacity-50" /><p>No achievements yet</p></div>
              ) : achievements.map(ach => (
                <div key={ach.id} className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <Star size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{ach.title}</div>
                    {ach.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ach.description}</div>}
                    {ach.platform && <div className="text-xs text-gray-400 mt-1">{ach.platform}</div>}
                  </div>
                  <span className="text-xs font-bold text-amber-600">+{ach.xpValue} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', engine: '', targetPlatforms: [] });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await onCreate(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Project</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Awesome Project" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {Object.entries(PROJECT_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            {(form.type === 'game_dev' || form.type === 'ar_vr_3d') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game Engine</label>
                <select value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select engine...</option>
                  <option value="unreal">🔴 Unreal Engine</option>
                  <option value="unity">⬛ Unity</option>
                  <option value="godot">🔵 Godot</option>
                  <option value="custom">⚙️ Custom</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What are you building?" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={!form.name.trim()} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Create Project</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDashboard({ userId, socket }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetail, setProjectDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchProjects = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:session')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Projects fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchProjectDetail = useCallback(async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:session')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch project detail');
      return await res.json();
    } catch (err) {
      console.error('Detail fetch error:', err);
      return null;
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (!socket) return;
    socket.on('project:updated', ({ projectId, status, progress }) => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status, progress } : p));
    });
    socket.on('project:build', ({ projectId, status, coveragePercent }) => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, buildStatus: status, coveragePercent: coveragePercent ?? p.coveragePercent } : p));
    });
    return () => {
      socket.off('project:updated');
      socket.off('project:build');
    };
  }, [socket]);

  const handleSelect = async (project) => {
    setSelectedProject(project);
    const detail = await fetchProjectDetail(project.id);
    setProjectDetail(detail);
  };

  const handleCreate = async (form) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus:session')}`,
        },
        body: JSON.stringify({ userId, ...form }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      await fetchProjects();
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:session')}` },
      });
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filtered = useMemo(() =>
    projects.filter(p =>
      (filterType === 'all' || p.type === filterType) &&
      (filterStatus === 'all' || p.status === filterStatus)
    ),
  [projects, filterType, filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <GitBranch className="text-indigo-600" size={24} />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Project Tracker</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">All Types</option>
                {Object.entries(PROJECT_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={fetchProjects} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium">
                <Plus size={14} />New Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-indigo-600">{projects.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Projects</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-blue-600">{projects.filter(p => p.status === 'in_progress').length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">In Progress</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-green-600">{projects.filter(p => p.status === 'completed').length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className={`text-2xl font-bold ${projects.some(p => p.buildStatus === 'failed') ? 'text-red-600' : 'text-green-600'}`}>
              {projects.filter(p => p.buildStatus === 'success').length}/{projects.filter(p => p.buildStatus).length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Builds Passing</div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-16 text-center">
            <GitBranch size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">No projects found</h3>
            <p className="text-gray-400 dark:text-gray-500 mb-6 text-sm">Create your first coding, game dev, or AR/VR/3D project.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
              <Plus size={16} />Create Project
            </button>
          </div>
        )}
      </div>

      {selectedProject && projectDetail && (
        <ProjectDetail
          project={selectedProject}
          builds={projectDetail.recentBuilds || []}
          achievements={projectDetail.achievements?.items || []}
          tasks={projectDetail.tasks?.items || []}
          onClose={() => { setSelectedProject(null); setProjectDetail(null); }}
          onUpdate={fetchProjects}
        />
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
