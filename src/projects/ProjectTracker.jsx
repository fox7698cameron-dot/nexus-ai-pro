// src/projects/ProjectTracker.jsx
// Nexus AI Pro - Project Tracking Dashboard
// Covers: coding, game dev, AR/VR/3D, achievements, connectors (Unreal/Epic/Sony/MS/Ubisoft)
// Real-time metrics; responsive desktop/mobile/tablet
// Date: 2026-08-01

import React, { useState, useEffect, useCallback } from 'react';

const API = '/api';

const TYPE_META = {
  coding:   { label: 'Coding',      icon: '💻', color: '#3b82f6' },
  game_dev: { label: 'Game Dev',    icon: '🎮', color: '#a855f7' },
  ar_vr_3d: { label: 'AR/VR/3D',   icon: '🥽', color: '#06b6d4' },
  app_dev:  { label: 'App Dev',     icon: '📱', color: '#22c55e' },
  web:      { label: 'Web',         icon: '🌐', color: '#f59e0b' }
};

const STATUS_META = {
  active:    { label: 'Active',    color: '#22c55e' },
  paused:    { label: 'Paused',    color: '#f59e0b' },
  completed: { label: 'Completed', color: '#3b82f6' },
  archived:  { label: 'Archived',  color: '#64748b' }
};

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

function ProgressRing({ value, size = 48, color = '#6366f1' }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s' }} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill="#fff" fontSize={11}
        style={{ transform: `rotate(90deg) translateX(-${size/2}px) translateY(-${size/2}px)` }}
        transform={`rotate(90, ${size/2}, ${size/2})`}>
        {value}%
      </text>
    </svg>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const meta = TYPE_META[project.type] || TYPE_META.coding;
  const status = STATUS_META[project.status] || STATUS_META.active;
  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        background: selected ? '#1e293b' : '#111827',
        border: `2px solid ${selected ? meta.color : '#1e293b'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer',
        transition: 'all 0.2s', marginBottom: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{meta.icon}</span>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{project.name}</span>
        </div>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 6,
          background: `${status.color}22`, color: status.color, fontWeight: 700
        }}>
          {status.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ProgressRing value={project.progress || 0} color={meta.color} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#64748b', fontSize: 12 }}>{meta.label}</div>
          {project.engine && (
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Engine: {project.engine}</div>
          )}
          {project.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {project.tags.map(t => (
                <span key={t} style={{
                  background: '#0f172a', borderRadius: 4, padding: '1px 6px',
                  fontSize: 10, color: '#64748b', border: '1px solid #1e293b'
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskItem({ task }) {
  const colors = { todo: '#64748b', in_progress: '#f59e0b', done: '#22c55e' };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
      borderBottom: '1px solid #1e293b'
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: colors[task.status] || '#64748b'
      }} />
      <span style={{ flex: 1, color: task.status === 'done' ? '#475569' : '#d1d5db', fontSize: 13,
        textDecoration: task.status === 'done' ? 'line-through' : 'none'
      }}>
        {task.title}
      </span>
      <span style={{
        fontSize: 10, padding: '1px 6px', borderRadius: 4,
        background: `${PRIORITY_COLORS[task.priority] || '#475569'}22`,
        color: PRIORITY_COLORS[task.priority] || '#475569'
      }}>
        {task.priority}
      </span>
    </div>
  );
}

function ConnectorBadge({ name, icon, connected, onConnect }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      background: '#0f172a', borderRadius: 8, border: `1px solid ${connected ? '#22c55e44' : '#1e293b'}`,
      marginBottom: 6
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ flex: 1, color: '#d1d5db', fontSize: 13 }}>{name}</span>
      <button
        onClick={onConnect}
        style={{
          background: connected ? '#0d2e1a' : '#1e293b',
          border: `1px solid ${connected ? '#22c55e' : '#334155'}`,
          borderRadius: 6, padding: '3px 10px', color: connected ? '#4ade80' : '#94a3b8',
          fontSize: 11, cursor: 'pointer', fontWeight: 600
        }}
      >
        {connected ? '✓ Connected' : 'Connect'}
      </button>
    </div>
  );
}

function NewProjectForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('coding');
  const [description, setDescription] = useState('');
  const [engine, setEngine] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), type, description, engine: engine || null, tags: [], platforms: [] });
  };

  const inputStyle = {
    width: '100%', background: '#0f172a', border: '1px solid #1e293b',
    borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13,
    boxSizing: 'border-box', marginBottom: 10
  };

  return (
    <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 16 }}>New Project</h3>
      <input style={inputStyle} placeholder="Project name" value={name} onChange={e => setName(e.target.value)} />
      <select style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
        {Object.entries(TYPE_META).map(([k, v]) => (
          <option key={k} value={k}>{v.icon} {v.label}</option>
        ))}
      </select>
      <input style={inputStyle} placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
      {(type === 'game_dev' || type === 'ar_vr_3d') && (
        <select style={inputStyle} value={engine} onChange={e => setEngine(e.target.value)}>
          <option value="">Select engine…</option>
          <option value="UNREAL">⚡ Unreal Engine</option>
          <option value="UNITY">🔮 Unity</option>
          <option value="GODOT">🤖 Godot</option>
          <option value="CRYENGINE">❄️ CryEngine</option>
          <option value="SOURCE">🔧 Source 2</option>
          <option value="CUSTOM">⚙️ Custom Engine</option>
        </select>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmit} style={{ flex: 1, background: '#6366f1', border: 'none', borderRadius: 8, padding: '10px 0', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          Create Project
        </button>
        <button onClick={onCancel} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ProjectTracker({ token }) {
  const [projects, setProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [connectors, setConnectors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchData = useCallback(async () => {
    try {
      const [projRes, dashRes, connRes] = await Promise.all([
        fetch(`${API}/projects${filterType ? `?type=${filterType}` : ''}`, { headers }),
        fetch(`${API}/projects/dashboard`, { headers }),
        fetch(`${API}/connectors`, { headers })
      ]);
      if (projRes.ok) setProjects((await projRes.json()).projects || []);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (connRes.ok) setConnectors(await connRes.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createProject = async (data) => {
    const res = await fetch(`${API}/projects`, { method: 'POST', headers, body: JSON.stringify(data) });
    if (res.ok) { setShowNew(false); fetchData(); }
  };

  const handleConnectStore = async (projectId, storeKey) => {
    await fetch(`${API}/projects/${projectId}/store/${storeKey}`, { method: 'POST', headers, body: JSON.stringify({}) });
    fetchData();
  };

  const storeConnectors = [
    { key: 'epic', name: 'Epic Games Store', icon: '⚡' },
    { key: 'sony', name: 'PlayStation Network', icon: '🎮' },
    { key: 'microsoft', name: 'Xbox / Microsoft Store', icon: '🟢' },
    { key: 'ubisoft', name: 'Ubisoft Connect', icon: '🔷' },
    { key: 'steam', name: 'Steam', icon: '🎭' }
  ];

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888', background: '#0a0a0f' }}>Loading projects…</div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🛠️ Project Tracker</h1>
        <button
          onClick={() => setShowNew(s => !s)}
          style={{ background: '#6366f1', border: 'none', borderRadius: 8, padding: '10px 18px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
        >
          + New Project
        </button>
      </div>

      {error && (
        <div style={{ background: '#2d0d0d', border: '1px solid #ef4444', borderRadius: 8, padding: 10, marginBottom: 16, color: '#f87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Dashboard KPIs */}
      {dashboard && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: dashboard.totalProjects, icon: '📁' },
            { label: 'Active', value: dashboard.activeProjects, icon: '🟢' },
            { label: 'Completed', value: dashboard.completedProjects, icon: '✅' },
            { label: 'Avg Progress', value: `${dashboard.avgProgress}%`, icon: '📈' }
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              flex: '1 1 100px', background: '#111827', borderRadius: 12,
              padding: '14px 16px', border: '1px solid #1e293b', textAlign: 'center'
            }}>
              <div style={{ fontSize: 20 }}>{icon}</div>
              <div style={{ color: '#4ade80', fontSize: 22, fontWeight: 800 }}>{value}</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Type Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setFilterType('')}
          style={filterBtnStyle(!filterType)}
        >All</button>
        {Object.entries(TYPE_META).map(([k, v]) => (
          <button key={k} onClick={() => setFilterType(k)} style={filterBtnStyle(filterType === k)}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* New Project Form */}
      {showNew && <NewProjectForm onSubmit={createProject} onCancel={() => setShowNew(false)} />}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Project List */}
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          {projects.length === 0 ? (
            <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>
              No projects yet. Create your first one above!
            </div>
          ) : (
            projects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={setSelected} selected={selected?.id === p.id} />
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ background: '#111827', borderRadius: 16, padding: 20, border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{TYPE_META[selected.type]?.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selected.name}</h2>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{TYPE_META[selected.type]?.label}</div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Progress</span>
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{selected.progress}%</span>
                </div>
                <div style={{ background: '#1e293b', borderRadius: 4, height: 6 }}>
                  <div style={{
                    width: `${selected.progress}%`, height: '100%',
                    background: TYPE_META[selected.type]?.color || '#6366f1',
                    borderRadius: 4, transition: 'width 0.5s'
                  }} />
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Lines of Code', val: selected.metrics?.linesOfCode || 0 },
                  { label: 'Commits', val: selected.metrics?.commits || 0 },
                  { label: 'Test Coverage', val: `${selected.metrics?.testCoverage || 0}%` },
                  { label: 'Open Bugs', val: selected.metrics?.bugs?.open || 0 }
                ].map(({ label, val }) => (
                  <div key={label} style={{
                    flex: '1 1 80px', background: '#0f172a', borderRadius: 8,
                    padding: '8px 10px', border: '1px solid #1e293b'
                  }}>
                    <div style={{ color: '#475569', fontSize: 10 }}>{label}</div>
                    <div style={{ color: '#4ade80', fontSize: 16, fontWeight: 700 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* AR/VR specific */}
              {selected.type === 'ar_vr_3d' && selected.metrics?.arVr && (
                <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid #06b6d444' }}>
                  <div style={{ color: '#06b6d4', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🥽 AR/VR Metrics</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { label: 'Target FPS', val: selected.metrics.arVr.targetFramerate },
                      { label: 'Poly Count', val: selected.metrics.arVr.polyCount?.toLocaleString() },
                      { label: 'VRAM (MB)', val: selected.metrics.arVr.vramUsageMb },
                      { label: 'Latency (ms)', val: selected.metrics.arVr.motionToPhotonLatency }
                    ].map(({ label, val }) => (
                      <div key={label} style={{ flex: '1 1 70px', textAlign: 'center' }}>
                        <div style={{ color: '#475569', fontSize: 10 }}>{label}</div>
                        <div style={{ color: '#67e8f9', fontSize: 15, fontWeight: 700 }}>{val || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {selected.tasks?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tasks</div>
                  {selected.tasks.slice(0, 8).map(t => <TaskItem key={t.id} task={t} />)}
                </div>
              )}

              {/* Store / Platform Connectors */}
              {(selected.type === 'game_dev' || selected.type === 'ar_vr_3d') && (
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Platform Connectors</div>
                  {storeConnectors.map(c => {
                    const isConnected = !!selected.connectors?.[`store_${c.key}`]?.connected;
                    return (
                      <ConnectorBadge
                        key={c.key}
                        name={c.name}
                        icon={c.icon}
                        connected={isConnected}
                        onConnect={() => handleConnectStore(selected.id, c.key)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function filterBtnStyle(active) {
  return {
    background: active ? '#6366f1' : '#111827', border: `1px solid ${active ? '#6366f1' : '#1e293b'}`,
    borderRadius: 8, padding: '6px 14px', color: active ? '#fff' : '#64748b',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
    whiteSpace: 'nowrap', transition: 'all 0.15s'
  };
}
