/**
 * src/tracking/GameDevTracker.jsx
 * Real-time project tracking for game development, AR/VR, and 3D projects.
 * Connectors: Unreal Engine, Epic Games, Sony, Microsoft, Ubisoft Connect,
 * achievement tracking, game progress tracking.
 * Created: 2026-08-23
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Platform connectors (replace token values with env-var-backed server calls) ─
const GAME_PLATFORMS = [
  { id: 'unreal',    name: 'Unreal Engine 5',   icon: '🎮', color: '#1c1c1c', accent: '#0084ff', apiBase: '/api/connectors/unreal' },
  { id: 'epic',      name: 'Epic Games',         icon: '🎮', color: '#2d2d2d', accent: '#0078f2', apiBase: '/api/connectors/epic' },
  { id: 'sony',      name: 'PlayStation (Sony)', icon: '🎯', color: '#003087', accent: '#0072ce', apiBase: '/api/connectors/sony' },
  { id: 'microsoft', name: 'Xbox / Microsoft',   icon: '🟢', color: '#107c10', accent: '#52b043', apiBase: '/api/connectors/xbox' },
  { id: 'ubisoft',   name: 'Ubisoft Connect',    icon: '🔵', color: '#0076c8', accent: '#00a8e0', apiBase: '/api/connectors/ubisoft' },
  { id: 'steam',     name: 'Steam (Valve)',       icon: '♨️', color: '#1b2838', accent: '#66c0f4', apiBase: '/api/connectors/steam' },
];

const PROJECT_TYPES = ['Game', 'AR', 'VR', 'XR', '3D Model', 'Animation', 'Plugin', 'SDK', 'Level Design', 'Mod'];
const TECH_STACK    = ['Unreal Engine', 'Unity', 'Godot', 'C++', 'C#', 'Blueprint', 'HLSL', 'Python', 'Rust', 'JavaScript', 'WebGPU', 'Vulkan', 'DirectX 12', 'Metal', 'OpenGL', 'OpenXR', 'WebXR', 'ARKit', 'ARCore'];

// ── Sample projects (replace with /api/projects call) ────────────────────────
function sampleProjects() {
  return [
    {
      id: 'P001', name: 'NexusWorld MMO',     type: 'Game', tech: ['Unreal Engine', 'C++', 'Blueprint'], platform: ['epic', 'sony', 'microsoft'],
      status: 'active', completion: 62, priority: 'high',
      milestones: [
        { name: 'Core Gameplay Loop', done: true,  dueDate: '2026-02-01' },
        { name: 'Multiplayer Netcode', done: true,  dueDate: '2026-04-01' },
        { name: 'World Generation',    done: false, dueDate: '2026-09-01' },
        { name: 'Beta Launch',         done: false, dueDate: '2026-12-01' },
      ],
      tasks: 142, tasksOpen: 38, bugs: 12, lastCommit: '2026-08-23T09:15:00Z',
      achievements: 28, achievementsTotal: 50,
    },
    {
      id: 'P002', name: 'VR Training Suite', type: 'VR', tech: ['Unreal Engine', 'C++', 'OpenXR'], platform: ['microsoft', 'sony'],
      status: 'active', completion: 45, priority: 'medium',
      milestones: [
        { name: 'VR Locomotion',       done: true,  dueDate: '2026-05-01' },
        { name: 'Hand Tracking',        done: false, dueDate: '2026-10-01' },
        { name: 'Scenario Editor',      done: false, dueDate: '2027-01-01' },
      ],
      tasks: 87, tasksOpen: 22, bugs: 5, lastCommit: '2026-08-22T14:30:00Z',
      achievements: 10, achievementsTotal: 20,
    },
    {
      id: 'P003', name: 'AR City Overlay',   type: 'AR', tech: ['ARKit', 'ARCore', 'WebXR', 'JavaScript'], platform: ['epic'],
      status: 'paused', completion: 30, priority: 'low',
      milestones: [
        { name: 'Plane Detection',     done: true,  dueDate: '2026-01-01' },
        { name: 'City Data Layer',     done: false, dueDate: '2026-11-01' },
      ],
      tasks: 54, tasksOpen: 18, bugs: 3, lastCommit: '2026-07-15T11:00:00Z',
      achievements: 5, achievementsTotal: 15,
    },
  ];
}

// ── Achievement badge ─────────────────────────────────────────────────────────
function AchievementBadge({ name, earned }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
      background: earned ? '#22c55e22' : '#1e293b', border: `1px solid ${earned ? '#22c55e' : '#334155'}`,
      borderRadius: 20, fontSize: 12, color: earned ? '#22c55e' : '#475569',
    }}>
      {earned ? '🏆' : '🔒'} {name}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, color = '#3b82f6', label }) {
  return (
    <div>
      {label && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>}
      <div style={{ height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'right' }}>{value}%</div>
    </div>
  );
}

// ── Platform connector badge ──────────────────────────────────────────────────
function PlatformBadge({ platformId }) {
  const p = GAME_PLATFORMS.find((g) => g.id === platformId);
  if (!p) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${p.accent}22`, color: p.accent, border: `1px solid ${p.accent}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
      {p.icon} {p.name.split(' ')[0]}
    </span>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onSelect, selected }) {
  const statusColor = { active: '#22c55e', paused: '#eab308', completed: '#3b82f6', cancelled: '#ef4444' }[project.status] || '#94a3b8';

  return (
    <div onClick={() => onSelect(project.id)}
      style={{ background: selected ? '#1e3a5f' : '#1e293b', border: `2px solid ${selected ? '#3b82f6' : '#334155'}`, borderRadius: 14, padding: 20, cursor: 'pointer', transition: 'all 0.2s' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc' }}>{project.name}</span>
            <span style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}`, borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              {project.status}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            {project.type} · {project.tech.slice(0, 3).join(', ')}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
          Priority: <span style={{ color: { high: '#ef4444', medium: '#eab308', low: '#22c55e' }[project.priority] || '#94a3b8', fontWeight: 700 }}>{project.priority}</span>
        </div>
      </div>

      <ProgressBar value={project.completion} label="Overall completion" color="#3b82f6" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
        {[['📋 Tasks', `${project.tasksOpen}/${project.tasks}`], ['🐛 Bugs', project.bugs], ['🏆 Achievements', `${project.achievements}/${project.achievementsTotal}`]].map(([l, v]) => (
          <div key={l} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {project.platform.map((pid) => <PlatformBadge key={pid} platformId={pid} />)}
      </div>

      <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>
        Last commit: {new Date(project.lastCommit).toLocaleString()}
      </div>
    </div>
  );
}

// ── Project detail ────────────────────────────────────────────────────────────
function ProjectDetail({ project }) {
  const achievements = Array.from({ length: project.achievementsTotal }, (_, i) => ({
    name: `Achievement ${i + 1}`,
    earned: i < project.achievements,
  }));

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 24 }}>
      <h2 style={{ color: '#f8fafc', fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
        {project.name} — {project.type}
      </h2>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>📍 Milestones</h3>
        {project.milestones.map((m) => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #0f172a' }}>
            <span style={{ fontSize: 18 }}>{m.done ? '✅' : '⬜'}</span>
            <span style={{ flex: 1, fontSize: 14, color: m.done ? '#22c55e' : '#f8fafc', textDecoration: m.done ? 'line-through' : 'none' }}>{m.name}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Due: {m.dueDate}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>🏆 Achievements ({project.achievements}/{project.achievementsTotal})</h3>
        <ProgressBar value={Math.round((project.achievements / project.achievementsTotal) * 100)} color="#f59e0b" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {achievements.map((a) => <AchievementBadge key={a.name} name={a.name} earned={a.earned} />)}
        </div>
      </div>

      <div>
        <h3 style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>🔗 Platform Connectors</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
          {GAME_PLATFORMS.filter((g) => project.platform.includes(g.id)).map((p) => (
            <div key={p.id} style={{ background: '#0f172a', border: `1px solid ${p.accent}44`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 22 }}>{p.icon}</div>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14, marginTop: 4 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>✅ Connected</div>
              <button onClick={() => fetch(`${p.apiBase}/sync`, { method: 'POST', credentials: 'include' }).catch(() => {})}
                style={{ marginTop: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                Sync
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── New project form ──────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'Game', tech: [], platform: [], priority: 'medium' });

  const toggleList = (field, val) =>
    setForm((p) => ({ ...p, [field]: p[field].includes(val) ? p[field].filter((v) => v !== val) : [...p[field], val] }));

  const save = async () => {
    const project = { ...form, id: `P${Date.now()}`, status: 'active', completion: 0, tasks: 0, tasksOpen: 0, bugs: 0, lastCommit: new Date().toISOString(), achievements: 0, achievementsTotal: 20, milestones: [] };
    // TODO: POST /api/projects
    onSave(project);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ color: '#f8fafc', marginBottom: 20 }}>New Project</h2>

        <label style={lbl}>Project Name</label>
        <input style={inp} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="My Awesome Game" />

        <label style={lbl}>Type</label>
        <select style={inp} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
          {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>

        <label style={lbl}>Tech Stack</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {TECH_STACK.map((t) => (
            <button key={t} onClick={() => toggleList('tech', t)}
              style={{ background: form.tech.includes(t) ? '#3b82f622' : '#0f172a', color: form.tech.includes(t) ? '#60a5fa' : '#64748b', border: `1px solid ${form.tech.includes(t) ? '#3b82f6' : '#334155'}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
              {t}
            </button>
          ))}
        </div>

        <label style={lbl}>Platforms</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {GAME_PLATFORMS.map((p) => (
            <button key={p.id} onClick={() => toggleList('platform', p.id)}
              style={{ background: form.platform.includes(p.id) ? `${p.accent}22` : '#0f172a', color: form.platform.includes(p.id) ? p.accent : '#64748b', border: `1px solid ${form.platform.includes(p.id) ? p.accent : '#334155'}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        <label style={lbl}>Priority</label>
        <select style={inp} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={save} style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>Create Project</button>
          <button onClick={onClose} style={{ flex: 1, background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer', fontSize: 15 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 };
const inp = { width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', padding: '10px 12px', fontSize: 14, marginBottom: 14 };

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GameDevTracker() {
  const [projects, setProjects]       = useState(sampleProjects());
  const [selected, setSelected]       = useState(null);
  const [showNewModal, setShowNew]    = useState(false);
  const [filter, setFilter]           = useState('all');

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter || p.type.toLowerCase() === filter);
  const selProject = projects.find((p) => p.id === selected);

  const addProject = (p) => { setProjects((ps) => [...ps, p]); setShowNew(false); };

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: 24, fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>🎮 Game Dev Tracker</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Game · AR · VR · 3D project tracking with platform connectors</p>
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          + New Project
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', 'active', 'paused', 'completed', 'Game', 'VR', 'AR', '3D Model'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? '#3b82f622' : '#1e293b', color: filter === f ? '#60a5fa' : '#94a3b8', border: `1px solid ${filter === f ? '#3b82f6' : '#334155'}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selProject ? '1fr 1fr' : '1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} selected={selected === p.id} onSelect={setSelected} />
          ))}
          {filtered.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No projects match this filter</div>}
        </div>

        {selProject && (
          <div>
            <button onClick={() => setSelected(null)} style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', marginBottom: 14, fontSize: 13 }}>
              ← Close Detail
            </button>
            <ProjectDetail project={selProject} />
          </div>
        )}
      </div>

      {showNewModal && <NewProjectModal onClose={() => setShowNew(false)} onSave={addProject} />}
    </div>
  );
}
