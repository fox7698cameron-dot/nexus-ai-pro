// src/components/dashboards/GameDevDashboard.jsx
// 2026-07-27 | Nexus AI Pro — Game Dev & AR/VR/3D Project Tracking
// Unreal, Unity, Godot | PS5, Xbox, Switch, iOS, Android, Meta, PSVR2

import React, { useState, useEffect, useCallback } from 'react';

const TYPE_ICONS = {
  game_2d: '🎮', game_3d: '🕹️', vr: '🥽', ar: '📱', mixed_reality: '🌐',
  game_engine_plugin: '🔌', mod: '🛠️', code: '💻', app: '📦',
};
const ENGINE_COLORS = {
  unreal: '#1fbfff', unity: '#ffffff', godot: '#478cbf', custom: '#f97316', other: '#6b7280',
};
const STATUS_COLOR = { active: '#22c55e', paused: '#f59e0b', completed: '#3b82f6', archived: '#6b7280' };
const CONNECTOR_ICONS = {
  epic_games: '🎯', sony_psn: '🎮', microsoft_xbox: '✖️', ubisoft_connect: '🔷',
  steam: '♨️', nintendo: '⭕', unity_cloud: '☁️',
};

function ProgressBar({ value, color = '#3b82f6' }) {
  return (
    <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const icon = TYPE_ICONS[project.type] || '📁';
  const color = ENGINE_COLORS[project.engine] || '#6b7280';
  return (
    <div onClick={() => onSelect(project)} style={{
      background: selected ? '#3b82f622' : 'var(--card-bg)',
      border: `2px solid ${selected ? '#3b82f6' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
          <div style={{ fontSize: 11, color }}>
            {project.engine} · <span style={{ color: STATUS_COLOR[project.status] }}>{project.status}</span>
          </div>
        </div>
      </div>
      <ProgressBar value={project.progress} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>{project.progress}% complete</span>
        <span>{project.milestones.filter(m => m.completed).length}/{project.milestones.length} milestones</span>
      </div>
    </div>
  );
}

function AchievementBadge({ achievement }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      background: achievement.unlocked ? '#22c55e11' : 'var(--card-bg)',
      border: `1px solid ${achievement.unlocked ? '#22c55e44' : 'var(--border)'}`,
      borderRadius: 8, opacity: achievement.unlocked ? 1 : 0.6 }}>
      <span style={{ fontSize: 20 }}>{achievement.icon || '🏅'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{achievement.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{achievement.description} · {achievement.xp} XP</div>
      </div>
      {achievement.unlocked && <span style={{ fontSize: 11, color: '#22c55e' }}>Unlocked</span>}
      {achievement.connector && <span style={{ fontSize: 16 }}>{CONNECTOR_ICONS[achievement.connector]}</span>}
    </div>
  );
}

export default function GameDevDashboard({ token }) {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [connectors, setConnectors] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [tab, setTab] = useState('projects');
  const [showNew, setShowNew] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', type: 'game_3d', engine: 'unreal', languages: [] });
  const [error, setError] = useState(null);

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    try {
      const [p, d, c, t] = await Promise.all([
        fetch('/api/gaming/projects', { headers: h }).then(r => r.json()),
        fetch('/api/gaming/dashboard', { headers: h }).then(r => r.json()),
        fetch('/api/gaming/connectors', { headers: h }).then(r => r.json()),
        fetch('/api/gaming/templates', { headers: h }).then(r => r.json()),
      ]);
      setProjects(p.projects || []);
      setDashboard(d);
      setConnectors(c.connectors || []);
      setTemplates(t.templates || []);
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const createProject = async () => {
    if (!newProject.name.trim()) return;
    const r = await fetch('/api/gaming/projects', { method: 'POST', headers: h, body: JSON.stringify(newProject) });
    if (r.ok) { await load(); setShowNew(false); setNewProject({ name: '', type: 'game_3d', engine: 'unreal', languages: [] }); }
  };

  const toggleMilestone = async (projectId, milestoneId, completed) => {
    await fetch(`/api/gaming/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PATCH', headers: h, body: JSON.stringify({ completed }),
    });
    await load();
  };

  const unlockAchievement = async (projectId, achievementId) => {
    await fetch(`/api/gaming/projects/${projectId}/achievements/${achievementId}/unlock`, { method: 'PATCH', headers: h });
    await load();
  };

  const TABS = ['projects', 'connectors', 'templates'];

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Game Dev Tracker</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>2D · 3D · VR · AR · Mixed Reality</div>
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
          + New Project
        </button>
      </div>

      {/* Summary */}
      {dashboard && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { label: 'Total Projects', value: dashboard.totalProjects, color: '#3b82f6' },
            { label: 'Active', value: dashboard.activeProjects, color: '#22c55e' },
            { label: 'Achievements', value: `${dashboard.unlockedAchievements}/${dashboard.totalAchievements}`, color: '#f59e0b' },
            { label: 'Total Builds', value: dashboard.totalBuilds, color: '#8b5cf6' },
            { label: 'Commits', value: dashboard.totalCommits, color: '#ec4899' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 20px', flex: '1 1 120px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              borderBottom: `2px solid ${tab === t ? '#3b82f6' : 'transparent'}`,
              fontWeight: tab === t ? 600 : 400, color: tab === t ? '#3b82f6' : 'var(--text)', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Projects tab */}
      {tab === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 400 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map(p => <ProjectCard key={p.id} project={p} selected={selected?.id === p.id} onSelect={setSelected} />)}
            {projects.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No projects yet</div>}
          </div>

          {selected && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 32 }}>{TYPE_ICONS[selected.type]}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>{selected.name}</h2>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.engine} · {selected.type}</div>
                </div>
              </div>

              <ProgressBar value={selected.progress} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 20px' }}>{selected.progress}% complete</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Milestones</div>
                  {selected.milestones.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No milestones</div>}
                  {selected.milestones.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <input type="checkbox" checked={m.completed} onChange={e => toggleMilestone(selected.id, m.id, e.target.checked)} />
                      <span style={{ textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? 'var(--text-muted)' : 'var(--text)' }}>{m.title}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Achievements</div>
                  {selected.achievements.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No achievements</div>}
                  {selected.achievements.map(a => (
                    <div key={a.id} style={{ marginBottom: 8 }}>
                      <AchievementBadge achievement={a} />
                      {!a.unlocked && (
                        <button onClick={() => unlockAchievement(selected.id, a.id)}
                          style={{ marginTop: 4, fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}>
                          Unlock
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Metrics</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                  {Object.entries(selected.metrics).map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--border)', borderRadius: 8, padding: '6px 12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}: </span><span style={{ fontWeight: 600 }}>{v.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Platforms</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.platforms.map(p => <span key={p} style={{ background: '#3b82f622', border: '1px solid #3b82f644', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{p}</span>)}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Languages</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.languages.map(l => <span key={l} style={{ background: '#8b5cf622', border: '1px solid #8b5cf644', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{l}</span>)}
                </div>
              </div>

              {selected.builds.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Recent Builds</div>
                  {selected.builds.slice(-3).reverse().map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>v{b.version} · {b.platform}</span>
                      <span style={{ color: b.status === 'success' ? '#22c55e' : '#ef4444' }}>{b.status}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(b.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connectors tab */}
      {tab === 'connectors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {connectors.map(c => (
            <div key={c.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{CONNECTOR_ICONS[c.id] || '🔗'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: c.connected ? '#22c55e' : '#ef4444' }}>
                    {c.connected ? 'Connected' : 'Not configured'}
                  </div>
                </div>
              </div>
              {!c.connected && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Set <code style={{ fontFamily: 'monospace' }}>{c.envVar}</code></div>}
            </div>
          ))}
        </div>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', cursor: 'pointer' }}
              onClick={() => setNewProject({ name: t.name, type: t.type, engine: t.engine, languages: t.languages || [] })}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.engine} · {t.type}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                {(t.languages || []).map(l => <span key={l} style={{ background: 'var(--border)', borderRadius: 20, padding: '1px 8px', fontSize: 11 }}>{l}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New project modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Project</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Project name" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 14 }} />
              <select value={newProject.type} onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}>
                {['game_2d','game_3d','vr','ar','mixed_reality','game_engine_plugin','mod','code','app'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={newProject.engine} onChange={e => setNewProject(p => ({ ...p, engine: e.target.value }))}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}>
                {['unreal','unity','godot','custom','other'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}>Cancel</button>
              <button onClick={createProject} style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
