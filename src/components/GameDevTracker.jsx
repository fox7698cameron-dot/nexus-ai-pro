/**
 * src/components/GameDevTracker.jsx
 * Real-time project tracking for coding, game dev, AR/VR/3D projects.
 * Platform connectors: Unreal/Epic, Sony, Microsoft, Ubisoft.
 * Achievement & game progress tracking.
 * Updated: 2026-10-04
 */
import React, { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPES = {
  game_2d:     { label: '2D Game',       icon: '🎮', engines: ['Unity', 'Godot', 'GameMaker'] },
  game_3d:     { label: '3D Game',       icon: '🕹️', engines: ['Unreal', 'Unity', 'CryEngine'] },
  vr:          { label: 'VR Experience', icon: '🥽', engines: ['Unreal', 'Unity', 'WebXR'] },
  ar:          { label: 'AR App',        icon: '📱', engines: ['ARKit', 'ARCore', 'Vuforia'] },
  '3d_model':  { label: '3D Model/Art',  icon: '🗿', engines: ['Blender', 'Maya', 'ZBrush'] },
  coding:      { label: 'Coding Project',icon: '💻', engines: ['Any'] },
  app:         { label: 'App Dev',       icon: '📲', engines: ['React Native', 'Flutter'] },
};

const PLATFORMS = {
  epic:       { label: 'Epic Games Store', icon: '🎯', color: '#2463eb' },
  sony:       { label: 'PlayStation',      icon: '🎮', color: '#003087' },
  microsoft:  { label: 'Xbox / MS Store',  icon: '🟩', color: '#107c10' },
  ubisoft:    { label: 'Ubisoft Connect',  icon: '🔷', color: '#0070c0' },
  steam:      { label: 'Steam',            icon: '🖥️', color: '#1b2838' },
  itch:       { label: 'itch.io',          icon: '🍊', color: '#fa5c5c' },
};

function ProgressBar({ pct, color = '#60a5fa' }) {
  return (
    <div style={{ height: 6, background: '#333', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    planning:     { color: '#6b7280', label: 'Planning'     },
    in_progress:  { color: '#60a5fa', label: 'In Progress'  },
    review:       { color: '#f59e0b', label: 'In Review'    },
    testing:      { color: '#a78bfa', label: 'Testing'      },
    released:     { color: '#4ade80', label: 'Released'     },
    paused:       { color: '#f87171', label: 'Paused'       },
  };
  const s = map[status] ?? map.planning;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      background: `${s.color}20`, color: s.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {s.label}
    </span>
  );
}

function AchievementBadge({ ach, unlocked }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
      background: unlocked ? '#4ade8010' : '#ffffff06',
      borderRadius: 8, border: `1px solid ${unlocked ? '#4ade8030' : '#ffffff10'}`,
      opacity: unlocked ? 1 : 0.5 }}>
      <span style={{ fontSize: 20 }}>{ach.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: unlocked ? '#4ade80' : '#888' }}>{ach.name}</div>
        <div style={{ fontSize: 10, color: '#666' }}>{ach.desc}</div>
      </div>
      {unlocked && <span style={{ fontSize: 10, color: '#4ade80' }}>✓</span>}
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const pt = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.coding;
  return (
    <div
      onClick={() => onSelect(project.id)}
      style={{ background: selected ? '#ffffff10' : '#ffffff06',
        border: `1px solid ${selected ? '#60a5fa50' : '#ffffff10'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s',
        marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{pt.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{project.name}</span>
            <StatusBadge status={project.status} />
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{pt.label} · {project.engine}</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 3 }}>
              <span>Progress</span><span>{project.progress}%</span>
            </div>
            <ProgressBar pct={project.progress} color={project.progress >= 80 ? '#4ade80' : '#60a5fa'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformConnector({ id, connected, onToggle }) {
  const p = PLATFORMS[id];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: '#ffffff06', borderRadius: 8, marginBottom: 6,
      border: `1px solid ${connected ? p.color + '40' : '#ffffff10'}` }}>
      <span style={{ fontSize: 18 }}>{p.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.label}</div>
        <div style={{ fontSize: 10, color: connected ? '#4ade80' : '#666' }}>
          {connected ? '✓ Connected' : 'Not connected'}
        </div>
      </div>
      <button
        onClick={() => onToggle(id)}
        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none',
          background: connected ? '#ef444430' : p.color,
          color: '#fff', cursor: 'pointer' }}>
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}

const MOCK_PROJECTS = [
  { id: 'p1', name: 'Nexus Arena',        type: 'game_3d',  engine: 'Unreal Engine 5', progress: 64, status: 'in_progress',
    milestones: ['Concept ✓','Prototype ✓','Alpha','Beta','Launch'],
    platforms: ['epic','microsoft'],
    achievements: [
      { icon: '🏁', name: 'First Commit',     desc: 'Started the project',      unlocked: true  },
      { icon: '🎨', name: 'Art Pass',         desc: 'Completed first art pass',  unlocked: true  },
      { icon: '🧪', name: 'Alpha Tester',     desc: 'Reached internal alpha',    unlocked: false },
      { icon: '🚀', name: 'Launch Ready',     desc: 'Build submitted to stores', unlocked: false },
    ],
    stats: { commits: 342, linesOfCode: 87400, buildTime: '4m 22s', bugs: 14, closedBugs: 127 },
  },
  { id: 'p2', name: 'VR Escape Room',     type: 'vr',       engine: 'Unity (XR)',      progress: 38, status: 'in_progress',
    milestones: ['Concept ✓','Whitebox ✓','Greybox','Polish','Launch'],
    platforms: ['sony','steam'],
    achievements: [
      { icon: '🥽', name: 'First VR Build',   desc: 'First standalone VR build',  unlocked: true  },
      { icon: '🎯', name: 'Puzzle Master',    desc: '10 puzzles implemented',     unlocked: false },
    ],
    stats: { commits: 89, linesOfCode: 24600, buildTime: '2m 10s', bugs: 7, closedBugs: 23 },
  },
  { id: 'p3', name: 'AR Treasure Hunt',   type: 'ar',       engine: 'ARKit / Unity',   progress: 20, status: 'planning',
    milestones: ['Concept ✓','Prototype','Field Test','Release'],
    platforms: ['itch'],
    achievements: [
      { icon: '📱', name: 'AR Hello World',   desc: 'First AR scene running',     unlocked: true  },
    ],
    stats: { commits: 21, linesOfCode: 5200, buildTime: '1m 04s', bugs: 2, closedBugs: 4 },
  },
  { id: 'p4', name: 'Nexus AI Pro',       type: 'coding',   engine: 'Node.js / React', progress: 87, status: 'review',
    milestones: ['MVP ✓','Beta ✓','Security Audit','Launch'],
    platforms: ['microsoft'],
    achievements: [
      { icon: '💎', name: 'Enterprise Ready', desc: 'Full-stack MVP complete',    unlocked: true  },
      { icon: '🔒', name: 'Fort Knox',        desc: 'Security audit passed',      unlocked: false },
    ],
    stats: { commits: 1247, linesOfCode: 156800, buildTime: '45s', bugs: 3, closedBugs: 289 },
  },
];

export function GameDevTracker() {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [selectedId, setSelectedId] = useState('p1');
  const [connected, setConnected] = useState({ epic: true, microsoft: true, steam: false, sony: false, ubisoft: false, itch: true });
  const [tab, setTab] = useState('projects');
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', type: 'game_3d', engine: '' });

  const selected = projects.find(p => p.id === selectedId);

  const toggleConnector = id => setConnected(p => ({ ...p, [id]: !p[id] }));

  const addProject = () => {
    if (!newProject.name.trim()) return;
    const p = {
      id: `p${Date.now()}`,
      ...newProject,
      progress: 0,
      status: 'planning',
      milestones: ['Concept', 'Prototype', 'Alpha', 'Launch'],
      platforms: [],
      achievements: [],
      stats: { commits: 0, linesOfCode: 0, buildTime: '—', bugs: 0, closedBugs: 0 },
    };
    setProjects(prev => [...prev, p]);
    setSelectedId(p.id);
    setNewProject({ name: '', type: 'game_3d', engine: '' });
    setNewProjectModal(false);
  };

  const globalStats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    released: projects.filter(p => p.status === 'released').length,
    totalCommits: projects.reduce((a, p) => a + (p.stats?.commits ?? 0), 0),
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🎮 Game & Project Tracker</h1>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Coding · Game Dev · AR/VR/3D · Platform Connectors</div>
        </div>
        <button onClick={() => setNewProjectModal(true)}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#60a5fa', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          + New Project
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Projects',     value: globalStats.total,       color: '#60a5fa' },
          { label: 'Active',       value: globalStats.inProgress,  color: '#f59e0b' },
          { label: 'Released',     value: globalStats.released,    color: '#4ade80' },
          { label: 'Total Commits',value: globalStats.totalCommits,color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ background: '#ffffff06', borderRadius: 10, padding: '12px 14px', border: `1px solid ${s.color}30` }}>
            <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #222' }}>
        {['projects', 'connectors', 'achievements'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 14px', background: 'none', border: 'none', color: tab === t ? '#fff' : '#666', fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: 'pointer', borderBottom: tab === t ? '2px solid #60a5fa' : '2px solid transparent' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* PROJECTS TAB */}
      {tab === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: 16 }}>
          {/* Project list */}
          <div>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={setSelectedId} selected={p.id === selectedId} />
            ))}
          </div>

          {/* Project detail */}
          {selected && (
            <div style={{ background: '#ffffff06', borderRadius: 12, padding: 18, border: '1px solid #ffffff15' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {PROJECT_TYPES[selected.type]?.label} · {selected.engine}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  <span>Overall Progress</span><span style={{ color: '#fff', fontWeight: 600 }}>{selected.progress}%</span>
                </div>
                <ProgressBar pct={selected.progress} color={selected.progress >= 80 ? '#4ade80' : '#60a5fa'} />
              </div>

              {/* Milestones */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Milestones</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selected.milestones.map((m, i) => {
                    const done = m.includes('✓');
                    return (
                      <span key={i} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20,
                        background: done ? '#4ade8020' : '#ffffff10',
                        color: done ? '#4ade80' : '#888',
                        border: `1px solid ${done ? '#4ade8030' : '#ffffff15'}` }}>
                        {m}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8, marginBottom: 16 }}>
                {Object.entries(selected.stats).map(([k, v]) => (
                  <div key={k} style={{ background: '#ffffff06', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#666', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g,' $1')}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Platform targets */}
              {selected.platforms.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Target Platforms</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selected.platforms.map(pid => {
                      const pp = PLATFORMS[pid];
                      return pp ? (
                        <span key={pid} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20,
                          background: `${pp.color}20`, color: pp.color, border: `1px solid ${pp.color}30` }}>
                          {pp.icon} {pp.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONNECTORS TAB */}
      {tab === 'connectors' && (
        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Connect your platform accounts for automated publishing and analytics</div>
          {Object.keys(PLATFORMS).map(id => (
            <PlatformConnector key={id} id={id} connected={!!connected[id]} onToggle={toggleConnector} />
          ))}
        </div>
      )}

      {/* ACHIEVEMENTS TAB */}
      {tab === 'achievements' && (
        <div>
          {projects.map(proj => (
            proj.achievements.length > 0 && (
              <div key={proj.id} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>{proj.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                  {proj.achievements.map((a, i) => (
                    <AchievementBadge key={i} ach={a} unlocked={a.unlocked} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* New project modal */}
      {newProjectModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 24, width: '90%', maxWidth: 400, border: '1px solid #333' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>New Project</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Project Name</label>
              <input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #333', background: '#0d0d0d', color: '#fff', fontSize: 13, boxSizing: 'border-box' }}
                placeholder="My Awesome Game" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Project Type</label>
              <select value={newProject.type} onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #333', background: '#0d0d0d', color: '#fff', fontSize: 13 }}>
                {Object.entries(PROJECT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Engine / Stack</label>
              <input value={newProject.engine} onChange={e => setNewProject(p => ({ ...p, engine: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #333', background: '#0d0d0d', color: '#fff', fontSize: 13, boxSizing: 'border-box' }}
                placeholder="Unreal Engine 5, Unity, Node.js…" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setNewProjectModal(false)}
                style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid #333', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={addProject}
                style={{ flex: 1, padding: '9px', borderRadius: 6, border: 'none', background: '#60a5fa', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameDevTracker;
