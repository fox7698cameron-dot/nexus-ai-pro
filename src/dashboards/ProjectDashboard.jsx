/**
 * src/dashboards/ProjectDashboard.jsx
 * Nexus AI Pro — Real-time Project Tracking Dashboard
 * Covers: coding, game dev, AR/VR, 3D, mobile, web, enterprise projects
 * Features: kanban view, milestones, builds, commits, metrics
 * Multi-platform: desktop/mobile/tablet responsive
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Type icons ────────────────────────────────────────────────────────────

const TYPE_ICON = {
  coding: '💻',
  game_dev: '🎮',
  ar: '🕶️',
  vr: '🥽',
  '3d': '🧊',
  mobile: '📱',
  web: '🌐',
  enterprise: '🏢',
};

const STATUS_COLOR = {
  planning: '#6b7280',
  active: '#3b82f6',
  on_hold: '#f59e0b',
  review: '#8b5cf6',
  completed: '#22c55e',
  archived: '#9ca3af',
};

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };

function ProgressBar({ value = 0, color = '#3b82f6' }) {
  return (
    <div style={{ background: 'var(--border)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s' }} />
    </div>
  );
}

function ProjectCard({ project, onSelect }) {
  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '16px', cursor: 'pointer', transition: 'border-color 0.15s', flex: '1 1 280px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>{TYPE_ICON[project.type] || '📁'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{project.type?.replace('_', ' ')}</div>
          </div>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600,
          background: `${STATUS_COLOR[project.status]}22`, color: STATUS_COLOR[project.status],
        }}>{project.status?.replace('_', ' ')}</span>
      </div>

      {project.description && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {project.description}
        </p>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
          <span>Progress</span>
          <span>{project.completionPercent || 0}%</span>
        </div>
        <ProgressBar value={project.completionPercent} color={STATUS_COLOR[project.status]} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {project.engine && <Tag>{project.engine}</Tag>}
        {project.platform && <Tag>{project.platform}</Tag>}
        {(project.languages || []).slice(0, 3).map((l) => <Tag key={l}>{l}</Tag>)}
        <span style={{
          padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
          background: `${PRIORITY_COLOR[project.priority]}22`, color: PRIORITY_COLOR[project.priority],
        }}>
          {project.priority}
        </span>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {project.targetDate && `Target: ${new Date(project.targetDate).toLocaleDateString()}`}
        {project.team?.length > 0 && ` · 👥 ${project.team.length}`}
      </div>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11,
      background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
    }}>{children}</span>
  );
}

function TaskKanban({ tasks, onUpdateTask }) {
  const columns = [
    { key: 'backlog', label: '📥 Backlog' },
    { key: 'todo', label: '📋 To Do' },
    { key: 'in_progress', label: '🔄 In Progress' },
    { key: 'blocked', label: '🚫 Blocked' },
    { key: 'review', label: '👀 Review' },
    { key: 'done', label: '✅ Done' },
  ];
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {columns.map(({ key, label }) => {
        const col = tasks.filter((t) => t.status === key);
        return (
          <div key={key} style={{ flex: '0 0 220px', background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>{label}</span>
              <span style={{ background: 'var(--border)', borderRadius: 99, padding: '0 6px', fontSize: 12 }}>{col.length}</span>
            </div>
            {col.map((task) => (
              <div key={task.id} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 10px', marginBottom: 8, fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                {task.dueDate && (
                  <div style={{ fontSize: 11, color: new Date(task.dueDate) < new Date() ? '#ef4444' : 'var(--text-secondary)' }}>
                    📅 {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
                <span style={{
                  display: 'inline-block', marginTop: 4, padding: '1px 6px', borderRadius: 99, fontSize: 11,
                  background: `${PRIORITY_COLOR[task.priority]}22`, color: PRIORITY_COLOR[task.priority],
                }}>{task.priority}</span>
              </div>
            ))}
            {col.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center', padding: 8 }}>Empty</div>}
          </div>
        );
      })}
    </div>
  );
}

function BuildHistory({ builds }) {
  const statusIcon = { success: '✅', failed: '❌', running: '⟳', pending: '⏳' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {builds.map((b) => (
        <div key={b.id} style={{
          display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px',
          background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 16 }}>{statusIcon[b.status] || '❓'}</span>
          <span style={{ fontWeight: 600 }}>{b.platform || 'All'}</span>
          {b.buildNumber && <Tag>#{b.buildNumber}</Tag>}
          {b.engine && <Tag>{b.engine}</Tag>}
          {b.duration && <span style={{ color: 'var(--text-secondary)' }}>{Math.round(b.duration / 1000)}s</span>}
          <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
            {new Date(b.startedAt).toLocaleString()}
          </span>
        </div>
      ))}
      {builds.length === 0 && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No builds recorded</p>}
    </div>
  );
}

// ── New project form (minimal) ────────────────────────────────────────────

function NewProjectForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: 'coding', description: '', priority: 'medium',
    engine: '', platform: '', languages: '',
  });
  const types = ['coding', 'game_dev', 'ar', 'vr', '3d', 'mobile', 'web', 'enterprise'];
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h2 style={{ margin: 0 }}>🆕 New Project</h2>
        {[
          { key: 'name', label: 'Project Name *', type: 'text', required: true },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'engine', label: 'Engine (e.g. Unreal, Unity)', type: 'text' },
          { key: 'platform', label: 'Target Platform (e.g. PC, PS5, Quest)', type: 'text' },
          { key: 'languages', label: 'Languages (comma-separated, e.g. C++, Swift)', type: 'text' },
        ].map(({ key, label, type, required }) => (
          <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
            {label}
            <input
              type={type} required={required} value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 14 }}
            />
          </label>
        ))}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          Type
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 14 }}>
            {types.map((t) => <option key={t} value={t}>{TYPE_ICON[t]} {t.replace('_', ' ')}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          Priority
          <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 14 }}>
            {['critical', 'high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onSubmit({ ...form, languages: form.languages ? form.languages.split(',').map((s) => s.trim()) : [] })}
            disabled={!form.name.trim()}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Create Project
          </button>
          <button onClick={onCancel}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ProjectDashboard ─────────────────────────────────────────────────

export function ProjectDashboard({ authToken, socket }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');
  const [typeFilter, setTypeFilter] = useState('all');

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  const fetchProjects = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/projects', { headers });
      const data = await res.json();
      setProjects(data.projects || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const fetchProjectDetails = useCallback(async (projectId) => {
    if (!projectId) return;
    const [tasksRes, buildsRes, msRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/tasks`, { headers }),
      fetch(`/api/projects/${projectId}/builds`, { headers }),
      fetch(`/api/projects/${projectId}/milestones`, { headers }),
    ]);
    if (tasksRes.ok) setTasks((await tasksRes.json()).tasks || []);
    if (buildsRes.ok) setBuilds((await buildsRes.json()).builds || []);
    if (msRes.ok) setMilestones((await msRes.json()).milestones || []);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => {
    if (selectedProject) fetchProjectDetails(selectedProject.id);
  }, [selectedProject, fetchProjectDetails]);

  // Real-time via WebSocket
  useEffect(() => {
    if (!socket) return;
    const onProjectUpdate = (data) => {
      setProjects((prev) => prev.map((p) => p.id === data.project.id ? data.project : p));
    };
    const onTaskUpdate = (data) => {
      setTasks((prev) => prev.map((t) => t.id === data.task.id ? data.task : t));
    };
    const onBuildUpdate = (data) => {
      setBuilds((prev) => prev.map((b) => b.id === data.build.id ? data.build : [data.build, ...prev][0]));
    };
    socket.on('project:updated', onProjectUpdate);
    socket.on('task:updated', onTaskUpdate);
    socket.on('build:updated', onBuildUpdate);
    return () => {
      socket.off('project:updated', onProjectUpdate);
      socket.off('task:updated', onTaskUpdate);
      socket.off('build:updated', onBuildUpdate);
    };
  }, [socket]);

  const createProject = async (data) => {
    const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify(data) });
    if (res.ok) { await fetchProjects(); setShowNewProject(false); }
  };

  const types = ['all', 'coding', 'game_dev', 'ar', 'vr', '3d', 'mobile', 'web', 'enterprise'];
  const filtered = typeFilter === 'all' ? projects : projects.filter((p) => p.type === typeFilter);

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'var(--text-primary, #1a1a2e)',
      maxWidth: 1100, margin: '0 auto', padding: '24px 16px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {showNewProject && <NewProjectForm onSubmit={createProject} onCancel={() => setShowNewProject(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🚀 Project Tracker</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Real-time project management for code, games, AR/VR &amp; 3D
          </p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          + New Project
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: summary.totalProjects, icon: '📁' },
            { label: 'Active', value: summary.activeProjects, icon: '🔄' },
            { label: 'Tasks', value: summary.totalTasks, icon: '📋' },
            { label: 'Done', value: summary.doneTasks, icon: '✅' },
            { label: 'Overdue', value: summary.overdueTasks, icon: '⚠️' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '14px 20px', flex: '1 1 120px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24 }}>{icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {types.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            style={{
              padding: '4px 12px', borderRadius: 99,
              border: `1px solid ${typeFilter === t ? '#3b82f6' : 'var(--border)'}`,
              background: typeFilter === t ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: typeFilter === t ? '#3b82f6' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
            {t === 'all' ? 'All' : `${TYPE_ICON[t] || ''} ${t.replace('_', ' ')}`}
          </button>
        ))}
      </div>

      {/* Project grid */}
      {!selectedProject && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading projects…</p>}
          {filtered.map((p) => <ProjectCard key={p.id} project={p} onSelect={setSelectedProject} />)}
          {!loading && filtered.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No projects found. Create one above!</p>
          )}
        </div>
      )}

      {/* Project detail */}
      {selectedProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setSelectedProject(null)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
              ← Back
            </button>
            <span style={{ fontSize: 22 }}>{TYPE_ICON[selectedProject.type]}</span>
            <h2 style={{ margin: 0, fontSize: 20 }}>{selectedProject.name}</h2>
            <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: `${STATUS_COLOR[selectedProject.status]}22`, color: STATUS_COLOR[selectedProject.status] }}>
              {selectedProject.status}
            </span>
          </div>
          <ProgressBar value={selectedProject.completionPercent} color={STATUS_COLOR[selectedProject.status]} />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)' }}>
            {['kanban', 'milestones', 'builds'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{
                  padding: '8px 16px', border: 'none', background: 'none',
                  borderBottom: activeTab === t ? '2px solid #3b82f6' : '2px solid transparent',
                  fontWeight: activeTab === t ? 700 : 400, color: activeTab === t ? '#3b82f6' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 14, marginBottom: -2,
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'kanban' && <TaskKanban tasks={tasks} />}

          {activeTab === 'milestones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {milestones.map((m) => (
                <div key={m.id} style={{
                  display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px',
                  background: 'var(--bg-secondary)', borderRadius: 10,
                }}>
                  <span style={{ fontSize: 18 }}>{m.completed ? '✅' : '🎯'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                    {m.dueDate && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Due: {new Date(m.dueDate).toLocaleDateString()}</div>}
                  </div>
                </div>
              ))}
              {milestones.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No milestones set</p>}
            </div>
          )}

          {activeTab === 'builds' && <BuildHistory builds={builds} />}
        </div>
      )}
    </div>
  );
}

export default ProjectDashboard;
