// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File created: 2026-08-06

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gamepad2, Trophy, Star, Zap, Cpu, Box, Layers, Play, Check, X, RefreshCw, Plus } from 'lucide-react';

const PLATFORMS = [
  { id: 'unreal',      name: 'Unreal Engine',     icon: '🎮', color: '#0e76a8', desc: 'Epic Games UE5 connector' },
  { id: 'epic',        name: 'Epic Games Store',  icon: '🛒', color: '#2563eb', desc: 'Publishing & analytics' },
  { id: 'playstation', name: 'PlayStation',        icon: '🎮', color: '#003087', desc: 'Sony PS5/PS4 dev kit' },
  { id: 'xbox',        name: 'Xbox / Microsoft',   icon: '🟢', color: '#107c10', desc: 'Xbox Game Dev Program' },
  { id: 'ubisoft',     name: 'Ubisoft Connect',   icon: '🔷', color: '#0099e5', desc: 'Ubisoft publishing tools' },
];

const TABS = ['Projects', 'Builds', 'Achievements', 'AR/VR', 'Connectors'];

const MOCK_PROJECTS = [
  { id: 1, title: 'StarForge RPG',        type: 'game',   engine: 'Unreal 5', progress: 72, buildStatus: 'passing', platform: 'PC/Console', team: 4,  updatedAt: Date.now() - 7200000 },
  { id: 2, title: 'Pixel Dash Runner',    type: 'game',   engine: 'Unity',    progress: 45, buildStatus: 'building',platform: 'Mobile',      team: 2,  updatedAt: Date.now() - 3600000 },
  { id: 3, title: 'VR Escape Room',       type: 'vr',     engine: 'Unreal 5', progress: 88, buildStatus: 'passing', platform: 'Meta Quest',  team: 3,  updatedAt: Date.now() - 1800000 },
  { id: 4, title: 'AR City Builder',      type: 'ar',     engine: 'ARKit',    progress: 31, buildStatus: 'failing', platform: 'iOS',         team: 2,  updatedAt: Date.now() - 900000  },
  { id: 5, title: 'Nexus Tactical',       type: 'game',   engine: 'Godot 4',  progress: 60, buildStatus: 'passing', platform: 'PC/Linux',    team: 5,  updatedAt: Date.now() - 600000  },
  { id: 6, title: '3D Portfolio Scene',   type: '3d',     engine: 'Blender',  progress: 95, buildStatus: 'passing', platform: 'Web/WebGL',   team: 1,  updatedAt: Date.now() - 300000  },
];

const MOCK_ACHIEVEMENTS = [
  { id: 1,  name: 'First Commit',          desc: 'Made your first code commit',          xp: 50,  unlocked: true },
  { id: 2,  name: 'Alpha Released',        desc: 'Released an alpha build',              xp: 200, unlocked: true },
  { id: 3,  name: '1K Downloads',          desc: 'Reached 1,000 downloads',             xp: 500, unlocked: true },
  { id: 4,  name: 'Multiplayer Ready',     desc: 'Implemented multiplayer networking',   xp: 300, unlocked: false },
  { id: 5,  name: 'Cross-Platform Ship',   desc: 'Released on 3+ platforms',            xp: 750, unlocked: false },
  { id: 6,  name: 'Console Certified',     desc: 'Passed console certification',         xp: 1000,unlocked: false },
  { id: 7,  name: 'Speedrunner',           desc: 'Completed a sprint in < 24h',         xp: 100, unlocked: true },
  { id: 8,  name: 'Bug Squasher',          desc: 'Closed 100 bug reports',              xp: 150, unlocked: true },
];

const STYLE = `
.gd-wrap{background:var(--an-bg,#0f172a);color:var(--an-text,#e2e8f0);min-height:100vh;font-family:system-ui,sans-serif;padding:1rem;}
.gd-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:.5rem;}
.gd-title{font-size:1.4rem;font-weight:700;display:flex;align-items:center;gap:.5rem;}
.gd-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap;}
.gd-tab{padding:.4rem .9rem;border-radius:.5rem;cursor:pointer;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:.8rem;}
.gd-tab.active{background:#8b5cf6;color:#fff;border-color:#8b5cf6;}
.gd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;}
.gd-card{background:#1e293b;border:1px solid #334155;border-radius:.75rem;padding:1rem;}
.gd-badge{display:inline-block;padding:.15rem .5rem;border-radius:9999px;font-size:.7rem;font-weight:600;}
.gd-progress{height:.4rem;background:#334155;border-radius:9999px;overflow:hidden;margin:.4rem 0;}
.gd-progress-fill{height:100%;border-radius:9999px;transition:width .5s;}
.gd-xp-bar{height:.6rem;background:#334155;border-radius:9999px;overflow:hidden;margin:.3rem 0;}
.gd-xp-fill{height:100%;background:linear-gradient(90deg,#8b5cf6,#ec4899);border-radius:9999px;}
.gd-connector{display:flex;align-items:center;justify-content:space-between;padding:.75rem;background:#1e293b;border:1px solid #334155;border-radius:.75rem;margin-bottom:.5rem;}
.gd-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .7rem;border-radius:.5rem;border:none;cursor:pointer;font-size:.78rem;font-weight:600;}
.gd-btn-primary{background:#8b5cf6;color:#fff;}
.gd-btn-connected{background:#22c55e22;color:#22c55e;border:1px solid #22c55e;}
.gd-btn-disconnect{background:#ef444422;color:#ef4444;border:1px solid #ef4444;}
.gd-kanban{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;}
.gd-column{background:#1e293b;border:1px solid #334155;border-radius:.75rem;padding:.75rem;}
.gd-col-title{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:.5rem;}
.gd-task{background:#0f172a;border-radius:.5rem;padding:.5rem .75rem;margin-bottom:.4rem;font-size:.8rem;border-left:3px solid #8b5cf6;}
.gd-ach-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.75rem;}
.gd-ach-card{background:#1e293b;border:1px solid #334155;border-radius:.75rem;padding:.75rem;opacity:1;}
.gd-ach-card.locked{opacity:.5;filter:grayscale(.7);}
`;

const BUILD_COLORS = { passing: '#22c55e', failing: '#ef4444', building: '#eab308' };

function StatusBadge({ status }) {
  return <span className="gd-badge" style={{ background: BUILD_COLORS[status] + '22', color: BUILD_COLORS[status] }}>{status}</span>;
}

function ProjectCard({ project }) {
  const typeColors = { game: '#8b5cf6', vr: '#06b6d4', ar: '#f59e0b', '3d': '#ec4899' };
  return (
    <div className="gd-card" style={{ borderTop: `3px solid ${typeColors[project.type] || '#8b5cf6'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
        <strong style={{ fontSize: '.95rem' }}>{project.title}</strong>
        <StatusBadge status={project.buildStatus} />
      </div>
      <div style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: '.5rem' }}>
        {project.engine} · {project.platform} · {project.team} devs
      </div>
      <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Progress</div>
      <div className="gd-progress">
        <div className="gd-progress-fill" style={{ width: `${project.progress}%`, background: typeColors[project.type] }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem' }}>
        <span style={{ color: typeColors[project.type], fontWeight: 700 }}>{project.progress}%</span>
        <span style={{ color: '#64748b' }}>{new Date(project.updatedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

const KANBAN_COLS = [
  { title: 'Backlog',     tasks: ['Design UI mockups', 'Define milestone 3', 'Research WebXR APIs'] },
  { title: 'In Progress', tasks: ['Enemy AI behavior', 'Multiplayer sync', 'Asset pipeline'] },
  { title: 'Review',      tasks: ['Level 5 geometry', 'Audio engine integration'] },
  { title: 'Done',        tasks: ['Core gameplay loop', 'Player controller', 'Physics system'] },
];

export function GameDevTracker() {
  const [activeTab, setActiveTab] = useState('Projects');
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [achievements, setAchievements] = useState(MOCK_ACHIEVEMENTS);
  const [connectors, setConnectors] = useState(new Map(PLATFORMS.map(p => [p.id, { status: 'disconnected', connecting: false }])));
  const intervalRef = useRef(null);
  const styleInjected = useRef(false);

  if (!styleInjected.current) {
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
    styleInjected.current = true;
  }

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch { /* use mock */ }
  }, []);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch('/api/achievements');
      if (res.ok) setAchievements(await res.json());
    } catch { /* use mock */ }
  }, []);

  useEffect(() => {
    fetchProjects(); fetchAchievements();
    intervalRef.current = setInterval(fetchProjects, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchProjects, fetchAchievements]);

  const connectPlatform = async (platformId) => {
    setConnectors(m => { const next = new Map(m); next.set(platformId, { status: 'connecting', connecting: true }); return next; });
    await new Promise(r => setTimeout(r, 1500));
    setConnectors(m => { const next = new Map(m); next.set(platformId, { status: 'connected', connecting: false, connectedAt: new Date().toLocaleTimeString() }); return next; });
  };

  const disconnectPlatform = (platformId) => {
    setConnectors(m => { const next = new Map(m); next.set(platformId, { status: 'disconnected', connecting: false }); return next; });
  };

  const xpTotal = achievements.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);
  const xpMax   = achievements.reduce((s, a) => s + a.xp, 0);
  const level   = Math.floor(xpTotal / 500) + 1;

  const arProjects = projects.filter(p => p.type === 'ar');
  const vrProjects = projects.filter(p => p.type === 'vr');
  const tdProjects = projects.filter(p => p.type === '3d');

  return (
    <div className="gd-wrap">
      <div className="gd-header">
        <div className="gd-title"><Gamepad2 size={22} color="#8b5cf6" /> Game Dev Tracker</div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="gd-btn gd-btn-primary" onClick={fetchProjects}><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      <div className="gd-tabs">
        {TABS.map(t => (
          <button key={t} className={`gd-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {activeTab === 'Projects' && (
        <div className="gd-grid">{projects.map(p => <ProjectCard key={p.id} project={p} />)}</div>
      )}

      {activeTab === 'Builds' && (
        <>
          <div className="gd-card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '.75rem' }}>Milestone Tracker</div>
            <div className="gd-kanban">
              {KANBAN_COLS.map(col => (
                <div key={col.title} className="gd-column">
                  <div className="gd-col-title">{col.title} <span style={{ color: '#3b82f6' }}>({col.tasks.length})</span></div>
                  {col.tasks.map(t => <div key={t} className="gd-task">{t}</div>)}
                </div>
              ))}
            </div>
          </div>
          <div className="gd-grid">
            {projects.map(p => (
              <div key={p.id} className="gd-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '.85rem' }}>{p.title}</strong>
                  <StatusBadge status={p.buildStatus} />
                </div>
                <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: '.3rem' }}>{p.engine}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'Achievements' && (
        <>
          <div className="gd-card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><strong>Level {level}</strong> · {xpTotal.toLocaleString()} XP</div>
              <span className="gd-badge" style={{ background: '#8b5cf622', color: '#8b5cf6' }}>
                <Trophy size={12} style={{ display: 'inline', marginRight: 3 }} /> {achievements.filter(a => a.unlocked).length}/{achievements.length} Unlocked
              </span>
            </div>
            <div className="gd-xp-bar"><div className="gd-xp-fill" style={{ width: `${(xpTotal / xpMax) * 100}%` }} /></div>
            <div style={{ fontSize: '.73rem', color: '#94a3b8' }}>{xpTotal} / {xpMax} XP to next prestige</div>
          </div>
          <div className="gd-ach-grid">
            {achievements.map(a => (
              <div key={a.id} className={`gd-ach-card${a.unlocked ? '' : ' locked'}`}>
                <div style={{ fontSize: '1.3rem', marginBottom: '.3rem' }}>{a.unlocked ? '🏆' : '🔒'}</div>
                <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{a.name}</div>
                <div style={{ fontSize: '.75rem', color: '#94a3b8', margin: '.2rem 0' }}>{a.desc}</div>
                <span className="gd-badge" style={{ background: '#8b5cf622', color: '#8b5cf6' }}>+{a.xp} XP</span>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'AR/VR' && (
        <>
          {[{ label: '🥽 VR Projects', items: vrProjects, color: '#06b6d4' },
            { label: '📱 AR Projects', items: arProjects, color: '#f59e0b' },
            { label: '🧊 3D Assets',   items: tdProjects, color: '#ec4899' }].map(sec => (
            <div key={sec.label} style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '.75rem', color: sec.color }}>{sec.label} ({sec.items.length})</div>
              {sec.items.length === 0 && <div style={{ color: '#94a3b8', fontSize: '.85rem' }}>No projects yet — add one to get started.</div>}
              <div className="gd-grid">
                {sec.items.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          ))}
        </>
      )}

      {activeTab === 'Connectors' && (
        <div>
          {PLATFORMS.map(p => {
            const conn = connectors.get(p.id) || { status: 'disconnected' };
            return (
              <div key={p.id} className="gd-connector">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>{p.desc}</div>
                    {conn.connectedAt && <div style={{ fontSize: '.7rem', color: '#22c55e' }}>Connected at {conn.connectedAt}</div>}
                  </div>
                </div>
                <div>
                  {conn.status === 'connected'
                    ? <button className="gd-btn gd-btn-disconnect" onClick={() => disconnectPlatform(p.id)}><X size={13} /> Disconnect</button>
                    : <button className="gd-btn gd-btn-primary" onClick={() => connectPlatform(p.id)} disabled={conn.connecting}>
                        {conn.connecting ? <RefreshCw size={13} /> : <Play size={13} />}
                        {conn.connecting ? 'Connecting…' : 'Connect'}
                      </button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GameDevTracker;
