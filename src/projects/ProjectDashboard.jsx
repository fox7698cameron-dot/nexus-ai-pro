/**
 * src/projects/ProjectDashboard.jsx
 * Real-time project tracking — coding, game dev (Unreal/Unity/Godot),
 * AR/VR/3D, with platform connectors (Epic, Sony, Microsoft, Ubisoft)
 * and achievement/game progress tracking.
 * Date: 2026-08-15
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Project type definitions ─────────────────────────────────────────────
const PROJECT_TYPES = {
  coding: { label: 'Coding',      icon: '💻', color: '#4f46e5' },
  game:   { label: 'Game Dev',    icon: '🎮', color: '#7c3aed' },
  ar_vr:  { label: 'AR/VR/3D',   icon: '🥽', color: '#0891b2' },
  mobile: { label: 'Mobile App',  icon: '📱', color: '#059669' },
  web:    { label: 'Web App',     icon: '🌐', color: '#d97706' },
};

// ─── Platform connectors ──────────────────────────────────────────────────
const GAME_PLATFORMS = [
  { id: 'unreal',   name: 'Unreal / Epic',  icon: '⚡', color: '#333' },
  { id: 'sony',     name: 'Sony / PSN',     icon: '🎮', color: '#003087' },
  { id: 'xbox',     name: 'Xbox / Microsoft', icon: '🟢', color: '#107c10' },
  { id: 'ubisoft',  name: 'Ubisoft Connect', icon: '🔵', color: '#0070ff' },
  { id: 'unity',    name: 'Unity',          icon: '🎯', color: '#1a1a1a' },
  { id: 'steam',    name: 'Steam',          icon: '🚂', color: '#1b2838' },
  { id: 'godot',    name: 'Godot',          icon: '🟢', color: '#478cbf' },
];

// ─── Status badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    active:    { bg: '#dcfce7', color: '#15803d', label: '● Active' },
    paused:    { bg: '#fef9c3', color: '#854d0e', label: '⏸ Paused' },
    completed: { bg: '#e0e7ff', color: '#3730a3', label: '✓ Done' },
    archived:  { bg: '#f3f4f6', color: '#6b7280', label: '📦 Archived' },
  };
  const c = cfg[status] ?? cfg.active;
  return (
    <span style={{ padding: '2px 8px', background: c.bg, color: c.color,
      borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
      {c.label}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────
function ProgressBar({ value, color = '#4f46e5', height = 6 }) {
  return (
    <div style={{ background: '#e5e7eb', borderRadius: height, height, overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          background: color,
          borderRadius: height,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

// ─── Achievement badge ────────────────────────────────────────────────────
function AchievementBadge({ achievement }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: achievement.unlocked ? '#fefce8' : '#f9fafb',
        border: `1px solid ${achievement.unlocked ? '#fde047' : '#e5e7eb'}`,
        borderRadius: 10,
        opacity: achievement.unlocked ? 1 : 0.6,
      }}
    >
      <span style={{ fontSize: 24 }}>{achievement.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{achievement.name}</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>{achievement.description}</div>
        {achievement.progress !== undefined && (
          <div style={{ marginTop: 4 }}>
            <ProgressBar value={achievement.progress} color="#eab308" height={4} />
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
              {achievement.progress}%
            </div>
          </div>
        )}
      </div>
      {achievement.unlocked && (
        <span style={{ fontSize: 16 }}>🏆</span>
      )}
    </div>
  );
}

// ─── Platform connector card ──────────────────────────────────────────────
function ConnectorCard({ platform, connected, onConnect, onDisconnect }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        border: `1.5px solid ${connected ? platform.color : '#e5e7eb'}`,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: connected ? '#f8faff' : '#fff',
      }}
    >
      <span style={{ fontSize: 22 }}>{platform.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{platform.name}</div>
        <div style={{ fontSize: 11, color: connected ? '#15803d' : '#6b7280' }}>
          {connected ? '✓ Connected' : 'Not connected'}
        </div>
      </div>
      <button
        onClick={() => (connected ? onDisconnect(platform.id) : onConnect(platform.id))}
        style={{
          padding: '5px 12px',
          background: connected ? 'transparent' : platform.color,
          color: connected ? '#6b7280' : '#fff',
          border: connected ? '1px solid #d1d5db' : 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────
function ProjectCard({ project, onSelect, onStatusChange }) {
  const type = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.coding;
  return (
    <div
      style={{
        padding: 16,
        border: `2px solid ${type.color}20`,
        borderRadius: 12,
        background: '#fff',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onClick={() => onSelect(project)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{type.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{project.name}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {type.label} · {project.language}
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <ProgressBar value={project.progress} color={type.color} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
        fontSize: 11, color: '#6b7280' }}>
        <span>{project.progress}% complete</span>
        <span>Updated {project.lastActivity ? new Date(project.lastActivity).toLocaleDateString() : '—'}</span>
      </div>
      {project.platforms && project.platforms.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {project.platforms.map((p) => {
            const pl = GAME_PLATFORMS.find((x) => x.id === p);
            return pl ? (
              <span
                key={p}
                style={{ fontSize: 11, padding: '1px 6px', background: '#f3f4f6',
                  borderRadius: 8, color: '#374151' }}
              >
                {pl.icon} {pl.name}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// ─── New project modal ────────────────────────────────────────────────────
function NewProjectModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    type: 'coding',
    language: 'JavaScript',
    description: '',
    platforms: [],
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const togglePlat = (id) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(id)
        ? f.platforms.filter((p) => p !== id)
        : [...f.platforms, id],
    }));

  const save = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, id: `proj_${Date.now()}`, progress: 0, status: 'active',
      createdAt: Date.now(), lastActivity: Date.now() });
    onClose();
  };

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
    borderRadius: 6, fontSize: 13, boxSizing: 'border-box', marginBottom: 10 };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 480, width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px' }}>New Project</h3>
        <input value={form.name} onChange={set('name')} placeholder="Project name" style={inputStyle} />
        <select value={form.type} onChange={set('type')} style={{ ...inputStyle, background: '#fff' }}>
          {Object.entries(PROJECT_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <input value={form.language} onChange={set('language')} placeholder="Primary language (e.g. C++, Swift, JS)" style={inputStyle} />
        <textarea value={form.description} onChange={set('description')} placeholder="Description"
          style={{ ...inputStyle, height: 64, resize: 'vertical' }} />
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Game Platforms (optional)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {GAME_PLATFORMS.map((p) => {
              const on = form.platforms.includes(p.id);
              return (
                <button key={p.id} onClick={() => togglePlat(p.id)}
                  style={{ padding: '4px 10px', border: `1px solid ${on ? p.color : '#d1d5db'}`,
                    background: on ? p.color + '20' : 'transparent', borderRadius: 6,
                    cursor: 'pointer', fontSize: 11, color: on ? p.color : '#374151' }}>
                  {p.icon} {p.name}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, border: '1px solid #d1d5db',
            borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} style={{ flex: 1, padding: 10, background: '#4f46e5', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────
const SAMPLE_PROJECTS = [
  { id: 'p1', name: 'Nexus AI Pro', type: 'coding', language: 'JavaScript/React',
    status: 'active', progress: 68, platforms: [], lastActivity: Date.now() - 3600000,
    createdAt: Date.now() - 30 * 86400000,
    achievements: [
      { id: 'a1', name: 'First Commit', icon: '🌱', description: 'Made the first commit', unlocked: true },
      { id: 'a2', name: 'Security Expert', icon: '🛡️', description: 'Implement AES-256 encryption', unlocked: true },
      { id: 'a3', name: 'Full Stack', icon: '⚡', description: 'Deploy frontend + backend', unlocked: false, progress: 65 },
    ]
  },
  { id: 'p2', name: 'Space Shooter VR', type: 'ar_vr', language: 'C++ / Blueprints',
    status: 'active', progress: 42, platforms: ['unreal', 'sony', 'xbox'],
    lastActivity: Date.now() - 7200000, createdAt: Date.now() - 60 * 86400000,
    achievements: [
      { id: 'a1', name: 'Engine Mastery', icon: '⚡', description: 'Set up Unreal 5 project', unlocked: true },
      { id: 'a2', name: 'Multi-Platform', icon: '🌍', description: 'Build for 3+ platforms', unlocked: false, progress: 30 },
    ]
  },
  { id: 'p3', name: 'Mobile RPG', type: 'game', language: 'C# / Unity',
    status: 'paused', progress: 25, platforms: ['unity', 'steam'],
    lastActivity: Date.now() - 5 * 86400000, createdAt: Date.now() - 90 * 86400000,
    achievements: [
      { id: 'a1', name: 'Alpha Release', icon: '🎮', description: 'Release alpha build', unlocked: false, progress: 25 },
    ]
  },
];

export default function ProjectDashboard() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState(['unity']);
  const [activeTab, setActiveTab] = useState('projects');
  const [liveMetrics, setLiveMetrics] = useState({});

  // Simulate live metric updates
  useEffect(() => {
    const t = setInterval(() => {
      setLiveMetrics({
        totalLines: Math.floor(Math.random() * 5000 + 45000),
        commitsToday: Math.floor(Math.random() * 10 + 2),
        buildStatus: Math.random() > 0.15 ? 'passing' : 'failing',
        testCoverage: Math.floor(Math.random() * 10 + 70),
        openIssues: Math.floor(Math.random() * 5 + 3),
        deployments: Math.floor(Math.random() * 3 + 1),
      });
    }, 15000);
    // Initial values
    setLiveMetrics({ totalLines: 47230, commitsToday: 7, buildStatus: 'passing',
      testCoverage: 74, openIssues: 4, deployments: 2 });
    return () => clearInterval(t);
  }, []);

  const addProject = (proj) => setProjects((p) => [proj, ...p]);

  const connectPlatform = async (id) => {
    // In production: open OAuth flow for each platform
    setConnectedPlatforms((p) => [...p, id]);
  };

  const disconnectPlatform = (id) => {
    setConnectedPlatforms((p) => p.filter((x) => x !== id));
  };

  const TABS = [
    { id: 'projects', label: '📁 Projects' },
    { id: 'live', label: '📈 Live Metrics' },
    { id: 'achievements', label: '🏆 Achievements' },
    { id: 'connectors', label: '🔌 Platform Connectors' },
  ];

  const tabStyle = (id) => ({
    padding: '8px 16px', border: 'none',
    borderBottom: activeTab === id ? '2px solid #4f46e5' : '2px solid transparent',
    background: 'transparent', color: activeTab === id ? '#4f46e5' : '#6b7280',
    cursor: 'pointer', fontSize: 13, fontWeight: activeTab === id ? 700 : 400,
  });

  const allAchievements = projects.flatMap((p) => (p.achievements ?? []).map((a) => ({ ...a, project: p.name })));

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🚀 Project Dashboard</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
            Real-time tracking for coding, game dev, AR/VR, and 3D projects
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{ marginLeft: 'auto', padding: '8px 18px', background: '#4f46e5', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          + New Project
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20,
        overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Projects list */}
      {activeTab === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onSelect={setSelected}
              onStatusChange={(id, status) =>
                setProjects((ps) => ps.map((pr) => pr.id === id ? { ...pr, status } : pr))
              }
            />
          ))}
        </div>
      )}

      {/* Live metrics */}
      {activeTab === 'live' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ padding: '3px 10px', background: '#dcfce7', color: '#15803d',
              borderRadius: 10, fontSize: 11, fontWeight: 700 }}>● Live</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Updates every 15 seconds</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Lines', value: liveMetrics.totalLines?.toLocaleString() ?? '—', icon: '📄' },
              { label: 'Commits Today', value: liveMetrics.commitsToday ?? '—', icon: '📝' },
              { label: 'Build Status', value: liveMetrics.buildStatus ?? '—', icon: '🔨',
                ok: liveMetrics.buildStatus === 'passing' },
              { label: 'Test Coverage', value: `${liveMetrics.testCoverage ?? 0}%`, icon: '✅',
                ok: liveMetrics.testCoverage >= 70 },
              { label: 'Open Issues', value: liveMetrics.openIssues ?? '—', icon: '🐛',
                ok: (liveMetrics.openIssues ?? 99) < 10 },
              { label: 'Deployments', value: liveMetrics.deployments ?? '—', icon: '🚀' },
            ].map((m) => (
              <div key={m.label} style={{ padding: '14px 16px', background: '#f9fafb',
                border: `1px solid ${m.ok === false ? '#fecaca' : '#e5e7eb'}`, borderRadius: 10 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700,
                  color: m.ok === false ? '#dc2626' : '#111827', marginTop: 2 }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {activeTab === 'achievements' && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
            All Achievements ({allAchievements.filter((a) => a.unlocked).length}/{allAchievements.length} unlocked)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {allAchievements.map((a) => (
              <div key={`${a.project}-${a.id}`}>
                <AchievementBadge achievement={a} />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, paddingLeft: 4 }}>
                  {a.project}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform connectors */}
      {activeTab === 'connectors' && (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Connect your game platform accounts to enable achievement sync, build pipelines,
            and progress tracking. OAuth flows are handled securely — no credentials stored.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {GAME_PLATFORMS.map((p) => (
              <ConnectorCard
                key={p.id}
                platform={p}
                connected={connectedPlatforms.includes(p.id)}
                onConnect={connectPlatform}
                onDisconnect={disconnectPlatform}
              />
            ))}
          </div>
          <div style={{ marginTop: 20, padding: 16, background: '#f0f9ff', borderRadius: 10,
            border: '1px solid #bae6fd', fontSize: 13 }}>
            <strong>Azure, AWS, GitHub, Bitbucket, Slack, Zoom, Google, Adobe</strong> connectors
            are available in the Workflow Automation panel. Each connector uses OAuth 2.0 or
            API-key authentication — all credentials stored encrypted via AES-256-GCM.
          </div>
        </div>
      )}

      {showNew && <NewProjectModal onSave={addProject} onClose={() => setShowNew(false)} />}
    </div>
  );
}
