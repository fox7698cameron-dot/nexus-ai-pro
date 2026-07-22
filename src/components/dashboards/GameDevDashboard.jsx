// src/components/dashboards/GameDevDashboard.jsx
// 2026-07-22 | Game/AR/VR/3D development tracking — projects, milestones, achievements, connectors

import { useState, useEffect } from 'react';

const TYPE_ICONS = {
  game: '🎮', vr: '🥽', ar: '📱', xr: '🔮', '3d': '🧊',
  mobile_game: '📲', indie: '💡', aaa: '🏆', mod: '🔧',
};

const ENGINE_COLORS = {
  unreal: '#0096e6', unity: '#111', godot: '#4a90d9', gamemaker: '#e04040',
  cryengine: '#2ecc71', custom: '#6366f1', bevy: '#f97316', o3de: '#10b981',
};

const CONNECTOR_ICONS = {
  unreal: '🔵', epic: '⚡', sony: '🔵', xbox: '💚', ubisoft: '🔷',
  steam: '🖤', unity: '⬛', godot: '🐾', itch: '🌸',
};

function ProgressBar({ value, color = '#6366f1', height = 6 }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', height }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value))}%`, height: '100%',
        background: color, borderRadius: 999, transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const icon = TYPE_ICONS[project.type] || '🎮';
  const statusColor = {
    planning: '#94a3b8', development: '#6366f1', testing: '#fbbf24',
    released: '#4ade80', cancelled: '#ef4444', paused: '#f97316',
  }[project.status] || '#6b7280';

  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 22, marginRight: 8 }}>{icon}</span>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{project.name}</span>
        </div>
        <span style={{ color: statusColor, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {project.status}
        </span>
      </div>
      {project.description && (
        <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{project.description}</div>
      )}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#9ca3af', fontSize: 11 }}>Progress</span>
          <span style={{ color: '#f1f5f9', fontSize: 11, fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {project.engine && (
          <span style={{
            background: `${ENGINE_COLORS[project.engine] || '#374151'}22`,
            color: ENGINE_COLORS[project.engine] || '#9ca3af',
            borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600,
            border: `1px solid ${ENGINE_COLORS[project.engine] || '#374151'}44`,
          }}>
            {project.engine}
          </span>
        )}
        {(project.targetPlatforms || []).map(p => (
          <span key={p} style={{
            background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
            borderRadius: 6, padding: '2px 8px', fontSize: 10,
          }}>{p}</span>
        ))}
      </div>
    </div>
  );
}

export default function GameDevDashboard({ token }) {
  const [projects, setProjects] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [connectors, setConnectors] = useState({});
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('projects');
  const [newProject, setNewProject] = useState({ name: '', type: 'game', engine: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    try {
      const [proj, ach, conn] = await Promise.all([
        fetch('/api/gamedev/projects', { headers }).then(r => r.json()),
        fetch('/api/gamedev/achievements', { headers }).then(r => r.json()),
        fetch('/api/gamedev/connectors', { headers }).then(r => r.json()),
      ]);
      setProjects(proj.projects || []);
      setAchievements(ach.achievements || []);
      setConnectors(conn.connectors || {});
    } catch {}
  };

  useEffect(() => { fetchAll(); }, [token]);

  const createProject = async () => {
    if (!newProject.name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/gamedev/projects', {
        method: 'POST', headers,
        body: JSON.stringify({ ...newProject, targetPlatforms: [], teamSize: 1 }),
      });
      if (res.ok) {
        setStatus('Project created!');
        setNewProject({ name: '', type: 'game', engine: '', description: '' });
        await fetchAll();
        setTimeout(() => setStatus(''), 3000);
      }
    } finally {
      setCreating(false);
    }
  };

  const unlockAchievement = async (id) => {
    await fetch(`/api/gamedev/achievements/${id}/unlock`, { method: 'POST', headers });
    await fetchAll();
  };

  const connectPlatform = async (platform) => {
    const res = await fetch(`/api/gamedev/connectors/${platform}/connect`, { method: 'POST', headers, body: JSON.stringify({}) });
    const data = await res.json();
    if (data.authUrl) window.open(data.authUrl, '_blank');
    else await fetchAll();
  };

  const style = {
    panel: { background: '#0c0c14', minHeight: '100vh', padding: 24, color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' },
    tabs: { display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 },
    tab: (active) => ({
      background: 'none', border: 'none', color: active ? '#6366f1' : '#6b7280',
      padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
      borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
      marginBottom: -1,
    }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 },
    input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none' },
    btn: (variant = 'primary') => ({
      background: variant === 'primary' ? '#6366f1' : 'rgba(255,255,255,0.06)',
      color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    }),
    row: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 14 },
  };

  return (
    <div style={style.panel}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Game Dev Dashboard</div>

      <div style={style.tabs}>
        {['projects', 'achievements', 'connectors'].map(t => (
          <button key={t} style={style.tab(view === t)} onClick={() => setView(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Projects ── */}
      {view === 'projects' && (
        <>
          {/* Create project */}
          <div style={{ ...style.card, marginBottom: 20 }}>
            <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
              New Project
            </div>
            <div style={style.row}>
              <input
                style={{ ...style.input, flex: 1, minWidth: 160 }}
                placeholder="Project name"
                value={newProject.name}
                onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              />
              <select
                style={{ ...style.input, width: 130 }}
                value={newProject.type}
                onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
              >
                {['game', 'vr', 'ar', 'xr', '3d', 'mobile_game', 'indie', 'aaa'].map(t => (
                  <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                ))}
              </select>
              <select
                style={{ ...style.input, width: 130 }}
                value={newProject.engine}
                onChange={e => setNewProject(p => ({ ...p, engine: e.target.value }))}
              >
                <option value="">Engine...</option>
                {['unreal', 'unity', 'godot', 'gamemaker', 'cryengine', 'bevy', 'custom'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <button style={style.btn()} onClick={createProject} disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
            {status && <div style={{ color: '#4ade80', fontSize: 12, marginTop: 8 }}>{status}</div>}
          </div>

          {projects.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 14 }}>No projects yet. Create one above.</div>
          ) : (
            <div style={style.grid}>
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} onSelect={setSelected} selected={selected?.id === p.id} />
              ))}
            </div>
          )}

          {/* Project detail */}
          {selected && (
            <div style={{ ...style.card, marginTop: 20 }}>
              <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                {TYPE_ICONS[selected.type]} {selected.name} — Metrics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {Object.entries(selected.metrics || {}).map(([k, v]) => (
                  <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12 }}>
                    <div style={{ color: '#6b7280', fontSize: 10, textTransform: 'capitalize', marginBottom: 4 }}>
                      {k.replace(/([A-Z])/g, ' $1')}
                    </div>
                    <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
                  Milestones ({(selected.milestones || []).length})
                </div>
                {(selected.milestones || []).map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>{m.completed ? '✅' : '⬜'}</span>
                    <span style={{ color: m.completed ? '#4ade80' : '#f1f5f9', fontSize: 13 }}>{m.name}</span>
                    {m.dueDate && <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 'auto' }}>{m.dueDate}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Achievements ── */}
      {view === 'achievements' && (
        <div style={style.grid}>
          {achievements.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 14 }}>No achievements defined yet.</div>
          ) : achievements.map(a => (
            <div key={a.id} style={{ ...style.card, opacity: a.unlocked ? 1 : 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{a.unlocked ? '🏆' : '🔒'}</span>
                <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700 }}>{a.points} pts</span>
              </div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6 }}>{a.name}</div>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>{a.description}</div>
              {!a.unlocked && (
                <button style={style.btn()} onClick={() => unlockAchievement(a.id)}>
                  Unlock
                </button>
              )}
              {a.unlocked && (
                <div style={{ color: '#4ade80', fontSize: 11 }}>
                  Unlocked {new Date(a.unlockedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Connectors ── */}
      {view === 'connectors' && (
        <div style={style.grid}>
          {Object.entries(connectors).map(([id, conn]) => (
            <div key={id} style={{ ...style.card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{CONNECTOR_ICONS[id] || '🔌'}</span>
                <div>
                  <div style={{ color: '#f1f5f9', fontWeight: 700 }}>{conn.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>{conn.company}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 11 }}>{conn.authType}</span>
              </div>
              <button
                style={style.btn()}
                onClick={() => connectPlatform(id)}
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
