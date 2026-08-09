/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Game Development Dashboard
 * Real-time project tracking: coding, game dev, AR/VR/3D
 * Connectors: Unreal/Epic, Sony PlayStation, Microsoft Xbox, Ubisoft Connect, Steam
 * Achievement tracking, game progress, milestones
 * Date: 2026-08-09
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  Gamepad2, Code, Box, Layers, Plus, RefreshCw, Trophy,
  Loader2, AlertCircle, CheckCircle, Clock, Zap, Target,
  BarChart3, GitBranch, Puzzle, Activity, Link, Unlink
} from 'lucide-react';

// ─── Project type configs ─────────────────────────────────────────────────────

const PROJECT_TYPES = {
  coding: { label: 'Coding', icon: '💻', color: '#667eea' },
  game: { label: 'Game Dev', icon: '🎮', color: '#f43f5e' },
  ar: { label: 'Augmented Reality', icon: '📱', color: '#22c55e' },
  vr: { label: 'Virtual Reality', icon: '🥽', color: '#8b5cf6' },
  '3d': { label: '3D Project', icon: '🎯', color: '#f59e0b' },
  mobile: { label: 'Mobile App', icon: '📲', color: '#06b6d4' },
  web: { label: 'Web App', icon: '🌐', color: '#a78bfa' },
  ai: { label: 'AI/ML Project', icon: '🤖', color: '#ec4899' },
};

const STATUS_STYLES = {
  planning: { color: '#6b7280', label: 'Planning' },
  active: { color: '#22c55e', label: 'Active' },
  on_hold: { color: '#eab308', label: 'On Hold' },
  completed: { color: '#8b5cf6', label: 'Completed' },
  archived: { color: '#374151', label: 'Archived' },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: (active) => ({
    padding: '8px 18px',
    borderRadius: '8px',
    border: `1px solid ${active ? '#667eea' : 'rgba(255,255,255,0.08)'}`,
    background: active ? 'rgba(102,126,234,0.15)' : 'transparent',
    color: active ? '#fff' : '#6b7280',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? '600' : '400',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' },
  projectCard: (color) => ({
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${color}33`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  }),
  connectorGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' },
  connectorCard: (connected) => ({
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${connected ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: '12px',
    padding: '20px',
  }),
  achievementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  achievementCard: (unlocked) => ({
    background: unlocked ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${unlocked ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
    borderRadius: '10px',
    padding: '16px',
    opacity: unlocked ? 1 : 0.6,
    textAlign: 'center',
  }),
  btn: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  outlineBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  progressBar: (pct, color) => ({
    height: '6px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '8px',
  }),
  progressFill: (pct, color) => ({
    height: '100%',
    width: `${pct}%`,
    background: color,
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  }),
  metricRow: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' },
  metricChip: (color) => ({
    fontSize: '0.7rem',
    padding: '2px 8px',
    background: `${color}15`,
    border: `1px solid ${color}33`,
    color,
    borderRadius: '4px',
  }),
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  },
  modalCard: {
    background: '#13131a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '520px',
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none',
    boxSizing: 'border-box', marginTop: '6px',
  },
  select: {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none',
    boxSizing: 'border-box', marginTop: '6px', cursor: 'pointer',
  },
};

// ─── New Project Modal ────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreate }) {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', engine: '', language: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await authFetch('/api/gamedev/projects', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (resp.ok) {
        const data = await resp.json();
        onCreate(data);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.modalCard} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: '#fff', marginBottom: '24px', fontSize: '1.2rem' }}>✨ New Project</h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Project Name *</label>
            <input value={form.name} onChange={set('name')} style={s.input} placeholder="My Awesome Game" required />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Type *</label>
            <select value={form.type} onChange={set('type')} style={s.select}>
              {Object.entries(PROJECT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Description</label>
            <textarea value={form.description} onChange={set('description')} style={{ ...s.input, minHeight: '80px', resize: 'vertical' }} placeholder="What are you building?" />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Engine (optional)</label>
              <select value={form.engine} onChange={set('engine')} style={s.select}>
                <option value="">None / Custom</option>
                <option value="unreal">Unreal Engine</option>
                <option value="unity">Unity</option>
                <option value="godot">Godot</option>
                <option value="o3de">Open 3D Engine</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Primary Language</label>
              <select value={form.language} onChange={set('language')} style={s.select}>
                <option value="">Select</option>
                <option>C++</option>
                <option>C#</option>
                <option>Python</option>
                <option>JavaScript</option>
                <option>TypeScript</option>
                <option>Rust</option>
                <option>Go</option>
                <option>Swift</option>
                <option>Kotlin</option>
                <option>GDScript</option>
                <option>Lua</option>
                <option>C</option>
                <option>Java</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" style={s.outlineBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? <Loader2 size={16} /> : <Plus size={16} />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function GameDevDashboard() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [connectingId, setConnectingId] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [projResp, connResp, achResp] = await Promise.all([
        authFetch('/api/gamedev/projects'),
        authFetch('/api/gamedev/connectors'),
        authFetch('/api/gamedev/achievements'),
      ]);
      if (projResp.ok) { const d = await projResp.json(); setProjects(d.projects ?? []); }
      if (connResp.ok) { const d = await connResp.json(); setConnectors(d.connectors ?? []); }
      if (achResp.ok) { const d = await achResp.json(); setAchievements(d.achievements ?? []); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const connectPlatform = async (id) => {
    setConnectingId(id);
    try {
      const resp = await authFetch(`/api/gamedev/connectors/${id}/connect`, { method: 'POST' });
      if (resp.ok) await loadAll();
    } finally {
      setConnectingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#6b7280', gap: '10px' }}>
        <Loader2 size={22} />
        <span>Loading Game Dev Dashboard…</span>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>
          <Gamepad2 size={22} color="#f43f5e" />
          Game Dev & Project Tracker
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={s.outlineBtn} onClick={loadAll}><RefreshCw size={14} /></button>
          <button style={s.btn} onClick={() => setShowNewProject(true)}>
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { id: 'projects', label: 'Projects', icon: <Code size={14} /> },
          { id: 'connectors', label: 'Game Connectors', icon: <Puzzle size={14} /> },
          { id: 'achievements', label: 'Achievements', icon: <Trophy size={14} /> },
        ].map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', color: '#fca5a5', display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Projects tab */}
      {tab === 'projects' && (
        <>
          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              <Gamepad2 size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
              <div style={{ fontSize: '1rem', marginBottom: '8px' }}>No projects yet</div>
              <button style={s.btn} onClick={() => setShowNewProject(true)}><Plus size={16} />Create Your First Project</button>
            </div>
          ) : (
            <div style={s.grid}>
              {projects.map(project => {
                const cfg = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.coding;
                const st = STATUS_STYLES[project.status] ?? STATUS_STYLES.active;
                return (
                  <div key={project.id} style={s.projectCard(cfg.color)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{cfg.icon}</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>{project.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{cfg.label}</div>
                      </div>
                      <span style={{ padding: '3px 8px', background: `${st.color}15`, border: `1px solid ${st.color}44`, color: st.color, borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600' }}>
                        {st.label}
                      </span>
                    </div>

                    {project.description && (
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '12px', lineHeight: 1.5 }}>
                        {project.description.slice(0, 100)}{project.description.length > 100 ? '…' : ''}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Progress</span>
                      <span style={{ fontSize: '0.75rem', color: cfg.color, fontWeight: '600' }}>{project.progress}%</span>
                    </div>
                    <div style={s.progressBar(project.progress, cfg.color)}>
                      <div style={s.progressFill(project.progress, cfg.color)} />
                    </div>

                    <div style={s.metricRow}>
                      {project.engine && <span style={s.metricChip('#a78bfa')}>⚙️ {project.engine}</span>}
                      {project.language && <span style={s.metricChip('#667eea')}>💻 {project.language}</span>}
                      {project.milestones.length > 0 && <span style={s.metricChip('#22c55e')}>🎯 {project.milestones.filter(m => m.completed).length}/{project.milestones.length} milestones</span>}
                      {project.tasks.length > 0 && <span style={s.metricChip('#f59e0b')}>📋 {project.tasks.filter(t => t.status === 'open').length} open tasks</span>}
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.7rem' }}>
                      <span>Metrics: {project.metrics.linesOfCode > 0 ? `${project.metrics.linesOfCode.toLocaleString()} LOC` : 'No data yet'}</span>
                      <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Connectors tab */}
      {tab === 'connectors' && (
        <div style={s.connectorGrid}>
          {connectors.map(conn => (
            <div key={conn.type} style={s.connectorCard(conn.connected)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>{conn.name}</div>
                <span style={{ padding: '3px 8px', background: conn.connected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${conn.connected ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`, color: conn.connected ? '#22c55e' : '#6b7280', borderRadius: '6px', fontSize: '0.7rem' }}>
                  {conn.connected ? '● Connected' : '○ Available'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                {conn.features.map(f => (
                  <span key={f} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: '#9ca3af' }}>
                    {f.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              {!conn.configured && (
                <div style={{ fontSize: '0.75rem', color: '#eab308', marginBottom: '10px' }}>
                  ⚠ Configure API credentials in .env to enable
                </div>
              )}

              <button
                style={{
                  ...s.btn,
                  background: conn.connected ? 'rgba(239,68,68,0.15)' : 'rgba(102,126,234,0.15)',
                  color: conn.connected ? '#ef4444' : '#667eea',
                  border: `1px solid ${conn.connected ? 'rgba(239,68,68,0.3)' : 'rgba(102,126,234,0.3)'}`,
                  width: '100%',
                  justifyContent: 'center',
                  opacity: (!conn.configured && !conn.connected) ? 0.5 : 1,
                }}
                onClick={() => connectPlatform(conn.type)}
                disabled={connectingId === conn.type || (!conn.configured && !conn.connected)}
              >
                {connectingId === conn.type ? <Loader2 size={14} /> : conn.connected ? <Unlink size={14} /> : <Link size={14} />}
                {connectingId === conn.type ? 'Connecting…' : conn.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Achievements tab */}
      {tab === 'achievements' && (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>Unlocked</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#FFD700' }}>
                {achievements.filter(a => a.unlocked).length} / {achievements.length}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>Total XP</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#a78bfa' }}>
                {achievements.filter(a => a.unlocked).reduce((s, a) => s + (a.xp ?? 0), 0).toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>Completion</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#22c55e' }}>
                {achievements.length ? Math.round(achievements.filter(a => a.unlocked).length / achievements.length * 100) : 0}%
              </div>
            </div>
          </div>

          {achievements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Trophy size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              Connect game platforms to sync your achievements
            </div>
          ) : (
            <div style={s.achievementGrid}>
              {achievements.map(ach => (
                <div key={ach.id} style={s.achievementCard(ach.unlocked)}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{ach.icon ?? '🏆'}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: ach.unlocked ? '#fff' : '#9ca3af', marginBottom: '4px' }}>{ach.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '8px' }}>{ach.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: ach.unlocked ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)', color: ach.unlocked ? '#FFD700' : '#6b7280', borderRadius: '4px' }}>
                      {ach.xp} XP
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', borderRadius: '4px' }}>
                      {ach.source}
                    </span>
                  </div>
                  {ach.unlocked && ach.unlockedAt && (
                    <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '6px' }}>
                      ✓ {new Date(ach.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={(proj) => setProjects(p => [proj, ...p])}
        />
      )}
    </div>
  );
}
