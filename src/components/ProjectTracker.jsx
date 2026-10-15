// ProjectTracker.jsx | Nexus AI Pro | Created: 2026-10-15 | Project Tracking
// Real-time coding project tracker with Kanban, CI/CD status, and platform integrations

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Play, Check, Clock, AlertTriangle, Plus, RefreshCw,
  Github, Globe, Cloud, Cpu, Users, Calendar, Tag, ChevronRight,
  Archive, Pause, Rocket, Code, Box, Layers, Activity
} from 'lucide-react';

const STATUSES = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
});

const PROJECT_STATUS = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
});

const STATUS_COLORS = {
  [PROJECT_STATUS.ACTIVE]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [PROJECT_STATUS.PAUSED]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  [PROJECT_STATUS.COMPLETED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [PROJECT_STATUS.ARCHIVED]: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const BUILD_STATUS_ICONS = {
  passing: { icon: <Check className="w-3 h-3" />, color: 'text-green-500', label: 'Passing' },
  failing: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-500', label: 'Failing' },
  building: { icon: <RefreshCw className="w-3 h-3 animate-spin" />, color: 'text-yellow-500', label: 'Building' },
  unknown: { icon: <Clock className="w-3 h-3" />, color: 'text-gray-400', label: 'Unknown' },
};

const DEMO_PROJECTS = [
  {
    id: 'p1',
    name: 'Nexus AI Core',
    description: 'Multi-model AI platform backend',
    status: PROJECT_STATUS.ACTIVE,
    stack: ['Node.js', 'React', 'PostgreSQL', 'Redis'],
    buildStatus: 'passing',
    progress: 68,
    integration: 'github',
    repo: 'fox7698cameron-dot/nexus-ai-pro',
    team: 3,
    dueDate: Date.now() + 86400000 * 20,
    tasks: {
      [STATUSES.TODO]: [{ id: 't1', title: 'Add Redis caching layer' }, { id: 't2', title: 'Write integration tests' }],
      [STATUSES.IN_PROGRESS]: [{ id: 't3', title: 'Analytics dashboard' }, { id: 't4', title: 'Payment integration' }],
      [STATUSES.DONE]: [{ id: 't5', title: 'Auth system' }, { id: 't6', title: 'Security dashboard' }],
    },
  },
  {
    id: 'p2',
    name: 'Mobile App v2',
    description: 'Cross-platform iOS/Android app',
    status: PROJECT_STATUS.ACTIVE,
    stack: ['React Native', 'TypeScript', 'Capacitor'],
    buildStatus: 'building',
    progress: 34,
    integration: 'bitbucket',
    repo: 'nexus/mobile-v2',
    team: 2,
    dueDate: Date.now() + 86400000 * 45,
    tasks: {
      [STATUSES.TODO]: [{ id: 't7', title: 'Biometric auth' }, { id: 't8', title: 'Push notifications' }, { id: 't9', title: 'Offline mode' }],
      [STATUSES.IN_PROGRESS]: [{ id: 't10', title: 'UI component library' }],
      [STATUSES.DONE]: [{ id: 't11', title: 'Project setup' }],
    },
  },
  {
    id: 'p3',
    name: 'Data Pipeline',
    description: 'ETL pipeline for analytics',
    status: PROJECT_STATUS.PAUSED,
    stack: ['Python', 'Apache Spark', 'AWS'],
    buildStatus: 'failing',
    progress: 51,
    integration: 'azure',
    repo: 'nexus/data-pipeline',
    team: 1,
    dueDate: Date.now() + 86400000 * 10,
    tasks: {
      [STATUSES.TODO]: [{ id: 't12', title: 'Fix memory leak' }],
      [STATUSES.IN_PROGRESS]: [],
      [STATUSES.DONE]: [{ id: 't13', title: 'Schema design' }, { id: 't14', title: 'Source connectors' }],
    },
  },
];

const INTEGRATION_ICONS = {
  github: <Github className="w-4 h-4" />,
  bitbucket: <GitBranch className="w-4 h-4" />,
  azure: <Cloud className="w-4 h-4" />,
};

/** @param {{ userId?: string }} props */
export default function ProjectTracker({ userId }) {
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView] = useState('cards'); // 'cards' | 'kanban'
  const [newTask, setNewTask] = useState({ title: '', status: STATUSES.TODO });
  const [loading, setLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);

  const filtered = projects.filter(p => !filterStatus || p.status === filterStatus);
  const active = selectedProject ? projects.find(p => p.id === selectedProject) : null;

  const moveTask = useCallback((projectId, taskId, fromStatus, toStatus) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const task = p.tasks[fromStatus].find(t => t.id === taskId);
      if (!task) return p;
      return {
        ...p,
        tasks: {
          ...p.tasks,
          [fromStatus]: p.tasks[fromStatus].filter(t => t.id !== taskId),
          [toStatus]: [...p.tasks[toStatus], task],
        },
        progress: calculateProgress({ ...p, tasks: { ...p.tasks, [fromStatus]: p.tasks[fromStatus].filter(t => t.id !== taskId), [toStatus]: [...p.tasks[toStatus], task] } }),
      };
    }));
  }, []);

  function calculateProgress(project) {
    const total = Object.values(project.tasks).flat().length;
    const done = project.tasks[STATUSES.DONE].length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  const addTask = useCallback((projectId) => {
    if (!newTask.title.trim()) return;
    const task = { id: `t-${Date.now()}`, title: newTask.title.trim() };
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: { ...p.tasks, [newTask.status]: [...p.tasks[newTask.status], task] } };
    }));
    setNewTask({ title: '', status: STATUSES.TODO });
  }, [newTask]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code className="w-6 h-6 text-blue-500" />
            Project Tracker
          </h1>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-sm px-3 py-1.5 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="">All Status</option>
              {Object.values(PROJECT_STATUS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <div className="flex border rounded-lg overflow-hidden dark:border-gray-600">
              {['cards', 'kanban'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm ${view === v ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                >
                  {v === 'cards' ? <Layers className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === 'cards' && !selectedProject && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-transparent hover:border-blue-500/30"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{project.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{project.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.stack.slice(0, 3).map(tech => (
                    <span key={tech} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                      {tech}
                    </span>
                  ))}
                  {project.stack.length > 3 && <span className="text-xs text-gray-400">+{project.stack.length - 3}</span>}
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span><span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className={`flex items-center gap-1 ${BUILD_STATUS_ICONS[project.buildStatus]?.color}`}>
                    {BUILD_STATUS_ICONS[project.buildStatus]?.icon}
                    CI: {BUILD_STATUS_ICONS[project.buildStatus]?.label}
                  </div>
                  <div className="flex items-center gap-1">
                    {INTEGRATION_ICONS[project.integration]}
                    <span>{project.repo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(view === 'kanban' || selectedProject) && active && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setSelectedProject(null)}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                ← Back
              </button>
              <span className="text-gray-400">/</span>
              <span className="font-medium">{active.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[active.status]}`}>
                {active.status.replace('_', ' ')}
              </span>
            </div>

            {/* Task input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Add new task..."
                value={newTask.title}
                onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addTask(active.id)}
                className="flex-1 text-sm px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              />
              <select
                value={newTask.status}
                onChange={e => setNewTask(prev => ({ ...prev, status: e.target.value }))}
                className="text-sm px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value={STATUSES.TODO}>To Do</option>
                <option value={STATUSES.IN_PROGRESS}>In Progress</option>
                <option value={STATUSES.DONE}>Done</option>
              </select>
              <button
                onClick={() => addTask(active.id)}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Kanban columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries({ 'To Do': STATUSES.TODO, 'In Progress': STATUSES.IN_PROGRESS, 'Done': STATUSES.DONE }).map(([label, status]) => (
                <div key={status} className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">{label}</h3>
                    <span className="text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {active.tasks[status].length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {active.tasks[status].map(task => (
                      <div key={task.id} className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
                        <p className="text-sm">{task.title}</p>
                        <div className="flex gap-1 mt-2">
                          {status !== STATUSES.TODO && (
                            <button
                              onClick={() => moveTask(active.id, task.id, status, status === STATUSES.IN_PROGRESS ? STATUSES.TODO : STATUSES.IN_PROGRESS)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              ←
                            </button>
                          )}
                          {status !== STATUSES.DONE && (
                            <button
                              onClick={() => moveTask(active.id, task.id, status, status === STATUSES.TODO ? STATUSES.IN_PROGRESS : STATUSES.DONE)}
                              className="text-xs text-blue-400 hover:text-blue-600 ml-auto"
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'kanban' && !selectedProject && (
          <div className="text-center py-12 text-gray-400">
            <p>Select a project from Cards view to see its Kanban board</p>
            <button onClick={() => setView('cards')} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">
              Switch to Cards
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
