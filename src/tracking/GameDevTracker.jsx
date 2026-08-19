/**
 * @file GameDevTracker.jsx
 * @description Real-Time Project Tracking for:
 *   Coding · Game Development · AR/VR/3D Projects
 *   Platform connectors: Unreal Engine, Epic Games, Sony, Microsoft Xbox,
 *   Ubisoft Connect, Achievement & Game Progress Tracking
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Project Types ─────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  { id: 'game2d',  icon: '🕹️',  name: '2D Game',          engine: ['Unity', 'Godot', 'Pygame'] },
  { id: 'game3d',  icon: '🎮',  name: '3D Game',          engine: ['Unreal Engine', 'Unity', 'CryEngine'] },
  { id: 'vr',      icon: '🥽',  name: 'VR Project',       engine: ['Unreal Engine', 'Unity XR', 'OpenXR'] },
  { id: 'ar',      icon: '📱',  name: 'AR Project',       engine: ['ARKit', 'ARCore', 'WebXR'] },
  { id: '3d',      icon: '🧊',  name: '3D Rendering',     engine: ['Blender', 'Three.js', 'Babylon.js'] },
  { id: 'coding',  icon: '💻',  name: 'Software Project', engine: ['Node.js', 'Python', 'Rust', 'C++', 'Swift'] },
  { id: 'mobile',  icon: '📲',  name: 'Mobile App',       engine: ['React Native', 'Flutter', 'Capacitor'] }
];

// ─── Platform Connectors ───────────────────────────────────────────────────────

const PLATFORM_CONNECTORS = [
  { id: 'unreal',    name: 'Unreal Engine',   icon: '🔷', color: '#1d7fb4', status: 'available' },
  { id: 'epic',      name: 'Epic Games',      icon: '🎯', color: '#313131', status: 'available' },
  { id: 'unity',     name: 'Unity',           icon: '⚙️',  color: '#222c37', status: 'available' },
  { id: 'godot',     name: 'Godot',           icon: '🤖', color: '#478cbf', status: 'available' },
  { id: 'sony',      name: 'PlayStation',     icon: '🎮', color: '#003791', status: 'available' },
  { id: 'xbox',      name: 'Xbox / Microsoft',icon: '🟢', color: '#107c10', status: 'available' },
  { id: 'ubisoft',   name: 'Ubisoft Connect', icon: '🦁', color: '#0070d1', status: 'available' },
  { id: 'steam',     name: 'Steam / Valve',   icon: '🌊', color: '#1b2838', status: 'available' },
  { id: 'gog',       name: 'GOG Galaxy',      icon: '🌌', color: '#6f2e9d', status: 'available' },
  { id: 'nintendo',  name: 'Nintendo',        icon: '🔴', color: '#e60012', status: 'coming_soon' },
  { id: 'apple',     name: 'Apple Arcade',    icon: '🍎', color: '#555', status: 'available' }
];

// ─── Demo Projects ─────────────────────────────────────────────────────────────

const DEMO_PROJECTS = [
  {
    id: 'p1', name: 'Nexus Realms', type: 'game3d', engine: 'Unreal Engine 5',
    progress: 67, status: 'active',
    milestones: [
      { id: 'm1', title: 'Core gameplay loop', done: true },
      { id: 'm2', title: 'Level 1 assets', done: true },
      { id: 'm3', title: 'Multiplayer backend', done: false },
      { id: 'm4', title: 'Platform certification', done: false }
    ],
    platforms: ['epic', 'sony', 'xbox'],
    achievements: [
      { id: 'a1', name: 'First Boot', points: 10, unlocked: true },
      { id: 'a2', name: 'Level 10', points: 50, unlocked: false },
      { id: 'a3', name: 'Completionist', points: 100, unlocked: false }
    ],
    linesOfCode: 48230,
    buildStatus: 'passing',
    lastBuild: new Date(Date.now() - 1800000).toISOString(),
    teammates: ['Cameron F.', 'Alex K.', 'Jordan L.']
  },
  {
    id: 'p2', name: 'AR Museum Guide', type: 'ar', engine: 'ARKit + React Native',
    progress: 42, status: 'active',
    milestones: [
      { id: 'm1', title: 'AR plane detection', done: true },
      { id: 'm2', title: '3D model loading', done: false },
      { id: 'm3', title: 'Audio narration', done: false }
    ],
    platforms: ['apple'],
    achievements: [],
    linesOfCode: 12800,
    buildStatus: 'passing',
    lastBuild: new Date(Date.now() - 3600000).toISOString(),
    teammates: ['Cameron F.', 'Sam W.']
  },
  {
    id: 'p3', name: 'Nexus AI Pro Backend', type: 'coding', engine: 'Node.js / Express',
    progress: 88, status: 'active',
    milestones: [
      { id: 'm1', title: 'Auth system', done: true },
      { id: 'm2', title: 'Payment integration', done: true },
      { id: 'm3', title: 'Analytics dashboards', done: true },
      { id: 'm4', title: 'Security hardening', done: false }
    ],
    platforms: [],
    achievements: [],
    linesOfCode: 73102,
    buildStatus: 'passing',
    lastBuild: new Date(Date.now() - 900000).toISOString(),
    teammates: ['Cameron F.']
  }
];

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, color = '#6366f1', height = 8 }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: height, overflow: 'hidden', height }}>
      <div style={{
        width: `${Math.min(100, value)}%`,
        height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: height,
        transition: 'width 0.6s cubic-bezier(.4,0,.2,1)'
      }} />
    </div>
  );
}

// ─── Build Status Badge ────────────────────────────────────────────────────────

function BuildBadge({ status }) {
  const map = { passing: ['#10b981', '✅ Passing'], failing: ['#ef4444', '❌ Failing'], pending: ['#f59e0b', '⏳ Building'] };
  const [color, label] = map[status] || ['#64748b', '— Unknown'];
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      background: `${color}22`, color, border: `1px solid ${color}44`
    }}>
      {label}
    </span>
  );
}

// ─── Achievement Card ──────────────────────────────────────────────────────────

function AchievementCard({ achievement }) {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '8px 12px',
      borderRadius: 10,
      background: achievement.unlocked ? 'rgba(16,185,129,0.08)' : '#0f172a',
      border: `1px solid ${achievement.unlocked ? '#10b98133' : '#1e293b'}`,
      opacity: achievement.unlocked ? 1 : 0.55
    }}>
      <span style={{ fontSize: 20 }}>{achievement.unlocked ? '🏆' : '🔒'}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: achievement.unlocked ? '#10b981' : '#94a3b8' }}>
          {achievement.name}
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>{achievement.points} XP</div>
      </div>
    </div>
  );
}

// ─── Connector Badge ───────────────────────────────────────────────────────────

function ConnectorBadge({ connector, connected, onToggle }) {
  const cs = connector.status === 'coming_soon';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      borderRadius: 10, cursor: cs ? 'not-allowed' : 'pointer',
      background: connected ? `${connector.color}22` : '#0f172a',
      border: `1px solid ${connected ? connector.color + '66' : '#1e293b'}`,
      opacity: cs ? 0.5 : 1
    }} onClick={() => !cs && onToggle(connector.id)}>
      <span style={{ fontSize: 16 }}>{connector.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{connector.name}</div>
        <div style={{ fontSize: 10, color: connected ? '#10b981' : '#64748b' }}>
          {cs ? 'Coming soon' : connected ? '● Connected' : '○ Connect'}
        </div>
      </div>
      {!cs && (
        <div style={{
          width: 32, height: 18, borderRadius: 9,
          background: connected ? '#10b981' : '#1e293b',
          position: 'relative', transition: 'background 0.2s'
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 2, left: connected ? 16 : 2,
            transition: 'left 0.2s'
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, connectors }) {
  const type = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  const [expanded, setExpanded] = useState(false);
  const completedMilestones = project.milestones.filter(m => m.done).length;

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 16,
      overflow: 'hidden'
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <span style={{ fontSize: 28 }}>{type.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{project.name}</h3>
            <BuildBadge status={project.buildStatus} />
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{project.engine} · {project.linesOfCode.toLocaleString()} lines</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Progress</span>
              <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 700 }}>{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} />
          </div>
        </div>
        <span style={{ fontSize: 18, color: '#64748b' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #1e293b', padding: '16px 20px' }}>
          {/* Milestones */}
          <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Milestones ({completedMilestones}/{project.milestones.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {project.milestones.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>{m.done ? '✅' : '⭕'}</span>
                <span style={{ fontSize: 13, color: m.done ? '#94a3b8' : '#f1f5f9', textDecoration: m.done ? 'line-through' : 'none' }}>
                  {m.title}
                </span>
              </div>
            ))}
          </div>

          {/* Achievements */}
          {project.achievements.length > 0 && (
            <>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Achievements ({project.achievements.filter(a => a.unlocked).length}/{project.achievements.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 16 }}>
                {project.achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
              </div>
            </>
          )}

          {/* Platform connections */}
          {project.platforms.length > 0 && (
            <>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Platform Integrations
              </h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {project.platforms.map(pid => {
                  const connector = PLATFORM_CONNECTORS.find(c => c.id === pid);
                  return connector ? (
                    <span key={pid} style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: `${connector.color}22`, color: connector.color || '#818cf8',
                      border: `1px solid ${connector.color}44`
                    }}>
                      {connector.icon} {connector.name}
                    </span>
                  ) : null;
                })}
              </div>
            </>
          )}

          <div style={{ marginTop: 12, fontSize: 11, color: '#475569' }}>
            Last build: {new Date(project.lastBuild).toLocaleString()} ·
            Team: {project.teammates.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Project Modal ─────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'game3d', engine: '', description: '' });
  const update = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const typeObj = PROJECT_TYPES.find(t => t.id === form.type);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>📁 New Project</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            placeholder="Project name"
            value={form.name}
            onChange={update('name')}
            style={inputStyle}
          />
          <select value={form.type} onChange={update('type')} style={inputStyle}>
            {PROJECT_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
            ))}
          </select>
          {typeObj && (
            <select value={form.engine} onChange={update('engine')} style={inputStyle}>
              <option value="">Select engine / framework…</option>
              {typeObj.engine.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={update('description')}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ ...btn, background: '#1e293b', color: '#94a3b8' }}>Cancel</button>
            <button onClick={() => onCreate(form)} disabled={!form.name} style={{ ...btn, opacity: form.name ? 1 : 0.5 }}>Create Project</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '11px 14px', borderRadius: 8,
  border: '1px solid #1e293b', background: '#050e1d',
  color: '#f1f5f9', fontSize: 14, width: '100%', boxSizing: 'border-box'
};

const btn = {
  padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontWeight: 700, fontSize: 14,
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff'
};

// ─── Main Tracker ─────────────────────────────────────────────────────────────

export default function GameDevTracker() {
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [connectorState, setConnectorState] = useState({});
  const [filter, setFilter] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [view, setView] = useState('projects'); // 'projects' | 'connectors'

  const toggleConnector = useCallback((id) => {
    setConnectorState(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const createProject = useCallback((form) => {
    const newProject = {
      id: `p${Date.now()}`,
      name: form.name,
      type: form.type,
      engine: form.engine || 'Not specified',
      progress: 0,
      status: 'active',
      milestones: [],
      platforms: [],
      achievements: [],
      linesOfCode: 0,
      buildStatus: 'pending',
      lastBuild: new Date().toISOString(),
      teammates: ['Cameron F.']
    };
    setProjects(prev => [newProject, ...prev]);
    setShowNewModal(false);
  }, []);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.type.startsWith(filter));
  const filterTypes = [
    { id: 'all', label: '🌐 All', count: projects.length },
    { id: 'game', label: '🎮 Games', count: projects.filter(p => p.type.includes('game')).length },
    { id: 'ar', label: '📱 AR', count: projects.filter(p => p.type === 'ar').length },
    { id: 'vr', label: '🥽 VR', count: projects.filter(p => p.type === 'vr').length },
    { id: 'coding', label: '💻 Code', count: projects.filter(p => p.type === 'coding').length }
  ];

  const connectedCount = Object.values(connectorState).filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>🎯 Project Tracker</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Coding · Game Dev · AR/VR/3D · Real-time milestones
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setView(v => v === 'projects' ? 'connectors' : 'projects')}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#1e293b', color: '#94a3b8', border: '1px solid #2d3748', cursor: 'pointer', fontSize: 13 }}
          >
            {view === 'projects' ? '🔗 Platform Connectors' : '📁 My Projects'}
            {view === 'projects' && connectedCount > 0 && (
              <span style={{ marginLeft: 6, background: '#10b981', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
                {connectedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
          >
            + New Project
          </button>
        </div>
      </div>

      {view === 'projects' ? (
        <>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {filterTypes.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${filter === f.id ? '#6366f1' : '#1e293b'}`,
                  background: filter === f.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: filter === f.id ? '#818cf8' : '#64748b'
                }}
              >
                {f.label} <span style={{ opacity: 0.6 }}>({f.count})</span>
              </button>
            ))}
          </div>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Projects', value: projects.length, icon: '📁' },
              { label: 'Active', value: projects.filter(p => p.status === 'active').length, icon: '🟢' },
              { label: 'Builds Passing', value: projects.filter(p => p.buildStatus === 'passing').length, icon: '✅' },
              { label: 'Lines of Code', value: projects.reduce((s, p) => s + p.linesOfCode, 0).toLocaleString(), icon: '📝' }
            ].map(s => (
              <div key={s.label} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Project list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} connectors={connectorState} />
            ))}
          </div>
        </>
      ) : (
        <>
          <p style={{ color: '#64748b', marginBottom: 20 }}>
            Connect your game engines, storefronts, and platform accounts to sync build status, achievements, and player analytics.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {PLATFORM_CONNECTORS.map(c => (
              <ConnectorBadge
                key={c.id}
                connector={c}
                connected={!!connectorState[c.id]}
                onToggle={toggleConnector}
              />
            ))}
          </div>
        </>
      )}

      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} onCreate={createProject} />}
    </div>
  );
}
