// Nexus AI Pro - ProjectTracker | 2026-10-12
import { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPES = ['all', 'coding', 'game', 'ar-vr', '3d'];

const TYPE_LABELS = { coding: 'Coding', game: 'Game Dev', 'ar-vr': 'AR/VR', '3d': '3D' };

const BUILD_STATUS_COLORS = {
  passing: 'text-green-400',
  failing: 'text-red-400',
  pending: 'text-yellow-400',
  unknown: 'text-gray-400',
};

function ProgressBar({ value, max = 100, color = 'bg-blue-500' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-gray-700 rounded-full h-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ProjectTypeTag({ type }) {
  const colors = {
    coding: 'bg-blue-900/50 text-blue-300 border-blue-700',
    game: 'bg-purple-900/50 text-purple-300 border-purple-700',
    'ar-vr': 'bg-green-900/50 text-green-300 border-green-700',
    '3d': 'bg-orange-900/50 text-orange-300 border-orange-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[type] ?? 'bg-gray-800 text-gray-300 border-gray-600'}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function CodingDetails({ project }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(project.languages ?? []).map(lang => (
          <span key={lang.name} className="flex items-center gap-1 text-xs bg-gray-700 px-2 py-0.5 rounded">
            <span>{lang.name}</span>
            <span className="text-gray-400">{lang.percent}%</span>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-400 text-xs">Test Coverage</div>
          <ProgressBar value={project.testCoverage ?? 0} color={project.testCoverage >= 80 ? 'bg-green-500' : 'bg-yellow-500'} />
          <div className="text-xs mt-0.5">{project.testCoverage ?? 0}%</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Build</div>
          <div className={`font-medium ${BUILD_STATUS_COLORS[project.buildStatus] ?? BUILD_STATUS_COLORS.unknown}`}>
            {project.buildStatus ?? 'Unknown'}
          </div>
        </div>
      </div>
      {project.vcsUrl && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{project.vcsProvider ?? 'Git'}:</span>
          <a href={project.vcsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate max-w-xs">
            {project.vcsUrl}
          </a>
          <span className={`${project.vcsConnected ? 'text-green-400' : 'text-gray-500'}`}>
            {project.vcsConnected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      )}
    </div>
  );
}

function GameDetails({ project }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <div className="text-gray-400 text-xs">Engine</div>
        <div className="font-medium">{project.engine ?? '—'}</div>
      </div>
      <div>
        <div className="text-gray-400 text-xs">Assets</div>
        <div className="font-medium">{project.assetCount ?? '—'}</div>
      </div>
      <div>
        <div className="text-gray-400 text-xs">Build Pipeline</div>
        <div className={BUILD_STATUS_COLORS[project.buildStatus] ?? BUILD_STATUS_COLORS.unknown}>
          {project.buildStatus ?? 'Unknown'}
        </div>
      </div>
      <div>
        <div className="text-gray-400 text-xs">Target FPS</div>
        <div className="font-medium">{project.targetFPS ?? '—'}</div>
      </div>
    </div>
  );
}

function ARVRDetails({ project }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <div className="text-gray-400 text-xs">Polygon Count</div>
        <div className="font-medium">{project.polyCount?.toLocaleString() ?? '—'}</div>
      </div>
      <div>
        <div className="text-gray-400 text-xs">Texture Memory</div>
        <div className="font-medium">{project.textureMemory ?? '—'}</div>
      </div>
      <div>
        <div className="text-gray-400 text-xs">Frame Rate Target</div>
        <div className="font-medium">{project.frameRateTarget ?? '—'} FPS</div>
      </div>
      <div>
        <div className="text-gray-400 text-xs">Platform</div>
        <div className="font-medium">{project.platform ?? '—'}</div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3" aria-label={`Project: ${project.name}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{project.name}</h3>
            <ProjectTypeTag type={project.type} />
          </div>
          {project.description && (
            <p className="text-gray-400 text-xs mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(project)} className="p-1.5 text-gray-400 hover:text-white rounded" aria-label={`Edit ${project.name}`}>✎</button>
          <button onClick={() => onDelete(project.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded" aria-label={`Delete ${project.name}`}>✕</button>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{project.progress ?? 0}%</span>
        </div>
        <ProgressBar value={project.progress ?? 0} color="bg-blue-500" />
      </div>

      {project.milestone && (
        <div className="text-xs text-gray-400">
          Milestone: <span className="text-white">{project.milestone}</span>
          {project.milestoneDate && <span> · Due {new Date(project.milestoneDate).toLocaleDateString()}</span>}
        </div>
      )}

      {(project.team ?? []).length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-1">Team:</span>
          {(project.team ?? []).slice(0, 5).map((member, i) => (
            <span
              key={i}
              className="w-6 h-6 rounded-full bg-gray-600 text-xs flex items-center justify-center"
              title={member.name}
              aria-label={member.name}
            >
              {member.name?.[0]?.toUpperCase()}
            </span>
          ))}
          {(project.team ?? []).length > 5 && (
            <span className="text-xs text-gray-400">+{project.team.length - 5}</span>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(e => !e)}
        className="text-xs text-blue-400 hover:text-blue-300 text-left"
        aria-expanded={expanded}
        aria-controls={`project-details-${project.id}`}
      >
        {expanded ? 'Hide details ▲' : 'Show details ▼'}
      </button>

      {expanded && (
        <div id={`project-details-${project.id}`}>
          {project.type === 'coding' && <CodingDetails project={project} />}
          {project.type === 'game' && <GameDetails project={project} />}
          {project.type === 'ar-vr' && <ARVRDetails project={project} />}
          {project.type === '3d' && <ARVRDetails project={project} />}
        </div>
      )}
    </article>
  );
}

function ProjectFormModal({ project, onSave, onClose }) {
  const [form, setForm] = useState(project ?? { name: '', type: 'coding', progress: 0, description: '' });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label={project ? 'Edit project' : 'Create project'}>
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{project ? 'Edit Project' : 'New Project'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-300 block mb-1" htmlFor="proj-name">Name</label>
            <input
              id="proj-name"
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1" htmlFor="proj-type">Type</label>
            <select
              id="proj-type"
              value={form.type}
              onChange={e => set('type', e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {['coding', 'game', 'ar-vr', '3d'].map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1" htmlFor="proj-progress">Progress ({form.progress}%)</label>
            <input
              id="proj-progress"
              type="range"
              min={0}
              max={100}
              value={form.progress}
              onChange={e => set('progress', Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1" htmlFor="proj-desc">Description</label>
            <textarea
              id="proj-desc"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-sm font-medium transition-colors">
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectTracker() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editingProject, setEditingProject] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data.projects ?? data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const socket = window.socketInstance;
    if (!socket) return;
    const handler = (update) => {
      setProjects(prev => prev.map(p => p.id === update.id ? { ...p, ...update } : p));
    };
    socket.on('project:update', handler);
    return () => socket.off('project:update', handler);
  }, []);

  const saveProject = async (form) => {
    const isEdit = !!form.id;
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/projects/${form.id}` : '/api/projects';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      setProjects(prev =>
        isEdit ? prev.map(p => p.id === saved.id ? saved : p) : [...prev, saved]
      );
      setEditingProject(null);
      setShowNewForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-live="polite" aria-busy="true">
        <div className="text-gray-400 animate-pulse">Loading projects...</div>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-6 text-white min-h-screen bg-gray-900" aria-label="Project Tracker">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Project Tracker</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg transition-colors"
          aria-label="Create new project"
        >
          + New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto" role="group" aria-label="Filter projects by type">
        {PROJECT_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filter === type ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            aria-pressed={filter === type}
          >
            {type === 'all' ? 'All' : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          No projects found{filter !== 'all' ? ` of type "${TYPE_LABELS[filter]}"` : ''}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditingProject}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}

      {(showNewForm || editingProject) && (
        <ProjectFormModal
          project={editingProject}
          onSave={saveProject}
          onClose={() => { setShowNewForm(false); setEditingProject(null); }}
        />
      )}
    </main>
  );
}
