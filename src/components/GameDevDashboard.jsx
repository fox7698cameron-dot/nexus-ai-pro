/**
 * GameDevDashboard.jsx
 * Nexus AI Pro — Game Development Project Tracker
 * Tracks coding projects, AR/VR/3D builds, achievements, platform connectors
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const PROJECT_STATUSES = ['planning', 'in_progress', 'testing', 'shipped'];

const TARGET_PLATFORMS = ['PC', 'PS5', 'Xbox', 'Switch', 'Mobile', 'VR/AR', 'Web'];

const TECH_STACK_OPTIONS = ['C++', 'C#', 'Swift', 'Obj-C', 'Python', 'Kotlin', 'Java', 'Rust', 'Go', 'TypeScript', 'JavaScript', 'GDScript'];

const ENGINES = ['Unreal Engine', 'Unity', 'Godot', 'CryEngine', 'GameMaker', 'Custom'];

/** @type {{ id: string, name: string, icon: string, color: string }[]} */
const CONNECTORS = [
  { id: 'unreal',    name: 'Unreal Engine',    icon: '🎮', color: '#0d1117' },
  { id: 'epic',      name: 'Epic Games Store', icon: '🛒', color: '#2d2d2d' },
  { id: 'unity',     name: 'Unity',            icon: '⚫', color: '#222222' },
  { id: 'psn',       name: 'PlayStation (PSN)',icon: '🔵', color: '#003087' },
  { id: 'xbox',      name: 'Xbox Live',         icon: '🟢', color: '#107c10' },
  { id: 'ubisoft',   name: 'Ubisoft Connect',  icon: '💠', color: '#0069c2' },
];

const KANBAN_COLS = ['Backlog', 'In Progress', 'Review', 'Done'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  planning:    '#805ad5',
  in_progress: '#3182ce',
  testing:     '#d69e2e',
  shipped:     '#38a169',
};

const CONN_STATUS_COLORS = { connected: '#48bb78', pending: '#d69e2e', error: '#f56565' };

function statusLabel(s) {
  return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Sub-components ────────────────────────────────────────────────────────────
/** @param {{ connector: object }} */
function ConnectorCard({ connector }) {
  const [status, setStatus] = useState(connector.status ?? 'pending');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(connector.lastSync ?? null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = sessionStorage.getItem('nexus_token') || '';
      const res = await fetch(`/api/gamedev/connectors/${connector.id}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('connected');
      setLastSync(new Date().toISOString());
    } catch {
      setStatus('error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="connector-card" style={{ borderLeft: `4px solid ${connector.color}` }}>
      <div className="connector-header">
        <span className="connector-icon">{connector.icon}</span>
        <span className="connector-name">{connector.name}</span>
        <span className="conn-status-dot" style={{ color: CONN_STATUS_COLORS[status] }}>●</span>
        <span style={{ fontSize: '.75rem', color: CONN_STATUS_COLORS[status] }}>{status}</span>
      </div>
      {lastSync && <div className="connector-meta">Last sync: {new Date(lastSync).toLocaleString()}</div>}
      <button className="sync-btn" onClick={handleSync} disabled={syncing}>
        {syncing ? '⟳ Syncing…' : '⟳ Sync'}
      </button>
    </div>
  );
}

/** @param {{ achievements: object[] }} */
function AchievementList({ achievements }) {
  if (!achievements || achievements.length === 0)
    return <p style={{ color: 'var(--muted)' }}>No achievements tracked yet.</p>;
  return (
    <div className="achievement-list">
      {achievements.map((a) => (
        <div key={a.id} className="achievement-item">
          <span className="ach-icon">{a.icon ?? '🏆'}</span>
          <div className="ach-info">
            <div className="ach-name">{a.name}</div>
            <div className="ach-meta">
              <span className={`ach-rarity rarity-${a.rarity}`}>{a.rarity}</span>
              <div className="ach-progress-bar">
                <div className="ach-progress-fill" style={{ width: `${a.completion}%` }} />
              </div>
              <span className="ach-pct">{a.completion}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** @param {{ tasks: object[] }} */
function KanbanBoard({ tasks, projectId, onTaskMove }) {
  const cols = KANBAN_COLS.reduce((acc, col) => {
    acc[col] = (tasks || []).filter(t => t.column === col);
    return acc;
  }, {});

  return (
    <div className="kanban-board">
      {KANBAN_COLS.map(col => (
        <div key={col} className="kanban-col">
          <div className="kanban-col-header">
            {col}
            <span className="kanban-count">{cols[col].length}</span>
          </div>
          <div className="kanban-cards">
            {cols[col].map(task => (
              <div key={task.id} className="kanban-card">
                <div className="kanban-card-title">{task.title}</div>
                {task.tags?.map(tag => (
                  <span key={tag} className="tech-tag">{tag}</span>
                ))}
                <select
                  className="kanban-move-select"
                  value={col}
                  onChange={e => onTaskMove(task.id, e.target.value)}
                >
                  {KANBAN_COLS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Project Form ──────────────────────────────────────────────────────────────
const EMPTY_PROJECT = {
  name: '', description: '', status: 'planning',
  platforms: [], engine: '', techStack: [], isVRAR: false,
};

function ProjectForm({ initial = EMPTY_PROJECT, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_PROJECT, ...initial });

  const toggle = (key, val) =>
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }));

  const submit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <form className="project-form" onSubmit={submit}>
      <label>Project Name
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </label>
      <label>Description
        <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </label>
      <label>Status
        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          {PROJECT_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </label>
      <label>Engine
        <select value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))}>
          <option value="">— Select —</option>
          {ENGINES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </label>
      <div className="form-group">
        <span className="form-group-label">Target Platforms</span>
        <div className="tag-grid">
          {TARGET_PLATFORMS.map(p => (
            <label key={p} className="tag-checkbox">
              <input type="checkbox" checked={form.platforms.includes(p)} onChange={() => toggle('platforms', p)} /> {p}
            </label>
          ))}
        </div>
      </div>
      <div className="form-group">
        <span className="form-group-label">Tech Stack</span>
        <div className="tag-grid">
          {TECH_STACK_OPTIONS.map(t => (
            <label key={t} className="tag-checkbox">
              <input type="checkbox" checked={form.techStack.includes(t)} onChange={() => toggle('techStack', t)} /> {t}
            </label>
          ))}
        </div>
      </div>
      <label className="tag-checkbox">
        <input type="checkbox" checked={form.isVRAR} onChange={e => setForm(f => ({ ...f, isVRAR: e.target.checked }))} />
        VR / AR / 3D Project
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
/** @param {{ authToken: string }} props */
export default function GameDevDashboard({ authToken }) {
  const [projects,   setProjects]   = useState([]);
  const [activeProj, setActiveProj] = useState(null);
  const [view,       setView]       = useState('list'); // list | detail | new | connectors
  const [ach,        setAch]        = useState([]);
  const [builds,     setBuilds]     = useState([]);
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gamedev/projects', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjects(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [authToken]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id) => {
    const [achRes, buildsRes] = await Promise.all([
      fetch(`/api/gamedev/projects/${id}/achievements`, { headers }),
      fetch(`/api/gamedev/projects/${id}/builds`,       { headers }),
    ]);
    if (achRes.ok)    setAch(await achRes.json());
    if (buildsRes.ok) setBuilds(await buildsRes.json());
    // Tasks are stored inline on project in this MVP
    const proj = projects.find(p => p.id === id);
    setTasks(proj?.tasks ?? []);
  };

  const openProject = async (proj) => {
    setActiveProj(proj);
    await loadDetail(proj.id);
    setView('detail');
  };

  const saveProject = async (form) => {
    setLoading(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const url    = form.id ? `/api/gamedev/projects/${form.id}` : '/api/gamedev/projects';
      const res    = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
      setView('list');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const deleteProject = async (id) => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/gamedev/projects/${id}`, { method: 'DELETE', headers });
    await load();
    if (activeProj?.id === id) { setActiveProj(null); setView('list'); }
  };

  const moveTask = async (taskId, col) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column: col } : t));
    // Persist via API in real implementation
  };

  return (
    <div className="gamedev-root">
      <style>{GAMEDEV_CSS}</style>

      {/* Nav */}
      <nav className="gamedev-nav">
        <h2>🎮 Game Dev Tracker</h2>
        <div className="nav-actions">
          <button className={`nav-btn${view === 'list' ? ' active' : ''}`}       onClick={() => setView('list')}>Projects</button>
          <button className={`nav-btn${view === 'connectors' ? ' active' : ''}`} onClick={() => setView('connectors')}>Connectors</button>
          <button className="btn-primary" onClick={() => setView('new')}>+ New Project</button>
        </div>
      </nav>

      {error   && <div className="gd-error">⚠ {error} <button onClick={() => setError(null)}>✕</button></div>}
      {loading && <div className="gd-loading">Loading…</div>}

      {/* Project List */}
      {view === 'list' && (
        <div className="project-grid">
          {projects.length === 0 && !loading && <p className="empty-msg">No projects yet. Create your first one!</p>}
          {projects.map(proj => (
            <div key={proj.id} className="project-card" onClick={() => openProject(proj)}>
              <div className="proj-header">
                <span className="proj-name">{proj.name}</span>
                <span className="proj-status-badge" style={{ background: STATUS_COLORS[proj.status] }}>
                  {statusLabel(proj.status)}
                </span>
              </div>
              <p className="proj-desc">{proj.description}</p>
              <div className="proj-meta">
                {proj.engine && <span className="tech-tag">{proj.engine}</span>}
                {(proj.techStack ?? []).slice(0, 3).map(t => <span key={t} className="tech-tag">{t}</span>)}
                {proj.isVRAR && <span className="tech-tag vrar">VR/AR</span>}
              </div>
              <div className="proj-platforms">
                {(proj.platforms ?? []).map(p => <span key={p} className="platform-pill">{p}</span>)}
              </div>
              <div className="proj-actions" onClick={e => e.stopPropagation()}>
                <button className="btn-ghost sm" onClick={() => { setActiveProj(proj); setView('new'); }}>Edit</button>
                <button className="btn-danger sm" onClick={() => deleteProject(proj.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New / Edit */}
      {view === 'new' && (
        <div className="form-panel">
          <h3>{activeProj?.id ? 'Edit Project' : 'New Project'}</h3>
          <ProjectForm
            initial={activeProj ?? EMPTY_PROJECT}
            onSave={saveProject}
            onCancel={() => { setView('list'); setActiveProj(null); }}
          />
        </div>
      )}

      {/* Connectors */}
      {view === 'connectors' && (
        <div>
          <h3>Platform Connectors</h3>
          <div className="connector-grid">
            {CONNECTORS.map(c => <ConnectorCard key={c.id} connector={c} />)}
          </div>
        </div>
      )}

      {/* Project Detail */}
      {view === 'detail' && activeProj && (
        <div>
          <button className="btn-ghost" onClick={() => setView('list')}>← Back</button>
          <h3>{activeProj.name}
            <span className="proj-status-badge" style={{ background: STATUS_COLORS[activeProj.status], marginLeft: 12 }}>
              {statusLabel(activeProj.status)}
            </span>
          </h3>

          <div className="detail-tabs">
            <details open><summary>Kanban Board</summary>
              <KanbanBoard tasks={tasks} projectId={activeProj.id} onTaskMove={moveTask} />
            </details>
            <details open><summary>Achievements</summary>
              <AchievementList achievements={ach} />
            </details>
            <details><summary>Build History</summary>
              {builds.length === 0
                ? <p style={{ color: 'var(--muted)' }}>No builds yet.</p>
                : builds.map(b => (
                  <div key={b.id} className="build-row">
                    <span className={`build-status build-${b.status}`}>{b.status}</span>
                    <span>{b.version}</span>
                    <span className="build-ts">{new Date(b.createdAt).toLocaleString()}</span>
                    <span style={{ color: 'var(--muted)' }}>{b.platform}</span>
                  </div>
                ))
              }
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const GAMEDEV_CSS = `
:root { --bg:#0f1117;--surface:#1a1d27;--border:#2a2d3a;--text:#e2e8f0;--muted:#718096;--radius:10px; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg:#f7f8fc;--surface:#fff;--border:#e2e8f0;--text:#1a202c;--muted:#4a5568; } }
.gamedev-root { background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;padding:16px;min-height:100vh; }
.gamedev-nav { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px; }
.gamedev-nav h2 { margin:0;font-size:1.4rem; }
.nav-actions { display:flex;gap:8px;flex-wrap:wrap; }
.nav-btn { background:none;border:1px solid var(--border);color:var(--muted);border-radius:var(--radius);padding:6px 14px;cursor:pointer; }
.nav-btn.active { border-color:#3182ce;color:#3182ce; }
.btn-primary { background:#3182ce;color:#fff;border:none;border-radius:var(--radius);padding:6px 16px;cursor:pointer; }
.btn-primary:hover { background:#2b6cb0; }
.btn-ghost { background:none;border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:6px 14px;cursor:pointer; }
.btn-danger { background:none;border:1px solid #f56565;color:#f56565;border-radius:var(--radius);padding:4px 10px;cursor:pointer; }
.btn-ghost.sm, .btn-danger.sm { font-size:.8rem;padding:3px 8px; }
.gd-error { background:rgba(245,101,101,.15);color:#fc8181;border:1px solid #fc8181;border-radius:var(--radius);padding:10px;margin-bottom:12px;display:flex;justify-content:space-between; }
.gd-loading { color:var(--muted);font-style:italic;margin-bottom:12px; }
.project-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px; }
.project-card { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;cursor:pointer;transition:border-color .2s; }
.project-card:hover { border-color:#3182ce; }
.proj-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
.proj-name { font-weight:600;font-size:1rem; }
.proj-status-badge { font-size:.7rem;color:#fff;padding:2px 8px;border-radius:9999px; }
.proj-desc { color:var(--muted);font-size:.85rem;margin:0 0 8px; }
.proj-meta,.proj-platforms { display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px; }
.tech-tag { background:var(--border);border-radius:4px;padding:2px 8px;font-size:.75rem; }
.tech-tag.vrar { background:rgba(128,90,213,.3);color:#b794f4; }
.platform-pill { background:rgba(49,130,206,.2);color:#63b3ed;border-radius:9999px;padding:2px 8px;font-size:.7rem; }
.proj-actions { display:flex;gap:8px;margin-top:10px; }
.connector-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px; }
.connector-card { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px; }
.connector-header { display:flex;align-items:center;gap:8px;margin-bottom:6px; }
.connector-icon { font-size:1.2rem; }
.connector-name { font-weight:600;flex:1; }
.connector-meta { font-size:.75rem;color:var(--muted);margin-bottom:8px; }
.sync-btn { background:var(--border);border:none;color:var(--text);border-radius:6px;padding:4px 12px;cursor:pointer;font-size:.8rem; }
.achievement-list { display:flex;flex-direction:column;gap:10px; }
.achievement-item { display:flex;gap:12px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px; }
.ach-icon { font-size:1.6rem; }
.ach-name { font-weight:600;font-size:.9rem;margin-bottom:4px; }
.ach-meta { display:flex;align-items:center;gap:8px;font-size:.75rem; }
.ach-rarity { padding:1px 6px;border-radius:9999px;font-size:.7rem; }
.rarity-common { background:rgba(160,174,192,.2);color:#a0aec0; }
.rarity-rare { background:rgba(66,153,225,.2);color:#63b3ed; }
.rarity-epic { background:rgba(128,90,213,.2);color:#b794f4; }
.rarity-legendary { background:rgba(237,137,54,.2);color:#f6ad55; }
.ach-progress-bar { flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden; }
.ach-progress-fill { height:100%;background:#3182ce;border-radius:3px; }
.ach-pct { white-space:nowrap; }
.kanban-board { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;overflow-x:auto; }
.kanban-col { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px; }
.kanban-col-header { display:flex;justify-content:space-between;font-weight:600;font-size:.9rem;margin-bottom:10px; }
.kanban-count { background:var(--border);border-radius:9999px;padding:0 8px;font-size:.75rem; }
.kanban-cards { display:flex;flex-direction:column;gap:8px;min-height:60px; }
.kanban-card { background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px; }
.kanban-card-title { font-size:.85rem;margin-bottom:6px; }
.kanban-move-select { width:100%;margin-top:6px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.75rem;padding:2px; }
.build-row { display:flex;gap:16px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:.85rem; }
.build-status { padding:2px 8px;border-radius:9999px;font-size:.75rem; }
.build-success { background:rgba(72,187,120,.2);color:#48bb78; }
.build-failed  { background:rgba(245,101,101,.2);color:#f56565; }
.build-running { background:rgba(49,130,206,.2);color:#63b3ed; }
.build-ts { color:var(--muted); }
.form-panel { max-width:640px; }
.project-form { display:flex;flex-direction:column;gap:14px;margin-top:16px; }
.project-form label { display:flex;flex-direction:column;gap:4px;font-size:.9rem; }
.project-form input,.project-form textarea,.project-form select { background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;font-size:.9rem; }
.form-group { display:flex;flex-direction:column;gap:6px; }
.form-group-label { font-size:.9rem; }
.tag-grid { display:flex;flex-wrap:wrap;gap:8px; }
.tag-checkbox { display:flex;align-items:center;gap:4px;font-size:.82rem;cursor:pointer; }
.form-actions { display:flex;gap:12px;margin-top:8px; }
.detail-tabs details { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:14px; }
.detail-tabs summary { cursor:pointer;font-weight:600;margin-bottom:10px; }
.empty-msg { color:var(--muted);padding:20px 0; }
@media (max-width:768px) { .kanban-board { grid-template-columns:repeat(2,1fr); } }
@media (max-width:480px) { .kanban-board { grid-template-columns:1fr; } }
`;
