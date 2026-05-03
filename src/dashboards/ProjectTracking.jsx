// src/dashboards/ProjectTracking.jsx
// Nexus AI Pro — Real-Time Project Tracking Dashboard
// Updated: 2026-05-03

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Code, Gamepad2, Box, Cpu, Plus, Trash2, Edit3,
  Activity, CheckCircle, Clock, AlertTriangle,
  GitBranch, Play, Pause, ChevronRight, Download,
  Target, Zap, TrendingUp, Users, Calendar, RefreshCw
} from 'lucide-react';

const PROJECT_TYPES = {
  coding:      { label: 'Coding',          icon: <Code size={16} />,    color: '#3b82f6', langs: ['JavaScript','TypeScript','Python','Go','Rust','C++','Swift'] },
  game_dev:    { label: 'Game Dev',         icon: <Gamepad2 size={16} />, color: '#8b5cf6', langs: ['C++','C#','GDScript','Lua','Blueprints'] },
  ar_vr:       { label: 'AR / VR',          icon: <Box size={16} />,     color: '#06b6d4', langs: ['C++','C#','HLSL','GLSL','Swift','Kotlin'] },
  three_d:     { label: '3D Projects',      icon: <Cpu size={16} />,     color: '#f59e0b', langs: ['C++','Python','MEL','GLSL','HLSL'] },
};

const STATUS_CONFIG = {
  active:     { label: 'Active',      color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',  dot: 'bg-green-500' },
  paused:     { label: 'Paused',      color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', dot: 'bg-yellow-500' },
  completed:  { label: 'Completed',   color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   dot: 'bg-blue-400' },
  blocked:    { label: 'Blocked',     color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',     dot: 'bg-red-500' },
};

function generateMilestones(n = 5) {
  const names = ['Setup & Scaffolding','Core Architecture','Feature Implementation','Testing & QA','Release & Deploy'];
  const progress = [100, 100, Math.round(Math.random() * 80 + 20), Math.round(Math.random() * 50), 0];
  return names.slice(0, n).map((name, i) => ({
    id: `m-${i}`, name, progress: progress[i] ?? 0,
    due: new Date(Date.now() + (i + 1) * 7 * 86400000).toISOString().slice(0, 10),
    done: progress[i] === 100
  }));
}

function generateProject(id, type) {
  const cfg = PROJECT_TYPES[type];
  const lang = cfg.langs[Math.floor(Math.random() * cfg.langs.length)];
  return {
    id, type,
    name: `Project ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 999)}`,
    description: `A ${cfg.label.toLowerCase()} project using ${lang}`,
    status: ['active', 'paused', 'active', 'blocked'][Math.floor(Math.random() * 4)],
    progress: Math.round(Math.random() * 90 + 5),
    language: lang,
    linesOfCode: Math.round(Math.random() * 50000 + 1000),
    commits: Math.round(Math.random() * 200 + 10),
    openIssues: Math.round(Math.random() * 20),
    teamSize: Math.round(Math.random() * 8 + 1),
    createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + Math.random() * 60 * 86400000).toISOString().slice(0, 10),
    milestones: generateMilestones(),
    activitySeries: Array.from({ length: 14 }, () => Math.round(Math.random() * 50))
  };
}

function MiniBar({ values, color }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm opacity-80"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: 2 }}
        />
      ))}
    </div>
  );
}

function ProjectCard({ project, onToggleStatus, onDelete }) {
  const cfg = PROJECT_TYPES[project.type];
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
  const daysLeft = Math.ceil((new Date(project.dueDate) - Date.now()) / 86400000);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="h-1" style={{ backgroundColor: cfg.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`flex items-center gap-1 text-xs ${statusCfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                  {statusCfg.label}
                </span>
                <span className="text-xs text-gray-400">{project.language}</span>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 rounded">{cfg.label}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onToggleStatus(project.id)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {project.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              onClick={() => onDelete(project.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{project.progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${project.progress}%`, backgroundColor: cfg.color }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Lines', value: project.linesOfCode >= 1000 ? `${(project.linesOfCode / 1000).toFixed(1)}K` : project.linesOfCode, icon: <Code size={10} /> },
            { label: 'Commits', value: project.commits, icon: <GitBranch size={10} /> },
            { label: 'Issues', value: project.openIssues, icon: <AlertTriangle size={10} /> },
            { label: 'Team', value: project.teamSize, icon: <Users size={10} /> }
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center gap-0.5 text-gray-400 mb-0.5">{stat.icon}<span className="text-xs">{stat.label}</span></div>
              <div className="font-semibold text-xs text-gray-800 dark:text-gray-100">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Activity spark */}
        <MiniBar values={project.activitySeries} color={cfg.color} />

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            Due {project.dueDate}
          </span>
          <span className={`flex items-center gap-1 ${daysLeft < 7 ? 'text-red-500' : daysLeft < 14 ? 'text-yellow-500' : 'text-gray-400'}`}>
            <Clock size={10} />
            {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
          </span>
        </div>
      </div>
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'coding', language: 'JavaScript', description: '' });
  const langs = PROJECT_TYPES[form.type]?.langs || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = `p-${Date.now()}`;
    const newProject = {
      ...generateProject(id, form.type),
      name: form.name || `New ${PROJECT_TYPES[form.type].label} Project`,
      language: form.language,
      description: form.description,
      progress: 0,
      commits: 0,
      openIssues: 0,
      milestones: generateMilestones(3)
    };
    onCreate(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">New Project</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Project name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          />
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value, language: PROJECT_TYPES[e.target.value].langs[0] }))}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(PROJECT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={form.language}
            onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          >
            {langs.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white resize-none"
          />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="flex-1 py-2 bg-blue-600 rounded-lg text-sm text-white hover:bg-blue-700 transition-colors">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectTracking() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const initial = [
      generateProject('p-1', 'coding'),
      generateProject('p-2', 'game_dev'),
      generateProject('p-3', 'ar_vr'),
      generateProject('p-4', 'three_d'),
      generateProject('p-5', 'coding'),
      generateProject('p-6', 'game_dev'),
    ];
    setProjects(initial);
    setLoading(false);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1);
      setProjects(prev => prev.map(p => {
        if (p.status !== 'active') return p;
        const newCommits = Math.random() > 0.7 ? p.commits + 1 : p.commits;
        const newSeries = [...p.activitySeries.slice(1), Math.round(Math.random() * 50)];
        return { ...p, commits: newCommits, activitySeries: newSeries };
      }));
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const toggleStatus = (id) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, status: p.status === 'active' ? 'paused' : 'active' } : p
    ));
  };

  const deleteProject = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const addProject = (project) => {
    setProjects(prev => [project, ...prev]);
  };

  const filtered = projects.filter(p => {
    const statusMatch = filter === 'all' || p.status === filter;
    const typeMatch = typeFilter === 'all' || p.type === typeFilter;
    return statusMatch && typeMatch;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    avgProgress: projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0,
    totalCommits: projects.reduce((s, p) => s + p.commits, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚀 Project Tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time metrics · Coding · Game Dev · AR/VR · 3D
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        {[
          { label: 'Total Projects', value: stats.total, icon: <Target size={18} />, color: 'from-blue-500 to-indigo-600' },
          { label: 'Active Now', value: stats.active, icon: <Activity size={18} />, color: 'from-green-500 to-emerald-600' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: <TrendingUp size={18} />, color: 'from-purple-500 to-pink-600' },
          { label: 'Total Commits', value: stats.totalCommits, icon: <GitBranch size={18} />, color: 'from-orange-500 to-red-500' }
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}>
            <div className="flex items-center gap-2 mb-1 opacity-90 text-sm">{s.icon} {s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          {['all', 'active', 'paused', 'blocked', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                filter === s
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${typeFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            All Types
          </button>
          {Object.entries(PROJECT_TYPES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setTypeFilter(k)}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${typeFilter === k ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              style={typeFilter === k ? { backgroundColor: v.color } : {}}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Project grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw size={28} className="animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-40" />
          <p>No projects match the current filters</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-blue-600 text-sm hover:underline">Create your first project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onToggleStatus={toggleStatus} onDelete={deleteProject} />
          ))}
        </div>
      )}

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onCreate={addProject} />}
    </div>
  );
}
