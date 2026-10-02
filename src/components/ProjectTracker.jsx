/**
 * ProjectTracker.jsx
 * Real-time project tracking for:
 *   – Coding / software development
 *   – Game development (Unreal, Unity, Godot)
 *   – AR / VR / 3D projects
 * Connectors: Unreal, Epic Games, Sony, Microsoft, Ubisoft
 * Achievement & game progress tracking included.
 * Created: 2026-10-02
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Project categories ─────────────────────────────────────────
const CATEGORIES = {
  coding: {
    label: 'Coding / Software',
    emoji: '💻',
    color: '#3b82f6',
    statuses: ['planning', 'in-progress', 'review', 'done', 'blocked'],
    connectors: ['github', 'bitbucket', 'azure', 'gitlab'],
  },
  gamedev: {
    label: 'Game Dev',
    emoji: '🎮',
    color: '#8b5cf6',
    statuses: ['pre-production', 'production', 'alpha', 'beta', 'gold', 'live'],
    connectors: ['unreal', 'unity', 'godot', 'epicgames'],
  },
  arvr: {
    label: 'AR / VR / 3D',
    emoji: '🥽',
    color: '#10b981',
    statuses: ['concept', 'prototyping', 'development', 'testing', 'shipped'],
    connectors: ['unreal', 'unity', 'blender', 'openxr'],
  },
};

// ── Platform / publisher connectors ───────────────────────────
const PLATFORM_CONNECTORS = {
  unreal: { label: 'Unreal Engine', emoji: '🎯', url: 'https://dev.epicgames.com' },
  epicgames: { label: 'Epic Games Store', emoji: '🛒', url: 'https://dev.epicgames.com' },
  sony: { label: 'PlayStation', emoji: '🎮', url: 'https://partners.playstation.net' },
  microsoft: { label: 'Xbox / ID@Xbox', emoji: '🟩', url: 'https://developer.microsoft.com/games' },
  ubisoft: { label: 'Ubisoft Connect', emoji: '🔷', url: 'https://developers.ubisoft.com' },
  github: { label: 'GitHub', emoji: '🐙', url: 'https://github.com' },
  bitbucket: { label: 'Bitbucket', emoji: '🔵', url: 'https://bitbucket.org' },
  azure: { label: 'Azure DevOps', emoji: '☁️', url: 'https://dev.azure.com' },
};

// ── Status pill ────────────────────────────────────────────────
const STATUS_COLORS = {
  planning: '#6b7280',
  'pre-production': '#6b7280',
  concept: '#6b7280',
  'in-progress': '#3b82f6',
  production: '#3b82f6',
  prototyping: '#3b82f6',
  development: '#8b5cf6',
  review: '#f59e0b',
  alpha: '#f59e0b',
  testing: '#f59e0b',
  beta: '#fb923c',
  done: '#10b981',
  gold: '#10b981',
  live: '#10b981',
  shipped: '#10b981',
  blocked: '#ef4444',
};

function StatusPill({ status }) {
  const color = STATUS_COLORS[status] ?? '#6b7280';
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 700,
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// ── Progress bar ───────────────────────────────────────────────
function ProgressBar({ pct, color = '#3b82f6' }) {
  return (
    <div
      style={{
        background: 'var(--border, rgba(255,255,255,0.1))',
        borderRadius: 99,
        height: 6,
        overflow: 'hidden',
        marginTop: 4,
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: '100%',
          background: color,
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

// ── Achievement badge ──────────────────────────────────────────
function AchievementBadge({ achievement }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 8,
        background: achievement.unlocked
          ? 'rgba(245,158,11,0.1)'
          : 'var(--card-bg, rgba(255,255,255,0.04))',
        border: `1px solid ${achievement.unlocked ? '#f59e0b55' : 'var(--border, rgba(255,255,255,0.08))'}`,
        opacity: achievement.unlocked ? 1 : 0.5,
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 20 }}>{achievement.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text, #f9fafb)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {achievement.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted, #9ca3af)' }}>{achievement.description}</div>
        {!achievement.unlocked && achievement.progress !== undefined && (
          <ProgressBar pct={achievement.progress} color="#f59e0b" />
        )}
      </div>
      {achievement.unlocked && (
        <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>✓</span>
      )}
    </div>
  );
}

// ── Demo project data factory ──────────────────────────────────
let _idSeed = 1;
function makeProject(overrides = {}) {
  const id = `proj-${_idSeed++}`;
  return {
    id,
    name: overrides.name ?? `Project ${id}`,
    category: overrides.category ?? 'coding',
    status: overrides.status ?? 'in-progress',
    progress: overrides.progress ?? Math.round(Math.random() * 80 + 10),
    platform: overrides.platform ?? null,
    connector: overrides.connector ?? null,
    description: overrides.description ?? '',
    commits: Math.round(Math.random() * 300),
    issues: Math.round(Math.random() * 40),
    builds: Math.round(Math.random() * 100),
    lastActivity: Date.now() - Math.round(Math.random() * 3_600_000),
    achievements: overrides.achievements ?? [],
  };
}

const DEMO_PROJECTS = [
  makeProject({ name: 'Nexus AI Pro', category: 'coding', status: 'in-progress', progress: 72, connector: 'github' }),
  makeProject({ name: 'Shadow Realm VR', category: 'gamedev', status: 'beta', progress: 58, connector: 'unreal', platform: 'epicgames' }),
  makeProject({ name: 'AR Commerce SDK', category: 'arvr', status: 'development', progress: 35, connector: 'unity' }),
  makeProject({ name: 'Space Shooter', category: 'gamedev', status: 'gold', progress: 100, connector: 'unity', platform: 'sony' }),
  makeProject({ name: 'Cloud Dashboard', category: 'coding', status: 'review', progress: 89, connector: 'azure' }),
];

const DEMO_ACHIEVEMENTS = [
  { id: 'a1', icon: '🚀', title: 'First Build', description: 'Complete your first build', unlocked: true },
  { id: 'a2', icon: '🎯', title: '100 Commits', description: 'Push 100 commits', unlocked: true },
  { id: 'a3', icon: '🏆', title: 'Gold Release', description: 'Ship a gold build', unlocked: true },
  { id: 'a4', icon: '🌐', title: 'Multi-Platform', description: 'Deploy to 3+ platforms', unlocked: false, progress: 66 },
  { id: 'a5', icon: '⚡', title: 'Speed Run', description: 'Close 10 issues in a day', unlocked: false, progress: 40 },
  { id: 'a6', icon: '🛡️', title: 'Zero Defects', description: 'Zero critical bugs in release', unlocked: false, progress: 80 },
];

// ── Project card ───────────────────────────────────────────────
function ProjectCard({ project, onSelect, isSelected }) {
  const cat = CATEGORIES[project.category];
  const conn = PLATFORM_CONNECTORS[project.connector];
  const plat = PLATFORM_CONNECTORS[project.platform];

  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${isSelected ? cat.color + '88' : 'var(--border, rgba(255,255,255,0.1))'}`,
        background: isSelected
          ? `${cat.color}14`
          : 'var(--card-bg, rgba(255,255,255,0.04))',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span>{cat.emoji}</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text, #f9fafb)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {project.name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusPill status={project.status} />
            {conn && <span style={{ fontSize: 10, color: 'var(--text-muted, #9ca3af)' }}>{conn.emoji} {conn.label}</span>}
            {plat && <span style={{ fontSize: 10, color: 'var(--text-muted, #9ca3af)' }}>{plat.emoji} {plat.label}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: cat.color }}>{project.progress}%</div>
        </div>
      </div>
      <ProgressBar pct={project.progress} color={cat.color} />
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>
        <span>📝 {project.commits} commits</span>
        <span>🐛 {project.issues} issues</span>
        <span>🔨 {project.builds} builds</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function ProjectTracker() {
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [selected, setSelected] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', category: 'coding', status: 'planning', connector: '' });

  // Real-time activity ticker
  const [ticker, setTicker] = useState('');
  useEffect(() => {
    const msgs = [
      '📦 Space Shooter: new build pushed',
      '🔀 Nexus AI Pro: PR #42 merged',
      '🐛 AR Commerce SDK: 2 issues resolved',
      '🏗️ Shadow Realm VR: asset build completed',
      '🚀 Cloud Dashboard: deployed to staging',
    ];
    let i = 0;
    const t = setInterval(() => {
      setTicker(msgs[i % msgs.length]);
      i++;
    }, 4_000);
    return () => clearInterval(t);
  }, []);

  const filtered = filterCat === 'all' ? projects : projects.filter((p) => p.category === filterCat);

  const addProject = () => {
    if (!newProject.name.trim()) return;
    const p = makeProject(newProject);
    setProjects((prev) => [p, ...prev]);
    setNewProject({ name: '', category: 'coding', status: 'planning', connector: '' });
    setShowAddForm(false);
  };

  const inputStyle = {
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid var(--border, rgba(255,255,255,0.15))',
    background: 'var(--input-bg, rgba(0,0,0,0.3))',
    color: 'var(--text, #f9fafb)',
    fontSize: 12,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', gap: 14, height: '100%', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text, #f9fafb)' }}>
            📁 Projects
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #3b82f6',
              background: '#3b82f620',
              color: '#3b82f6',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + New
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--card-bg, rgba(255,255,255,0.05))', borderRadius: 8, border: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
            <input
              style={inputStyle}
              placeholder="Project name"
              value={newProject.name}
              onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
            />
            <select
              style={inputStyle}
              value={newProject.category}
              onChange={(e) => setNewProject((p) => ({ ...p, category: e.target.value }))}
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
            <select
              style={inputStyle}
              value={newProject.connector}
              onChange={(e) => setNewProject((p) => ({ ...p, connector: e.target.value }))}
            >
              <option value="">No connector</option>
              {Object.entries(PLATFORM_CONNECTORS).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
            <button
              onClick={addProject}
              style={{ padding: '6px', borderRadius: 6, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              Create Project
            </button>
          </div>
        )}

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCat('all')}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              background: filterCat === 'all' ? 'var(--accent, #3b82f6)' : 'transparent',
              color: filterCat === 'all' ? '#fff' : 'var(--text-muted, #9ca3af)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilterCat(k)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: `1px solid ${filterCat === k ? v.color : 'var(--border, rgba(255,255,255,0.1))'}`,
                background: filterCat === k ? `${v.color}22` : 'transparent',
                color: filterCat === k ? v.color : 'var(--text-muted, #9ca3af)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {v.emoji} {v.label}
            </button>
          ))}
        </div>

        {/* Live ticker */}
        {ticker && (
          <div style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            🔴 {ticker}
          </div>
        )}

        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={setSelected}
              isSelected={selected?.id === p.id}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        {selected ? (
          <>
            {/* Project detail */}
            <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'var(--card-bg, rgba(255,255,255,0.04))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{CATEGORIES[selected.category].emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text, #f9fafb)' }}>{selected.name}</div>
                  <StatusPill status={selected.status} />
                </div>
              </div>
              <ProgressBar pct={selected.progress} color={CATEGORIES[selected.category].color} />
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>Progress: {selected.progress}%</div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
                {[
                  { l: 'Commits', v: selected.commits, e: '📝' },
                  { l: 'Open Issues', v: selected.issues, e: '🐛' },
                  { l: 'Builds', v: selected.builds, e: '🔨' },
                ].map((s) => (
                  <div key={s.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text, #f9fafb)' }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>{s.e} {s.l}</div>
                  </div>
                ))}
              </div>

              {/* Platform connectors */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #9ca3af)', marginBottom: 8 }}>
                  Platform Connectors
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIES[selected.category].connectors.map((cKey) => {
                    const c = PLATFORM_CONNECTORS[cKey];
                    if (!c) return null;
                    const active = selected.connector === cKey || selected.platform === cKey;
                    return (
                      <div
                        key={cKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 10px',
                          borderRadius: 7,
                          border: `1px solid ${active ? '#3b82f688' : 'var(--border, rgba(255,255,255,0.1))'}`,
                          background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                          fontSize: 11,
                          color: active ? '#3b82f6' : 'var(--text-muted, #9ca3af)',
                        }}
                      >
                        {c.emoji} {c.label}
                        {active && <span style={{ color: '#10b981', marginLeft: 2 }}>●</span>}
                      </div>
                    );
                  })}
                  {/* Always show game publisher connectors for gamedev */}
                  {selected.category === 'gamedev' &&
                    ['sony', 'microsoft', 'ubisoft'].map((cKey) => {
                      const c = PLATFORM_CONNECTORS[cKey];
                      if (!c) return null;
                      const active = selected.platform === cKey;
                      return (
                        <div
                          key={cKey}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 10px',
                            borderRadius: 7,
                            border: `1px solid ${active ? '#8b5cf688' : 'var(--border, rgba(255,255,255,0.1))'}`,
                            background: active ? 'rgba(139,92,246,0.1)' : 'transparent',
                            fontSize: 11,
                            color: active ? '#8b5cf6' : 'var(--text-muted, #9ca3af)',
                          }}
                        >
                          {c.emoji} {c.label}
                          {active && <span style={{ color: '#10b981', marginLeft: 2 }}>●</span>}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text, #f9fafb)', marginBottom: 8 }}>
                🏆 Achievements & Game Progress
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {DEMO_ACHIEVEMENTS.map((a) => (
                  <AchievementBadge key={a.id} achievement={a} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted, #9ca3af)', gap: 10 }}>
            <span style={{ fontSize: 40 }}>📁</span>
            <div style={{ fontSize: 14 }}>Select a project to view details</div>
          </div>
        )}
      </div>
    </div>
  );
}
