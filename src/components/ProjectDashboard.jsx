// src/components/ProjectDashboard.jsx
// Created: 2026-10-19
// Real-time project tracking — coding, game development, AR/VR/3D

import React, { useState, useEffect, useCallback } from 'react';
import {
  Code2, Gamepad2, Box, Plus, X, Activity, CheckCircle2,
  PauseCircle, Clock, Trophy, Target, Cpu, Layers,
  Monitor, Smartphone, ChevronDown, ChevronRight, RefreshCw,
  GitBranch, TestTube, Zap, Globe, Star, Award
} from 'lucide-react';

// ── constants ──────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  { key: 'all',    label: 'All',           icon: Layers  },
  { key: 'coding', label: 'Coding',        icon: Code2   },
  { key: 'game',   label: 'Game Dev',      icon: Gamepad2 },
  { key: 'arvr',   label: 'AR / VR / 3D', icon: Box     },
];

const STATUS_META = {
  active:   { label: 'Active',   color: '#22c55e', icon: Activity     },
  paused:   { label: 'Paused',   color: '#f59e0b', icon: PauseCircle  },
  complete: { label: 'Complete', color: '#6366f1', icon: CheckCircle2 },
};

const GAME_ENGINES = [
  { key: 'unreal',     label: 'Unreal Engine',  color: '#0a0a0a', accent: '#1f8fe4' },
  { key: 'epic',       label: 'Epic Games',     color: '#313131', accent: '#c8c8c8' },
  { key: 'sony',       label: 'PlayStation',    color: '#003087', accent: '#0070d1' },
  { key: 'microsoft',  label: 'Xbox / MS',      color: '#107c10', accent: '#52b043' },
  { key: 'ubisoft',    label: 'Ubisoft Connect',color: '#1b1b2f', accent: '#2f95e0' },
];

const XR_PLATFORMS = ['Meta Quest', 'Apple Vision Pro', 'SteamVR', 'PlayStation VR2', 'HoloLens'];

const DEMO_ACHIEVEMENTS = [
  { id: 'a1', title: 'First Commit',      icon: '🚀', description: 'Pushed your first commit',        unlocked: true  },
  { id: 'a2', title: '100% Coverage',     icon: '🧪', description: 'Achieved 100% test coverage',     unlocked: false },
  { id: 'a3', title: 'Ship It',           icon: '📦', description: 'Published a production release',  unlocked: true  },
  { id: 'a4', title: 'Bug Slayer',        icon: '🐛', description: 'Closed 50 bug issues',            unlocked: true  },
  { id: 'a5', title: 'Speed Demon',       icon: '⚡', description: 'Maintained 60+ FPS in build',    unlocked: false },
  { id: 'a6', title: 'Multi-Platform',    icon: '🌍', description: 'Shipped on 3+ platforms',        unlocked: false },
];

const DEMO_PROJECTS = [
  {
    id: 'p1', type: 'coding', name: 'Nexus AI Pro', status: 'active', progress: 72,
    language: 'JavaScript / React', framework: 'Express + Vite', buildStatus: 'passing',
    testCoverage: 68, lastUpdated: Date.now() - 1_800_000,
    description: 'Full-stack AI platform with multi-model support',
    tags: ['AI', 'React', 'Node.js'],
  },
  {
    id: 'p2', type: 'game', name: 'Shadow Realm RPG', status: 'active', progress: 41,
    engine: 'unreal', buildStatus: 'passing',
    targetPlatforms: ['PC', 'PlayStation 5', 'Xbox Series X'], version: '0.3.2-alpha',
    lastUpdated: Date.now() - 7_200_000,
    description: 'Open-world action RPG with procedural dungeons',
    tags: ['RPG', 'Unreal', 'Multiplayer'],
  },
  {
    id: 'p3', type: 'arvr', name: 'VR Training Sim', status: 'paused', progress: 28,
    xrPlatforms: ['Meta Quest', 'SteamVR'], polygonTarget: 500_000,
    fpsTarget: 90, lastUpdated: Date.now() - 86_400_000,
    description: 'Enterprise VR training environment',
    tags: ['VR', 'Unity', 'Enterprise'],
  },
  {
    id: 'p4', type: 'coding', name: 'Analytics SDK', status: 'complete', progress: 100,
    language: 'TypeScript', framework: 'Node.js', buildStatus: 'passing',
    testCoverage: 94, lastUpdated: Date.now() - 259_200_000,
    description: 'Real-time analytics SDK for social platforms',
    tags: ['SDK', 'TypeScript', 'Analytics'],
  },
];

// ── helpers ────────────────────────────────────────────────────────────────

function relTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)   return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function ProgressBar({ value, color = '#6366f1' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  );
}

function Tag({ label }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontWeight: 500 }}>
      {label}
    </span>
  );
}

function EngineConnectorPanel() {
  const [connected, setConnected] = useState({});
  const toggle = (key) => setConnected(c => ({ ...c, [key]: !c[key] }));
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Engine & Platform Connectors</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GAME_ENGINES.map(e => (
          <div key={e.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${connected[e.key] ? e.accent + '66' : 'rgba(255,255,255,0.06)'}` }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: connected[e.key] ? e.accent : '#f1f5f9' }}>{e.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {connected[e.key] ? 'Connected — syncing project data' : 'Not connected'}
              </div>
            </div>
            <button
              onClick={() => toggle(e.key)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: connected[e.key] ? 'rgba(239,68,68,0.2)' : e.accent,
                color: connected[e.key] ? '#ef4444' : '#fff',
              }}
            >
              {connected[e.key] ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12, marginBottom: 0 }}>
        Connectors authenticate via OAuth. No tokens are stored server-side.
      </p>
    </div>
  );
}

function ProjectCard({ project, onSelect, active }) {
  const sm = STATUS_META[project.status];
  const StatusIcon = sm.icon;
  const typeColor = project.type === 'coding' ? '#6366f1' : project.type === 'game' ? '#f43f5e' : '#f59e0b';

  return (
    <div
      onClick={() => onSelect(project.id)}
      style={{
        background: active ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? '#6366f150' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12,
        padding: 18,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
          <div style={{ fontSize: 11, color: typeColor, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{project.type}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: sm.color }}>
          <StatusIcon size={12} /> {sm.label}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 12px', lineHeight: 1.5 }}>{project.description}</p>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
          <span>Progress</span><span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={typeColor} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {(project.tags ?? []).map(t => <Tag key={t} label={t} />)}
      </div>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={10} /> {relTime(project.lastUpdated)}
      </div>
    </div>
  );
}

function ProjectDetail({ project }) {
  if (!project) return null;
  const typeColor = project.type === 'coding' ? '#6366f1' : project.type === 'game' ? '#f43f5e' : '#f59e0b';

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: typeColor }}>{project.name} — Details</h3>

      {project.type === 'coding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Language',       value: project.language,    icon: Code2 },
            { label: 'Framework',      value: project.framework,   icon: Layers },
            { label: 'Build Status',   value: project.buildStatus, icon: GitBranch, color: project.buildStatus === 'passing' ? '#22c55e' : '#ef4444' },
            { label: 'Test Coverage',  value: `${project.testCoverage}%`, icon: TestTube, color: project.testCoverage >= 80 ? '#22c55e' : project.testCoverage >= 60 ? '#f59e0b' : '#ef4444' },
          ].map(({ label, value, icon: Icon, color = 'rgba(255,255,255,0.8)' }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                <Icon size={13} /> {label}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Test Coverage</div>
            <ProgressBar value={project.testCoverage} color={project.testCoverage >= 80 ? '#22c55e' : '#f59e0b'} />
          </div>
        </div>
      )}

      {project.type === 'game' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Engine',           value: GAME_ENGINES.find(e => e.key === project.engine)?.label ?? project.engine, icon: Gamepad2 },
            { label: 'Version',          value: project.version,        icon: GitBranch },
            { label: 'Build Status',     value: project.buildStatus,    icon: Activity, color: project.buildStatus === 'passing' ? '#22c55e' : '#ef4444' },
          ].map(({ label, value, icon: Icon, color = 'rgba(255,255,255,0.8)' }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}><Icon size={13} /> {label}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Target Platforms</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(project.targetPlatforms ?? []).map(p => <Tag key={p} label={p} />)}
            </div>
          </div>
        </div>
      )}

      {project.type === 'arvr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Polygon Target',  value: project.polygonTarget?.toLocaleString() ?? '—', icon: Box },
            { label: 'FPS Target',      value: `${project.fpsTarget ?? '—'} fps`, icon: Zap, color: '#22c55e' },
          ].map(({ label, value, icon: Icon, color = 'rgba(255,255,255,0.8)' }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}><Icon size={13} /> {label}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>XR Platforms</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(project.xrPlatforms ?? []).map(p => <Tag key={p} label={p} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AchievementsPanel() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Trophy size={15} color="#fbbf24" /> Achievements
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          {DEMO_ACHIEVEMENTS.filter(a => a.unlocked).length}/{DEMO_ACHIEVEMENTS.length}
        </span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEMO_ACHIEVEMENTS.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: a.unlocked ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${a.unlocked ? '#fbbf2430' : 'rgba(255,255,255,0.05)'}`, opacity: a.unlocked ? 1 : 0.5 }}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: a.unlocked ? '#fbbf24' : 'rgba(255,255,255,0.6)' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{a.description}</div>
            </div>
            {a.unlocked && <Award size={16} color="#fbbf24" style={{ marginLeft: 'auto' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── New project form ────────────────────────────────────────────────────────

function NewProjectForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({
      id: `p${Date.now()}`,
      ...form,
      status: 'active',
      progress: 0,
      testCoverage: 0,
      buildStatus: 'pending',
      lastUpdated: Date.now(),
      tags: [form.type],
    });
    onClose();
  };
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' };
  return (
    <form onSubmit={submit} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid #6366f150', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>New Project</h4>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={16} /></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input style={inputStyle} placeholder="Project name" value={form.name} onChange={e => set('name', e.target.value)} required />
        <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="coding">Coding</option>
          <option value="game">Game Development</option>
          <option value="arvr">AR / VR / 3D</option>
        </select>
        <input style={inputStyle} placeholder="Short description" value={form.description} onChange={e => set('description', e.target.value)} />
        <button type="submit" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          Create Project
        </button>
      </div>
    </form>
  );
}

// ── main component ──────────────────────────────────────────────────────────

export default function ProjectDashboard({ socket }) {
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [filter, setFilter]     = useState('all');
  const [selectedId, setSelectedId] = useState(DEMO_PROJECTS[0]?.id ?? null);
  const [showNew, setShowNew]   = useState(false);
  const [liveStats, setLiveStats] = useState({});

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      if (payload.projects) setLiveStats(payload.projects);
    };
    socket.on('projects:update', handler);
    return () => socket.off('projects:update', handler);
  }, [socket]);

  const addProject = useCallback((p) => {
    setProjects(prev => [p, ...prev]);
    setSelectedId(p.id);
  }, []);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter);
  const selected  = projects.find(p => p.id === selectedId);

  const containerStyle = {
    background: 'var(--bg-primary, #0f1117)',
    color: 'var(--text-primary, #f1f5f9)',
    minHeight: '100vh',
    padding: 24,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={22} color="#6366f1" /> Project Tracker
        </h2>
        <button onClick={() => setShowNew(s => !s)} style={{ background: '#6366f1', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {PROJECT_TYPES.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setFilter(key)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: filter === key ? '#6366f1' : 'rgba(255,255,255,0.07)', color: '#fff', fontWeight: filter === key ? 700 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {showNew && <NewProjectForm onAdd={addProject} onClose={() => setShowNew(false)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No projects found</div>
          ) : (
            filtered.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={setSelectedId} active={selectedId === p.id} />
            ))
          )}
        </div>

        {/* Detail pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ProjectDetail project={selected} />
          <EngineConnectorPanel />
          <AchievementsPanel />
        </div>
      </div>
    </div>
  );
}
