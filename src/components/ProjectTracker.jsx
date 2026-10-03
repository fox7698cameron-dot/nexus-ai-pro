// src/components/ProjectTracker.jsx
// Date: 2026-10-03
// Real-time project tracking: coding, game dev, AR/VR/3D with engine connectors

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Code, Box, Plus, Trash2, Edit3, CheckCircle,
  Clock, Target, Trophy, Zap, GitBranch, Bug, TestTube,
  Layers, Cpu, Link, RefreshCw, BarChart3
} from 'lucide-react';

const PROJECT_TYPE_META = {
  coding:  { icon: Code,     label: 'Coding',           color: 'blue'   },
  game:    { icon: Gamepad2, label: 'Game',              color: 'purple' },
  ar:      { icon: Cpu,      label: 'AR',                color: 'cyan'   },
  vr:      { icon: Box,      label: 'VR',                color: 'indigo' },
  '3d':    { icon: Layers,   label: '3D',                color: 'pink'   },
  mobile:  { icon: Code,     label: 'Mobile App',        color: 'green'  },
  web:     { icon: Code,     label: 'Web App',           color: 'orange' },
  desktop: { icon: Code,     label: 'Desktop App',       color: 'teal'   }
};

const ENGINES = ['unreal', 'unity', 'godot', 'o3de', 'webxr', 'threejs', 'blender', 'maya', 'custom'];

const CONNECTORS = [
  { id: 'unreal',    name: 'Unreal Engine',   icon: '🎮', color: 'text-blue-600' },
  { id: 'epic',      name: 'Epic Games',       icon: '⚡', color: 'text-purple-600' },
  { id: 'sony',      name: 'PlayStation',      icon: '🎮', color: 'text-blue-800' },
  { id: 'microsoft', name: 'Xbox Live',        icon: '🎯', color: 'text-green-600' },
  { id: 'ubisoft',   name: 'Ubisoft Connect',  icon: '🦁', color: 'text-blue-500' }
];

function ProgressBar({ value, color = 'blue' }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full bg-${color}-500 transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color = 'gray' }) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1.5">
      <Icon size={12} className={`text-${color}-500`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  );
}

function ProjectCard({ project, onSelect, onDelete }) {
  const meta = PROJECT_TYPE_META[project.type] || PROJECT_TYPE_META.coding;
  const TypeIcon = meta.icon;
  const testRate = project.testsTotal > 0 ? Math.round((project.testsPassing / project.testsTotal) * 100) : 0;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all"
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-${meta.color}-100 dark:bg-${meta.color}-900/30`}>
            <TypeIcon size={16} className={`text-${meta.color}-600 dark:text-${meta.color}-400`} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{meta.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}>{project.status}</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={meta.color} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <StatChip icon={GitBranch} label="commits" value={project.commits} color="blue" />
        <StatChip icon={Code}      label="lines"   value={project.linesOfCode > 999 ? `${(project.linesOfCode/1000).toFixed(1)}k` : project.linesOfCode} color="purple" />
        <StatChip icon={Bug}       label="bugs"    value={project.bugsOpen}  color="red" />
        <StatChip icon={TestTube}  label="tests"   value={`${testRate}%`}    color="green" />
      </div>

      {project.connectors?.length > 0 && (
        <div className="mt-2 flex gap-1">
          {project.connectors.map(c => {
            const meta = CONNECTORS.find(x => x.id === c);
            return meta ? <span key={c} className="text-lg" title={meta.name}>{meta.icon}</span> : null;
          })}
        </div>
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'coding', engine: '', description: '' });

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = e => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreate(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">New Project</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Project Name *</label>
            <input
              name="name" value={form.name} onChange={handle} required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="My Awesome Project"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Type</label>
            <select
              name="type" value={form.type} onChange={handle}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {Object.entries(PROJECT_TYPE_META).map(([id, m]) => (
                <option key={id} value={id}>{m.label}</option>
              ))}
            </select>
          </div>
          {['game', 'ar', 'vr', '3d'].includes(form.type) && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Engine</label>
              <select
                name="engine" value={form.engine} onChange={handle}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select engine...</option>
                {ENGINES.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea
              name="description" value={form.description} onChange={handle} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectTracker() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = () => {
    const token = localStorage.getItem('nexus:accessToken');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', { headers: headers() });
      if (res.ok) setProjects(await res.json());
    } catch {
      // Use demo data when offline
      setProjects([
        { id: 'demo-1', name: 'Nexus AI Pro', type: 'web',    status: 'active', progress: 72, commits: 124, linesOfCode: 14500, bugsOpen: 3, bugsClosed: 28, testsTotal: 45, testsPassing: 42, connectors: [], milestones: [] },
        { id: 'demo-2', name: 'Space Shooter', type: 'game',  status: 'active', progress: 38, commits: 56,  linesOfCode: 8200,  bugsOpen: 7, bugsClosed: 12, testsTotal: 20, testsPassing: 18, connectors: ['unreal'], milestones: [] },
        { id: 'demo-3', name: 'AR Tour Guide', type: 'ar',    status: 'active', progress: 15, commits: 23,  linesOfCode: 3100,  bugsOpen: 2, bugsClosed: 4,  testsTotal: 10, testsPassing: 8,  connectors: [], milestones: [] }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/connectors/list', { headers: headers() });
      if (res.ok) setConnectors(await res.json());
    } catch {
      setConnectors(CONNECTORS.map(c => ({ ...c, connected: false })));
    }
  }, []);

  useEffect(() => { fetchProjects(); fetchConnectors(); }, [fetchProjects, fetchConnectors]);

  const createProject = async (form) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: headers(), body: JSON.stringify(form)
      });
      if (res.ok) {
        const project = await res.json();
        setProjects(p => [project, ...p]);
      }
    } catch {
      const fakeProject = { id: `local-${Date.now()}`, ...form, status: 'active', progress: 0, commits: 0, linesOfCode: 0, bugsOpen: 0, bugsClosed: 0, testsTotal: 0, testsPassing: 0, connectors: [], milestones: [], createdAt: Date.now() };
      setProjects(p => [fakeProject, ...p]);
    }
  };

  const deleteProject = async (id) => {
    setProjects(p => p.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: headers() });
    } catch {}
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={24} className="text-purple-500" />
            Project Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Coding · Game Dev · AR/VR · 3D</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchProjects} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
            <Plus size={14} />
            New Project
          </button>
        </div>
      </div>

      {/* Game engine connectors */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Link size={14} />
          Game Engine Connectors
        </h2>
        <div className="flex flex-wrap gap-2">
          {CONNECTORS.map(c => {
            const serverStatus = connectors.find(x => x.id === c.id);
            const connected = serverStatus?.connected ?? false;
            return (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  connected
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                }`}
              >
                <span>{c.icon}</span>
                <span className={`font-medium ${connected ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>{c.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Configure via environment variables: UNREAL_API_KEY, EPIC_CLIENT_ID, PSN_CLIENT_ID, XBOX_CLIENT_ID, UBISOFT_APP_ID</p>
      </div>

      {/* Projects grid */}
      {loading && projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <Code size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No projects yet. Create your first project!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={setSelected}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selected.name}</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Commits',    value: selected.commits,    icon: GitBranch, color: 'blue' },
              { label: 'Lines',      value: selected.linesOfCode, icon: Code,     color: 'purple' },
              { label: 'Open Bugs',  value: selected.bugsOpen,   icon: Bug,       color: 'red' },
              { label: 'Test Pass',  value: `${selected.testsTotal > 0 ? Math.round(selected.testsPassing / selected.testsTotal * 100) : 0}%`, icon: TestTube, color: 'green' }
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <stat.icon size={18} className={`mx-auto text-${stat.color}-500 mb-1`} />
                <div className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={createProject} />}
    </div>
  );
}
