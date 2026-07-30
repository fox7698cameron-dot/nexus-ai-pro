// src/dashboards/ProjectTracker.jsx
// Created: 2026-07-30
// Real-time project tracking: coding, game dev, AR/VR/3D with engine connectors
// and achievement/progress tracking

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api/projects'
  : 'http://localhost:3001/api/projects';

const PROJECT_TYPES = [
  { id: 'coding',  label: 'Coding',        icon: '💻', color: '#6366f1' },
  { id: 'game',    label: 'Game Dev',       icon: '🎮', color: '#f97316' },
  { id: 'ar',      label: 'AR',             icon: '📱', color: '#22c55e' },
  { id: 'vr',      label: 'VR',             icon: '🥽', color: '#a855f7' },
  { id: 'xr',      label: 'Mixed Reality',  icon: '🌐', color: '#0ea5e9' },
  { id: '3d',      label: '3D Design',      icon: '🎨', color: '#f59e0b' },
  { id: 'mobile',  label: 'Mobile',         icon: '📲', color: '#ec4899' },
  { id: 'web',     label: 'Web',            icon: '🌍', color: '#14b8a6' },
  { id: 'desktop', label: 'Desktop',        icon: '🖥️', color: '#84cc16' },
  { id: 'engine',  label: 'Game Engine',    icon: '⚙️', color: '#ef4444' },
  { id: 'plugin',  label: 'Plugin',         icon: '🔌', color: '#8b5cf6' }
];

const GAME_PLATFORMS = [
  { id: 'steam',   name: 'Steam',         icon: '🎮' },
  { id: 'epic',    name: 'Epic Games',    icon: '🎯' },
  { id: 'psn',     name: 'PlayStation',   icon: '🕹️' },
  { id: 'xbox',    name: 'Xbox',          icon: '🟩' },
  { id: 'ubisoft', name: 'Ubisoft',       icon: '🎲' },
  { id: 'mobile',  name: 'Mobile',        icon: '📲' }
];

const ENGINES = [
  { id: 'unreal', name: 'Unreal Engine 5', icon: '⚡' },
  { id: 'unity',  name: 'Unity 6',         icon: '🔵' },
  { id: 'godot',  name: 'Godot 4',         icon: '🤖' },
  { id: 'other',  name: 'Other',           icon: '🔧' }
];

function ProgressBar({ value, color = '#6366f1', height = 6 }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: height, height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(value, 100)}%`,
        background: color, borderRadius: height,
        transition: 'width 0.5s ease'
      }} />
    </div>
  );
}

function ProjectCard({ project, onSelect, onDelete }) {
  const type = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  const statusColors = { active: '#22c55e', completed: '#6366f1', paused: '#f59e0b', archived: '#888' };
  const statusColor = statusColors[project.status] || '#888';

  return (
    <div onClick={() => onSelect(project)} style={{
      background: 'var(--card-bg, rgba(255,255,255,0.04))',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '18px 20px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative'
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = type.color + '66'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
    >
      <button onClick={e => { e.stopPropagation(); onDelete(project.id); }} style={{
        position: 'absolute', top: 10, right: 10,
        background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16
      }}>×</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>{type.icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{project.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>
            {type.label}
            {project.engine ? ` · ${project.engine}` : ''}
          </div>
        </div>
      </div>

      <ProgressBar value={project.progress} color={type.color} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted, #888)' }}>{project.progress}% complete</span>
        <span style={{ color: statusColor }}>{project.status}</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {project.bugsOpen > 0 && (
          <span style={{ fontSize: 11, color: '#ef4444' }}>🐛 {project.bugsOpen} open bugs</span>
        )}
        {project.testCoverage > 0 && (
          <span style={{ fontSize: 11, color: '#22c55e' }}>✅ {project.testCoverage}% coverage</span>
        )}
        {project.buildStatus && project.buildStatus !== 'unknown' && (
          <span style={{ fontSize: 11, color: project.buildStatus === 'passing' ? '#22c55e' : '#ef4444' }}>
            {project.buildStatus === 'passing' ? '🟢' : '🔴'} {project.buildStatus}
          </span>
        )}
      </div>
    </div>
  );
}

function AchievementBadge({ achievement }) {
  return (
    <div style={{
      background: achievement.unlocked ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${achievement.unlocked ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      opacity: achievement.unlocked ? 1 : 0.5
    }}>
      <span style={{ fontSize: 22 }}>{achievement.unlocked ? achievement.icon : '🔒'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{achievement.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>{achievement.description}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>+{achievement.points}</div>
        {achievement.unlocked && (
          <div style={{ fontSize: 10, color: '#22c55e' }}>Unlocked</div>
        )}
      </div>
    </div>
  );
}

function NewProjectForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: '', type: 'coding', engine: '', description: '', targetPlatforms: [] });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--card-bg, rgba(255,255,255,0.04))',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14, padding: 24
    }}>
      <h3 style={{ margin: '0 0 20px' }}>New Project</h3>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted, #888)', marginBottom: 6 }}>
            Project Name *
          </label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="My Awesome Project" required
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)', color: 'inherit', fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted, #888)', marginBottom: 6 }}>
            Project Type *
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PROJECT_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => set('type', t.id)} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: form.type === t.id ? t.color : 'rgba(255,255,255,0.06)',
                color: 'inherit', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {(form.type === 'game' || form.type === 'ar' || form.type === 'vr' || form.type === 'xr') && (
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted, #888)', marginBottom: 6 }}>
              Game Engine
            </label>
            <select value={form.engine} onChange={e => set('engine', e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)', color: 'inherit', fontSize: 14, width: '100%' }}>
              <option value="">Select engine...</option>
              {ENGINES.map(eng => (
                <option key={eng.id} value={eng.id}>{eng.icon} {eng.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted, #888)', marginBottom: 6 }}>
            Description
          </label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="Project description..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)', color: 'inherit', fontSize: 14,
              resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" style={{
            padding: '10px 24px', background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600
          }}>Create Project</button>
          <button type="button" onClick={onCancel} style={{
            padding: '10px 20px', background: 'transparent', color: 'inherit',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 14
          }}>Cancel</button>
        </div>
      </div>
    </form>
  );
}

export default function ProjectTracker({ token }) {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json'
  };

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
      // Mock demo data
      setProjects([
        { id: '1', name: 'Nexus AI Pro', type: 'web', status: 'active', progress: 78, bugsOpen: 3, testCoverage: 72, buildStatus: 'passing' },
        { id: '2', name: 'Shadow Realm', type: 'game', engine: 'unreal', status: 'active', progress: 34, bugsOpen: 7, testCoverage: 45, buildStatus: 'failing' },
        { id: '3', name: 'AR Navigator', type: 'ar', engine: 'unity', status: 'paused', progress: 56, bugsOpen: 2, testCoverage: 60, buildStatus: 'passing' }
      ]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchAchievements = useCallback(async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${API_BASE}/achievements/${selected.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements || []);
      }
    } catch {
      setAchievements([
        { id: '1', title: 'First Commit', description: 'Made your first commit', icon: '🎉', points: 10, unlocked: true },
        { id: '2', title: 'Bug Hunter', description: 'Fixed 10 bugs', icon: '🐛', points: 50, unlocked: true },
        { id: '3', title: 'Test Champion', description: '80%+ test coverage', icon: '✅', points: 100, unlocked: false },
        { id: '4', title: 'Ship It!', description: 'First production deploy', icon: '🚀', points: 200, unlocked: false }
      ]);
    }
  }, [selected, token]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  const handleCreate = async (form) => {
    try {
      const res = await fetch(`${API_BASE}`, {
        method: 'POST', headers,
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const project = await res.json();
        setProjects(prev => [project, ...prev]);
        setShowNewForm(false);
      }
    } catch {
      // Add locally as fallback
      const mock = { id: Date.now().toString(), ...form, status: 'active', progress: 0, bugsOpen: 0, testCoverage: 0 };
      setProjects(prev => [mock, ...prev]);
      setShowNewForm(false);
    }
  };

  const handleDelete = async (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
    try {
      await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers });
    } catch { /* already removed from UI */ }
  };

  const filteredProjects = filterType === 'all'
    ? projects
    : projects.filter(p => p.type === filterType);

  const summary = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    avgProgress: projects.length
      ? Math.round(projects.reduce((a, p) => a + (p.progress || 0), 0) / projects.length)
      : 0
  };

  return (
    <div style={{
      padding: 24,
      color: 'var(--text, #f1f5f9)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 1400,
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📁 Project Tracker</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #888)', fontSize: 14 }}>
            {summary.total} projects · {summary.active} active · {summary.avgProgress}% avg progress
          </p>
        </div>
        <button onClick={() => setShowNewForm(true)} style={{
          padding: '8px 20px', background: '#6366f1', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600
        }}>+ New Project</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['projects', 'achievements', 'connectors'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '7px 18px', background: 'none', border: 'none',
            borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === tab ? '#6366f1' : 'var(--text-muted, #888)',
            cursor: 'pointer', fontSize: 14, textTransform: 'capitalize',
            fontWeight: activeTab === tab ? 600 : 400
          }}>
            {tab === 'projects' ? '📁 Projects' : tab === 'achievements' ? '🏆 Achievements' : '🔌 Connectors'}
          </button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <>
          {/* Type Filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <button onClick={() => setFilterType('all')} style={{
              padding: '5px 14px', borderRadius: 8, border: 'none',
              background: filterType === 'all' ? '#6366f1' : 'rgba(255,255,255,0.06)',
              color: 'inherit', cursor: 'pointer', fontSize: 12
            }}>All ({projects.length})</button>
            {PROJECT_TYPES.map(t => {
              const count = projects.filter(p => p.type === t.id).length;
              if (count === 0) return null;
              return (
                <button key={t.id} onClick={() => setFilterType(t.id)} style={{
                  padding: '5px 12px', borderRadius: 8, border: 'none',
                  background: filterType === t.id ? t.color : 'rgba(255,255,255,0.06)',
                  color: 'inherit', cursor: 'pointer', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {t.icon} {t.label} ({count})
                </button>
              );
            })}
          </div>

          {showNewForm && (
            <div style={{ marginBottom: 20 }}>
              <NewProjectForm onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {filteredProjects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={setSelected} onDelete={handleDelete} />
            ))}
            {filteredProjects.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-muted, #888)' }}>
                No projects yet. Click "New Project" to get started.
              </div>
            )}
          </div>

          {selected && (
            <div style={{
              marginTop: 24, background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0 }}>{selected.name}</h3>
                <button onClick={() => setSelected(null)} style={{
                  background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20
                }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 16 }}>
                {[
                  { label: 'Progress', value: `${selected.progress}%` },
                  { label: 'Status', value: selected.status },
                  { label: 'Open Bugs', value: selected.bugsOpen || 0 },
                  { label: 'Test Coverage', value: `${selected.testCoverage || 0}%` },
                  { label: 'Build Status', value: selected.buildStatus || 'unknown' },
                  { label: 'Type', value: selected.type }
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px'
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'achievements' && (
        <div>
          {selected ? (
            <div>
              <h3 style={{ margin: '0 0 16px' }}>Achievements for {selected.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
              Select a project from the Projects tab to view achievements.
            </div>
          )}
        </div>
      )}

      {activeTab === 'connectors' && (
        <div>
          <h3 style={{ margin: '0 0 16px' }}>Game Platform Connectors</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {GAME_PLATFORMS.map(p => (
              <div key={p.id} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>{p.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#f59e0b' }}>⚠ Configure API key in .env</div>
                  </div>
                </div>
                <button style={{
                  width: '100%', padding: '7px 0', background: 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6,
                  color: '#a5b4fc', cursor: 'pointer', fontSize: 12
                }}>Configure Connector</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: 13, color: '#fbbf24' }}>
            💡 Set platform API keys in your <code style={{ fontFamily: 'monospace' }}>.env</code> file:{' '}
            STEAM_WEB_API_KEY, EOS_CLIENT_ID, PSN_CLIENT_ID, XBOX_CLIENT_ID, UBISOFT_APP_ID
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #888)' }}>
          Loading projects...
        </div>
      )}
    </div>
  );
}
