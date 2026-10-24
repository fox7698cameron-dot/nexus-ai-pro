/**
 * ProjectTracker.jsx
 * Created: 2026-10-24
 * Real-time project tracking: coding, game dev, AR/VR/3D.
 * Connectors for Unreal/Epic, Sony, Microsoft, Ubisoft + achievement tracking.
 */

import React, { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPES = [
  { id: 'coding',   label: 'Coding',    icon: '💻', color: '#3b82f6' },
  { id: 'game',     label: 'Game Dev',  icon: '🎮', color: '#8b5cf6' },
  { id: 'ar_vr',   label: 'AR/VR',     icon: '🥽', color: '#06b6d4' },
  { id: '3d',       label: '3D',        icon: '🧊', color: '#10b981' },
  { id: 'app',      label: 'App Dev',   icon: '📱', color: '#f59e0b' },
];

const PLATFORMS_GAME = [
  { id: 'unreal',     name: 'Unreal Engine',  icon: '🎮', color: '#0ea5e9' },
  { id: 'epic',       name: 'Epic Games',     icon: '🏰', color: '#2563eb' },
  { id: 'sony',       name: 'Sony / PS',      icon: '🎯', color: '#003087' },
  { id: 'microsoft',  name: 'Xbox / MS',      icon: '🟩', color: '#107c10' },
  { id: 'ubisoft',    name: 'Ubisoft Connect', icon: '🔷', color: '#0070cc' },
];

const STATUS_COLORS = { active: '#4ade80', paused: '#eab308', completed: '#818cf8', archived: '#6b7280' };

function ProgressBar({ value, color = '#3b82f6' }) {
  return (
    <div style={{ background: '#1f2937', borderRadius: 4, height: 8, overflow: 'hidden', marginTop: 6 }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: '100%',
        background: color,
        borderRadius: 4,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

function AchievementBadge({ ach }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: ach.unlocked ? '#fbbf2422' : '#1f293780',
      border: `1px solid ${ach.unlocked ? '#fbbf24' : '#374151'}`,
      borderRadius: 8,
      padding: '6px 10px',
      opacity: ach.unlocked ? 1 : 0.5,
    }}>
      <span style={{ fontSize: 18 }}>{ach.icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: ach.unlocked ? '#fbbf24' : '#9ca3af' }}>{ach.name}</div>
        <div style={{ fontSize: 10, color: '#6b7280' }}>{ach.description}</div>
      </div>
      {ach.unlocked && <span style={{ fontSize: 9, color: '#fbbf24', marginLeft: 'auto' }}>✓</span>}
    </div>
  );
}

function ConnectorBadge({ connector, connected, onConnect }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: connected ? connector.color + '22' : '#1f2937',
      border: `1px solid ${connected ? connector.color : '#374151'}`,
      borderRadius: 8,
      padding: '8px 12px',
      cursor: 'pointer',
    }} onClick={onConnect}>
      <span style={{ fontSize: 18 }}>{connector.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: connected ? connector.color : '#9ca3af' }}>{connector.name}</div>
        <div style={{ fontSize: 10, color: '#6b7280' }}>{connected ? 'Connected' : 'Click to connect'}</div>
      </div>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: connected ? '#4ade80' : '#6b7280',
      }} />
    </div>
  );
}

function ProjectCard({ project, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  const statusColor = STATUS_COLORS[project.status] || '#6b7280';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${typeInfo.color}44`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
        <span style={{ fontSize: 22 }}>{typeInfo.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{project.name}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {typeInfo.label} · {project.language || ''} · Updated {new Date(project.updatedAt).toLocaleDateString()}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1,
          background: statusColor + '22', color: statusColor,
          border: `1px solid ${statusColor}44`,
          borderRadius: 6, padding: '2px 8px',
        }}>
          {project.status.toUpperCase()}
        </span>
        <span style={{ color: '#6b7280', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={typeInfo.color} />
      </div>

      {expanded && (
        <div style={{ marginTop: 16 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { label: 'Commits', value: project.commits || 0, icon: '📝' },
              { label: 'Issues', value: project.issues || 0, icon: '🐛' },
              { label: 'PRs', value: project.prs || 0, icon: '🔀' },
              { label: 'Hours', value: project.hours || 0, icon: '⏱' },
              { label: 'Build', value: project.buildStatus || 'unknown', icon: '🔨' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px', minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 14 }}>{s.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Game platform connectors */}
          {(project.type === 'game' || project.type === 'ar_vr') && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 8 }}>Platform Connectors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PLATFORMS_GAME.map(c => (
                  <ConnectorBadge
                    key={c.id}
                    connector={c}
                    connected={project.connectors?.includes(c.id)}
                    onConnect={() => onUpdate(project.id, {
                      connectors: project.connectors?.includes(c.id)
                        ? project.connectors.filter(x => x !== c.id)
                        : [...(project.connectors || []), c.id],
                    })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {project.achievements?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 8 }}>Achievements</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {project.achievements.map((a, i) => <AchievementBadge key={i} ach={a} />)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {['active', 'paused', 'completed'].map(s => (
              <button
                key={s}
                onClick={() => onUpdate(project.id, { status: s, updatedAt: Date.now() })}
                style={{
                  background: project.status === s ? STATUS_COLORS[s] + '33' : 'transparent',
                  border: `1px solid ${project.status === s ? STATUS_COLORS[s] : '#374151'}`,
                  color: project.status === s ? STATUS_COLORS[s] : '#6b7280',
                  borderRadius: 6,
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => onDelete(project.id)}
              style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #4b1818', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SAMPLE_ACHIEVEMENTS = [
  { icon: '🏆', name: 'First Commit', description: 'Made your first commit', unlocked: true },
  { icon: '🔥', name: 'On Fire', description: '7-day commit streak', unlocked: true },
  { icon: '🌟', name: 'Milestone', description: 'Reached 50% completion', unlocked: false },
  { icon: '🚀', name: 'Launched', description: 'Published to production', unlocked: false },
];

function generateProject(type, idx) {
  const typeInfo = PROJECT_TYPES.find(t => t.id === type) || PROJECT_TYPES[0];
  const names = {
    coding: ['Nexus API v3', 'Auth Microservice', 'Data Pipeline', 'CLI Toolkit'],
    game: ['Shadow Realm RPG', 'Space Racer 2', 'Dungeon Crawler X'],
    ar_vr: ['VR Training Sim', 'AR Wayfinder', 'Mixed Reality Studio'],
    '3d': ['Arch Visualizer', '3D Product Viewer', 'CGI Short Film'],
    app: ['iOS Companion', 'Android Tracker', 'Desktop Dashboard'],
  };
  const langs = {
    coding: ['TypeScript', 'Python', 'Go', 'Rust'],
    game: ['C++', 'C#', 'Blueprint'],
    ar_vr: ['C++', 'Swift', 'Kotlin'],
    '3d': ['C++', 'Python', 'MEL'],
    app: ['Swift', 'Kotlin', 'Dart'],
  };
  const nameArr = names[type] || names.coding;
  const langArr = langs[type] || langs.coding;
  return {
    id: `proj-${type}-${idx}`,
    name: nameArr[idx % nameArr.length],
    type,
    language: langArr[idx % langArr.length],
    status: ['active', 'active', 'paused', 'completed'][idx % 4],
    progress: Math.floor(Math.random() * 80) + 10,
    commits: Math.floor(Math.random() * 300) + 10,
    issues: Math.floor(Math.random() * 20),
    prs: Math.floor(Math.random() * 15),
    hours: Math.floor(Math.random() * 200) + 10,
    buildStatus: ['passing', 'failing', 'passing', 'passing'][idx % 4],
    connectors: type === 'game' ? ['unreal'] : [],
    achievements: SAMPLE_ACHIEVEMENTS.map(a => ({ ...a, unlocked: Math.random() > 0.4 })),
    createdAt: Date.now() - Math.random() * 90 * 86400000,
    updatedAt: Date.now() - Math.random() * 3 * 86400000,
  };
}

const INITIAL_PROJECTS = [
  ...PROJECT_TYPES.flatMap((t, ti) =>
    Array.from({ length: 2 }, (_, i) => generateProject(t.id, ti * 2 + i))
  ),
];

export default function ProjectTracker() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [filterType, setFilterType] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', type: 'coding', language: '' });

  const updateProject = useCallback((id, changes) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  }, []);

  const deleteProject = useCallback((id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const addProject = () => {
    if (!newProject.name.trim()) return;
    const p = {
      ...generateProject(newProject.type, projects.length),
      id: `proj-${Date.now()}`,
      name: newProject.name.trim(),
      language: newProject.language || '',
      status: 'active',
      progress: 0,
      commits: 0,
      issues: 0,
      prs: 0,
      hours: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects(prev => [p, ...prev]);
    setNewProject({ name: '', type: 'coding', language: '' });
    setShowNewForm(false);
  };

  const visible = projects.filter(p => {
    if (filterType && p.type !== filterType) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  // Aggregate stats
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalHours: projects.reduce((s, p) => s + (p.hours || 0), 0),
  };

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📂 Project Tracker</h2>
        <button
          onClick={() => setShowNewForm(v => !v)}
          style={{ background: '#3b82f622', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, icon: '📁' },
          { label: 'Active', value: stats.active, icon: '▶' },
          { label: 'Completed', value: stats.completed, icon: '✓' },
          { label: 'Total Hours', value: stats.totalHours, icon: '⏱' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 16px', minWidth: 100 }}>
            <div style={{ fontSize: 16 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* New project form */}
      {showNewForm && (
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>New Project</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              placeholder="Project name"
              value={newProject.name}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              style={{ flex: 2, minWidth: 160, background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
            />
            <select
              value={newProject.type}
              onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
              style={{ background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
            >
              {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <input
              placeholder="Language (optional)"
              value={newProject.language}
              onChange={e => setNewProject(p => ({ ...p, language: e.target.value }))}
              style={{ flex: 1, minWidth: 120, background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
            />
            <button onClick={addProject} style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Create</button>
            <button onClick={() => setShowNewForm(false)} style={{ background: 'transparent', border: '1px solid #374151', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => { setFilterType(null); setFilterStatus(null); }} style={{ background: !filterType && !filterStatus ? '#ffffff22' : 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>All</button>
        {PROJECT_TYPES.map(t => (
          <button key={t.id} onClick={() => setFilterType(prev => prev === t.id ? null : t.id)}
            style={{ background: filterType === t.id ? t.color + '33' : 'transparent', border: `1px solid ${filterType === t.id ? t.color : '#444'}`, color: filterType === t.id ? t.color : '#ccc', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>
            {t.icon} {t.label}
          </button>
        ))}
        <div style={{ width: 1, background: '#374151', margin: '0 4px' }} />
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <button key={s} onClick={() => setFilterStatus(prev => prev === s ? null : s)}
            style={{ background: filterStatus === s ? c + '33' : 'transparent', border: `1px solid ${filterStatus === s ? c : '#444'}`, color: filterStatus === s ? c : '#ccc', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12, textTransform: 'capitalize' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Project list */}
      {visible.length === 0
        ? <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>No projects match the current filter.</div>
        : visible.map(p => (
          <ProjectCard key={p.id} project={p} onUpdate={updateProject} onDelete={deleteProject} />
        ))}
    </div>
  );
}
