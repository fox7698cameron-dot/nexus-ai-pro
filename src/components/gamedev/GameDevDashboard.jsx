/**
 * src/components/gamedev/GameDevDashboard.jsx
 * Nexus AI Pro — Game Development & Project Tracking Dashboard
 * Labeled: 2026-08-25
 *
 * Real-time project tracking for:
 *   - Coding projects
 *   - Game development (Unreal Engine, Unity, Godot)
 *   - AR/VR/XR projects
 *   - 3D projects
 * Platform connectors: Epic/Unreal, Sony PSN, Xbox Live, Ubisoft Connect, Steam
 * Achievement & game progress tracking
 */

import React, { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPE_ICONS = {
  game_3d:    '🎮',
  game_2d:    '👾',
  ar:         '🥽',
  vr:         '🌐',
  xr:         '✨',
  coding:     '💻',
  app:        '📱',
  web:        '🌍',
  ml_ai:      '🤖',
  blockchain: '⛓️'
};

const PLATFORM_ICONS = {
  unreal:          '⚡',
  epic:            '🎯',
  sony_psn:        '🎮',
  xbox_live:       '🟢',
  ubisoft_connect: '🔷',
  steam:           '🚂',
  itch_io:         '🎪'
};

const STATUS_COLORS = {
  active:   '#16a34a',
  paused:   '#d97706',
  shipped:  '#6366f1',
  archived: '#9ca3af'
};

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('nexus:accessToken');
  const res   = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, color = '#6366f1', label }) {
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ fontWeight: 600 }}>{value}%</span>
        </div>
      )}
      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(value, 100)}%`,
          background: color, borderRadius: 4,
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }) {
  const icon     = PROJECT_TYPE_ICONS[project.type] || '📁';
  const progress = project.progress || 0;

  return (
    <button
      onClick={() => onClick(project)}
      style={{
        background:   'var(--card-bg)',
        border:       '1px solid var(--border)',
        borderRadius: 14, padding: '18px 20px',
        textAlign:    'left', cursor: 'pointer',
        transition:   'border-color 0.15s, transform 0.1s',
        width:        '100%'
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }} aria-hidden="true">{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {project.type?.replace(/_/g, ' ')} · {project.engine}
            </div>
          </div>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: `${STATUS_COLORS[project.status] || '#9ca3af'}20`,
          color: STATUS_COLORS[project.status] || '#9ca3af',
          textTransform: 'capitalize'
        }}>
          {project.status}
        </span>
      </div>

      <ProgressBar value={progress} />

      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>✅ {project.completedTasks || 0}/{project.totalTasks || 0} tasks</span>
        <span>🏁 {project.milestones?.completed || 0}/{project.milestones?.total || 0} milestones</span>
        {(project.openBugs || 0) > 0 && (
          <span style={{ color: '#dc2626' }}>🐛 {project.openBugs} bugs</span>
        )}
      </div>

      {project.linkedPlatforms?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {project.linkedPlatforms.map(p => (
            <span key={p} title={p} style={{ fontSize: 16 }} aria-label={p}>
              {PLATFORM_ICONS[p] || '🔗'}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ── Create project modal ──────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '', type: 'game_3d', engine: 'unreal', description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name required'); return; }
    setLoading(true);
    setError('');
    try {
      const project = await apiFetch('/gamedev/projects', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      onCreate(project);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--input-bg)',
    color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 16, padding: 32,
        width: '100%', maxWidth: 480, border: '1px solid var(--border)'
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>🎮 New Project</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Project Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Game" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
              {Object.entries(PROJECT_TYPE_ICONS).map(([k, v]) => (
                <option key={k} value={k}>{v} {k.replace(/_/g, ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Engine / Framework</label>
            <select value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))} style={inputStyle}>
              {['unreal', 'unity', 'godot', 'custom', 'react', 'flutter', 'swift', 'kotlin'].map(e => (
                <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What are you building?" rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)'
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              padding: '10px 18px', borderRadius: 8, border: 'none',
              background: '#6366f1', color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Project detail panel ──────────────────────────────────────────────────────
function ProjectDetail({ project, onBack, onRefresh }) {
  const [metrics,    setMetrics]    = useState(null);
  const [builds,     setBuilds]     = useState([]);
  const [taskTitle,  setTaskTitle]  = useState('');
  const [buildNotes, setBuildNotes] = useState('');
  const [activeTab,  setActiveTab]  = useState('overview');

  useEffect(() => {
    apiFetch(`/gamedev/projects/${project.id}/metrics`).then(setMetrics).catch(() => {});
    apiFetch(`/gamedev/projects/${project.id}/builds?limit=10`).then(d => setBuilds(d.builds || [])).catch(() => {});
  }, [project.id]);

  async function addTask() {
    if (!taskTitle.trim()) return;
    try {
      await apiFetch(`/gamedev/projects/${project.id}/tasks`, {
        method: 'POST', body: JSON.stringify({ title: taskTitle })
      });
      setTaskTitle('');
      onRefresh();
    } catch {}
  }

  async function recordBuild(status) {
    try {
      await apiFetch(`/gamedev/projects/${project.id}/builds`, {
        method: 'POST', body: JSON.stringify({ status, notes: buildNotes, platform: 'all' })
      });
      setBuildNotes('');
      const d = await apiFetch(`/gamedev/projects/${project.id}/builds?limit=10`);
      setBuilds(d.builds || []);
    } catch {}
  }

  const tabs = ['overview', 'tasks', 'builds', 'platforms'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{
          padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)'
        }}>
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {PROJECT_TYPE_ICONS[project.type]} {project.name}
        </h2>
        <span style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: `${STATUS_COLORS[project.status] || '#9ca3af'}20`,
          color: STATUS_COLORS[project.status] || '#9ca3af', textTransform: 'capitalize'
        }}>
          {project.status}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 14, fontWeight: activeTab === t ? 700 : 500,
            color: activeTab === t ? '#6366f1' : 'var(--text-muted)',
            borderBottom: activeTab === t ? '2px solid #6366f1' : '2px solid transparent',
            textTransform: 'capitalize', marginBottom: -1
          }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Progress',    value: `${metrics.progress || 0}%` },
            { label: 'Total Tasks', value: metrics.totalTasks || 0     },
            { label: 'Done',        value: metrics.completedTasks || 0 },
            { label: 'Open Bugs',   value: metrics.openBugs || 0       },
            { label: 'Milestones',  value: `${metrics.milestones?.completed || 0}/${metrics.milestones?.total || 0}` },
            { label: 'Engine',      value: project.engine || '—'       }
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px'
            }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{item.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
          <div style={{ gridColumn: '1/-1' }}>
            <ProgressBar value={metrics.progress || 0} label="Overall Completion" />
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
              placeholder="New task title…" onKeyDown={e => e.key === 'Enter' && addTask()}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--input-bg)',
                color: 'var(--text-primary)', fontSize: 14
              }} />
            <button onClick={addTask} style={{
              padding: '10px 16px', borderRadius: 8, border: 'none',
              background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600
            }}>
              + Add
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Tasks are managed via the project API. Milestones and detailed task management available through the full project view.
          </p>
        </div>
      )}

      {activeTab === 'builds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={buildNotes} onChange={e => setBuildNotes(e.target.value)}
              placeholder="Build notes…"
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--input-bg)',
                color: 'var(--text-primary)', fontSize: 14
              }} />
            <button onClick={() => recordBuild('success')} style={{
              padding: '10px 14px', borderRadius: 8, border: 'none',
              background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13
            }}>
              ✅ Record Success
            </button>
            <button onClick={() => recordBuild('failed')} style={{
              padding: '10px 14px', borderRadius: 8, border: 'none',
              background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13
            }}>
              ❌ Record Failure
            </button>
          </div>
          {builds.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {builds.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: b.status === 'success' ? '#f0fdf4' : b.status === 'failed' ? '#fef2f2' : '#fffbf0',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 18 }}>{b.status === 'success' ? '✅' : b.status === 'failed' ? '❌' : '⏳'}</span>
                  <span style={{ fontWeight: 600 }}>v{b.version}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b.platform}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No builds recorded yet</p>
          )}
        </div>
      )}

      {activeTab === 'platforms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>Connected Game Platforms</h4>
          {project.linkedPlatforms?.length > 0 ? (
            project.linkedPlatforms.map(lp => (
              <div key={lp.platform} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 8,
                background: 'var(--card-bg)', border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 20 }}>{PLATFORM_ICONS[lp.platform] || '🔗'}</span>
                <div>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {lp.platform.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {lp.displayName} · {lp.status}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              No platforms connected. Link platforms via the API:
              POST /api/gamedev/projects/{project.id}/link
            </p>
          )}
          <div style={{ marginTop: 8 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-muted)' }}>Available Connectors</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(PLATFORM_ICONS).map(([k, v]) => (
                <span key={k} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20,
                  border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)'
                }}>
                  {v} {k.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Achievement wall ──────────────────────────────────────────────────────────
function AchievementWall({ userId }) {
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    apiFetch('/gamedev/achievements').then(d => setAchievements(d.achievements || [])).catch(() => {});
  }, []);

  const rarityColor = {
    common:    '#6b7280',
    rare:      '#3b82f6',
    epic:      '#8b5cf6',
    legendary: '#f59e0b'
  };

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>🏆 Achievements ({achievements.length})</h3>
      {achievements.length > 0 ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {achievements.map(a => (
            <div key={a.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '14px 16px', borderRadius: 12,
              border: `2px solid ${rarityColor[a.rarity] || '#6b7280'}20`,
              background: 'var(--card-bg)', minWidth: 100, maxWidth: 130, textAlign: 'center'
            }}>
              <span style={{ fontSize: 28 }}>{a.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{a.name}</span>
              <span style={{ fontSize: 11, color: rarityColor[a.rarity] || '#6b7280', textTransform: 'capitalize' }}>
                {a.rarity}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{a.xp} XP</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No achievements yet. Start building!</p>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function GameDevDashboard() {
  const [projects,      setProjects]      = useState([]);
  const [selectedProj,  setSelectedProj]  = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [activeSection, setActiveSection] = useState('projects');
  const [filter,        setFilter]        = useState('all');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const [projData] = await Promise.all([
        apiFetch('/gamedev/projects')
      ]);
      // Fetch metrics for each project
      const withMetrics = await Promise.all(
        (projData.projects || []).map(async p => {
          try {
            const m = await apiFetch(`/gamedev/projects/${p.id}/metrics`);
            return { ...p, ...m };
          } catch {
            return p;
          }
        })
      );
      setProjects(withMetrics);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.type === filter || p.status === filter);

  if (selectedProj) {
    return (
      <ProjectDetail
        project={selectedProj}
        onBack={() => setSelectedProj(null)}
        onRefresh={loadProjects}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 4px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🎮 Game Dev Projects</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Real-time tracking for games, AR/VR, 3D & coding projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: '#6366f1', color: '#fff', cursor: 'pointer',
            fontSize: 14, fontWeight: 600
          }}
        >
          + New Project
        </button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {['projects', 'achievements'].map(s => (
          <button key={s} onClick={() => setActiveSection(s)} style={{
            padding: '8px 16px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 14, fontWeight: activeSection === s ? 700 : 500,
            color: activeSection === s ? '#6366f1' : 'var(--text-muted)',
            borderBottom: activeSection === s ? '2px solid #6366f1' : '2px solid transparent',
            textTransform: 'capitalize', marginBottom: -1
          }}>
            {s}
          </button>
        ))}
      </div>

      {activeSection === 'projects' && (
        <>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', 'game_3d', 'game_2d', 'ar', 'vr', 'coding', 'active', 'paused', 'shipped'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: filter === f ? 700 : 500,
                border: filter === f ? '2px solid #6366f1' : '2px solid var(--border)',
                background: filter === f ? '#eef2ff' : 'var(--card-bg)',
                color: filter === f ? '#6366f1' : 'var(--text-muted)',
                cursor: 'pointer', textTransform: 'capitalize'
              }}>
                {PROJECT_TYPE_ICONS[f] || ''} {f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading projects…</div>
          ) : filteredProjects.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filteredProjects.map(p => (
                <ProjectCard key={p.id} project={p} onClick={setSelectedProj} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 40, margin: 0 }} aria-hidden="true">🎮</p>
              <p style={{ margin: '12px 0' }}>No projects yet</p>
              <button onClick={() => setShowCreate(true)} style={{
                padding: '12px 24px', borderRadius: 8, border: 'none',
                background: '#6366f1', color: '#fff', cursor: 'pointer',
                fontSize: 15, fontWeight: 600
              }}>
                Create Your First Project
              </button>
            </div>
          )}
        </>
      )}

      {activeSection === 'achievements' && <AchievementWall />}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={p => { setProjects(prev => [p, ...prev]); }}
        />
      )}
    </div>
  );
}
