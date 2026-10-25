// src/dashboards/ProjectTrackingDashboard.jsx
// Updated: 2026-10-25
// Real-time project tracker: coding, game dev, AR/VR/3D
// Game dev connectors: Unreal, Epic, Sony, Microsoft, Ubisoft

import React, { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPES = [
  { id: 'coding', label: 'Coding', icon: '💻', color: '#6366f1' },
  { id: 'game', label: 'Game Dev', icon: '🎮', color: '#ec4899' },
  { id: 'ar', label: 'AR', icon: '🔮', color: '#8b5cf6' },
  { id: 'vr', label: 'VR', icon: '🥽', color: '#0ea5e9' },
  { id: '3d', label: '3D / Film', icon: '🎬', color: '#f59e0b' }
];

const ENGINES = ['unreal', 'unity', 'godot', 'blender', 'custom'];

const PLATFORMS_MAP = {
  epic: { name: 'Epic/Unreal', icon: '⚡', color: '#0078f2' },
  psn: { name: 'PlayStation', icon: '🎮', color: '#003087' },
  xbox: { name: 'Xbox', icon: '🟩', color: '#107c10' },
  ubisoft: { name: 'Ubisoft Connect', icon: '🔷', color: '#0056a6' },
  steam: { name: 'Steam', icon: '💨', color: '#1b2838' },
  itch: { name: 'itch.io', icon: '🕹️', color: '#fa5c5c' }
};

function ProgressBar({ value, color = '#6366f1', label }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{label}</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{value}%</span>
      </div>}
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, background: color, height: '100%', borderRadius: 20, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function MilestoneList({ milestones = [], onComplete }) {
  return (
    <div style={{ marginTop: 12 }}>
      {milestones.map(ms => (
        <div key={ms.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={() => !ms.completed && onComplete(ms.id)}
            style={{
              width: 20, height: 20, borderRadius: 6, border: `2px solid ${ms.completed ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
              background: ms.completed ? '#22c55e' : 'transparent', cursor: ms.completed ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
            }}
          >{ms.completed && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}</button>
          <span style={{ color: ms.completed ? 'rgba(255,255,255,0.35)' : '#fff', fontSize: 13, textDecoration: ms.completed ? 'line-through' : 'none', flex: 1 }}>
            {ms.name}
          </span>
          {ms.dueDate && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{new Date(ms.dueDate).toLocaleDateString()}</span>}
        </div>
      ))}
    </div>
  );
}

function MetricsRow({ metrics }) {
  const items = [
    { label: 'Commits', value: metrics?.commits || 0, icon: '📝' },
    { label: 'Builds', value: metrics?.builds || 0, icon: '🔨' },
    { label: 'Playtests', value: metrics?.playtests || 0, icon: '▶️' },
    { label: 'Bugs', value: metrics?.bugs || 0, icon: '🐛' },
    { label: 'Features', value: metrics?.features || 0, icon: '✨' }
  ];
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
      {items.map(({ label, value, icon }) => (
        <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 14px', minWidth: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{value}</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function AchievementBadge({ achievement }) {
  const isUnlocked = achievement.status === 'unlocked';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isUnlocked ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${isUnlocked ? 'rgba(234,179,8,0.3)' : 'transparent'}` }}>
      {achievement.iconUrl ? (
        <img src={achievement.iconUrl} alt="" width={32} height={32} style={{ borderRadius: 6 }} />
      ) : (
        <span style={{ fontSize: 28, filter: isUnlocked ? 'none' : 'grayscale(100%) opacity(0.3)' }}>{isUnlocked ? '🏆' : '🔒'}</span>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ color: isUnlocked ? '#fbbf24' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, margin: 0 }}>{achievement.name}</p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>{achievement.description}</p>
      </div>
      {achievement.rarity && (
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{achievement.rarity}%</span>
      )}
    </div>
  );
}

function ProjectCard({ project, onSelect, isSelected }) {
  const type = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  return (
    <button
      onClick={() => onSelect(project)}
      style={{
        background: isSelected ? `linear-gradient(135deg, ${type.color}33, ${type.color}11)` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isSelected ? type.color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', width: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{type.icon}</span>
        <div>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: 0 }}>{project.name}</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0 }}>{type.label} · {project.engine || 'Custom'}</p>
        </div>
      </div>
      <ProgressBar value={project.progress || 0} color={type.color} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {(project.platforms || []).map(p => (
          <span key={p} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 10, padding: '2px 8px', borderRadius: 12 }}>{p}</span>
        ))}
      </div>
    </button>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'coding', engine: '', platforms: [] });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1a2e', borderRadius: 20, padding: 32, width: 440, border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: '0 0 20px' }}>New Project</h2>
        <input
          placeholder="Project name"
          value={form.name}
          onChange={e => set('name')(e.target.value)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
        />
        <select
          value={form.type}
          onChange={e => set('type')(e.target.value)}
          style={{ width: '100%', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: 14, marginBottom: 12 }}
        >
          {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        {(form.type === 'game' || form.type === 'vr' || form.type === 'ar') && (
          <select
            value={form.engine}
            onChange={e => set('engine')(e.target.value)}
            style={{ width: '100%', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: 14, marginBottom: 12 }}
          >
            <option value="">Select engine</option>
            {ENGINES.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={() => { if (form.name) { onCreate(form); onClose(); } }}
            style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', cursor: 'pointer', fontWeight: 600 }}
          >Create</button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectTrackingDashboard() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    // Load projects from API or use demo data
    fetch('/api/projects', {
      headers: { Authorization: `Bearer ${localStorage.getItem('nexus:accessToken') || ''}` }
    }).then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.projects) setProjects(data.projects); else setProjects(generateDemoProjects()); })
      .catch(() => setProjects(generateDemoProjects()));

    fetch('/api/achievements', {
      headers: { Authorization: `Bearer ${localStorage.getItem('nexus:accessToken') || ''}` }
    }).then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.achievements) setAchievements(data.achievements); else setAchievements(generateDemoAchievements()); })
      .catch(() => setAchievements(generateDemoAchievements()));
  }, []);

  const createProject = useCallback(async (form) => {
    const newProject = {
      id: `proj_${Date.now()}`, ...form,
      progress: 0, milestones: [],
      metrics: { commits: 0, builds: 0, playtests: 0, bugs: 0, features: 0 },
      createdAt: Date.now()
    };
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:accessToken') || ''}` },
        body: JSON.stringify(form)
      });
      if (r.ok) { const d = await r.json(); setProjects(p => [d, ...p]); }
      else setProjects(p => [newProject, ...p]);
    } catch { setProjects(p => [newProject, ...p]); }
  }, []);

  const completeMilestone = useCallback((projectId, milestoneId) => {
    setProjects(ps => ps.map(p => {
      if (p.id !== projectId) return p;
      const milestones = p.milestones.map(m => m.id === milestoneId ? { ...m, completed: true } : m);
      const done = milestones.filter(m => m.completed).length;
      return { ...p, milestones, progress: Math.round((done / milestones.length) * 100) };
    }));
  }, []);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter);

  return (
    <div style={{ background: '#0d0d1a', minHeight: '100vh', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} onCreate={createProject} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 700, margin: 0 }}>Project Tracker</h1>
        <button
          onClick={() => setShowNewModal(true)}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >+ New Project</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setFilter('all')} style={{ background: filter === 'all' ? '#6366f1' : 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}>All</button>
        {PROJECT_TYPES.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{ background: filter === t.id ? t.color : 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) 2fr', gap: 24 }}>
        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '80vh', overflowY: 'auto' }}>
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onSelect={setSelected} isSelected={selected?.id === p.id} />
          ))}
          {filtered.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
              No {filter === 'all' ? '' : filter + ' '}projects yet
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{selected.name}</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
                  {PROJECT_TYPES.find(t => t.id === selected.type)?.label} · {selected.engine || 'Custom'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{selected.progress}%</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Complete</div>
              </div>
            </div>

            <ProgressBar value={selected.progress} label="Overall Progress" />
            <MetricsRow metrics={selected.metrics} />

            {/* Game platform connections */}
            {(selected.type === 'game' || selected.connectedPlatforms) && (
              <div style={{ marginTop: 24 }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>Platform Connections</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {Object.entries(PLATFORMS_MAP).map(([id, p]) => (
                    <div key={id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{p.icon}</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones */}
            {selected.milestones?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Milestones</p>
                <MilestoneList milestones={selected.milestones} onComplete={id => completeMilestone(selected.id, id)} />
              </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>Achievements</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {achievements.slice(0, 5).map(a => <AchievementBadge key={a.id} achievement={a} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 20, color: 'rgba(255,255,255,0.2)', fontSize: 15 }}>
            Select a project to view details
          </div>
        )}
      </div>
    </div>
  );
}

function generateDemoProjects() {
  return [
    { id: 'p1', name: 'Nexus Shooter', type: 'game', engine: 'unreal', platforms: ['xbox', 'psn', 'pc'], progress: 65, milestones: [
      { id: 'm1', name: 'Core gameplay loop', completed: true }, { id: 'm2', name: 'Multiplayer network', completed: true },
      { id: 'm3', name: 'Level design — 10 maps', completed: false }, { id: 'm4', name: 'Console submission', completed: false }
    ], metrics: { commits: 342, builds: 28, playtests: 15, bugs: 7, features: 23 } },
    { id: 'p2', name: 'AR Navigation App', type: 'ar', engine: 'unity', platforms: ['ios', 'android'], progress: 40, milestones: [
      { id: 'm5', name: 'ARKit integration', completed: true }, { id: 'm6', name: 'POI data layer', completed: false }
    ], metrics: { commits: 121, builds: 8, playtests: 3, bugs: 4, features: 9 } },
    { id: 'p3', name: 'VR Escape Room', type: 'vr', engine: 'unreal', platforms: ['pc', 'quest'], progress: 80, milestones: [
      { id: 'm7', name: 'Room 1 complete', completed: true }, { id: 'm8', name: 'Room 2 complete', completed: true },
      { id: 'm9', name: 'Room 3 complete', completed: false }
    ], metrics: { commits: 567, builds: 42, playtests: 30, bugs: 2, features: 34 } },
    { id: 'p4', name: 'Nexus AI Platform', type: 'coding', engine: '', platforms: ['web', 'desktop', 'mobile'], progress: 72, milestones: [
      { id: 'm10', name: 'Auth system', completed: true }, { id: 'm11', name: 'Payment integration', completed: false }
    ], metrics: { commits: 893, builds: 61, playtests: 0, bugs: 12, features: 45 } }
  ];
}

function generateDemoAchievements() {
  return [
    { id: 'a1', name: 'First Commit', description: 'Made your first code commit', status: 'unlocked', platform: 'github', rarity: 95 },
    { id: 'a2', name: 'Ship It!', description: 'Deployed to production', status: 'unlocked', platform: 'epic', rarity: 47 },
    { id: 'a3', name: 'Bug Hunter', description: 'Fixed 10 bugs in one session', status: 'locked', platform: 'xbox', rarity: 21 },
    { id: 'a4', name: 'Level Master', description: 'Completed all game levels', status: 'progress', platform: 'psn', rarity: 8 },
    { id: 'a5', name: 'Platinum Coder', description: '1000 commits on one project', status: 'locked', platform: 'github', rarity: 3 }
  ];
}
