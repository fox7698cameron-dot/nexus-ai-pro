// src/components/dashboards/GameDevDashboard.jsx
// Created: 2026-10-18
// Game development & AR/VR/3D project tracker with platform connectors

import React, { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPES = [
  { id: 'game', label: 'Game', icon: '🎮' },
  { id: 'ar',   label: 'AR',   icon: '🥽' },
  { id: 'vr',   label: 'VR',   icon: '🎯' },
  { id: '3d',   label: '3D',   icon: '🧊' },
  { id: 'code', label: 'Code', icon: '💻' },
];

const GAME_CONNECTORS = [
  { id: 'unreal_epic', label: 'Unreal / Epic',    icon: '🎮', color: '#313131' },
  { id: 'sony',        label: 'Sony (PSN)',        icon: '🎮', color: '#003087' },
  { id: 'microsoft',   label: 'Microsoft (Xbox)',  icon: '🟢', color: '#107c10' },
  { id: 'ubisoft',     label: 'Ubisoft Connect',   icon: '🔷', color: '#0070d1' },
  { id: 'steam',       label: 'Steam',             icon: '🎭', color: '#1b2838' },
];

const STATUS_COLORS = { active: '#22c55e', paused: '#eab308', archived: '#64748b', completed: '#6366f1' };

function StatusBadge({ status }) {
  return (
    <span style={{ background: STATUS_COLORS[status] || '#334155', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
      {status?.toUpperCase()}
    </span>
  );
}

function ProgressBar({ value, max, color = '#6366f1' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s' }} />
    </div>
  );
}

function ProjectCard({ project, onUpdate, onDelete }) {
  const type = PROJECT_TYPES.find(t => t.id === project.type) || { icon: '📁', label: project.type };
  return (
    <div style={styles.projectCard}>
      <div style={styles.projectHeader}>
        <span style={styles.projectIcon}>{type.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={styles.projectName}>{project.name}</div>
          <div style={styles.projectMeta}>
            {type.label}{project.platform ? ` · ${project.platform}` : ''}
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>
      {project.description && <div style={styles.projectDesc}>{project.description}</div>}
      <div style={styles.metricsGrid}>
        <div style={styles.metric}><span style={styles.metricVal}>{project.metrics?.commits || 0}</span><span style={styles.metricLabel}>Commits</span></div>
        <div style={styles.metric}><span style={styles.metricVal}>{project.metrics?.builds || 0}</span><span style={styles.metricLabel}>Builds</span></div>
        <div style={styles.metric}><span style={styles.metricVal}>{project.metrics?.issues || 0}</span><span style={styles.metricLabel}>Issues</span></div>
        <div style={styles.metric}><span style={styles.metricVal}>{project.metrics?.deployments || 0}</span><span style={styles.metricLabel}>Deploys</span></div>
      </div>
      {project.metrics?.progress != null && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            <span>Progress</span><span>{project.metrics.progress}%</span>
          </div>
          <ProgressBar value={project.metrics.progress} max={100} />
        </div>
      )}
      <div style={styles.cardFooter}>
        <span style={{ color: '#64748b', fontSize: 12 }}>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.btnSmall} onClick={() => onUpdate(project)}>Edit</button>
          <button style={{ ...styles.btnSmall, background: '#ef444420', color: '#ef4444' }} onClick={() => onDelete(project.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ConnectorPanel({ connectors }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>🔌 Platform Connectors</div>
      <div style={styles.connectorGrid}>
        {GAME_CONNECTORS.map(c => {
          const cfg = connectors?.find(x => x.id === c.id);
          return (
            <div key={c.id} style={{ ...styles.connectorCard, borderTop: `3px solid ${c.color}` }}>
              <div style={styles.connectorHeader}>
                <span style={styles.connectorIcon}>{c.icon}</span>
                <span style={styles.connectorName}>{c.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg?.configured ? '#22c55e' : '#64748b' }} />
                <span style={{ fontSize: 12, color: cfg?.configured ? '#22c55e' : '#64748b' }}>
                  {cfg?.configured ? 'Connected' : 'Not configured'}
                </span>
              </div>
              {!cfg?.configured && (
                <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Set env var in .env to connect</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'game', platform: '', description: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreate(form);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>New Project</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Name *</label>
          <input
            style={styles.input}
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="My Awesome Game"
            required
          />
          <label style={styles.label}>Type *</label>
          <select style={styles.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <label style={styles.label}>Platform</label>
          <input
            style={styles.input}
            value={form.platform}
            onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
            placeholder="PC, Console, Mobile, Web…"
          />
          <label style={styles.label}>Description</label>
          <textarea
            style={{ ...styles.input, height: 80, resize: 'vertical' }}
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Brief description…"
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button type="submit" style={styles.primaryBtn}>Create Project</button>
            <button type="button" style={styles.outlineBtn} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GameDevDashboard({ token }) {
  const [projects, setProjects] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editProject, setEditProject] = useState(null);

  const apiFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [token]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projs, conns] = await Promise.allSettled([
        apiFetch('/api/analytics/projects'),
        apiFetch('/api/analytics/game/connectors'),
      ]);
      if (projs.status === 'fulfilled') setProjects(projs.value);
      if (conns.status === 'fulfilled') setConnectors(conns.value);
    } catch (err) {
      console.error('[GameDevDashboard]', err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const createProject = async (data) => {
    try {
      await apiFetch('/api/analytics/projects', { method: 'POST', body: JSON.stringify(data) });
      await loadData();
    } catch (err) {
      console.error('[GameDevDashboard] create:', err.message);
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await apiFetch(`/api/analytics/projects/${id}`, { method: 'DELETE' });
      setProjects(p => p.filter(x => x.id !== id));
    } catch (err) {
      console.error('[GameDevDashboard] delete:', err.message);
    }
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter);

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    commits: projects.reduce((s, p) => s + (p.metrics?.commits || 0), 0),
    builds: projects.reduce((s, p) => s + (p.metrics?.builds || 0), 0),
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🎮 Game & Project Dashboard</h1>
          <p style={styles.subtitle}>Track coding, game development, AR, VR, and 3D projects in real time</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => setShowNew(true)}>+ New Project</button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}><div style={styles.statBig}>{stats.total}</div><div style={styles.statLabel}>Total Projects</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statBig, color: '#22c55e' }}>{stats.active}</div><div style={styles.statLabel}>Active</div></div>
        <div style={styles.statCard}><div style={styles.statBig}>{stats.commits.toLocaleString()}</div><div style={styles.statLabel}>Total Commits</div></div>
        <div style={styles.statCard}><div style={styles.statBig}>{stats.builds.toLocaleString()}</div><div style={styles.statLabel}>Total Builds</div></div>
      </div>

      {/* Connectors */}
      <ConnectorPanel connectors={connectors} />

      {/* Filters */}
      <div style={styles.filters}>
        {[{ id: 'all', label: 'All' }, ...PROJECT_TYPES].map(t => (
          <button
            key={t.id}
            style={{ ...styles.filterBtn, ...(filter === t.id ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(t.id)}
          >
            {t.icon || ''} {t.label}
          </button>
        ))}
      </div>

      {/* Project list */}
      {loading ? (
        <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Loading projects…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>
          No projects yet. <button style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }} onClick={() => setShowNew(true)}>Create one →</button>
        </div>
      ) : (
        <div style={styles.projectGrid}>
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onUpdate={setEditProject} onDelete={deleteProject} />
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={createProject} />}
    </div>
  );
}

const styles = {
  container: { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#94a3b8' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', textAlign: 'center' },
  statBig: { fontSize: 32, fontWeight: 800, color: '#f8fafc' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', marginBottom: 24 },
  cardTitle: { fontWeight: 700, fontSize: 16, color: '#f1f5f9', marginBottom: 16 },
  connectorGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  connectorCard: { background: '#0f172a', borderRadius: 10, padding: 16 },
  connectorHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  connectorIcon: { fontSize: 20 },
  connectorName: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 },
  filters: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  filterBtnActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  projectGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  projectCard: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  projectHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  projectIcon: { fontSize: 28 },
  projectName: { fontWeight: 700, fontSize: 18, color: '#f8fafc' },
  projectMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  projectDesc: { color: '#94a3b8', fontSize: 13, marginBottom: 12 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 },
  metric: { background: '#0f172a', borderRadius: 8, padding: '8px', textAlign: 'center' },
  metricVal: { display: 'block', fontWeight: 700, fontSize: 18, color: '#f8fafc' },
  metricLabel: { display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  btnSmall: { background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 },
  primaryBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  outlineBtn: { background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e293b', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, border: '1px solid #334155' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#f8fafc' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' },
  label: { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6, marginTop: 14 },
  input: { width: '100%', background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' },
};
