/**
 * src/dashboards/ProjectTracker.jsx
 * Nexus AI Pro — Real-time Project Tracker
 * Coding, Game Development, AR/VR/3D projects with achievement tracking.
 * Date: 2026-08-11
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Project Types ────────────────────────────────────────────────────────────
export const PROJECT_TYPES = {
  coding:   { label: 'Software',       icon: '💻', color: '#3b82f6' },
  gamedev:  { label: 'Game Dev',       icon: '🎮', color: '#8b5cf6' },
  arvr:     { label: 'AR/VR/3D',       icon: '🥽', color: '#06b6d4' },
  mobile:   { label: 'Mobile App',     icon: '📱', color: '#22c55e' },
  web:      { label: 'Web App',        icon: '🌐', color: '#f59e0b' },
  systems:  { label: 'Systems (C/C++)',icon: '⚙️', color: '#ef4444' },
  swift:    { label: 'iOS/macOS',      icon: '🍎', color: '#f97316' },
  backend:  { label: 'Backend',        icon: '🖥️', color: '#6366f1' },
};

export const STATUS_COLORS = {
  planning:    '#64748b', active:   '#3b82f6',
  blocked:     '#ef4444', review:   '#f59e0b',
  testing:     '#8b5cf6', complete: '#22c55e',
  archived:    '#94a3b8',
};

// ─── Project API ──────────────────────────────────────────────────────────────
const ProjectAPI = {
  async list(type)            { return _req(`/api/projects?type=${type ?? ''}`); },
  async get(id)               { return _req(`/api/projects/${id}`); },
  async create(data)          { return _req('/api/projects', 'POST', data); },
  async update(id, data)      { return _req(`/api/projects/${id}`, 'PATCH', data); },
  async delete(id)            { return _req(`/api/projects/${id}`, 'DELETE'); },
  async getTasks(id)          { return _req(`/api/projects/${id}/tasks`); },
  async addTask(id, task)     { return _req(`/api/projects/${id}/tasks`, 'POST', task); },
  async updateTask(pid, tid, data){ return _req(`/api/projects/${pid}/tasks/${tid}`, 'PATCH', data); },
  async getMilestones(id)     { return _req(`/api/projects/${id}/milestones`); },
  async getAchievements(id)   { return _req(`/api/projects/${id}/achievements`); },
  async getMetrics(id)        { return _req(`/api/projects/${id}/metrics`); },
  async getRealTimeMetrics(id){ return _req(`/api/projects/${id}/realtime`); },
  async getTeam(id)           { return _req(`/api/projects/${id}/team`); },
  async inviteTeam(id, email) { return _req(`/api/projects/${id}/team`, 'POST', { email }); },
  async getBuilds(id)         { return _req(`/api/projects/${id}/builds`); },
  async triggerBuild(id)      { return _req(`/api/projects/${id}/builds/trigger`, 'POST'); },
};

// ─── Main Tracker ─────────────────────────────────────────────────────────────
export default function ProjectTracker() {
  const [projects, setProjects]       = useState([]);
  const [activeType, setType]         = useState(null);
  const [activeProject, setActiveProj]= useState(null);
  const [tasks, setTasks]             = useState([]);
  const [milestones, setMilestones]   = useState([]);
  const [achievements, setAchievements]= useState([]);
  const [metrics, setMetrics]         = useState(null);
  const [showCreate, setCreate]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ProjectAPI.list(activeType);
      setProjects(Array.isArray(data) ? data : data.projects ?? demoProjects);
    } catch {
      setProjects(demoProjects);
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!activeProject) return;
    Promise.allSettled([
      ProjectAPI.getTasks(activeProject.id).then(d => setTasks(Array.isArray(d) ? d : d.tasks ?? [])),
      ProjectAPI.getMilestones(activeProject.id).then(d => setMilestones(Array.isArray(d) ? d : d.milestones ?? [])),
      ProjectAPI.getAchievements(activeProject.id).then(d => setAchievements(Array.isArray(d) ? d : d.achievements ?? [])),
      ProjectAPI.getMetrics(activeProject.id).then(setMetrics),
    ]);
  }, [activeProject]);

  const openProject = (proj) => {
    setActiveProj(proj);
    setTasks([]); setMilestones([]); setAchievements([]); setMetrics(null);
  };

  const handleCreate = async (data) => {
    try {
      const proj = await ProjectAPI.create(data);
      setProjects(prev => [proj, ...prev]);
      setCreate(false);
    } catch (err) { setError(err.message); }
  };

  const handleUpdateProject = async (id, data) => {
    try {
      const updated = await ProjectAPI.update(id, data);
      setProjects(prev => prev.map(p => p.id === id ? updated : p));
      if (activeProject?.id === id) setActiveProj(updated);
    } catch (err) { setError(err.message); }
  };

  const byType = activeType ? projects.filter(p => p.type === activeType) : projects;

  return (
    <div className="project-tracker">
      {/* ── Header ── */}
      <div className="tracker-header">
        <h1 className="dash-title">📂 Project Tracker</h1>
        <button className="btn-primary" onClick={() => setCreate(true)}>+ New Project</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* ── Type Filter ── */}
      <div className="type-filters">
        <button className={`type-chip ${!activeType ? 'active' : ''}`} onClick={() => setType(null)}>
          All ({projects.length})
        </button>
        {Object.entries(PROJECT_TYPES).map(([key, info]) => {
          const count = projects.filter(p => p.type === key).length;
          if (count === 0 && activeType !== key) return null;
          return (
            <button key={key} className={`type-chip ${activeType === key ? 'active' : ''}`}
              style={{ '--type-color': info.color }} onClick={() => setType(activeType === key ? null : key)}>
              {info.icon} {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Project Grid ── */}
      {!activeProject ? (
        <div className="project-grid">
          {loading && <p className="loading-text">Loading projects…</p>}
          {byType.map(proj => (
            <ProjectCard key={proj.id} project={proj}
              onClick={() => openProject(proj)}
              onUpdate={(data) => handleUpdateProject(proj.id, data)} />
          ))}
          {!loading && byType.length === 0 && (
            <div className="empty-state">
              <p>No projects yet.</p>
              <button className="btn-primary" onClick={() => setCreate(true)}>Create your first project</button>
            </div>
          )}
        </div>
      ) : (
        <ProjectDetail
          project={activeProject} tasks={tasks} milestones={milestones}
          achievements={achievements} metrics={metrics}
          onBack={() => setActiveProj(null)}
          onAddTask={async (task) => {
            const t = await ProjectAPI.addTask(activeProject.id, task);
            setTasks(prev => [...prev, t]);
          }}
          onTriggerBuild={() => ProjectAPI.triggerBuild(activeProject.id)}
        />
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <CreateProjectModal onSubmit={handleCreate} onClose={() => setCreate(false)} />
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick, onUpdate }) {
  const type  = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.coding;
  const color = STATUS_COLORS[project.status] ?? '#64748b';
  const pct   = project.progress ?? 0;
  return (
    <div className="project-card" onClick={onClick}>
      <div className="pc-header">
        <span className="pc-type" style={{ color: type.color }}>{type.icon} {type.label}</span>
        <span className="pc-status" style={{ background: color }}>
          {project.status ?? 'active'}
        </span>
      </div>
      <h3 className="pc-name">{project.name}</h3>
      <p className="pc-desc">{project.description}</p>
      <div className="pc-progress">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: type.color }} />
        </div>
        <span className="progress-pct">{pct}%</span>
      </div>
      <div className="pc-meta">
        {project.deadline && <span>📅 {new Date(project.deadline).toLocaleDateString()}</span>}
        {project.teamSize && <span>👥 {project.teamSize}</span>}
        {project.engine   && <span>⚙️ {project.engine}</span>}
      </div>
      {project.tags?.length > 0 && (
        <div className="pc-tags">
          {project.tags.map((tag, i) => <span key={i} className="tag-badge">{tag}</span>)}
        </div>
      )}
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────
function ProjectDetail({ project, tasks, milestones, achievements, metrics, onBack, onAddTask, onTriggerBuild }) {
  const [tab, setTab]       = useState('tasks');
  const [newTask, setNT]    = useState('');
  const type                = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.coding;

  const detailTabs = [
    { id: 'tasks',        label: `✅ Tasks (${tasks.length})` },
    { id: 'milestones',   label: `🎯 Milestones (${milestones.length})` },
    { id: 'achievements', label: `🏆 Achievements (${achievements.length})` },
    { id: 'metrics',      label: '📊 Metrics' },
    { id: 'builds',       label: '🔨 Builds' },
  ];

  return (
    <div className="project-detail">
      <button className="back-btn" onClick={onBack}>← Back to projects</button>
      <div className="pd-header">
        <div>
          <h2 className="pd-title">{type.icon} {project.name}</h2>
          <p className="pd-desc">{project.description}</p>
          <div className="pd-meta">
            <span className="tag-badge" style={{ background: STATUS_COLORS[project.status] }}>
              {project.status}
            </span>
            {project.engine && <span className="tag-badge">⚙️ {project.engine}</span>}
            {project.platform && <span className="tag-badge">🖥️ {project.platform}</span>}
          </div>
        </div>
        <div className="pd-progress-ring">
          <svg viewBox="0 0 36 36" width={80}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-color)" strokeWidth="2" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={type.color} strokeWidth="2.5"
              strokeDasharray={`${project.progress ?? 0}, 100`} strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
            <text x="18" y="21" textAnchor="middle" fontSize="7" fill={type.color}>
              {project.progress ?? 0}%
            </text>
          </svg>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="detail-tabs">
        {detailTabs.map(t => (
          <button key={t.id} className={`detail-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── Tasks ── */}
      {tab === 'tasks' && (
        <div className="tasks-panel">
          <div className="add-task-row">
            <input className="field-input" value={newTask} onChange={e => setNT(e.target.value)}
              placeholder="Add a task…" onKeyDown={e => { if (e.key === 'Enter' && newTask) { onAddTask({ title: newTask, status: 'todo' }); setNT(''); } }} />
            <button className="btn-primary" onClick={() => { if (newTask) { onAddTask({ title: newTask, status: 'todo' }); setNT(''); } }}>Add</button>
          </div>
          {tasks.length === 0 && <p className="empty-state">No tasks yet — add your first!</p>}
          {tasks.map((task, i) => (
            <div key={i} className={`task-item ${task.status}`}>
              <span className="task-status-dot" />
              <span className="task-title">{task.title}</span>
              <span className="task-assignee">{task.assignee}</span>
              <span className="task-due">{task.due ? new Date(task.due).toLocaleDateString() : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Milestones ── */}
      {tab === 'milestones' && (
        <div className="milestones-panel">
          {milestones.length === 0 && <p className="empty-state">No milestones set.</p>}
          {milestones.map((m, i) => (
            <div key={i} className="milestone-item">
              <div className="milestone-check">{m.complete ? '✅' : '⭕'}</div>
              <div>
                <h4 className="milestone-name">{m.name}</h4>
                <p className="milestone-desc">{m.description}</p>
                <span className="milestone-date">
                  {m.dueDate ? `Due: ${new Date(m.dueDate).toLocaleDateString()}` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Achievements ── */}
      {tab === 'achievements' && (
        <div className="achievements-panel">
          {achievements.length === 0 && demoAchievements.map((a, i) => (
            <div key={i} className={`achievement-item ${a.unlocked ? 'unlocked' : 'locked'}`}>
              <span className="ach-icon">{a.unlocked ? a.icon : '🔒'}</span>
              <div>
                <h4 className="ach-name">{a.name}</h4>
                <p className="ach-desc">{a.description}</p>
                {a.progress !== undefined && (
                  <div className="ach-progress">
                    <div className="progress-bar-bg" style={{ height: 6 }}>
                      <div className="progress-bar-fill" style={{ width: `${a.progress}%` }} />
                    </div>
                    <span>{a.progress}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {achievements.map((a, i) => (
            <div key={i} className={`achievement-item ${a.unlocked ? 'unlocked' : 'locked'}`}>
              <span className="ach-icon">{a.unlocked ? (a.icon ?? '🏆') : '🔒'}</span>
              <div>
                <h4 className="ach-name">{a.name}</h4>
                <p className="ach-desc">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Metrics ── */}
      {tab === 'metrics' && (
        <div className="metrics-panel">
          <div className="metrics-grid">
            {(metrics ?? demoMetrics).map((m, i) => (
              <div key={i} className="metric-tile">
                <span className="metric-label">{m.label}</span>
                <span className="metric-value" style={{ color: type.color }}>{m.value}</span>
                {m.change !== undefined && (
                  <span className={`metric-change ${m.change >= 0 ? 'positive' : 'negative'}`}>
                    {m.change >= 0 ? '↑' : '↓'} {Math.abs(m.change)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Builds ── */}
      {tab === 'builds' && (
        <div className="builds-panel">
          <button className="btn-primary" onClick={onTriggerBuild}>🔨 Trigger Build</button>
          <div className="build-history">
            {demoBuildHistory.map((build, i) => (
              <div key={i} className={`build-item ${build.status}`}>
                <span className="build-num">#{build.number}</span>
                <span className={`build-status ${build.status}`}>{build.status}</span>
                <span className="build-commit">{build.commit}</span>
                <span className="build-time">{build.duration}</span>
                <span className="build-date">{new Date(build.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Project Modal ─────────────────────────────────────────────────────
function CreateProjectModal({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: '', description: '', type: 'coding', status: 'planning',
    deadline: '', engine: '', platform: '', tags: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), progress: 0 });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>New Project</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <label>Project Name *<input className="field-input" required value={form.name} onChange={e => set('name', e.target.value)} /></label>
          <label>Description<textarea className="field-textarea" value={form.description} onChange={e => set('description', e.target.value)} /></label>
          <label>Type *
            <select className="field-select" value={form.type} onChange={e => set('type', e.target.value)}>
              {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </label>
          {(form.type === 'gamedev' || form.type === 'arvr') && (
            <label>Engine
              <input className="field-input" placeholder="Unreal, Unity, Godot, Blender…" value={form.engine} onChange={e => set('engine', e.target.value)} />
            </label>
          )}
          <label>Target Platform
            <input className="field-input" placeholder="Windows, macOS, iOS, Android, Linux, Web…" value={form.platform} onChange={e => set('platform', e.target.value)} />
          </label>
          <label>Deadline<input className="field-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} /></label>
          <label>Tags (comma-separated)<input className="field-input" placeholder="react, multiplayer, AR" value={form.tags} onChange={e => set('tags', e.target.value)} /></label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!form.name}>Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const demoProjects = [
  { id: '1', name: 'Nexus Mobile App',        type: 'mobile',  status: 'active',   progress: 72, description: 'iOS + Android app', tags: ['swift', 'kotlin'], deadline: Date.now() + 30 * 86400000 },
  { id: '2', name: 'Multiplayer RPG',         type: 'gamedev', status: 'active',   progress: 45, description: 'Unreal Engine 5 multiplayer', engine: 'Unreal 5', tags: ['UE5', 'C++'] },
  { id: '3', name: 'AR Interior Designer',    type: 'arvr',    status: 'planning', progress: 12, description: 'AR room planner', engine: 'Unity', tags: ['AR', 'LiDAR'] },
  { id: '4', name: 'Analytics Backend',       type: 'backend', status: 'review',   progress: 88, description: 'Real-time analytics service', tags: ['Node.js', 'Redis'] },
  { id: '5', name: 'Low-latency Game Server', type: 'systems', status: 'active',   progress: 60, description: 'C++ dedicated game server', tags: ['C++', 'UDP'] },
];

const demoAchievements = [
  { icon: '🚀', name: 'First Launch',   description: 'Deployed to production for the first time',    unlocked: true  },
  { icon: '🔥', name: '1K Users',       description: 'Reached 1,000 active users',                  unlocked: true  },
  { icon: '⚡', name: 'Performance Pro', description: '< 50ms API response time at scale',           unlocked: false, progress: 73 },
  { icon: '🛡️', name: 'Fort Knox',     description: 'Passed full security audit with 0 criticals',  unlocked: false, progress: 40 },
  { icon: '🏆', name: 'Team Player',   description: 'Collaborated with 5+ team members',            unlocked: true  },
];

const demoMetrics = [
  { label: 'Lines of Code', value: '42,318',  change: 12  },
  { label: 'Test Coverage', value: '78%',     change: 5   },
  { label: 'Open Issues',   value: '14',      change: -3  },
  { label: 'Build Time',    value: '2m 14s',  change: -8  },
  { label: 'Dependencies',  value: '87',      change: 2   },
  { label: 'Tech Debt',     value: '3.2 days',change: -15 },
  { label: 'Commits/Week',  value: '28',      change: 17  },
  { label: 'PRs Merged',    value: '9',       change: 0   },
];

const demoBuildHistory = [
  { number: 47, status: 'success', commit: 'feat: add biometrics auth',  duration: '1m 52s', at: Date.now() - 3600000 },
  { number: 46, status: 'failed',  commit: 'fix: payment module',        duration: '0m 43s', at: Date.now() - 7200000 },
  { number: 45, status: 'success', commit: 'chore: update deps',         duration: '2m 01s', at: Date.now() - 14400000 },
  { number: 44, status: 'success', commit: 'feat: analytics dashboard',  duration: '1m 59s', at: Date.now() - 28800000 },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
async function _req(url, method = 'GET', body) {
  const res = await fetch(url, {
    method, headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}
