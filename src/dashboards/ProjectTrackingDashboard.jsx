// src/dashboards/ProjectTrackingDashboard.jsx
// 2026-06-06 | Real-time project tracking: coding, game, AR/VR, 3D
// Connectors: Unreal/Epic, Sony PSN, Xbox, Ubisoft, Steam

import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../auth/AuthService.js';

const PROJECT_TYPES = [
  { id: 'all', label: 'All', icon: '📁' },
  { id: 'coding', label: 'Coding', icon: '💻' },
  { id: 'game', label: 'Game Dev', icon: '🎮' },
  { id: 'ar_vr', label: 'AR/VR', icon: '🥽' },
  { id: '3d', label: '3D Art', icon: '🎨' },
  { id: 'unreal', label: 'Unreal', icon: '⚡' },
  { id: 'unity', label: 'Unity', icon: '🔷' }
];

const GAME_SERVICES = [
  { id: 'epic', label: 'Epic Games', icon: '⚡', color: '#0073e6' },
  { id: 'playstation', label: 'PlayStation', icon: '🎮', color: '#003087' },
  { id: 'xbox', label: 'Xbox', icon: '🟢', color: '#107C10' },
  { id: 'ubisoft', label: 'Ubisoft Connect', icon: '👾', color: '#0078d4' },
  { id: 'steam', label: 'Steam', icon: '🌊', color: '#1b2838' }
];

const STATUS_COLORS = { active: '#22c55e', paused: '#f59e0b', completed: '#818cf8', archived: '#555' };
const BUILD_COLORS = { success: '#22c55e', failed: '#ef4444', building: '#f59e0b', unknown: '#555' };

function ProgressBar({ value, color = '#818cf8' }) {
  return (
    <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
    </div>
  );
}

function ProjectCard({ project, onSelect, onDelete }) {
  return (
    <div onClick={() => onSelect(project)}
      style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', cursor: 'pointer', transition: 'border-color 0.2s', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <p style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: '600' }}>{project.name}</p>
          <p style={{ margin: '2px 0 0', color: '#666', fontSize: '12px' }}>{project.type} · {project.engine || 'No engine'}</p>
        </div>
        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: STATUS_COLORS[project.status] + '22', color: STATUS_COLORS[project.status] }}>
          {project.status?.toUpperCase()}
        </span>
      </div>
      <ProgressBar value={project.progress} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '11px', color: '#666' }}>{project.progress}% complete</span>
        <span style={{ fontSize: '11px', color: BUILD_COLORS[project.buildStatus] }}>⚙ {project.buildStatus}</span>
      </div>
      {project.milestones?.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#555' }}>
          {project.milestones.filter(m => m.completed).length}/{project.milestones.length} milestones
        </p>
      )}
      <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '11px', color: '#555' }}>
        <span>📝 {project.commits || 0} commits</span>
        <span>📄 {(project.linesOfCode || 0).toLocaleString()} lines</span>
      </div>
    </div>
  );
}

function NewProjectModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'coding', engine: '', description: '', platform: [] });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputStyle = { width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', marginBottom: '14px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '400px', maxWidth: '95vw' }}>
        <h3 style={{ color: '#fff', margin: '0 0 20px' }}>New Project</h3>
        <input style={inputStyle} placeholder="Project Name *" value={form.name} onChange={set('name')} />
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.type} onChange={set('type')}>
          {PROJECT_TYPES.filter(t => t.id !== 'all').map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <input style={inputStyle} placeholder="Engine (Unity, Unreal, etc.)" value={form.engine} onChange={set('engine')} />
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} placeholder="Description" value={form.description} onChange={set('description')} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name}
            style={{ flex: 1, padding: '10px', background: '#818cf8', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectorPanel({ project, onConnect }) {
  return (
    <div style={{ marginTop: '16px' }}>
      <p style={{ color: '#888', fontSize: '12px', margin: '0 0 10px' }}>Game Platform Connectors</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {GAME_SERVICES.map(svc => {
          const isConnected = project?.connectors?.[svc.id]?.connected;
          return (
            <button key={svc.id} onClick={() => onConnect(svc.id)}
              style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${isConnected ? svc.color : '#333'}`, background: isConnected ? svc.color + '33' : '#1a1a1a', color: isConnected ? '#fff' : '#888', cursor: 'pointer', fontSize: '12px' }}>
              {svc.icon} {svc.label} {isConnected ? '✓' : '+'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProjectTrackingDashboard({ socket }) {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [projRes, statsRes] = await Promise.all([
      authFetch('/api/projects'),
      authFetch('/api/projects/stats/summary')
    ]);
    if (projRes.ok) setProjects((await projRes.json()).projects || []);
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time build status updates via Socket.io
  useEffect(() => {
    if (!socket) return;
    socket.on('project:build_update', ({ projectId, buildStatus }) => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, buildStatus } : p));
    });
    return () => socket.off('project:build_update');
  }, [socket]);

  const createProject = async (form) => {
    const res = await authFetch('/api/projects', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) {
      const project = await res.json();
      setProjects(prev => [...prev, project]);
      setShowNew(false);
    }
  };

  const updateProject = async (id, updates) => {
    const res = await authFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (res.ok) {
      const updated = await res.json();
      setProjects(prev => prev.map(p => p.id === id ? updated : p));
      setSelected(updated);
    }
  };

  const connectService = async (projectId, service) => {
    const accountId = prompt(`Enter your ${service} account ID:`);
    if (!accountId) return;
    const res = await authFetch(`/api/projects/${projectId}/connect/${service}`, {
      method: 'POST',
      body: JSON.stringify({ accountId })
    });
    if (res.ok) load();
  };

  const filtered = filterType === 'all' ? projects : projects.filter(p => p.type === filterType);

  if (loading) return <div style={{ padding: '24px', color: '#666' }}>Loading projects…</div>;

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'system-ui, -apple-system', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>🗂️ Project Tracker</h2>
        <button onClick={() => setShowNew(true)}
          style={{ padding: '8px 20px', background: '#818cf8', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          + New Project
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total', value: stats.total, icon: '📁' },
            { label: 'Active', value: stats.active, icon: '🟢' },
            { label: 'Completed', value: stats.completed, icon: '✅' },
            { label: 'Commits', value: stats.totalCommits, icon: '📝' },
            { label: 'Lines', value: (stats.totalLinesOfCode || 0).toLocaleString(), icon: '📄' },
            { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: '📈' }
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: '18px' }}>{s.icon}</p>
              <p style={{ margin: '0 0 2px', color: '#fff', fontSize: '18px', fontWeight: '700' }}>{s.value}</p>
              <p style={{ margin: 0, color: '#666', fontSize: '11px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {PROJECT_TYPES.map(t => (
          <button key={t.id} onClick={() => setFilterType(t.id)}
            style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${filterType === t.id ? '#818cf8' : '#333'}`, background: filterType === t.id ? '#818cf822' : '#111', color: filterType === t.id ? '#818cf8' : '#aaa', cursor: 'pointer', fontSize: '12px' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Project detail panel */}
      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} style={{ padding: '6px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#aaa', cursor: 'pointer', fontSize: '12px', marginBottom: '16px' }}>
            ← Back
          </button>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '20px' }}>{selected.name}</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>{selected.type} · {selected.engine || 'No engine'} · {selected.description}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['active', 'paused', 'completed'].map(s => (
                  <button key={s} onClick={() => updateProject(selected.id, { status: s })}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${selected.status === s ? STATUS_COLORS[s] : '#333'}`, background: selected.status === s ? STATUS_COLORS[s] + '22' : '#1a1a1a', color: selected.status === s ? STATUS_COLORS[s] : '#666', cursor: 'pointer', fontSize: '11px' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#aaa', fontSize: '12px' }}>Progress</span>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>{selected.progress}%</span>
              </div>
              <ProgressBar value={selected.progress} color="#818cf8" />
            </div>

            {/* Milestones */}
            {selected.milestones?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#888', fontSize: '12px', margin: '0 0 10px' }}>Milestones</p>
                {selected.milestones.map(ms => (
                  <div key={ms.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <span style={{ fontSize: '14px' }}>{ms.completed ? '✅' : '⬜'}</span>
                    <span style={{ flex: 1, color: ms.completed ? '#555' : '#fff', fontSize: '13px', textDecoration: ms.completed ? 'line-through' : 'none' }}>{ms.name || ms.title}</span>
                    {ms.completedAt && <span style={{ fontSize: '11px', color: '#555' }}>{new Date(ms.completedAt).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
            )}

            <ConnectorPanel project={selected} onConnect={svc => connectService(selected.id, svc)} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: '#444' }}>
              <p style={{ fontSize: '32px', margin: '0 0 8px' }}>📁</p>
              <p>No projects yet. Create your first one!</p>
            </div>
          ) : (
            filtered.map(p => <ProjectCard key={p.id} project={p} onSelect={setSelected} />)
          )}
        </div>
      )}

      {showNew && <NewProjectModal onSave={createProject} onClose={() => setShowNew(false)} />}
    </div>
  );
}
