// File: ProjectDashboard.jsx | Date: 2026-06-16 | Nexus AI Pro

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import {
  Plus, Search, Filter, Code2, Smartphone, Monitor, Globe, Server,
  Gamepad2, Layers, ChevronRight, GitBranch, Check, Clock, AlertCircle,
  Users, Activity, X, Cpu
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_PROJECTS = [
  {
    id: 'p1', name: 'Nexus AI Pro', type: 'webapp', status: 'active',
    languages: ['JavaScript', 'Python', 'Rust'],
    platforms: ['Web', 'Linux'],
    description: 'AI platform SaaS with social analytics',
    tasks: { done: 34, total: 52 }, milestone: { name: 'v1.0 Launch', progress: 65 },
    velocity: 12, risk: 'medium',
    milestones: [
      { id: 'm1', name: 'MVP', status: 'done', dueDate: '2026-05-01' },
      { id: 'm2', name: 'Beta', status: 'active', dueDate: '2026-07-01' },
      { id: 'm3', name: 'v1.0 Launch', status: 'upcoming', dueDate: '2026-08-15' },
    ],
    tasks_board: {
      todo: [
        { id: 't1', title: 'Add dark mode toggle', priority: 'medium', assignee: 'AJ', due: '2026-06-20' },
        { id: 't2', title: 'Mobile nav bar', priority: 'high', assignee: 'KL', due: '2026-06-18' },
      ],
      inProgress: [
        { id: 't3', title: 'Analytics dashboard charts', priority: 'high', assignee: 'MC', due: '2026-06-17' },
        { id: 't4', title: 'Auth context MFA flow', priority: 'critical', assignee: 'AJ', due: '2026-06-16' },
      ],
      review: [
        { id: 't5', title: 'Payment Stripe integration', priority: 'high', assignee: 'KL', due: '2026-06-16' },
      ],
      done: [
        { id: 't6', title: 'Login / Register forms', priority: 'high', assignee: 'MC', due: '2026-06-10' },
        { id: 't7', title: 'AuthContext JWT handling', priority: 'critical', assignee: 'AJ', due: '2026-06-12' },
      ],
    },
    build: { status: 'passing', errors: 0, warnings: 3, branch: 'main', lastBuild: '4 min ago' },
    activeDevelopers: ['AJ', 'KL', 'MC'],
    linesChanged: 847,
    coverage: 71,
    activity: [
      { id: 'a1', type: 'commit', message: 'feat: add biometric auth component', author: 'AJ', time: '8 min ago' },
      { id: 'a2', type: 'pr', message: 'PR #42: Payment checkout merged', author: 'KL', time: '1 hr ago' },
      { id: 'a3', type: 'deploy', message: 'Deployed to staging', author: 'system', time: '2 hr ago' },
    ],
  },
  {
    id: 'p2', name: 'GameVault Mobile', type: 'mobile', status: 'active',
    languages: ['Dart', 'Swift', 'Kotlin'],
    platforms: ['iOS', 'Android'],
    description: 'Cross-platform gaming companion app',
    tasks: { done: 18, total: 30 }, milestone: { name: 'App Store submission', progress: 40 },
    velocity: 8, risk: 'low',
    milestones: [
      { id: 'm1', name: 'Core features', status: 'done', dueDate: '2026-05-15' },
      { id: 'm2', name: 'Beta test', status: 'active', dueDate: '2026-07-01' },
      { id: 'm3', name: 'App Store', status: 'upcoming', dueDate: '2026-08-01' },
    ],
    tasks_board: {
      todo: [
        { id: 't1', title: 'Push notifications', priority: 'medium', assignee: 'RS', due: '2026-06-25' },
      ],
      inProgress: [
        { id: 't2', title: 'Achievement sync', priority: 'high', assignee: 'TU', due: '2026-06-20' },
      ],
      review: [],
      done: [
        { id: 't3', title: 'Login screen', priority: 'high', assignee: 'RS', due: '2026-05-20' },
      ],
    },
    build: { status: 'failing', errors: 2, warnings: 0, branch: 'feature/push-notifs', lastBuild: '22 min ago' },
    activeDevelopers: ['RS', 'TU'],
    linesChanged: 312,
    coverage: 58,
    activity: [
      { id: 'a1', type: 'commit', message: 'fix: crash on empty achievement list', author: 'RS', time: '15 min ago' },
      { id: 'a2', type: 'deploy', message: 'TestFlight build uploaded', author: 'system', time: '3 hr ago' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_TYPES = [
  { value: 'webapp',  label: 'Webapp',   icon: Globe,      emoji: '🌐' },
  { value: 'mobile',  label: 'Mobile',   icon: Smartphone, emoji: '📱' },
  { value: 'desktop', label: 'Desktop',  icon: Monitor,    emoji: '💻' },
  { value: 'api',     label: 'API',      icon: Server,     emoji: '⚙️' },
  { value: 'gamedev', label: 'Game Dev', icon: Gamepad2,   emoji: '🎮' },
  { value: 'arvr',    label: 'AR/VR',    icon: Layers,     emoji: '🥽' },
  { value: '3d',      label: '3D',       icon: Cpu,        emoji: '🧊' },
];

const ALL_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Rust', 'Go',
  'C++', 'Swift', 'Kotlin', 'C#', 'Java', 'Dart',
];

const ALL_PLATFORMS = [
  'Web', 'iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Electron',
];

const FRAMEWORKS_BY_TYPE = {
  webapp:  ['React', 'Vue', 'Svelte', 'Next.js'],
  mobile:  ['Flutter', 'React Native', 'Expo'],
  desktop: ['Electron', 'Tauri', 'Qt'],
  api:     ['Express', 'FastAPI', 'Gin', 'Actix'],
  gamedev: ['Unity', 'Unreal Engine', 'Godot'],
  arvr:    ['Unity XR', 'WebXR', 'OpenXR'],
  '3d':    ['Three.js', 'Babylon.js', 'Blender Pipeline'],
};

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  medium:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  low:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const RISK_STYLES = {
  low:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  high:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const BUILD_DOT = {
  passing: 'bg-green-500',
  failing: 'bg-red-500',
  pending: 'bg-yellow-400',
};

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-teal-500',   'bg-orange-500', 'bg-cyan-500',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avatarColor(initials) {
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function typeIcon(type) {
  const found = PROJECT_TYPES.find(t => t.value === type);
  if (!found) return <Globe className="w-4 h-4" />;
  const Icon = found.icon;
  return <Icon className="w-4 h-4" />;
}

function typeLabel(type) {
  return PROJECT_TYPES.find(t => t.value === type)?.label ?? type;
}

function activityIcon(type) {
  if (type === 'commit') return <GitBranch className="w-3.5 h-3.5 text-indigo-400" />;
  if (type === 'pr')     return <Check className="w-3.5 h-3.5 text-green-400" />;
  if (type === 'deploy') return <Activity className="w-3.5 h-3.5 text-purple-400" />;
  return <Clock className="w-3.5 h-3.5 text-gray-400" />;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({ initials, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold text-white ${avatarColor(initials)}`}>
      {initials}
    </div>
  );
}

function BuildStatusBadge({ status }) {
  const styles = {
    passing: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    failing: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? styles.pending}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${BUILD_DOT[status] ?? 'bg-gray-400'}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${PRIORITY_STYLES[priority] ?? ''}`}>
      {priority}
    </span>
  );
}

function MilestoneTimeline({ milestones }) {
  const statusDot = {
    done:     'bg-green-500 border-green-500',
    active:   'bg-indigo-500 border-indigo-500 ring-2 ring-indigo-300 dark:ring-indigo-700',
    upcoming: 'bg-transparent border-gray-400 dark:border-gray-600',
  };
  const statusLine = {
    done:     'bg-green-500',
    active:   'bg-indigo-400',
    upcoming: 'bg-gray-300 dark:bg-gray-600',
  };

  return (
    <div className="relative flex items-center justify-between mt-2 mb-1">
      {milestones.map((ms, idx) => (
        <div key={ms.id} className="flex-1 flex flex-col items-center relative">
          {idx < milestones.length - 1 && (
            <div className={`absolute left-1/2 top-2.5 w-full h-0.5 ${statusLine[ms.status]}`} style={{ zIndex: 0 }} />
          )}
          <div className={`w-5 h-5 rounded-full border-2 ${statusDot[ms.status]} relative z-10 flex items-center justify-center`} style={{ zIndex: 1 }}>
            {ms.status === 'done' && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center leading-tight max-w-[80px]">{ms.name}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{ms.dueDate}</span>
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <Avatar initials={task.assignee} size="sm" />
        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {task.due}
        </span>
      </div>
    </div>
  );
}

function KanbanBoard({ board }) {
  const columns = [
    { key: 'todo',       label: 'Todo',        color: 'text-gray-500 dark:text-gray-400' },
    { key: 'inProgress', label: 'In Progress',  color: 'text-indigo-500 dark:text-indigo-400' },
    { key: 'review',     label: 'Review',       color: 'text-yellow-500 dark:text-yellow-400' },
    { key: 'done',       label: 'Done',         color: 'text-green-500 dark:text-green-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map(col => (
        <div key={col.key} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 min-h-[180px]">
          <div className={`flex items-center justify-between mb-3`}>
            <span className={`text-xs font-bold uppercase tracking-wide ${col.color}`}>{col.label}</span>
            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full w-5 h-5 flex items-center justify-center font-semibold">
              {(board[col.key] ?? []).length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {(board[col.key] ?? []).map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed({ activity }) {
  return (
    <div className="flex flex-col gap-3">
      {activity.map(item => (
        <div key={item.id} className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            {activityIcon(item.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{item.message}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{item.author} · {item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    type: 'webapp',
    description: '',
    languages: [],
    platforms: [],
    framework: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const frameworks = FRAMEWORKS_BY_TYPE[form.type] ?? [];

  function toggleList(field, value) {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      onCreated(data);
    } catch {
      // Optimistic mock
      const mockNew = {
        id: `p${Date.now()}`,
        ...form,
        status: 'active',
        tasks: { done: 0, total: 0 },
        milestone: { name: 'Setup', progress: 0 },
        velocity: 0,
        risk: 'low',
        milestones: [],
        tasks_board: { todo: [], inProgress: [], review: [], done: [] },
        build: { status: 'pending', errors: 0, warnings: 0, branch: 'main', lastBuild: 'Never' },
        activeDevelopers: [],
        linesChanged: 0,
        coverage: 0,
        activity: [],
      };
      onCreated(mockNew);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Project Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="My Awesome Project"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Project Type</label>
            <div className="grid grid-cols-4 gap-2">
              {PROJECT_TYPES.map(pt => {
                const Icon = pt.icon;
                const active = form.type === pt.value;
                return (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, type: pt.value, framework: '' }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-lg">{pt.emoji}</span>
                    <Icon className="w-4 h-4" />
                    {pt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What are you building?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              {ALL_LANGUAGES.map(lang => {
                const active = form.languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleList('languages', lang)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-400'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 inline mr-1" />}
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map(plat => {
                const active = form.platforms.includes(plat);
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => toggleList('platforms', plat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-purple-500 border-purple-500 text-white'
                        : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-400'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 inline mr-1" />}
                    {plat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Framework */}
          {frameworks.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Framework</label>
              <select
                value={form.framework}
                onChange={e => setForm(p => ({ ...p, framework: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Select a framework…</option>
                {frameworks.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectDetail({ project }) {
  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 p-10">
        <Layers className="w-14 h-14 mb-4 opacity-40" />
        <p className="text-lg font-semibold">Select a project</p>
        <p className="text-sm mt-1">Choose a project from the sidebar or create a new one.</p>
      </div>
    );
  }

  const taskTotal = project.tasks.total;
  const taskDone  = project.tasks.done;
  const taskPct   = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              {typeIcon(project.type)}
              {typeLabel(project.type)}
            </span>
            <BuildStatusBadge status={project.build.status} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{project.description}</p>
          {/* Language pills */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {project.languages.map(lang => (
              <span key={lang} className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {lang}
              </span>
            ))}
            {project.platforms.map(plat => (
              <span key={plat} className="px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {plat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tasks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{taskDone}<span className="text-base text-gray-400">/{taskTotal}</span></p>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${taskPct}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{taskPct}% complete</p>
        </div>

        {/* Milestone */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Milestone</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{project.milestone.name}</p>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${project.milestone.progress}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{project.milestone.progress}% done</p>
        </div>

        {/* Velocity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Velocity</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.velocity}</p>
          <p className="text-[11px] text-gray-400 mt-1">tasks / sprint</p>
        </div>

        {/* Risk */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Risk</p>
          <div className="mt-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${RISK_STYLES[project.risk]}`}>
              {project.risk}
            </span>
          </div>
        </div>
      </div>

      {/* Milestones Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          Milestones
        </h3>
        <MilestoneTimeline milestones={project.milestones} />
      </div>

      {/* Kanban Board */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          Task Board
        </h3>
        <KanbanBoard board={project.tasks_board} />
      </div>

      {/* Build Status Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-green-400" />
          Build Status
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <BuildStatusBadge status={project.build.status} />
          <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            <GitBranch className="w-3.5 h-3.5 text-gray-400" />
            {project.build.branch}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            {project.build.lastBuild}
          </span>
          {project.build.errors > 0 && (
            <span className="flex items-center gap-1 text-sm text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              {project.build.errors} error{project.build.errors !== 1 ? 's' : ''}
            </span>
          )}
          {project.build.warnings > 0 && (
            <span className="flex items-center gap-1 text-sm text-yellow-500">
              <AlertCircle className="w-3.5 h-3.5" />
              {project.build.warnings} warning{project.build.warnings !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Real-time Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Devs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Devs</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {project.activeDevelopers.map(dev => (
              <Avatar key={dev} initials={dev} size="sm" />
            ))}
          </div>
        </div>

        {/* Lines Changed */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-4 h-4 text-teal-400" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lines Changed Today</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.linesChanged.toLocaleString()}</p>
        </div>

        {/* Coverage */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Test Coverage</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.coverage}<span className="text-base text-gray-400">%</span></p>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${project.coverage >= 80 ? 'bg-green-500' : project.coverage >= 60 ? 'bg-yellow-400' : 'bg-red-500'}`}
              style={{ width: `${project.coverage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          Recent Activity
        </h3>
        <ActivityFeed activity={project.activity} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProjectDashboard() {
  // Auth & socket (optional — graceful if not available)
  let auth = null;
  let socket = null;
  try { auth = useAuth(); } catch {}
  try { socket = useSocket(); } catch {}

  const [projects, setProjects]             = useState([]);
  const [selectedProject, setSelected]      = useState(null);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]        = useState('');
  const [typeFilter, setTypeFilter]          = useState('all');
  const [sortBy, setSortBy]                  = useState('date');
  const [showCreateModal, setShowCreate]     = useState(false);
  const [sidebarOpen, setSidebarOpen]        = useState(false);

  // Load projects
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {};
      if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;
      const res = await fetch('/api/projects', { headers });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.projects ?? MOCK_PROJECTS);
      setProjects(list);
      setSelected(prev => prev ?? (list[0] ?? null));
    } catch {
      setProjects(MOCK_PROJECTS);
      setSelected(prev => prev ?? MOCK_PROJECTS[0]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (updatedProject) => {
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setSelected(prev => prev?.id === updatedProject.id ? updatedProject : prev);
    };
    const onBuild = ({ projectId, build }) => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, build } : p));
      setSelected(prev => prev?.id === projectId ? { ...prev, build } : prev);
    };
    socket.on?.('project:update', onUpdate);
    socket.on?.('build:status', onBuild);
    return () => {
      socket.off?.('project:update', onUpdate);
      socket.off?.('build:status', onBuild);
    };
  }, [socket]);

  // Filtering & sorting
  const filteredProjects = projects
    .filter(p => typeFilter === 'all' || p.type === typeFilter)
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0; // date: keep server order
    });

  function handleCreated(newProject) {
    setProjects(prev => [newProject, ...prev]);
    setSelected(newProject);
    setShowCreate(false);
  }

  // Sidebar content (shared between desktop and mobile drawer)
  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-bold text-gray-900 dark:text-white tracking-wide">Projects</span>
        <button
          onClick={() => { setShowCreate(true); setSidebarOpen(false); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Type filter pills */}
      <div className="px-3 pb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${typeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          All
        </button>
        {PROJECT_TYPES.map(pt => (
          <button
            key={pt.value}
            onClick={() => setTypeFilter(pt.value)}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${typeFilter === pt.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            <span>{pt.emoji}</span>
            {pt.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-none rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="date">Sort: Date</option>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
          ))
        ) : filteredProjects.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">No projects found.</p>
        ) : (
          filteredProjects.map(p => {
            const active = selectedProject?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setSelected(p); setSidebarOpen(false); }}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${BUILD_DOT[p.build.status] ?? 'bg-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                    {p.name}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{typeLabel(p.type)}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl z-10">
            <div className="absolute top-3 right-3">
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {selectedProject?.name ?? 'Project Dashboard'}
          </span>
          <div className="ml-auto">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        <ProjectDetail project={selectedProject} />
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
