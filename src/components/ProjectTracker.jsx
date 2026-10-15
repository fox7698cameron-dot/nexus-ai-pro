// ProjectTracker.jsx | Nexus AI Pro | Created: 2026-10-15 | Project Tracking

import React, { useState } from 'react';
import {
  GitBranch, CheckCircle, Circle, Clock, Users,
  Activity, Play, Pause, Archive, RefreshCw,
  AlertCircle, ChevronRight, Plus, Search,
  Server, Globe, Cpu
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const PROJECT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

const KANBAN_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'text-gray-500' },
  { id: 'inprogress', label: 'In Progress', color: 'text-blue-500' },
  { id: 'done', label: 'Done', color: 'text-green-500' }
];

const CI_STATUS = {
  PASSING: 'passing',
  FAILING: 'failing',
  RUNNING: 'running',
  PENDING: 'pending'
};

// ============================================
// MOCK DATA
// ============================================

const MOCK_PROJECTS = [
  {
    id: 'p1',
    name: 'Nexus AI Pro',
    description: 'Military-grade AI platform',
    status: PROJECT_STATUS.ACTIVE,
    stack: ['React', 'Node.js', 'Socket.io', 'Tailwind'],
    vcs: { provider: 'github', url: 'github.com/cameronfox/nexus-ai-pro', connected: true },
    ci: CI_STATUS.PASSING,
    progress: 78,
    timeTracked: '342h',
    sprint: {
      todo: [
        { id: 't1', title: 'Add WebRTC video chat', priority: 'high' },
        { id: 't2', title: 'iOS push notification fix', priority: 'medium' }
      ],
      inprogress: [
        { id: 't3', title: 'Analytics dashboard v2', priority: 'high' },
        { id: 't4', title: 'Auth biometrics', priority: 'medium' }
      ],
      done: [
        { id: 't5', title: 'Payment integration', priority: 'high' },
        { id: 't6', title: 'Security dashboard', priority: 'high' }
      ]
    },
    milestones: [
      { name: 'MVP Launch', done: true, date: '2025-06-01' },
      { name: 'v2.0 Release', done: true, date: '2026-01-15' },
      { name: 'Mobile App', done: false, date: '2026-11-30' }
    ],
    team: ['CF', 'AJ', 'SR', 'ML', 'PW', 'GR']
  },
  {
    id: 'p2',
    name: 'n8n Automation Studio',
    description: 'Workflow automation engine',
    status: PROJECT_STATUS.ACTIVE,
    stack: ['TypeScript', 'Vue.js', 'PostgreSQL'],
    vcs: { provider: 'github', url: 'github.com/cameronfox/n8n-studio', connected: true },
    ci: CI_STATUS.RUNNING,
    progress: 45,
    timeTracked: '128h',
    sprint: {
      todo: [
        { id: 't7', title: 'Webhook trigger nodes', priority: 'high' },
        { id: 't8', title: 'Scheduled cron jobs', priority: 'medium' }
      ],
      inprogress: [
        { id: 't9', title: 'Visual canvas editor', priority: 'high' }
      ],
      done: [
        { id: 't10', title: 'Core node library', priority: 'high' }
      ]
    },
    milestones: [
      { name: 'Alpha Release', done: true, date: '2026-07-01' },
      { name: 'Beta Launch', done: false, date: '2026-12-15' }
    ],
    team: ['CF', 'SR']
  },
  {
    id: 'p3',
    name: 'Avatar Creator SDK',
    description: '3D avatar generation toolkit',
    status: PROJECT_STATUS.PAUSED,
    stack: ['Three.js', 'WebGL', 'WASM'],
    vcs: { provider: 'bitbucket', url: 'bitbucket.org/cameronfox/avatar-sdk', connected: true },
    ci: CI_STATUS.PENDING,
    progress: 30,
    timeTracked: '67h',
    sprint: {
      todo: [
        { id: 't11', title: 'Cloth simulation', priority: 'low' }
      ],
      inprogress: [],
      done: [
        { id: 't12', title: 'Base mesh generator', priority: 'high' }
      ]
    },
    milestones: [
      { name: 'Proof of Concept', done: true, date: '2026-04-01' },
      { name: 'SDK v1.0', done: false, date: '2027-02-01' }
    ],
    team: ['AJ', 'GR']
  },
  {
    id: 'p4',
    name: 'DevOps Pipeline CLI',
    description: 'CI/CD tooling for teams',
    status: PROJECT_STATUS.COMPLETED,
    stack: ['Go', 'Docker', 'K8s'],
    vcs: { provider: 'azure', url: 'dev.azure.com/cameronfox/devops-cli', connected: false },
    ci: CI_STATUS.PASSING,
    progress: 100,
    timeTracked: '211h',
    sprint: {
      todo: [],
      inprogress: [],
      done: [
        { id: 't13', title: 'All milestones complete', priority: 'high' }
      ]
    },
    milestones: [
      { name: 'v1.0 Released', done: true, date: '2026-09-01' }
    ],
    team: ['CF', 'ML']
  }
];

// ============================================
// HELPERS
// ============================================

function statusColor(status) {
  switch (status) {
    case PROJECT_STATUS.ACTIVE: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case PROJECT_STATUS.PAUSED: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case PROJECT_STATUS.COMPLETED: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    case PROJECT_STATUS.ARCHIVED: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}

function statusIcon(status) {
  switch (status) {
    case PROJECT_STATUS.ACTIVE: return <Play size={10} />;
    case PROJECT_STATUS.PAUSED: return <Pause size={10} />;
    case PROJECT_STATUS.COMPLETED: return <CheckCircle size={10} />;
    case PROJECT_STATUS.ARCHIVED: return <Archive size={10} />;
    default: return <Circle size={10} />;
  }
}

function ciStatusBadge(status) {
  switch (status) {
    case CI_STATUS.PASSING:
      return <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle size={10} /> Passing</span>;
    case CI_STATUS.FAILING:
      return <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle size={10} /> Failing</span>;
    case CI_STATUS.RUNNING:
      return <span className="flex items-center gap-1 text-xs text-blue-500 animate-pulse"><RefreshCw size={10} className="animate-spin" /> Running</span>;
    default:
      return <span className="flex items-center gap-1 text-xs text-gray-400"><Circle size={10} /> Pending</span>;
  }
}

function vcsIcon(provider) {
  switch (provider) {
    case 'github': return <span className="text-xs font-mono text-gray-500">GH</span>;
    case 'bitbucket': return <span className="text-xs font-mono text-blue-400">BB</span>;
    case 'azure': return <span className="text-xs font-mono text-blue-500">AZ</span>;
    default: return <GitBranch size={12} />;
  }
}

function priorityColor(p) {
  switch (p) {
    case 'high': return 'border-l-red-400';
    case 'medium': return 'border-l-yellow-400';
    default: return 'border-l-gray-300';
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * @param {{ task: object }} props
 */
function KanbanCard({ task }) {
  return (
    <div className={`bg-white dark:bg-gray-700 rounded-lg p-2.5 shadow-sm border-l-4 ${priorityColor(task.priority)} cursor-default`}>
      <p className="text-xs text-gray-800 dark:text-gray-200">{task.title}</p>
      <span className={`text-xs mt-1 block capitalize ${
        task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-yellow-400' : 'text-gray-400'
      }`}>{task.priority}</span>
    </div>
  );
}

/**
 * @param {{ project: object }} props
 */
function ProjectCard({ project }) {
  const [showKanban, setShowKanban] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{project.description}</p>
          </div>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(project.status)}`}>
            {statusIcon(project.status)} {project.status}
          </span>
        </div>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-1 mb-3">
          {project.stack.map(s => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {s}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* VCS + CI row */}
        <div className="flex items-center gap-3 mb-3 text-xs">
          <div className="flex items-center gap-1">
            {vcsIcon(project.vcs.provider)}
            <span className={project.vcs.connected ? 'text-green-500' : 'text-gray-400'}>
              {project.vcs.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          {ciStatusBadge(project.ci)}
          <span className="ml-auto flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Clock size={10} /> {project.timeTracked}
          </span>
        </div>

        {/* Milestones */}
        <div className="mb-3">
          {project.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              {m.done
                ? <CheckCircle size={10} className="text-green-500" />
                : <Circle size={10} className="text-gray-400" />}
              <span className={m.done ? 'line-through' : ''}>{m.name}</span>
              <span className="ml-auto text-gray-400">{m.date}</span>
            </div>
          ))}
        </div>

        {/* Team avatars */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {project.team.slice(0, 5).map((m, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800" title={m}>
                {m[0]}
              </div>
            ))}
            {project.team.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs border-2 border-white dark:border-gray-800">
                +{project.team.length - 5}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowKanban(v => !v)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            Sprint Board
            <ChevronRight size={12} className={`transition-transform ${showKanban ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {showKanban && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/30">
          <div className="grid grid-cols-3 gap-3">
            {KANBAN_COLUMNS.map(col => {
              const tasks = project.sprint[col.id] || [];
              return (
                <div key={col.id}>
                  <h4 className={`text-xs font-semibold mb-2 ${col.color}`}>
                    {col.label} ({tasks.length})
                  </h4>
                  <div className="space-y-2 min-h-8">
                    {tasks.map(task => (
                      <KanbanCard key={task.id} task={task} />
                    ))}
                    {tasks.length === 0 && (
                      <div className="text-xs text-gray-400 italic">Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * ProjectTracker — real-time coding project tracking with kanban sprint boards
 * @param {{ className?: string }} props
 */
export default function ProjectTracker({ className = '' }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = MOCK_PROJECTS.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = MOCK_PROJECTS.filter(p => p.status === PROJECT_STATUS.ACTIVE).length;

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitBranch className="text-blue-500" size={24} />
            Project Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeCount} active · {MOCK_PROJECTS.length} total projects
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 gap-1">
          {['all', ...Object.values(PROJECT_STATUS)].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(p => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-400">
            No projects match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
