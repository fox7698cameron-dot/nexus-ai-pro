// src/components/dashboards/ProjectDashboard.jsx
// Real-time project tracking — coding, game dev, AR/VR/3D, with engine connectors
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import React, { useState, useEffect, useCallback } from 'react';
import {
  Code2, Gamepad2, Layers, Box, Globe, Monitor,
  Plus, RefreshCw, GitCommit, GitBranch, CheckCircle2,
  Clock, Zap, Activity, Trophy, Target,
} from 'lucide-react';

const TYPE_CONFIG = {
  coding: { icon: Code2, color: '#6366F1', label: 'Coding' },
  game_dev: { icon: Gamepad2, color: '#F59E0B', label: 'Game Dev' },
  ar_vr: { icon: Layers, color: '#06B6D4', label: 'AR/VR' },
  '3d': { icon: Box, color: '#8B5CF6', label: '3D' },
  app_dev: { icon: Monitor, color: '#10B981', label: 'App Dev' },
  web_dev: { icon: Globe, color: '#EC4899', label: 'Web Dev' },
};

const STATUS_COLORS = { active: '#10B981', paused: '#F59E0B', completed: '#6366F1', archived: '#64748B' };

function ProgressBar({ value, color = '#6366F1' }) {
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressFill, width: `${value}%`, background: color }} />
    </div>
  );
}

function ProjectCard({ project, onSelect }) {
  const cfg = TYPE_CONFIG[project.type] ?? TYPE_CONFIG.coding;
  const ProjIcon = cfg.icon;
  return (
    <div style={{ ...styles.projectCard, borderTop: `3px solid ${cfg.color}` }} onClick={() => onSelect(project)}>
      <div style={styles.cardHeader}>
        <div style={{ ...styles.typeIcon, background: `${cfg.color}22`, color: cfg.color }}>
          <ProjIcon size={16} />
        </div>
        <span style={styles.typeBadge}>{cfg.label}</span>
        <span style={{ ...styles.statusDot, background: STATUS_COLORS[project.status] ?? '#64748B' }} />
        <span style={styles.statusLabel}>{project.status}</span>
      </div>
      <h3 style={styles.cardTitle}>{project.name}</h3>
      <p style={styles.cardDesc}>{project.description?.slice(0, 80) ?? 'No description'}</p>
      <div style={styles.progressRow}>
        <span style={styles.progressLabel}>{project.progress}%</span>
        <ProgressBar value={project.progress} color={cfg.color} />
      </div>
      <div style={styles.cardMetrics}>
        {project.metrics?.commits > 0 && (
          <span style={styles.metricChip}><GitCommit size={11} /> {project.metrics.commits}</span>
        )}
        {project.metrics?.linesOfCode > 0 && (
          <span style={styles.metricChip}><Code2 size={11} /> {(project.metrics.linesOfCode / 1000).toFixed(1)}k LOC</span>
        )}
        {project.metrics?.polygonCount > 0 && (
          <span style={styles.metricChip}><Box size={11} /> {(project.metrics.polygonCount / 1000).toFixed(0)}k poly</span>
        )}
        {project.buildStatus && (
          <span style={{ ...styles.metricChip, color: project.buildStatus === 'success' ? '#10B981' : '#EF4444' }}>
            {project.buildStatus === 'success' ? <CheckCircle2 size={11} /> : <Zap size={11} />} {project.buildStatus}
          </span>
        )}
      </div>
    </div>
  );
}

function ProjectDetail({ project, onClose, socket }) {
  const [metrics, setMetrics] = useState(project.metrics);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ projectId, metrics: m }) => {
      if (projectId === project.id) setMetrics(m);
    };
    socket.on('project:metrics', handler);
    socket.on('project:progress', handler);
    return () => { socket.off('project:metrics', handler); socket.off('project:progress', handler); };
  }, [socket, project.id]);

  const cfg = TYPE_CONFIG[project.type] ?? TYPE_CONFIG.coding;
  return (
    <div style={styles.detailPanel}>
      <div style={styles.detailHeader}>
        <h2 style={styles.detailTitle}>{project.name}</h2>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={styles.detailMeta}>
        <span style={{ color: cfg.color }}>{cfg.label}</span>
        {project.engine && <span style={styles.metaBadge}>{project.engine}</span>}
        {(project.platforms ?? []).map(p => <span key={p} style={styles.metaBadge}>{p}</span>)}
      </div>

      {/* Metrics grid */}
      <div style={styles.metricsGrid}>
        {[
          { label: 'Progress', value: `${project.progress}%`, icon: Target },
          { label: 'Commits', value: metrics?.commits ?? 0, icon: GitCommit },
          { label: 'Lines of Code', value: (metrics?.linesOfCode ?? 0).toLocaleString(), icon: Code2 },
          { label: 'Test Coverage', value: `${metrics?.testCoverage ?? 0}%`, icon: CheckCircle2 },
          { label: 'Build Count', value: metrics?.buildCount ?? 0, icon: Zap },
          { label: 'Open Issues', value: metrics?.openIssues ?? 0, icon: Activity },
          ...(project.type === 'ar_vr' || project.type === '3d' ? [
            { label: 'Polygons', value: (metrics?.polygonCount ?? 0).toLocaleString(), icon: Box },
            { label: 'Textures', value: metrics?.textureCount ?? 0, icon: Layers },
            { label: 'Scenes', value: metrics?.sceneCount ?? 0, icon: Globe },
          ] : []),
          ...(project.type === 'game_dev' ? [
            { label: 'Blueprints', value: metrics?.blueprintCount ?? 0, icon: GitBranch },
            { label: 'Scripts', value: metrics?.scriptCount ?? 0, icon: Code2 },
          ] : []),
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={styles.metricBox}>
            <Icon size={16} color={cfg.color} />
            <span style={styles.metricVal}>{value}</span>
            <span style={styles.metricLbl}>{label}</span>
          </div>
        ))}
      </div>

      {/* Milestones */}
      {project.milestones?.length > 0 && (
        <div style={styles.milestoneSection}>
          <h3 style={styles.sectionTitle}><Trophy size={14} /> Milestones</h3>
          {project.milestones.map(m => (
            <div key={m.id} style={{ ...styles.milestone, opacity: m.status === 'completed' ? 0.6 : 1 }}>
              {m.status === 'completed' ? <CheckCircle2 size={14} color="#10B981" /> : <Clock size={14} color="#F59E0B" />}
              <span style={styles.milestoneTitle}>{m.title}</span>
              {m.dueDate && <span style={styles.milestoneDue}>{new Date(m.dueDate).toLocaleDateString()}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', engine: '', platforms: [] });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { onCreate(await res.json()); onClose(); }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>New Project</h2>
        <input style={styles.input} placeholder="Project name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <select style={styles.input} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {Object.entries(TYPE_CONFIG).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <textarea style={{ ...styles.input, height: 80, resize: 'vertical' }} placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        {(form.type === 'game_dev' || form.type === 'ar_vr' || form.type === '3d') && (
          <input style={styles.input} placeholder="Engine (Unreal, Unity, Godot, Blender…)" value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))} />
        )}
        <div style={styles.modalBtns}>
          <button style={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDashboard({ socket }) {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = filter === 'all' ? '/api/projects' : `/api/projects?type=${filter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setProjects((await res.json()).projects ?? []);
    } catch { /**/ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (!socket) return;
    socket.on('project:created', fetchProjects);
    socket.on('engine:event', fetchProjects);
    return () => { socket.off('project:created', fetchProjects); socket.off('engine:event', fetchProjects); };
  }, [socket, fetchProjects]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><Gamepad2 size={22} style={{ marginRight: 8 }} />Project Tracker</h1>
        <div style={styles.headerRight}>
          <button style={styles.btnOutline} onClick={fetchProjects}><RefreshCw size={14} /></button>
          <button style={styles.btnPrimary} onClick={() => setShowNew(true)}><Plus size={14} /> New Project</button>
        </div>
      </div>

      {/* Type filter */}
      <div style={styles.filterRow}>
        {['all', ...Object.keys(TYPE_CONFIG)].map(t => (
          <button
            key={t}
            style={{ ...styles.filterBtn, ...(filter === t ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(t)}
          >
            {t === 'all' ? 'All' : TYPE_CONFIG[t]?.label ?? t}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {/* Project grid */}
        <div style={styles.projectGrid}>
          {loading
            ? <div style={styles.loading}><RefreshCw size={20} /> Loading…</div>
            : projects.length === 0
              ? <div style={styles.empty}><Box size={32} style={{ opacity: 0.3 }} /><p>No projects yet — create one!</p></div>
              : projects.map(p => <ProjectCard key={p.id} project={p} onSelect={setSelected} />)
          }
        </div>
        {/* Detail panel */}
        {selected && <ProjectDetail project={selected} onClose={() => setSelected(null)} socket={socket} />}
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={p => { setProjects(prev => [p, ...prev]); }} />}
    </div>
  );
}

const styles = {
  container: { padding: 24, color: '#E2E8F0', minHeight: '100vh', background: '#0F0F23' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center' },
  headerRight: { display: 'flex', gap: 8 },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#6366F1', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnOutline: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'transparent', border: '1px solid #334155', borderRadius: 8, color: '#E2E8F0', cursor: 'pointer', fontSize: 13 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', borderRadius: 20, border: '1px solid #334155', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: 13 },
  filterBtnActive: { background: '#1E293B', color: '#E2E8F0', borderColor: '#6366F1' },
  content: { display: 'flex', gap: 16 },
  projectGrid: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, alignContent: 'start' },
  projectCard: { background: '#1E293B', borderRadius: 12, padding: 16, border: '1px solid #334155', cursor: 'pointer', transition: 'border-color 0.2s' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeIcon: { padding: 6, borderRadius: 6 },
  typeBadge: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statusDot: { width: 8, height: 8, borderRadius: '50%', marginLeft: 'auto' },
  statusLabel: { fontSize: 11, color: '#64748B' },
  cardTitle: { fontSize: 16, fontWeight: 600, margin: '0 0 4px' },
  cardDesc: { fontSize: 12, color: '#64748B', margin: '0 0 12px' },
  progressRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressLabel: { fontSize: 12, color: '#94A3B8', width: 32, textAlign: 'right' },
  progressTrack: { flex: 1, height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.3s' },
  cardMetrics: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  metricChip: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8', background: '#0F172A', padding: '2px 8px', borderRadius: 10 },
  detailPanel: { width: 360, background: '#1E293B', borderRadius: 12, padding: 20, border: '1px solid #334155', flexShrink: 0, height: 'fit-content' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
  closeBtn: { background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 16 },
  detailMeta: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  metaBadge: { fontSize: 11, background: '#0F172A', padding: '3px 8px', borderRadius: 10, color: '#94A3B8' },
  metricsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  metricBox: { background: '#0F172A', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  metricVal: { fontSize: 18, fontWeight: 700 },
  metricLbl: { fontSize: 11, color: '#64748B' },
  milestoneSection: { borderTop: '1px solid #334155', paddingTop: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px' },
  milestone: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #0F172A' },
  milestoneTitle: { flex: 1, fontSize: 13 },
  milestoneDue: { fontSize: 11, color: '#64748B' },
  loading: { display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', padding: 32, gridColumn: '1/-1' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#64748B', padding: 48, gridColumn: '1/-1' },
  modalOverlay: { position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1E293B', borderRadius: 16, padding: 24, width: 440, border: '1px solid #334155' },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 16px' },
  input: { width: '100%', marginBottom: 12, padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#E2E8F0', fontSize: 14, boxSizing: 'border-box' },
  modalBtns: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
};
