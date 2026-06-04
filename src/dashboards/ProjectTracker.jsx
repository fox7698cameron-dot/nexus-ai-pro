// ================================================
// NEXUS AI PRO — Project Tracker Dashboard
// Types: coding, game_dev, ar_vr, 3d, app
// Real-time commit tracking, task management
// Created: 2026-06-04
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Code, Gamepad2, Layers, Box, Smartphone, Plus, GitCommit, CheckSquare, Flag, TrendingUp, Clock, Users, Filter, Search, ChevronRight, AlertCircle } from 'lucide-react';

const TYPE_ICONS = { coding: Code, game_dev: Gamepad2, ar_vr: Layers, '3d': Box, app: Smartphone };
const TYPE_COLORS = { coding: '#6366f1', game_dev: '#f59e0b', ar_vr: '#10b981', '3d': '#a855f7', app: '#3b82f6', research: '#f97316', design: '#ec4899' };
const STATUS_COLORS = { planning: '#888', active: '#10b981', paused: '#f59e0b', review: '#3b82f6', completed: '#6366f1', archived: '#666' };
const PRIORITY_COLORS = { low: '#888', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };

function ProgressBar({ value, color = '#6366f1' }) {
  return (
    <div style={{ background: '#1a1a2e', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ background: color, height: '100%', width: `${Math.min(100, Math.max(0, value))}%`, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const Icon = TYPE_ICONS[project.type] || Code;
  const typeColor = TYPE_COLORS[project.type] || '#888';

  return (
    <div
      onClick={() => onClick(project)}
      style={{ background: '#16213e', borderRadius: 14, padding: 18, cursor: 'pointer', border: '1px solid #2d2d44', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = typeColor}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2d2d44'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: typeColor + '22', borderRadius: 8, padding: 8 }}>
            <Icon size={16} color={typeColor} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{project.name}</div>
            <div style={{ color: '#888', fontSize: 11, textTransform: 'capitalize' }}>{project.type.replace('_', ' ')}</div>
          </div>
        </div>
        <span style={{ background: STATUS_COLORS[project.status] + '22', color: STATUS_COLORS[project.status], border: `1px solid ${STATUS_COLORS[project.status]}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
          {project.status}
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#888', fontSize: 12 }}>Progress</span>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={typeColor} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#6366f1', fontSize: 16, fontWeight: 700 }}>{project.commits}</div>
          <div style={{ color: '#666', fontSize: 10 }}>Commits</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f59e0b', fontSize: 16, fontWeight: 700 }}>{project.openTasks}</div>
          <div style={{ color: '#666', fontSize: 10 }}>Open Tasks</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#10b981', fontSize: 16, fontWeight: 700 }}>{fmtLoc(project.linesOfCode)}</div>
          <div style={{ color: '#666', fontSize: 10 }}>LOC</div>
        </div>
      </div>

      {project.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
          {project.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{ background: '#1a1a2e', color: '#888', border: '1px solid #333', borderRadius: 4, padding: '2px 6px', fontSize: 10 }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onSave, token }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'coding', engine: 'none', tags: '', platform: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Project name required.'); return; }
    setSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed.'); return; }
      const project = await res.json();
      onSave(project);
      onClose();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#16213e', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, border: '1px solid #2d2d44' }}>
        <h2 style={{ margin: '0 0 20px', color: '#fff', fontSize: 18 }}>New Project</h2>
        {error && <div style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{error}</div>}
        {[
          { key: 'name', label: 'Project Name', type: 'text', placeholder: 'My Awesome Project' },
          { key: 'description', label: 'Description', type: 'text', placeholder: 'Brief description…' },
          { key: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'react, typescript, api' }
        ].map(({ key, label, type, placeholder }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{ width: '100%', background: '#0a0a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>Type</label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
              style={{ width: '100%', background: '#0a0a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
            >
              {['coding', 'game_dev', 'ar_vr', '3d', 'app', 'research', 'design'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>Engine</label>
            <select
              value={form.engine}
              onChange={e => setForm(prev => ({ ...prev, engine: e.target.value }))}
              style={{ width: '100%', background: '#0a0a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
            >
              {['none', 'unreal', 'unity', 'godot', 'custom'].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#1a1a2e', color: '#888', border: '1px solid #444', borderRadius: 8, padding: '10px', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: saving ? 'default' : 'pointer', fontSize: 14, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectTracker({ token }) {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [commits, setCommits] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [pRes, sRes] = await Promise.all([
        fetch('/api/projects', { headers }),
        fetch('/api/projects/stats/overview', { headers })
      ]);
      if (pRes.ok) { const d = await pRes.json(); setProjects(d.projects || []); }
      if (sRes.ok) setStats(await sRes.json());
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchProjectDetails = useCallback(async (project) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [tRes, cRes] = await Promise.all([
        fetch(`/api/projects/${project.id}/tasks`, { headers }),
        fetch(`/api/projects/${project.id}/commits?limit=10`, { headers })
      ]);
      if (tRes.ok) { const d = await tRes.json(); setTasks(d.tasks || []); }
      if (cRes.ok) { const d = await cRes.json(); setCommits(d.commits || []); }
    } catch {
      // swallow
    }
  }, [token]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (selected) fetchProjectDetails(selected);
  }, [selected, fetchProjectDetails]);

  const filteredProjects = projects.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>Loading projects…</div>;
  }

  return (
    <div style={{ background: '#0a0a1a', minHeight: '100%', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Project Tracker
          </h1>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
            {stats?.total || 0} projects · {stats?.active || 0} active
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <Plus size={14} />
          New Project
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Projects', value: stats.total, icon: Code, color: '#6366f1' },
            { label: 'Active', value: stats.active, icon: TrendingUp, color: '#10b981' },
            { label: 'Completed', value: stats.completed, icon: CheckSquare, color: '#f59e0b' },
            { label: 'Total Commits', value: stats.totalCommits, icon: GitCommit, color: '#a855f7' },
            { label: 'Lines of Code', value: fmtLoc(stats.totalLinesOfCode), icon: Code, color: '#3b82f6' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ background: '#16213e', borderRadius: 12, padding: 16, border: '1px solid #2d2d44', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: color + '22', borderRadius: 8, padding: 8 }}><Icon size={16} color={color} /></div>
              <div>
                <div style={{ color: '#888', fontSize: 11 }}>{label}</div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{value ?? 0}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16213e', border: '1px solid #2d2d44', borderRadius: 8, padding: '6px 12px', flex: 1, minWidth: 160 }}>
          <Search size={14} color="#888" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, outline: 'none', width: '100%' }}
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ background: '#16213e', border: '1px solid #2d2d44', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
        >
          <option value="all">All Types</option>
          {['coding', 'game_dev', 'ar_vr', '3d', 'app', 'research', 'design'].map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ background: '#16213e', border: '1px solid #2d2d44', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
        >
          <option value="all">All Statuses</option>
          {['planning', 'active', 'paused', 'review', 'completed', 'archived'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Project grid */}
      {filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', padding: 48, background: '#16213e', borderRadius: 16, border: '1px solid #2d2d44' }}>
          <AlertCircle size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <div>No projects found. Create your first project!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filteredProjects.map(p => <ProjectCard key={p.id} project={p} onClick={setSelected} />)}
        </div>
      )}

      {/* Project detail panel */}
      {selected && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: '#0f1923', borderLeft: '1px solid #2d2d44', overflowY: 'auto', zIndex: 200, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: 16 }}>{selected.name}</h2>
            <button onClick={() => setSelected(null)} style={{ background: '#1a1a2e', color: '#888', border: '1px solid #444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Close</button>
          </div>
          <div style={{ marginBottom: 20 }}>
            <ProgressBar value={selected.progress} color={TYPE_COLORS[selected.type] || '#6366f1'} />
            <div style={{ color: '#888', fontSize: 12, marginTop: 6 }}>{selected.progress}% complete</div>
          </div>
          <h3 style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Recent Commits</h3>
          {commits.map(c => (
            <div key={c.id} style={{ background: '#16213e', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ color: '#6366f1', fontSize: 11, fontFamily: 'monospace' }}>{c.hash}</div>
              <div style={{ color: '#ccc', fontSize: 13, margin: '4px 0' }}>{c.message}</div>
              <div style={{ color: '#666', fontSize: 11 }}>{c.branch} · {c.linesAdded}++ {c.linesRemoved}--</div>
            </div>
          ))}
          <h3 style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '16px 0 10px' }}>Tasks ({tasks.length})</h3>
          {tasks.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#16213e', borderRadius: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[t.priority] || '#888', flexShrink: 0 }} />
              <div style={{ flex: 1, color: t.status === 'completed' ? '#666' : '#ccc', fontSize: 13, textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>
                {t.title}
              </div>
              <span style={{ background: STATUS_COLORS[t.status] + '22', color: STATUS_COLORS[t.status] || '#888', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewProjectModal token={token} onClose={() => setShowNew(false)} onSave={p => setProjects(prev => [p, ...prev])} />}
    </div>
  );
}

function fmtLoc(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}
