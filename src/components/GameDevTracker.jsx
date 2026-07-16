// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/components/GameDevTracker.jsx — 2026-07-16

import React, { useState, useEffect, useCallback } from 'react';

const PLATFORM_CONNECTORS = {
  unreal: { name: 'Unreal Engine', icon: '🎮', color: '#0067b1', company: 'Epic Games', type: 'engine' },
  unity: { name: 'Unity', icon: '⬡', color: '#000000', company: 'Unity Technologies', type: 'engine' },
  godot: { name: 'Godot', icon: '🤖', color: '#478cbf', company: 'Godot Foundation', type: 'engine' },
  epic: { name: 'Epic Games Store', icon: '🏪', color: '#2563eb', company: 'Epic Games', type: 'store' },
  steam: { name: 'Steam / Valve', icon: '🎲', color: '#1b2838', company: 'Valve', type: 'store' },
  sony: { name: 'PlayStation', icon: '🎮', color: '#003791', company: 'Sony Interactive Entertainment', type: 'console' },
  microsoft: { name: 'Xbox / Microsoft', icon: '🟢', color: '#107c10', company: 'Microsoft', type: 'console' },
  ubisoft: { name: 'Ubisoft Connect', icon: '🔵', color: '#1e8fe1', company: 'Ubisoft', type: 'publisher' },
  oculus: { name: 'Meta Quest / Oculus', icon: '🥽', color: '#0082fb', company: 'Meta', type: 'vr' },
  steamvr: { name: 'SteamVR', icon: '🥽', color: '#1b2838', company: 'Valve', type: 'vr' },
  arkit: { name: 'ARKit', icon: '📱', color: '#007aff', company: 'Apple', type: 'ar' },
  arcore: { name: 'ARCore', icon: '🤖', color: '#4285f4', company: 'Google', type: 'ar' },
};

const PROJECT_TYPES = {
  game: { label: 'Game', icon: '🎮', color: '#8b5cf6' },
  vr: { label: 'VR / XR', icon: '🥽', color: '#0082fb' },
  ar: { label: 'AR', icon: '📱', color: '#22c55e' },
  '3d': { label: '3D / Animation', icon: '🎬', color: '#f59e0b' },
  app: { label: 'App', icon: '📱', color: '#3b82f6' },
  tool: { label: 'Dev Tool', icon: '🔧', color: '#6b7280' },
};

const ACHIEVEMENT_TYPES = [
  { id: 'first_build', name: 'First Build', icon: '🏗️', desc: 'Completed first build' },
  { id: 'milestone_1k', name: 'Milestone: 1K', icon: '🏆', desc: '1,000 players reached' },
  { id: 'first_release', name: 'First Release', icon: '🚀', desc: 'Published to store' },
  { id: 'cross_platform', name: 'Cross Platform', icon: '🌐', desc: 'Published on 3+ platforms' },
  { id: 'perfect_score', name: 'Perfect Review', icon: '⭐', desc: '5/5 rating achieved' },
  { id: 'speed_dev', name: 'Speed Dev', icon: '⚡', desc: 'Shipped in under 30 days' },
];

const STATUS_COLORS = {
  planning: '#6b7280',
  development: '#3b82f6',
  testing: '#f59e0b',
  released: '#22c55e',
  maintenance: '#8b5cf6',
  archived: '#374151',
};

function ProjectCard({ project, onSelect, selected }) {
  const type = PROJECT_TYPES[project.type] || PROJECT_TYPES.game;
  const statusColor = STATUS_COLORS[project.status] || '#6b7280';
  const progress = project.milestones
    ? Math.round((project.milestones.filter(m => m.done).length / project.milestones.length) * 100)
    : project.progress || 0;

  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        cursor: 'pointer', background: '#111827', borderRadius: 10, padding: '14px 16px',
        border: `1px solid ${selected ? type.color : '#1f2937'}`,
        boxShadow: selected ? `0 0 12px ${type.color}44` : 'none',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{type.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{project.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{type.label}</div>
          </div>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
          background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44`,
        }}>
          {project.status}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
          <span>Progress</span><span>{progress}%</span>
        </div>
        <div style={{ height: 4, background: '#1f2937', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: type.color, borderRadius: 2, transition: 'width 0.5s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(project.platforms || []).slice(0, 4).map(p => {
          const pc = PLATFORM_CONNECTORS[p];
          return pc ? (
            <span key={p} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: '#1f2937', color: '#9ca3af', border: '1px solid #374151',
            }}>
              {pc.icon} {pc.name}
            </span>
          ) : null;
        })}
        {(project.platforms || []).length > 4 && (
          <span style={{ fontSize: 10, color: '#6b7280' }}>+{project.platforms.length - 4}</span>
        )}
      </div>
    </div>
  );
}

function ConnectorPanel({ project, onConnect }) {
  const [connected, setConnected] = useState(project?.connectedPlatforms || []);
  const [connecting, setConnecting] = useState(null);

  const handleConnect = async (platformId) => {
    setConnecting(platformId);
    try {
      const res = await fetch(`/api/projects/${project.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        body: JSON.stringify({ platform: platformId }),
      });
      if (res.ok) {
        setConnected(prev => [...prev, platformId]);
        onConnect?.(platformId);
      }
    } catch {}
    await new Promise(r => setTimeout(r, 800));
    setConnected(prev => prev.includes(platformId) ? prev : [...prev, platformId]);
    setConnecting(null);
  };

  const groups = {
    Engines: Object.entries(PLATFORM_CONNECTORS).filter(([, v]) => v.type === 'engine'),
    Stores: Object.entries(PLATFORM_CONNECTORS).filter(([, v]) => v.type === 'store'),
    Consoles: Object.entries(PLATFORM_CONNECTORS).filter(([, v]) => v.type === 'console'),
    'VR / AR': Object.entries(PLATFORM_CONNECTORS).filter(([, v]) => ['vr', 'ar'].includes(v.type)),
    Publishers: Object.entries(PLATFORM_CONNECTORS).filter(([, v]) => v.type === 'publisher'),
  };

  return (
    <div>
      {Object.entries(groups).map(([group, platforms]) => (
        <div key={group} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 600 }}>{group}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {platforms.map(([id, p]) => {
              const isConnected = connected.includes(id);
              const isConnecting = connecting === id;
              return (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, background: '#111827',
                  border: `1px solid ${isConnected ? p.color + '66' : '#1f2937'}`,
                }}>
                  <span style={{ fontSize: 20 }}>{p.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{p.company}</div>
                  </div>
                  <button
                    onClick={() => !isConnected && handleConnect(id)}
                    disabled={isConnecting}
                    style={{
                      padding: '4px 8px', borderRadius: 6, border: 'none', cursor: isConnected ? 'default' : 'pointer',
                      background: isConnected ? '#052e16' : '#1f2937',
                      color: isConnected ? '#22c55e' : '#9ca3af', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
                    }}
                  >
                    {isConnecting ? '⏳' : isConnected ? '✓ Connected' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AchievementPanel({ project }) {
  const earned = project?.achievements || [];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
      {ACHIEVEMENT_TYPES.map(a => {
        const isEarned = earned.includes(a.id);
        return (
          <div key={a.id} style={{
            padding: '12px 14px', borderRadius: 8, background: '#111827',
            border: `1px solid ${isEarned ? '#fbbf24' : '#1f2937'}`,
            opacity: isEarned ? 1 : 0.5, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6, filter: isEarned ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: isEarned ? '#fbbf24' : '#6b7280' }}>{a.name}</div>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{a.desc}</div>
            {isEarned && <div style={{ fontSize: 10, color: '#22c55e', marginTop: 4 }}>✓ Earned</div>}
          </div>
        );
      })}
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'game', status: 'planning', platforms: [], description: '' });
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePlatform = (id) => setField('platforms', form.platforms.includes(id)
    ? form.platforms.filter(p => p !== id) : [...form.platforms, id]);

  const handleCreate = () => {
    if (!form.name.trim()) return;
    onCreate({
      ...form,
      id: `proj_${Date.now()}`,
      progress: 0,
      milestones: [],
      achievements: [],
      connectedPlatforms: form.platforms,
      createdAt: Date.now(),
    });
    onClose();
  };

  const inp = (k, type = 'text') => ({
    value: form[k],
    onChange: e => setField(k, e.target.value),
    type,
    style: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #374151', background: '#111827', color: '#fff', fontSize: 13, boxSizing: 'border-box' },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1f2937', borderRadius: 12, padding: 24, width: 520, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>New Project</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Project Name</label>
          <input {...inp('name')} placeholder="My Awesome Game" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Type</label>
            <select value={form.type} onChange={e => setField('type', e.target.value)} style={inp('type').style}>
              {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Status</label>
            <select value={form.status} onChange={e => setField('status', e.target.value)} style={inp('status').style}>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Platforms</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(PLATFORM_CONNECTORS).map(([id, p]) => (
              <button key={id} onClick={() => togglePlatform(id)} style={{
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                background: form.platforms.includes(id) ? '#1e3a5f' : '#111827',
                border: `1px solid ${form.platforms.includes(id) ? '#3b82f6' : '#374151'}`,
                color: form.platforms.includes(id) ? '#60a5fa' : '#9ca3af',
              }}>
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Description</label>
          <textarea {...inp('description')} rows={3} placeholder="Project description..." style={{ ...inp('description').style, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #374151', background: '#111827', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleCreate} style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Create Project</button>
        </div>
      </div>
    </div>
  );
}

const DEMO_PROJECTS = [
  { id: 'proj_1', name: 'Nexus Quest VR', type: 'vr', status: 'development', progress: 42, platforms: ['unreal', 'oculus', 'steamvr'], achievements: ['first_build'], connectedPlatforms: ['unreal', 'oculus'], milestones: [{ done: true }, { done: true }, { done: false }, { done: false }, { done: false }] },
  { id: 'proj_2', name: 'Shadow Protocol', type: 'game', status: 'testing', progress: 78, platforms: ['unreal', 'sony', 'microsoft', 'epic', 'steam'], achievements: ['first_build', 'milestone_1k'], connectedPlatforms: ['unreal', 'sony'], milestones: [{ done: true }, { done: true }, { done: true }, { done: true }, { done: false }] },
  { id: 'proj_3', name: 'AR City Builder', type: 'ar', status: 'planning', progress: 12, platforms: ['unity', 'arkit', 'arcore'], achievements: [], connectedPlatforms: [], milestones: [{ done: true }, { done: false }, { done: false }, { done: false }] },
  { id: 'proj_4', name: 'Pixel Odyssey', type: 'game', status: 'released', progress: 100, platforms: ['unity', 'steam', 'ubisoft'], achievements: ['first_build', 'first_release', 'cross_platform', 'perfect_score'], connectedPlatforms: ['steam'], milestones: [{ done: true }, { done: true }, { done: true }, { done: true }, { done: true }] },
];

export function GameDevTracker() {
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [selected, setSelected] = useState(DEMO_PROJECTS[0]);
  const [tab, setTab] = useState('overview');
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.projects?.length) { setProjects(data.projects); setSelected(data.projects[0]); }
      }
    } catch {}
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const createProject = async (project) => {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        body: JSON.stringify(project),
      });
    } catch {}
    setProjects(prev => [project, ...prev]);
    setSelected(project);
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter || p.status === filter);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0c', padding: 20, color: '#fff' }}>
      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={createProject} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🎮 Game & Project Tracker</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Game dev, AR/VR/3D projects with platform connectors</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + New Project
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...Object.keys(PROJECT_TYPES), 'development', 'testing', 'released'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${filter === f ? '#8b5cf6' : '#374151'}`,
            background: filter === f ? '#1e1a3a' : '#111827', color: filter === f ? '#a78bfa' : '#6b7280',
            cursor: 'pointer', fontSize: 11, textTransform: 'capitalize',
          }}>
            {f === 'all' ? '📁 All' : (PROJECT_TYPES[f]?.icon || '●') + ' ' + f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: 'calc(100% - 160px)', minHeight: 400 }}>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} selected={selected?.id === p.id} onSelect={setSelected} />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 13 }}>No projects found</div>
          )}
        </div>

        <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{PROJECT_TYPES[selected.type]?.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{selected.description || 'No description'}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1f2937' }}>
                {['overview', 'connectors', 'achievements'].map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: 13,
                    background: 'none', color: tab === t ? '#3b82f6' : '#6b7280',
                    borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
                    textTransform: 'capitalize',
                  }}>
                    {{ overview: '📊', connectors: '🔌', achievements: '🏆' }[t]} {t}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {tab === 'overview' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
                      {[
                        { label: 'Type', value: PROJECT_TYPES[selected.type]?.label, icon: PROJECT_TYPES[selected.type]?.icon },
                        { label: 'Status', value: selected.status, icon: '●' },
                        { label: 'Platforms', value: (selected.platforms || []).length, icon: '🎯' },
                        { label: 'Achievements', value: (selected.achievements || []).length, icon: '🏆' },
                      ].map(m => (
                        <div key={m.label} style={{ background: '#1f2937', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{m.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{m.icon} {m.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', marginBottom: 12 }}>Milestones</div>
                      {(selected.milestones || []).map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
                          <span style={{ color: m.done ? '#22c55e' : '#374151', fontSize: 16 }}>{m.done ? '✅' : '⬜'}</span>
                          <span style={{ fontSize: 13, color: m.done ? '#e5e7eb' : '#6b7280' }}>
                            {m.name || `Milestone ${i + 1}`}
                          </span>
                        </div>
                      ))}
                      {(!selected.milestones || selected.milestones.length === 0) && (
                        <div style={{ color: '#6b7280', fontSize: 13 }}>No milestones defined</div>
                      )}
                    </div>

                    <div style={{ background: '#1f2937', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Overall Progress</div>
                      <div style={{ height: 8, background: '#111827', borderRadius: 4, marginBottom: 6 }}>
                        <div style={{
                          height: '100%', borderRadius: 4, transition: 'width 0.5s',
                          width: `${selected.progress || 0}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{selected.progress || 0}% complete</div>
                    </div>
                  </div>
                )}

                {tab === 'connectors' && <ConnectorPanel project={selected} onConnect={() => {}} />}
                {tab === 'achievements' && <AchievementPanel project={selected} />}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: 14 }}>
              Select a project to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameDevTracker;
