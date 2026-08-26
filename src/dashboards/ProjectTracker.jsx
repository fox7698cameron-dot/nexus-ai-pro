/**
 * NEXUS AI PRO - Project Tracker Dashboard Component
 * File: src/dashboards/ProjectTracker.jsx
 * Date: 2026-08-26
 *
 * Real-time project tracking for:
 * - Coding, Web, Mobile, Full Stack, ML/AI
 * - Game Development (with game engine connectors)
 * - AR/VR projects
 * - 3D projects
 * With achievement and progress tracking.
 */

import { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPE_CONFIG = {
  coding: { icon: '💻', color: '#6366f1', label: 'Coding' },
  game_dev: { icon: '🎮', color: '#8b5cf6', label: 'Game Dev' },
  ar_vr: { icon: '🥽', color: '#06b6d4', label: 'AR/VR' },
  '3d': { icon: '🎲', color: '#f59e0b', label: '3D' },
  web: { icon: '🌐', color: '#10b981', label: 'Web' },
  mobile: { icon: '📱', color: '#f43f5e', label: 'Mobile' },
  backend: { icon: '⚙️', color: '#64748b', label: 'Backend' },
  fullstack: { icon: '🏗', color: '#3b82f6', label: 'Full Stack' },
  ml_ai: { icon: '🤖', color: '#ec4899', label: 'ML/AI' },
};

const GAME_ENGINE_CONFIG = {
  unreal_engine: { icon: '⬤', color: '#0e1128', label: 'Unreal Engine', bg: '#1d2546' },
  epic_games: { icon: '🎯', color: '#2563eb', label: 'Epic Games', bg: '#1d3461' },
  playstation: { icon: '🎮', color: '#003791', label: 'PlayStation', bg: '#002a6e' },
  xbox_live: { icon: '🎮', color: '#107c10', label: 'Xbox Live', bg: '#0a5e0a' },
  ubisoft_connect: { icon: '🔷', color: '#1a69da', label: 'Ubisoft Connect', bg: '#13509e' },
  steam: { icon: '🕹', color: '#1b2838', label: 'Steam', bg: '#c7d5e0' },
  unity: { icon: '⬡', color: '#000000', label: 'Unity', bg: '#353535' },
};

function ProgressBar({ value, color = '#6366f1', height = 8 }) {
  return (
    <div style={{ background: 'var(--border)', borderRadius: height, height, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const typeCfg = PROJECT_TYPE_CONFIG[project.type] || { icon: '📁', color: '#6366f1', label: project.type };
  return (
    <button
      onClick={() => onSelect(project)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? `${typeCfg.color}22` : 'var(--card-bg)',
        border: `2px solid ${selected ? typeCfg.color : 'var(--border)'}`,
        borderRadius: 14,
        padding: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{typeCfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{project.name}</div>
          <div style={{ fontSize: 11, color: typeCfg.color, fontWeight: 600 }}>{typeCfg.label}</div>
        </div>
        <span style={{ fontSize: 11, background: project.status === 'active' ? '#4ade8022' : '#94a3b822', color: project.status === 'active' ? '#4ade80' : '#94a3b8', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
          {project.status}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>Progress</span>
          <span style={{ color: typeCfg.color, fontWeight: 700 }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={typeCfg.color} />
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>📌 {project.milestones?.filter(m => m.completed).length || 0}/{project.milestones?.length || 0} milestones</span>
        {project.connectors?.length > 0 && <span>🔌 {project.connectors.length} connectors</span>}
      </div>
    </button>
  );
}

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', platform: [], language: [], gameEngine: '' });

  const LANGS = ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'C++', 'C#', 'Swift', 'Kotlin', 'Java', 'Objective-C', 'Ruby', 'PHP', 'Dart'];
  const PLATFORMS = ['Web', 'iOS', 'Android', 'Windows', 'macOS', 'Linux', 'PS5', 'Xbox', 'Switch', 'VR'];

  const toggleArr = (key, val) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: 20, fontWeight: 800 }}>Create Project</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Project Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Project 🚀"
              style={{ width: '100%', padding: '0.6rem 0.9rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Project Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(PROJECT_TYPE_CONFIG).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, type }))}
                  style={{ padding: '4px 10px', border: `2px solid ${form.type === type ? cfg.color : 'var(--border)'}`, borderRadius: 8, background: form.type === type ? `${cfg.color}22` : 'transparent', color: form.type === type ? cfg.color : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'game_dev' && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Game Engine</label>
              <select
                value={form.gameEngine}
                onChange={e => setForm(f => ({ ...f, gameEngine: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14 }}
              >
                <option value="">Select engine</option>
                {Object.entries(GAME_ENGINE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Target Platforms</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => toggleArr('platform', p)}
                  style={{ padding: '3px 9px', border: `1px solid ${form.platform.includes(p) ? '#6366f1' : 'var(--border)'}`, borderRadius: 6, background: form.platform.includes(p) ? '#6366f122' : 'transparent', color: form.platform.includes(p) ? '#6366f1' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Languages</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LANGS.map(l => (
                <button
                  key={l}
                  onClick={() => toggleArr('language', l)}
                  style={{ padding: '3px 9px', border: `1px solid ${form.language.includes(l) ? '#10b981' : 'var(--border)'}`, borderRadius: 6, background: form.language.includes(l) ? '#10b98122' : 'transparent', color: form.language.includes(l) ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What are you building?"
              rows={3}
              style={{ width: '100%', padding: '0.6rem 0.9rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={() => onCreate(form)}
            disabled={!form.name.trim()}
            style={{ padding: '0.5rem 1.25rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: form.name.trim() ? 'pointer' : 'not-allowed', fontWeight: 700 }}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectTracker({ socket }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_token') : null;

  const fetchProjects = useCallback(async () => {
    try {
      const resp = await fetch('/api/projects?pageSize=100', { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        setProjects(data.items || []);
      }
    } catch { /* noop */ }
    setLoading(false);
  }, [token]);

  const fetchAchievements = useCallback(async () => {
    try {
      const profile = JSON.parse(localStorage.getItem('nexus_user') || '{}');
      if (!profile.id) return;
      const resp = await fetch(`/api/projects/achievements/${profile.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        setAchievements(data.achievements || []);
      }
    } catch { /* noop */ }
  }, [token]);

  useEffect(() => { fetchProjects(); fetchAchievements(); }, [fetchProjects, fetchAchievements]);

  useEffect(() => {
    if (!socket || !selectedProject) return;
    socket.emit('project:join', selectedProject.id);
    socket.on('project:changed', (updated) => {
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (selectedProject?.id === updated.id) setSelectedProject(updated);
    });
    return () => {
      socket.emit('project:leave', selectedProject.id);
      socket.off('project:changed');
    };
  }, [socket, selectedProject?.id]);

  const createProject = async (form) => {
    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (resp.ok) {
        const project = await resp.json();
        setProjects(prev => [project, ...prev]);
        setSelectedProject(project);
        setShowCreate(false);
      }
    } catch (err) {
      console.error('Create project failed', err);
    }
  };

  const typeGroups = Object.keys(PROJECT_TYPE_CONFIG);
  const filtered = activeTab === 'all' ? projects : projects.filter(p => p.type === activeTab);

  const typeCfg = selectedProject ? (PROJECT_TYPE_CONFIG[selectedProject.type] || { icon: '📁', color: '#6366f1' }) : null;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--text)', padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={createProject} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🚀 Project Tracker</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {projects.length} projects · {achievements.length} achievements
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '0.5rem 1.25rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
        >
          + New Project
        </button>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <button onClick={() => setActiveTab('all')} style={{ padding: '4px 12px', border: `2px solid ${activeTab === 'all' ? '#6366f1' : 'var(--border)'}`, borderRadius: 8, background: activeTab === 'all' ? '#6366f122' : 'transparent', color: activeTab === 'all' ? '#6366f1' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
          All ({projects.length})
        </button>
        {typeGroups.map(type => {
          const cfg = PROJECT_TYPE_CONFIG[type];
          const count = projects.filter(p => p.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              style={{ padding: '4px 12px', border: `2px solid ${activeTab === type ? cfg.color : 'var(--border)'}`, borderRadius: 8, background: activeTab === type ? `${cfg.color}22` : 'transparent', color: activeTab === type ? cfg.color : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              {cfg.icon} {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedProject ? '320px 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '80vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              {projects.length === 0 ? 'No projects yet. Create your first one!' : 'No projects in this category'}
            </div>
          ) : (
            filtered.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={setSelectedProject} selected={selectedProject?.id === p.id} />
            ))
          )}
        </div>

        {/* Project detail */}
        {selectedProject && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
              <span style={{ fontSize: 32 }}>{typeCfg?.icon}</span>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{selectedProject.name}</h2>
                <div style={{ fontSize: 12, color: typeCfg?.color, fontWeight: 600, marginTop: 2 }}>{typeCfg?.label} · {selectedProject.status}</div>
              </div>
              <button onClick={() => setSelectedProject(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>✕</button>
            </div>

            {selectedProject.description && (
              <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: 14 }}>{selectedProject.description}</p>
            )}

            {/* Progress */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Overall Progress</span>
                <span style={{ color: typeCfg?.color, fontWeight: 700 }}>{selectedProject.progress}%</span>
              </div>
              <ProgressBar value={selectedProject.progress} color={typeCfg?.color} height={10} />
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {[
                { key: 'commits', label: 'Commits', icon: '📝' },
                { key: 'linesOfCode', label: 'Lines', icon: '📄' },
                { key: 'testCoverage', label: 'Coverage', icon: '🧪', suffix: '%' },
                { key: 'openIssues', label: 'Open Issues', icon: '🐛' },
              ].map(({ key, label, icon, suffix = '' }) => (
                <div key={key} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.6rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{icon} {label}</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{(selectedProject.metrics?.[key] || 0).toLocaleString()}{suffix}</div>
                </div>
              ))}
            </div>

            {/* Platform tags */}
            {selectedProject.platform?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Target Platforms</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedProject.platform.map(p => (
                    <span key={p} style={{ background: '#6366f122', color: '#6366f1', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Language tags */}
            {selectedProject.language?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Languages</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedProject.language.map(l => (
                    <span key={l} style={{ background: '#10b98122', color: '#10b981', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Game Engine */}
            {selectedProject.gameEngine && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Game Engine</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: GAME_ENGINE_CONFIG[selectedProject.gameEngine]?.bg || '#1a1a2e', padding: '6px 14px', borderRadius: 8 }}>
                  <span style={{ color: GAME_ENGINE_CONFIG[selectedProject.gameEngine]?.color || '#fff', fontWeight: 700, fontSize: 13 }}>
                    {GAME_ENGINE_CONFIG[selectedProject.gameEngine]?.label || selectedProject.gameEngine}
                  </span>
                </div>
              </div>
            )}

            {/* Milestones */}
            {selectedProject.milestones?.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Milestones</div>
                {selectedProject.milestones.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ fontSize: 16 }}>{m.completed ? '✅' : '⬜'}</span>
                    <span style={{ flex: 1, color: m.completed ? 'var(--text-muted)' : 'var(--text)', textDecoration: m.completed ? 'line-through' : 'none' }}>{m.title}</span>
                    {m.dueDate && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.dueDate}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div style={{ marginTop: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: 18, fontWeight: 800 }}>🏆 Achievements ({achievements.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {achievements.map(a => (
              <div key={a.id} style={{ background: 'var(--bg)', border: '1px solid #f59e0b44', borderRadius: 12, padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{a.title}</div>
                {a.game && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.game}</div>}
                <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>+{a.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
