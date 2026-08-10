// ================================================
// NEXUS AI PRO - Real-Time Project Tracker
// Coding | Game Dev | AR/VR | 3D Projects
// 2026-08-10 | Version 2.1.0
// ================================================

import React, { useState, useEffect, useCallback } from 'react';

// ── Project type config ──────────────────────────
const PROJECT_TYPES = [
  { key: 'coding',  label: 'Coding',    icon: '💻', color: '#60a5fa' },
  { key: 'game',    label: 'Game Dev',  icon: '🎮', color: '#a78bfa' },
  { key: 'arvr',    label: 'AR / VR',   icon: '🥽', color: '#34d399' },
  { key: '3d',      label: '3D / CAD',  icon: '🧊', color: '#fb923c' }
];

const PLATFORMS = {
  coding: ['Web', 'Mobile', 'Desktop', 'Backend', 'CLI', 'Library', 'AI/ML', 'Other'],
  game:   ['Unreal Engine', 'Unity', 'Godot', 'GameMaker', 'Cocos2d', 'Custom C++', 'Other'],
  arvr:   ['Unreal XR', 'Unity XR', 'Meta SDK', 'Apple visionOS', 'WebXR', 'OpenXR', 'Other'],
  '3d':   ['Blender', 'Maya', 'Cinema4D', 'Houdini', 'ZBrush', 'Unreal Nanite', 'Other']
};

const STATUS_COLORS = {
  active:   '#4ade80',
  paused:   '#fbbf24',
  complete: '#60a5fa',
  archived: '#6b7280'
};

// ── Progress bar ─────────────────────────────────
function ProgressBar({ value = 0, color = '#4f46e5' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ── Milestone list ───────────────────────────────
function MilestoneList({ milestones = [], projectId, onAdd, onToggle }) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>MILESTONES</div>
      {milestones.map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            type="checkbox"
            checked={m.done || false}
            onChange={() => onToggle && onToggle(m.id)}
            style={{ accentColor: '#4f46e5', cursor: 'pointer' }}
          />
          <span style={{ flex: 1, fontSize: 13, color: m.done ? '#555' : '#ccc', textDecoration: m.done ? 'line-through' : 'none' }}>{m.title}</span>
          {m.dueDate && <span style={{ fontSize: 11, color: '#666' }}>{m.dueDate}</span>}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="New milestone…"
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 13 }}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onAdd({ title: text.trim(), dueDate, done: false }); setText(''); setDueDate(''); } }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 8px', color: '#aaa', fontSize: 12 }}
        />
        <button
          onClick={() => { if (text.trim()) { onAdd({ title: text.trim(), dueDate, done: false }); setText(''); setDueDate(''); } }}
          style={{ background: '#4f46e5', border: 'none', borderRadius: 6, color: '#fff', padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}
        >+</button>
      </div>
    </div>
  );
}

// ── Project Card ─────────────────────────────────
function ProjectCard({ project, onUpdate, onAddMilestone }) {
  const [expanded, setExpanded] = useState(false);
  const [editProgress, setEditProgress] = useState(project.progress);
  const typeConfig = PROJECT_TYPES.find(t => t.key === project.type) || PROJECT_TYPES[0];

  const handleProgressChange = (v) => {
    setEditProgress(v);
    onUpdate(project.id, { progress: v });
  };

  const handleStatusChange = (status) => {
    onUpdate(project.id, { status });
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${typeConfig.color}25`,
      borderLeft: `3px solid ${typeConfig.color}`,
      borderRadius: 12, padding: '16px 20px', marginBottom: 12
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{typeConfig.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{project.name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{project.platform} {project.engine ? `· ${project.engine}` : ''}</div>
        </div>
        <span style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 12,
          background: `${STATUS_COLORS[project.status] || '#666'}20`,
          color: STATUS_COLORS[project.status] || '#666', fontWeight: 600
        }}>
          {project.status?.toUpperCase()}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
        >{expanded ? '▲' : '▼'}</button>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: expanded ? 16 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
          <span>Progress</span><span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={typeConfig.color} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {project.description && (
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{project.description}</p>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Commits', value: project.commits ?? 0 },
              { label: 'Bugs Open', value: project.bugsOpen ?? 0, color: project.bugsOpen > 0 ? '#ef4444' : '#4ade80' },
              { label: 'Bugs Closed', value: project.bugsClosed ?? 0, color: '#4ade80' },
              { label: 'Milestones', value: `${project.milestones?.filter(m => m.done).length ?? 0}/${project.milestones?.length ?? 0}` }
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: color || '#fff' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Progress slider */}
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>
              Progress: {editProgress}%
            </label>
            <input
              type="range" min={0} max={100} value={editProgress}
              onChange={e => handleProgressChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: typeConfig.color }}
            />
          </div>

          {/* Status controls */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(STATUS_COLORS).map(s => (
              <button key={s}
                onClick={() => handleStatusChange(s)}
                style={{
                  padding: '4px 12px', borderRadius: 8, border: `1px solid ${STATUS_COLORS[s]}50`,
                  background: project.status === s ? `${STATUS_COLORS[s]}20` : 'transparent',
                  color: STATUS_COLORS[s], cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}
              >{s}</button>
            ))}
          </div>

          {/* Milestones */}
          <MilestoneList
            milestones={project.milestones || []}
            projectId={project.id}
            onAdd={(m) => onAddMilestone(project.id, m)}
            onToggle={(mid) => {
              const updated = (project.milestones || []).map(m =>
                m.id === mid ? { ...m, done: !m.done } : m
              );
              onUpdate(project.id, { milestones: updated });
            }}
          />

          <div style={{ fontSize: 11, color: '#555' }}>
            Created: {new Date(project.createdAt).toLocaleDateString()} · Updated: {new Date(project.updatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ── New Project Form ─────────────────────────────
function NewProjectForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'coding', platform: '', description: '' });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '28px', width: '100%', maxWidth: 480 }}>
        <h3 style={{ margin: '0 0 20px', color: '#e2e8f0', fontWeight: 700 }}>New Project</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'name', label: 'Project Name', type: 'text', placeholder: 'My awesome project' }
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{label}</label>
              <input
                type={type} value={form[key]} placeholder={placeholder}
                onChange={e => set(key, e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Project Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROJECT_TYPES.map(t => (
                <button key={t.key}
                  onClick={() => { set('type', t.key); set('platform', ''); }}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: `1px solid ${form.type === t.key ? t.color : 'rgba(255,255,255,0.1)'}`,
                    background: form.type === t.key ? `${t.color}20` : 'transparent',
                    color: form.type === t.key ? t.color : '#aaa', cursor: 'pointer', fontSize: 13
                  }}
                >{t.icon} {t.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Platform / Engine</label>
            <select
              value={form.platform}
              onChange={e => set('platform', e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14 }}
            >
              <option value="">Select…</option>
              {(PLATFORMS[form.type] || []).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Short project description…"
              rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#aaa', padding: '8px 18px', cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={() => { if (form.name.trim()) { onSubmit(form); onClose(); } }}
              style={{ background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 18px', cursor: 'pointer', fontWeight: 600 }}
            >Create Project</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ProjectTracker ──────────────────────────
export default function ProjectTracker({ userId = 'guest', authToken }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const headers = { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${userId}`, { headers });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setProjects(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, authToken]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async (form) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, ...form })
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const project = await res.json();
      setProjects(prev => [project, ...prev]);
    } catch (e) {
      setError(e.message);
    }
  };

  const updateProject = async (id, patch) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p));
    try {
      await fetch(`/api/projects/${id}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
    } catch (e) {
      setError(e.message);
    }
  };

  const addMilestone = async (projectId, milestone) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestone`, {
        method: 'POST',
        headers,
        body: JSON.stringify(milestone)
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const m = await res.json();
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, milestones: [...(p.milestones || []), m] } : p
      ));
    } catch (e) {
      setError(e.message);
    }
  };

  const filtered = typeFilter === 'all' ? projects : projects.filter(p => p.type === typeFilter);

  const s = {
    wrap: { background: '#0a0a0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '24px' },
    header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
    title: { fontSize: 22, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flex: 1 }
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.title}>🗂 Project Tracker</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'All' }, ...PROJECT_TYPES].map(t => (
            <button key={t.key}
              onClick={() => setTypeFilter(t.key)}
              style={{
                padding: '5px 14px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 13,
                background: typeFilter === t.key ? '#4f46e5' : 'rgba(255,255,255,0.07)',
                color: typeFilter === t.key ? '#fff' : '#aaa', fontWeight: typeFilter === t.key ? 600 : 400
              }}
            >{t.icon ? `${t.icon} ` : ''}{t.label}</button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ background: '#4f46e5', border: 'none', borderRadius: 10, color: '#fff', padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >+ New Project</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',    value: projects.length,                                    color: '#a78bfa' },
          { label: 'Active',   value: projects.filter(p => p.status === 'active').length,  color: '#4ade80' },
          { label: 'Paused',   value: projects.filter(p => p.status === 'paused').length,  color: '#fbbf24' },
          { label: 'Complete', value: projects.filter(p => p.status === 'complete').length, color: '#60a5fa' }
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '60px 0' }}>Loading projects…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#444', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗂</div>
          <div>No projects yet — create your first one!</div>
        </div>
      ) : (
        filtered.map(p => (
          <ProjectCard key={p.id} project={p} onUpdate={updateProject} onAddMilestone={addMilestone} />
        ))
      )}

      {showForm && <NewProjectForm onSubmit={createProject} onClose={() => setShowForm(false)} />}
    </div>
  );
}
