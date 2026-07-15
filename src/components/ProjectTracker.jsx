/**
 * src/components/ProjectTracker.jsx
 * Nexus AI Pro — Real-Time Project Tracking
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Tracks: software projects, game development, AR/VR, 3D modeling.
 * Real-time metrics: commits, builds, test coverage, milestones.
 * Connects to GitHub, Bitbucket, Unreal, Unity via connector hub.
 */

import React, { useState, useEffect, useCallback } from 'react';
import AuthService from '../auth/AuthService.js';
import { formatNumber, formatDate } from '../i18n/index.js';

// ─── Types / enums ────────────────────────────────────────────────────────────

const PROJECT_TYPES = {
  coding:  { icon: '💻', label: 'Software',         color: '#3b82f6' },
  gamedev: { icon: '🎮', label: 'Game Development', color: '#a855f7' },
  ar:      { icon: '🥽', label: 'Augmented Reality', color: '#06b6d4' },
  vr:      { icon: '🌐', label: 'Virtual Reality',  color: '#8b5cf6' },
  '3d':    { icon: '🎨', label: '3D / Modeling',    color: '#f59e0b' },
};

const STATUS_COLORS = {
  active:  '#10b981',
  paused:  '#f59e0b',
  blocked: '#ef4444',
  done:    '#6b7280',
};

// ─── API helpers ──────────────────────────────────────────────────────────────

function getHeaders() {
  const token = AuthService.getToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiGet(path) {
  const res = await fetch(path, { headers: getHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(path, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(path, { method: 'DELETE', headers: getHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, color = '#7c3aed', label }) {
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
          <span>{label}</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}%</span>
        </div>
      )}
      <div style={{ height: 6, background: '#2d2d44', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function StatChip({ icon, value, label }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 12px', background: '#1a1a2e', borderRadius: 8 }}>
      <div style={{ fontSize: 16 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{formatNumber(value ?? 0)}</div>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function ProjectCard({ project, onSelect, onUpdate, onDelete }) {
  const type = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.coding;
  const statusColor = STATUS_COLORS[project.status] ?? '#6b7280';

  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        background: '#12121f', border: '1px solid #2d2d44', borderRadius: 14,
        padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = type.color}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2d2d44'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `${type.color}20`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>
            {type.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{project.name}</div>
            <div style={{ fontSize: 11, color: type.color }}>{type.label}</div>
          </div>
        </div>
        <div style={{
          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
          background: `${statusColor}20`, color: statusColor,
        }}>
          {project.status?.toUpperCase()}
        </div>
      </div>

      {project.description && (
        <p style={{ color: '#555', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
          {project.description.slice(0, 120)}{project.description.length > 120 ? '…' : ''}
        </p>
      )}

      <ProgressBar value={project.progress ?? 0} color={type.color} label="Progress" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
        <StatChip icon="📝" value={project.commits}    label="Commits" />
        <StatChip icon="🔨" value={project.builds}     label="Builds" />
        <StatChip icon="🧪" value={`${project.coverage ?? 0}%`} label="Coverage" />
        <StatChip icon="🚩" value={project.openIssues} label="Issues" />
      </div>

      {project.deadline && (
        <div style={{ marginTop: 12, fontSize: 11, color: '#555' }}>
          📅 Deadline: {formatDate(project.deadline)}
        </div>
      )}

      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }}>
        <button onClick={e => { e.stopPropagation(); onDelete(project.id); }} style={{
          padding: '3px 8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444',
          border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11,
        }}>
          ✕
        </button>
      </div>
    </div>
  );
}

function ProjectDetail({ project, onBack, onUpdate }) {
  const type = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.coding;
  const [milestones, setMilestones] = useState(project.milestones ?? []);

  async function toggleMilestone(id) {
    const updated = milestones.map(m => m.id === id ? { ...m, done: !m.done } : m);
    setMilestones(updated);
    await apiPut(`/api/projects/${project.id}`, { milestones: updated });
  }

  const doneCount = milestones.filter(m => m.done).length;

  return (
    <div>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer',
        fontSize: 14, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        ← Back to Projects
      </button>

      <div style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: `${type.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>
            {type.icon}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{project.name}</h2>
            <div style={{ color: type.color, fontSize: 13 }}>{type.label}</div>
          </div>
        </div>

        {project.description && (
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>{project.description}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatChip icon="📝" value={project.commits}    label="Commits" />
          <StatChip icon="🔨" value={project.builds}     label="Builds" />
          <StatChip icon="✅" value={project.passedTests} label="Tests Pass" />
          <StatChip icon="❌" value={project.failedTests} label="Tests Fail" />
          <StatChip icon="🧪" value={`${project.coverage ?? 0}%`} label="Coverage" />
          <StatChip icon="🚩" value={project.openIssues} label="Issues" />
          <StatChip icon="👥" value={project.teamSize}   label="Team" />
          <StatChip icon="⭐" value={project.stars}      label="Stars" />
        </div>

        <ProgressBar value={project.progress ?? 0} color={type.color} label="Overall Progress" />

        {project.coverage !== undefined && (
          <div style={{ marginTop: 14 }}>
            <ProgressBar
              value={project.coverage}
              color={project.coverage >= 80 ? '#10b981' : project.coverage >= 60 ? '#f59e0b' : '#ef4444'}
              label="Test Coverage"
            />
          </div>
        )}
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 14, padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
            🚀 Milestones ({doneCount}/{milestones.length})
          </h3>
          <ProgressBar value={Math.round((doneCount / milestones.length) * 100)} color={type.color} />
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {milestones.map(m => (
              <div key={m.id} onClick={() => toggleMilestone(m.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: m.done ? 'rgba(16,185,129,0.08)' : '#1a1a2e', borderRadius: 8,
                cursor: 'pointer', border: `1px solid ${m.done ? '#10b98130' : '#2d2d44'}`,
              }}>
                <span style={{ fontSize: 16 }}>{m.done ? '✅' : '⬜'}</span>
                <span style={{ color: m.done ? '#10b981' : '#ccc', fontSize: 14, textDecoration: m.done ? 'line-through' : 'none' }}>
                  {m.title}
                </span>
                {m.dueDate && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#555' }}>{formatDate(m.dueDate)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', status: 'active' });
  const [loading, setLoading] = useState(false);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handleCreate() {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const project = await apiPost('/api/projects', {
        ...form,
        progress: 0, commits: 0, builds: 0, coverage: 0, openIssues: 0,
        milestones: [],
      });
      onCreate(project);
      onClose();
    } catch (err) {
      console.error('Create project failed:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: '#1a1a2e',
    border: '1px solid #2d2d44', borderRadius: 8, color: '#e2e8f0',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#12121f', border: '1px solid #2d2d44', borderRadius: 16,
        padding: '28px', width: '100%', maxWidth: 480,
        boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>New Project</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <input value={form.name} onChange={e => set('name')(e.target.value)}
          placeholder="Project name" style={inputStyle} />
        <select value={form.type} onChange={e => set('type')(e.target.value)} style={inputStyle}>
          {Object.entries(PROJECT_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <textarea value={form.description} onChange={e => set('description')(e.target.value)}
          placeholder="Description (optional)" rows={3}
          style={{ ...inputStyle, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', background: '#1a1a2e', color: '#888',
            border: '1px solid #2d2d44', borderRadius: 8, cursor: 'pointer', fontSize: 14,
          }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={loading || !form.name.trim()} style={{
            flex: 2, padding: '10px',
            background: loading ? '#2d2d44' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
          }}>
            {loading ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectTracker() {
  const [projects, setProjects]       = useState([]);
  const [selectedProject, setSelected] = useState(null);
  const [showNew, setShowNew]          = useState(false);
  const [typeFilter, setTypeFilter]    = useState('all');
  const [loading, setLoading]          = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const data = await apiGet('/api/projects');
      setProjects(data.projects ?? []);
    } catch (err) {
      console.error('Load projects failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function deleteProject(id) {
    await apiDelete(`/api/projects/${id}`);
    setProjects(p => p.filter(x => x.id !== id));
  }

  const filtered = typeFilter === 'all'
    ? projects
    : projects.filter(p => p.type === typeFilter);

  const stats = {
    total:  projects.length,
    active: projects.filter(p => p.status === 'active').length,
    avgProgress: projects.length
      ? Math.round(projects.reduce((s, p) => s + (p.progress ?? 0), 0) / projects.length)
      : 0,
    avgCoverage: projects.length
      ? Math.round(projects.reduce((s, p) => s + (p.coverage ?? 0), 0) / projects.length)
      : 0,
  };

  if (selectedProject) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <ProjectDetail
          project={selectedProject}
          onBack={() => setSelected(null)}
          onUpdate={updated => {
            setProjects(p => p.map(x => x.id === updated.id ? updated : x));
            setSelected(updated);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreate={p => setProjects(prev => [p, ...prev])}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, background: 'linear-gradient(135deg, #a855f7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Project Tracker
          </h1>
          <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
            Real-time tracking across software, game dev, AR, VR &amp; 3D projects
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          padding: '10px 20px', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
          color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700,
        }}>
          + New Project
        </button>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: '📁', label: 'Total Projects',  value: stats.total },
          { icon: '🟢', label: 'Active',          value: stats.active },
          { icon: '📈', label: 'Avg Progress',    value: `${stats.avgProgress}%` },
          { icon: '🧪', label: 'Avg Coverage',    value: `${stats.avgCoverage}%` },
        ].map(s => (
          <div key={s.label} style={{
            background: '#12121f', border: '1px solid #2d2d44',
            borderRadius: 12, padding: '16px',
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setTypeFilter('all')} style={{
          padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
          background: typeFilter === 'all' ? '#7c3aed' : '#2d2d44',
          color: typeFilter === 'all' ? '#fff' : '#888', fontSize: 13, fontWeight: 600,
        }}>
          All
        </button>
        {Object.entries(PROJECT_TYPES).map(([k, v]) => (
          <button key={k} onClick={() => setTypeFilter(k)} style={{
            padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: typeFilter === k ? v.color : '#2d2d44',
            color: typeFilter === k ? '#fff' : '#888', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* Project grid */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>Loading projects…</div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60, border: '2px dashed #2d2d44',
          borderRadius: 16, color: '#555',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No projects yet</div>
          <div style={{ fontSize: 13 }}>Click "+ New Project" to get started</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map(p => (
          <ProjectCard key={p.id} project={p} onSelect={setSelected}
            onDelete={deleteProject}
            onUpdate={updated => setProjects(prev => prev.map(x => x.id === updated.id ? updated : x))}
          />
        ))}
      </div>
    </div>
  );
}
