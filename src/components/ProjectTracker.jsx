// ProjectTracker.jsx | 2026-10-08

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, GitBranch, Cpu, Gamepad2, Box,
  Tag, Calendar, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';

const PROJECT_TYPES = [
  { id: 'CODING', label: 'Coding', icon: Cpu },
  { id: 'GAME', label: 'Game Dev', icon: Gamepad2 },
  { id: 'AR_VR_3D', label: 'AR/VR/3D', icon: Box },
];

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
const STATUS_COLORS = {
  TODO: 'bg-gray-100 dark:bg-gray-700',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-900/20',
  DONE: 'bg-green-50 dark:bg-green-900/20',
};
const PRIORITY_COLORS = {
  LOW: 'text-blue-500',
  MEDIUM: 'text-yellow-500',
  HIGH: 'text-orange-500',
  CRITICAL: 'text-red-500',
};

const TECH_SUGGESTIONS = {
  CODING: ['React', 'Node.js', 'TypeScript', 'Python', 'Rust', 'Go', 'Docker', 'PostgreSQL'],
  GAME: ['Unreal Engine', 'Unity', 'Godot', 'C++', 'Blueprints', 'HLSL'],
  AR_VR_3D: ['ARKit', 'ARCore', 'WebXR', 'OpenXR', 'Three.js', 'Blender', 'Unity', 'Unreal'],
};

const EMPTY_FORM = {
  title: '', description: '', type: 'CODING', techStack: [],
  priority: 'MEDIUM', deadline: '', status: 'TODO', progress: 0,
};

function StatusIcon({ status }) {
  if (status === 'DONE') return <CheckCircle2 size={14} className="text-green-500" />;
  if (status === 'IN_PROGRESS') return <Clock size={14} className="text-blue-500" />;
  return <AlertCircle size={14} className="text-gray-400" />;
}

function ProgressBar({ value }) {
  return (
    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ProjectCard({ project, onEdit, onDelete, onStatusChange }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <StatusIcon status={project.status} />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{project.title}</h3>
          </div>
          {project.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(project)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-500 transition-colors">
            <Edit3 size={14} />
          </button>
          <button onClick={() => onDelete(project.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold uppercase ${PRIORITY_COLORS[project.priority]}`}>{project.priority}</span>
        {project.deadline && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <Calendar size={10} />{new Date(project.deadline).toLocaleDateString()}
          </span>
        )}
        {project.gitBranch && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-mono">
            <GitBranch size={10} />{project.gitBranch}
          </span>
        )}
      </div>

      {project.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.techStack.map(t => (
            <span key={t} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full">
              <Tag size={8} />{t}
            </span>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400">Progress</span>
          <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>

      <select
        value={project.status}
        onChange={e => onStatusChange(project.id, e.target.value)}
        className="mt-auto text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1 w-full"
      >
        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
    </div>
  );
}

function ProjectModal({ project, onSave, onClose }) {
  const [form, setForm] = useState(project || EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.techStack.includes(t)) set('techStack', [...form.techStack, t]);
    setTagInput('');
  };

  const removeTag = t => set('techStack', form.techStack.filter(x => x !== t));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {project?.id ? 'Edit Project' : 'New Project'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Project title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Deadline</label>
              <input type="date" value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Progress %</label>
              <input type="number" min={0} max={100} value={form.progress}
                onChange={e => set('progress', Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tech Stack</label>
            <div className="flex gap-2 mb-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                list="tech-suggestions"
                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                placeholder="Type and press Enter"
              />
              <datalist id="tech-suggestions">
                {(TECH_SUGGESTIONS[form.type] || []).map(s => <option key={s} value={s} />)}
              </datalist>
              <button onClick={addTag} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.techStack.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-red-500 ml-0.5">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSave(form)}
            disabled={!form.title}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
          >
            Save
          </button>
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectTracker() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProject = async (form) => {
    if (form.id) {
      const res = await fetch(`/api/projects/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setProjects(ps => ps.map(p => p.id === form.id ? { ...p, ...form } : p));
    } else {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(ps => [...ps, data.project || { ...form, id: Date.now() }]);
      }
    }
    setModal(null);
  };

  const deleteProject = async (id) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) setProjects(ps => ps.filter(p => p.id !== id));
  };

  const updateStatus = async (id, status) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setProjects(ps => ps.map(p => p.id === id ? { ...p, status } : p));
  };

  const filtered = filter === 'ALL' ? projects : projects.filter(p => p.type === filter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Tracker</h1>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter('ALL')} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
          All
        </button>
        {PROJECT_TYPES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setFilter(id)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUSES.map(status => {
          const col = filtered.filter(p => p.status === status);
          return (
            <div key={status} className={`rounded-xl p-4 ${STATUS_COLORS[status]}`}>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <StatusIcon status={status} />
                {STATUS_LABELS[status]}
                <span className="ml-auto text-xs text-gray-400">{col.length}</span>
              </h2>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl h-32" />
                  ))
                ) : col.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onEdit={proj => setModal(proj)}
                    onDelete={deleteProject}
                    onStatusChange={updateStatus}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal !== null && (
        <ProjectModal
          project={modal}
          onSave={saveProject}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
