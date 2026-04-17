// nexus-ai-pro/src/dashboards/ProjectTracker.jsx | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Real-time project tracking: coding, game dev, AR/VR/3D + platform connectors

import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Plus, Tag, Calendar, CheckSquare, Link2,
  Trophy, Gamepad2, Cpu, Globe, BarChart3, RefreshCw,
  ChevronRight, Circle, CheckCircle, AlertCircle, Clock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const STATUS_COLORS = {
  planning:  { bg: 'bg-blue-500/10',   text: 'text-blue-300',   border: 'border-blue-500/30' },
  active:    { bg: 'bg-green-500/10',  text: 'text-green-300',  border: 'border-green-500/30' },
  paused:    { bg: 'bg-yellow-500/10', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  completed: { bg: 'bg-gray-500/10',   text: 'text-gray-300',   border: 'border-gray-600' },
  archived:  { bg: 'bg-gray-800',      text: 'text-gray-500',   border: 'border-gray-700' },
};

const TYPE_ICONS = {
  game:    Gamepad2,
  ar_vr:   Cpu,
  web:     Globe,
  mobile:  Globe,
  desktop: Globe,
  ai_ml:   Cpu,
  other:   FolderOpen,
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.planning;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {status}
    </span>
  );
}

function ProgressBar({ pct, color = '#6366f1' }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  );
}

function TaskRow({ task }) {
  const done = task.status === 'done';
  const priorityColor = { low: 'text-gray-400', medium: 'text-yellow-400', high: 'text-orange-400', critical: 'text-red-400' }[task.priority] ?? 'text-gray-400';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
      {done ? <CheckCircle size={15} className="text-green-400 flex-shrink-0" /> : <Circle size={15} className="text-gray-600 flex-shrink-0" />}
      <span className={`flex-1 text-sm ${done ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</span>
      <span className={`text-xs ${priorityColor}`}>{task.priority}</span>
      {task.due_date && <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} />{task.due_date}</span>}
    </div>
  );
}

function AchievementCard({ achievement }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${achievement.unlocked_at ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-gray-800 bg-gray-900 opacity-60'}`}>
      {achievement.icon_url
        ? <img src={achievement.icon_url} alt="" className="w-8 h-8 rounded" />
        : <Trophy size={20} className={achievement.unlocked_at ? 'text-yellow-400' : 'text-gray-600'} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{achievement.title}</p>
        <p className="text-xs text-gray-400 truncate">{achievement.description}</p>
      </div>
      {achievement.points > 0 && (
        <span className="text-xs font-bold text-yellow-400">{achievement.points}pts</span>
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'web', description: '', status: 'planning' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreate(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Project Name *</label>
            <input
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="My awesome project"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select
              value={form.type}
              onChange={e => set('type', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {['web', 'mobile', 'desktop', 'game', 'ar_vr', 'ai_ml', 'blockchain', 'other'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' / ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm hover:bg-gray-700 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2 bg-indigo-600 rounded-lg text-white text-sm hover:bg-indigo-500 transition">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectTracker() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState(null);

  const token = () => localStorage.getItem('accessToken');
  const authHeader = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data.projects ?? []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectDetail = useCallback(async (projectId) => {
    try {
      const [tasksRes, achRes, connRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/tasks`, { headers: authHeader() }),
        fetch(`/api/projects/${projectId}/achievements`, { headers: authHeader() }),
        fetch(`/api/projects/${projectId}/connectors`, { headers: authHeader() }),
      ]);
      setTasks(tasksRes.ok ? await tasksRes.json() : []);
      setAchievements(achRes.ok ? await achRes.json() : []);
      setConnectors(connRes.ok ? await connRes.json() : []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (selected) fetchProjectDetail(selected.id);
  }, [selected, fetchProjectDetail]);

  const createProject = async (form) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fetchProjects();
  };

  const tasksByStatus = {
    todo:        tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review:      tasks.filter(t => t.status === 'review'),
    done:        tasks.filter(t => t.status === 'done'),
  };

  const progressPct = tasks.length > 0
    ? Math.round(tasksByStatus.done.length / tasks.length * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 flex flex-col gap-6">
      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={createProject} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Tracker</h1>
          <p className="text-gray-400 text-sm">Game dev, AR/VR, web, mobile — real-time progress</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} />New Project
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
          <AlertCircle size={15} />{error}
        </div>
      )}

      <div className="flex gap-6 flex-col xl:flex-row">
        {/* Project list */}
        <div className="w-full xl:w-80 flex-shrink-0 space-y-2">
          {loading && <div className="text-gray-500 text-sm text-center py-4">Loading…</div>}
          {projects.map(p => {
            const Icon = TYPE_ICONS[p.type] ?? FolderOpen;
            const isActive = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full text-left p-4 rounded-xl border transition ${isActive ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={15} className="text-indigo-400 flex-shrink-0" />
                  <span className="font-medium text-white text-sm truncate">{p.name}</span>
                  <ChevronRight size={13} className="ml-auto text-gray-600" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-gray-500">{p.type.replace('_', '/')}</span>
                </div>
                <ProgressBar pct={p.progress_pct ?? 0} />
                <p className="text-xs text-gray-500 mt-1">{p.progress_pct ?? 0}% complete</p>
              </button>
            );
          })}
          {!loading && projects.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No projects yet</p>
            </div>
          )}
        </div>

        {/* Project detail */}
        {selected ? (
          <div className="flex-1 space-y-4">
            {/* Project header */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                  {selected.description && <p className="text-gray-400 text-sm mt-1">{selected.description}</p>}
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {selected.platform?.map(plt => (
                  <span key={plt} className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">{plt}</span>
                ))}
                {selected.engines?.map(e => (
                  <span key={e} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-xs border border-purple-500/20">{e}</span>
                ))}
              </div>
              <ProgressBar pct={progressPct} />
              <p className="text-xs text-gray-500 mt-1">{progressPct}% complete · {tasks.length} tasks</p>
            </div>

            {/* Tasks */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Tasks</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {Object.entries(tasksByStatus).map(([status, list]) => (
                  <div key={status} className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{status.replace('_', ' ')}</p>
                    <p className="text-2xl font-bold text-white">{list.length}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-0">
                {tasks.slice(0, 15).map(t => <TaskRow key={t.id} task={t} />)}
                {tasks.length === 0 && <p className="text-gray-500 text-sm text-center py-3">No tasks yet</p>}
              </div>
            </div>

            {/* Connectors */}
            {connectors.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Link2 size={14} />Platform Connectors</h3>
                <div className="space-y-2">
                  {connectors.map(c => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                      <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                      <span className="text-sm text-white capitalize">{c.platform.replace('_', ' ')}</span>
                      {c.last_synced_at && <span className="text-xs text-gray-500 ml-auto">Synced {new Date(c.last_synced_at).toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Trophy size={14} className="text-yellow-400" />Achievements</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a project to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
