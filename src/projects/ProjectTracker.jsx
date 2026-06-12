// src/projects/ProjectTracker.jsx
// 2026-06-12 | Nexus AI Pro — Project Tracker
// Coding · Game Dev · AR/VR/3D — milestones, connectors, achievements, real-time

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ---- type config -----------------------------------------------------

const TYPE_CONFIG = {
  code:   { label: 'Code',     color: '#1f6feb', icon: '💻' },
  game:   { label: 'Game',     color: '#8957e5', icon: '🎮' },
  ar_vr:  { label: 'AR/VR',   color: '#e3b341', icon: '🥽' },
  '3d':   { label: '3D',       color: '#f87171', icon: '📦' },
  plugin: { label: 'Plugin',   color: '#4ade80', icon: '🧩' }
};

const ENGINE_NAMES = {
  unreal: 'Unreal Engine', epic: 'Epic Games', sony: 'PlayStation',
  microsoft: 'Xbox / MSFT', ubisoft: 'Ubisoft Connect'
};

// ---- ProgressBar ----------------------------------------------------

function ProgressBar({ value, color = '#1f6feb' }) {
  return (
    <div style={{ background: '#21262d', borderRadius: 6, height: 8, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${value}%`, background: color, height: '100%', borderRadius: 6, transition: 'width .5s ease' }} />
    </div>
  );
}

// ---- ProjectCard ----------------------------------------------------

function ProjectCard({ project, onSelect, selected }) {
  const cfg = TYPE_CONFIG[project.type] || TYPE_CONFIG.code;
  return (
    <div
      onClick={() => onSelect(project.id)}
      style={{
        background: selected ? `${cfg.color}15` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? cfg.color : '#30363d'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all .2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
          <div style={{ fontSize: 11, color: '#8b949e' }}>{cfg.label} · {project.subtype || ''}</div>
        </div>
        <StatusChip status={project.status} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ProgressBar value={project.progress} color={cfg.color} />
        <span style={{ fontSize: 12, color: cfg.color, fontWeight: 700, minWidth: 36 }}>{project.progress}%</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#8b949e' }}>
        {project.milestones?.length || 0} milestones ·{' '}
        {project.milestones?.filter(m => m.completed).length || 0} done
      </div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = { active: ['#4ade80', '#002d0a'], completed: ['#1f6feb', '#00102d'], paused: ['#ffd700', '#2d2600'] };
  const [color, bg] = map[status] || map.active;
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}40`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
      {status}
    </span>
  );
}

// ---- NewProjectModal ------------------------------------------------

function NewProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', type: 'code', subtype: '', description: '', engine: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` },
        body: JSON.stringify({ ...form, milestones: [] })
      });
      if (r.ok) { onCreated(await r.json()); onClose(); }
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 16, padding: 28, width: '90%', maxWidth: 480 }}>
        <h3 style={{ margin: '0 0 20px' }}>New Project</h3>
        <FormField label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="My awesome project" />
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>Type</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <FormField label="Subtype (optional)" value={form.subtype} onChange={v => setForm(f => ({ ...f, subtype: v }))} placeholder="e.g. 3d, vr, saas…" />
        {form.type === 'game' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>Game Engine</label>
            <select value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))} style={inputStyle}>
              <option value="">Select engine…</option>
              {Object.entries(ENGINE_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              <option value="unity">Unity</option>
              <option value="godot">Godot</option>
              <option value="custom">Custom Engine</option>
            </select>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What are you building?" />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={btnStyle('#30363d')}>Cancel</button>
          <button onClick={save} disabled={saving} style={btnStyle('#1f6feb')}>{saving ? 'Creating…' : 'Create Project'}</button>
        </div>
      </div>
    </div>
  );
}

// ---- ProjectDetail --------------------------------------------------

function ProjectDetail({ project, onUpdate, onConnectorSync }) {
  const cfg = TYPE_CONFIG[project.type] || TYPE_CONFIG.code;
  const [addingMS, setAddingMS] = useState(false);
  const [msForm, setMsForm] = useState({ title: '', dueDate: '' });
  const [syncingEngine, setSyncingEngine] = useState(null);

  const completeMilestone = async (msId) => {
    const r = await fetch(`/api/projects/${project.id}/milestones/${msId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` }
    });
    if (r.ok) onUpdate(await r.json());
  };

  const addMilestone = async () => {
    if (!msForm.title.trim()) return;
    const r = await fetch(`/api/projects/${project.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` },
      body: JSON.stringify(msForm)
    });
    if (r.ok) { onUpdate(await r.json()); setAddingMS(false); setMsForm({ title: '', dueDate: '' }); }
  };

  const syncConnector = async (connKey) => {
    setSyncingEngine(connKey);
    const r = await fetch(`/api/projects/${project.id}/sync/${connKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` }
    });
    if (r.ok) { const d = await r.json(); onConnectorSync(d); }
    setSyncingEngine(null);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{cfg.icon}</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{project.name}</h2>
          <div style={{ fontSize: 13, color: '#8b949e' }}>{project.description}</div>
        </div>
        <StatusChip status={project.status} />
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#8b949e' }}>
          <span>Overall Progress</span>
          <span style={{ color: cfg.color, fontWeight: 700 }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={cfg.color} />
      </div>

      {/* Milestones */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Milestones</div>
          <button onClick={() => setAddingMS(true)} style={btnStyle(cfg.color)}>+ Add</button>
        </div>
        {addingMS && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={msForm.title} onChange={e => setMsForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Milestone title…" style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
            <input type="date" value={msForm.dueDate} onChange={e => setMsForm(f => ({ ...f, dueDate: e.target.value }))}
              style={{ ...inputStyle, width: 140 }} />
            <button onClick={addMilestone} style={btnStyle(cfg.color)}>Add</button>
            <button onClick={() => setAddingMS(false)} style={btnStyle('#30363d')}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(project.milestones || []).map(ms => (
            <div key={ms.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              background: ms.completed ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
              borderRadius: 8, border: `1px solid ${ms.completed ? '#4ade8040' : '#30363d'}`
            }}>
              <button onClick={() => !ms.completed && completeMilestone(ms.id)} style={{
                width: 18, height: 18, borderRadius: 4, border: `2px solid ${ms.completed ? '#4ade80' : '#8b949e'}`,
                background: ms.completed ? '#4ade80' : 'transparent', cursor: ms.completed ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: 12
              }}>{ms.completed ? '✓' : ''}</button>
              <span style={{ flex: 1, fontSize: 13, textDecoration: ms.completed ? 'line-through' : 'none', color: ms.completed ? '#8b949e' : '#e6edf3' }}>
                {ms.title}
              </span>
              {ms.dueDate && <span style={{ fontSize: 11, color: '#8b949e' }}>{ms.dueDate}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Game engine connectors */}
      {project.type === 'game' && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Engine Connectors</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(ENGINE_NAMES).map(([key, name]) => {
              const connected = project.connectorData?.[key];
              return (
                <button key={key} onClick={() => syncConnector(key)} disabled={syncingEngine === key}
                  style={{
                    background: connected ? '#166534' : 'rgba(255,255,255,0.06)',
                    color: connected ? '#4ade80' : '#e6edf3',
                    border: `1px solid ${connected ? '#4ade80' : '#30363d'}`,
                    borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12
                  }}>
                  {syncingEngine === key ? 'Syncing…' : `${connected ? '✓' : '○'} ${name}`}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- main component -------------------------------------------------

export default function ProjectTracker({ socket }) {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchAll = useCallback(async () => {
    try {
      const [projR, statsR, achR] = await Promise.all([
        fetch('/api/projects', { headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` } }),
        fetch('/api/projects/stats', { headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` } }),
        fetch('/api/projects/achievements', { headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}` } })
      ]);
      if (projR.ok) setProjects(await projR.json());
      if (statsR.ok) setStats(await statsR.json());
      if (achR.ok) setAchievements(await achR.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Socket.io project updates
  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchAll();
    socket.on('project:updated', handler);
    return () => socket.off('project:updated', handler);
  }, [socket, fetchAll]);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter);
  const selected = projects.find(p => p.id === selectedId);

  const chartData = stats
    ? Object.entries(stats.byType || {}).map(([type, count]) => ({
        name: TYPE_CONFIG[type]?.label || type,
        count,
        color: TYPE_CONFIG[type]?.color || '#888'
      }))
    : [];

  return (
    <div style={{ background: '#0d1117', color: '#e6edf3', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Project Tracker</h1>
          <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>Code · Game Dev · AR/VR · 3D — Real-time milestones</div>
        </div>
        <button onClick={() => setShowNew(true)} style={btnStyle('#1f6feb')}>+ New Project</button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: stats.total, color: '#e6edf3' },
            { label: 'Active', value: stats.active, color: '#4ade80' },
            { label: 'Completed', value: stats.completed, color: '#1f6feb' },
            { label: 'Avg Progress', value: `${stats.avgProgress}%`, color: '#e3b341' },
            { label: 'XP Earned', value: achievements.reduce((s, a) => s + a.xp, 0), color: '#f87171' }
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#8b949e' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, flex: 1, minWidth: 200 }}>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Bar dataKey="count" radius={[4,4,0,0]} fill="#1f6feb" />
                <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['all', 'All', '#e6edf3'], ...Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label, v.color])].map(([key, label, color]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            background: filter === key ? color : 'rgba(255,255,255,0.06)',
            color: filter === key ? '#000' : '#e6edf3',
            border: `1px solid ${color}`,
            borderRadius: 20, padding: '5px 14px', cursor: 'pointer', fontSize: 13, fontWeight: filter === key ? 700 : 400
          }}>{label}</button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: 60, color: '#8b949e' }}>No projects yet. Create one to get started!</div>
            : filtered.map(p => (
              <ProjectCard key={p.id} project={p} selected={p.id === selectedId} onSelect={setSelectedId} />
            ))}
        </div>
        {selected && (
          <ProjectDetail
            project={selected}
            onUpdate={(updated) => setProjects(ps => ps.map(p => p.id === updated.id ? updated : p))}
            onConnectorSync={() => fetchAll()}
          />
        )}
      </div>

      {/* Achievements strip */}
      {achievements.length > 0 && (
        <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Achievements</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {achievements.slice(0, 8).map(a => (
              <div key={a.id} style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid #e3b34140', borderRadius: 10, padding: '10px 14px', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 22 }}>🏆</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#e3b341' }}>+{a.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={(p) => { setProjects(ps => [p, ...ps]); setSelectedId(p.id); }} />}
    </div>
  );
}

// ---- style helpers --------------------------------------------------

const inputStyle = {
  background: '#0d1117', border: '1px solid #30363d', borderRadius: 8,
  color: '#e6edf3', padding: '8px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box'
};

function FormField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg, color: bg === '#30363d' ? '#e6edf3' : (bg.startsWith('#4') || bg === '#1f6feb' ? '#fff' : '#000'),
    border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600
  };
}
