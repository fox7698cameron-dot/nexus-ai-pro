// ================================================
// NEXUS AI PRO - Project Tracker Component
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, ChevronRight, CheckCircle2, Circle, Clock,
  Code2, Gamepad2, Globe, Smartphone, Monitor, Cpu,
  Box, Layers, Zap, Activity, GitCommit, TestTube2,
  Rocket, Calendar, BarChart2, Filter, Edit3, Trash2,
  RefreshCw, TrendingUp, Users, AlertCircle
} from 'lucide-react';

// ------------------------------------------------
// Constants
// ------------------------------------------------
const PROJECT_TYPES = [
  { value: 'web', label: 'Web', icon: Globe, color: 'bg-blue-500' },
  { value: 'mobile', label: 'Mobile', icon: Smartphone, color: 'bg-purple-500' },
  { value: 'desktop', label: 'Desktop', icon: Monitor, color: 'bg-gray-500' },
  { value: 'api', label: 'API', icon: Zap, color: 'bg-yellow-500' },
  { value: 'game', label: 'Game', icon: Gamepad2, color: 'bg-red-500' },
  { value: 'ar', label: 'AR', icon: Box, color: 'bg-teal-500' },
  { value: 'vr', label: 'VR', icon: Box, color: 'bg-indigo-500' },
  { value: 'xr', label: 'XR', icon: Box, color: 'bg-violet-500' },
  { value: '3d', label: '3D', icon: Layers, color: 'bg-orange-500' },
  { value: 'fullstack', label: 'Full Stack', icon: Layers, color: 'bg-green-500' },
  { value: 'ai', label: 'AI', icon: Cpu, color: 'bg-pink-500' }
];

const LANGUAGES = [
  'C++', 'Swift', 'JavaScript', 'TypeScript', 'Python',
  'Rust', 'Go', 'Java', 'Kotlin', 'Dart', 'C#', 'Lua',
  'HLSL', 'GLSL', 'Blueprint'
];

const PLATFORMS_LIST = [
  { value: 'web', label: 'Web', icon: '🌐' },
  { value: 'ios', label: 'iOS', icon: '🍎' },
  { value: 'android', label: 'Android', icon: '🤖' },
  { value: 'windows', label: 'Windows', icon: '🪟' },
  { value: 'macos', label: 'macOS', icon: '🍏' },
  { value: 'linux', label: 'Linux', icon: '🐧' },
  { value: 'ps5', label: 'PS5', icon: '🎮' },
  { value: 'xbox', label: 'Xbox', icon: '🟢' },
  { value: 'switch', label: 'Switch', icon: '🕹️' },
  { value: 'steam', label: 'Steam', icon: '♨️' },
  { value: 'vr-quest', label: 'VR Quest', icon: '🥽' },
  { value: 'ar-glass', label: 'AR Glass', icon: '👓' }
];

const STATUS_STYLES = {
  active: 'text-green-400 bg-green-400/10 border-green-400/30',
  paused: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  complete: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  archived: 'text-gray-400 bg-gray-400/10 border-gray-400/30'
};

const LANG_COLORS = {
  'C++': 'bg-blue-700', 'Swift': 'bg-orange-500', 'JavaScript': 'bg-yellow-500',
  'TypeScript': 'bg-blue-500', 'Python': 'bg-green-600', 'Rust': 'bg-orange-700',
  'Go': 'bg-cyan-600', 'Java': 'bg-red-600', 'Kotlin': 'bg-purple-600',
  'Dart': 'bg-teal-500', 'C#': 'bg-violet-600', 'Lua': 'bg-blue-800',
  'HLSL': 'bg-gray-600', 'GLSL': 'bg-gray-700', 'Blueprint': 'bg-indigo-500'
};

// ------------------------------------------------
// API helpers
// ------------------------------------------------
const API_BASE = '/api/projects';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ------------------------------------------------
// Sub-components
// ------------------------------------------------
function TypeBadge({ type, size = 'sm' }) {
  const def = PROJECT_TYPES.find(t => t.value === type) || PROJECT_TYPES[0];
  const Icon = def.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-${size} font-medium ${def.color}`}>
      <Icon size={12} />
      {def.label}
    </span>
  );
}

function LangBadge({ lang }) {
  const color = LANG_COLORS[lang] || 'bg-gray-600';
  return (
    <span className={`px-1.5 py-0.5 rounded text-white text-xs font-mono ${color}`}>
      {lang}
    </span>
  );
}

function PlatformIcon({ platform }) {
  const def = PLATFORMS_LIST.find(p => p.value === platform);
  if (!def) return null;
  return (
    <span title={def.label} className="text-base leading-none" role="img" aria-label={def.label}>
      {def.icon}
    </span>
  );
}

function ProgressBar({ value, colorClass = 'bg-blue-500' }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-400 text-xs">
        <Icon size={14} />
        {label}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

// ------------------------------------------------
// Create Project Modal
// ------------------------------------------------
function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '', type: 'web', description: '', stack: '',
    language: [], platforms: [], status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLang = (lang) => {
    setForm(f => ({
      ...f,
      language: f.language.includes(lang)
        ? f.language.filter(l => l !== lang)
        : [...f.language, lang]
    }));
  };

  const togglePlatform = (p) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter(x => x !== p)
        : [...f.platforms, p]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const project = await apiFetch('', { method: 'POST', body: JSON.stringify(form) });
      onCreate(project);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus size={20} className="text-blue-400" />
            New Project
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Project Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Awesome Project"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {PROJECT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Stack / Framework</label>
              <input
                type="text"
                value={form.stack}
                onChange={e => setForm(f => ({ ...f, stack: e.target.value }))}
                placeholder="React + Node.js"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Brief description of the project..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                    form.language.includes(lang)
                      ? `text-white border-transparent ${LANG_COLORS[lang] || 'bg-gray-600'}`
                      : 'text-gray-400 border-gray-600 bg-gray-800 hover:border-gray-400'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Platforms</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {PLATFORMS_LIST.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${
                    form.platforms.includes(p.value)
                      ? 'text-white border-blue-500 bg-blue-500/20'
                      : 'text-gray-400 border-gray-700 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------
// Milestone Panel
// ------------------------------------------------
function MilestonePanel({ projectId }) {
  const [milestones, setMilestones] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/${projectId}/milestones`);
      setMilestones(data.milestones || []);
    } catch {}
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const addMilestone = async () => {
    if (!newTitle.trim()) return;
    try {
      await apiFetch(`/${projectId}/milestone`, {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, dueDate: newDue || null })
      });
      setNewTitle(''); setNewDue(''); setAdding(false);
      load();
    } catch {}
  };

  const toggleComplete = async (m) => {
    try {
      await apiFetch(`/${projectId}/milestones/${m.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: m.status === 'complete' ? 'pending' : 'complete' })
      });
      load();
    } catch {}
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Milestones</h3>
        <button
          onClick={() => setAdding(true)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {adding && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-700">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Milestone title..."
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="date"
            value={newDue}
            onChange={e => setNewDue(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button onClick={addMilestone} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors">Add</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1 text-gray-400 hover:text-white text-xs transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {milestones.length === 0 && !adding && (
        <p className="text-gray-500 text-xs text-center py-4">No milestones yet</p>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {milestones.map(m => (
          <div
            key={m.id}
            className="flex items-start gap-2 group"
          >
            <button onClick={() => toggleComplete(m)} className="mt-0.5 text-gray-500 hover:text-blue-400 transition-colors flex-shrink-0">
              {m.status === 'complete'
                ? <CheckCircle2 size={16} className="text-green-400" />
                : <Circle size={16} />
              }
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${m.status === 'complete' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                {m.title}
              </p>
              {m.dueDate && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Calendar size={10} />
                  {new Date(m.dueDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------
// Activity Feed
// ------------------------------------------------
function ActivityFeed({ projectId, socket }) {
  const [activities, setActivities] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/${projectId}/activity?limit=20`);
      setActivities(data.activities || []);
    } catch {}
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.projectId === projectId) {
        setActivities(prev => [data, ...prev].slice(0, 50));
      }
    };
    socket.on('project:activity', handler);
    return () => socket.off('project:activity', handler);
  }, [socket, projectId]);

  const timeAgo = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">Recent Activity</h3>
      {activities.length === 0 && (
        <p className="text-gray-500 text-xs text-center py-4">No activity yet</p>
      )}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {activities.map(a => (
          <div key={a.id} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">{a.description}</p>
              <p className="text-xs text-gray-500">{timeAgo(a.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------
// Project Detail View
// ------------------------------------------------
function ProjectDetail({ project, onBack, socket }) {
  const [metrics, setMetrics] = useState(null);
  const [tab, setTab] = useState('milestones');

  useEffect(() => {
    apiFetch(`/${project.id}/metrics`).then(setMetrics).catch(() => {});
  }, [project.id]);

  const buildColor = metrics?.buildStatus === 'passing' ? 'text-green-400' : metrics?.buildStatus === 'failing' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm"
        >
          <ChevronRight size={16} className="rotate-180" /> Back
        </button>
      </div>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white">{project.name}</h2>
              <TypeBadge type={project.type} />
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${STATUS_STYLES[project.status] || STATUS_STYLES.active}`}>
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-gray-400 text-sm max-w-2xl">{project.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(project.language || []).map(l => <LangBadge key={l} lang={l} />)}
            </div>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {(project.platforms || []).map(p => <PlatformIcon key={p} platform={p} />)}
            </div>
          </div>

          <div className="w-32">
            <div className="text-xs text-gray-400 mb-1">Progress</div>
            <div className="text-3xl font-bold text-white">{project.progress || 0}%</div>
            <ProgressBar value={project.progress || 0} colorClass="bg-blue-500" />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={GitCommit} label="Commits" value={metrics.commits} />
          <MetricCard icon={Code2} label="Lines" value={`${(metrics.linesOfCode / 1000).toFixed(1)}k`} />
          <MetricCard icon={TestTube2} label="Coverage" value={`${metrics.testCoverage}%`} />
          <MetricCard
            icon={Activity}
            label="Build"
            value={<span className={`capitalize ${buildColor}`}>{metrics.buildStatus}</span>}
          />
          <MetricCard icon={Rocket} label="Deploys" value={metrics.deployments} />
          <MetricCard icon={Users} label="Contributors" value={metrics.contributors} />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-700">
          {[
            { id: 'milestones', label: 'Milestones', icon: CheckCircle2 },
            { id: 'activity', label: 'Activity', icon: Activity }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'text-white border-b-2 border-blue-500 bg-blue-500/5'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === 'milestones' && <MilestonePanel projectId={project.id} />}
          {tab === 'activity' && <ActivityFeed projectId={project.id} socket={socket} />}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------
// Project Card
// ------------------------------------------------
function ProjectCard({ project, onClick, onDelete }) {
  const def = PROJECT_TYPES.find(t => t.value === project.type);
  const progressColor =
    (project.progress || 0) >= 75 ? 'bg-green-500' :
    (project.progress || 0) >= 40 ? 'bg-blue-500' : 'bg-yellow-500';

  return (
    <div
      className="bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 group"
      onClick={() => onClick(project)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate text-base leading-tight">{project.name}</h3>
          {project.description && (
            <p className="text-gray-500 text-xs mt-0.5 truncate">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TypeBadge type={project.type} size="xs" />
          <button
            onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {(project.language || []).slice(0, 4).map(l => <LangBadge key={l} lang={l} />)}
        {(project.language || []).length > 4 && (
          <span className="text-xs text-gray-500">+{project.language.length - 4}</span>
        )}
      </div>

      <div className="flex gap-1 mb-3 flex-wrap">
        {(project.platforms || []).map(p => <PlatformIcon key={p} platform={p} />)}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Progress</span>
          <span className="font-medium text-white">{project.progress || 0}%</span>
        </div>
        <ProgressBar value={project.progress || 0} colorClass={progressColor} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[project.status] || STATUS_STYLES.active}`}>
          {project.status}
        </span>
        <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
    </div>
  );
}

// ------------------------------------------------
// Main ProjectTracker component
// ------------------------------------------------
export default function ProjectTracker({ socket }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('');
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time project updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (data) => {
      setProjects(prev => {
        const idx = prev.findIndex(p => p.id === data.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...data };
          return updated;
        }
        return [data, ...prev];
      });
    };
    socket.on('project:updated', onUpdate);
    socket.on('project:created', (p) => setProjects(prev => [p, ...prev]));
    return () => {
      socket.off('project:updated', onUpdate);
      socket.off('project:created');
    };
  }, [socket]);

  const deleteProject = async (id) => {
    try {
      await apiFetch(`/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch {}
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'web', label: 'Web' },
    { value: 'game', label: 'Game' },
    { value: 'ar', label: 'AR' },
    { value: 'vr', label: 'VR' },
    { value: 'xr', label: 'XR' },
    { value: '3d', label: '3D' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'ai', label: 'AI' }
  ];

  const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter);

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        socket={socket}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 size={24} className="text-blue-400" />
            Project Tracker
          </h2>
          <p className="text-gray-400 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-gray-500" />
        {filterOptions.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
              <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Code2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No projects found</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={setSelectedProject}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={(p) => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}
