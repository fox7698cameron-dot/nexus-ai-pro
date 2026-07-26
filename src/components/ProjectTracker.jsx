/**
 * src/components/ProjectTracker.jsx
 * Nexus AI Pro - Real-time Project Tracker
 * Supports: Coding, Game Development, AR/VR/3D projects
 * Connectors: Unreal, Epic Games, Sony, Microsoft, Ubisoft
 * Achievement & progress tracking
 * Created: 2026-07-26
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Code2, Box, Zap, Play, Pause, CheckCircle2,
  Clock, GitBranch, Trophy, Target, Star, Plus, Trash2,
  Edit3, Save, X, ChevronRight, ChevronDown, Activity,
  Cpu, Globe, Shield, ArrowUpRight, BarChart3, AlertCircle,
  RefreshCw, Link, Unlink, Settings, Award,
} from 'lucide-react';

// ── Project types ───────────────────────────────────────────────────
const PROJECT_TYPES = [
  { id: 'coding', label: 'Coding', icon: '💻', color: '#60a5fa' },
  { id: 'game2d', label: '2D Game', icon: '🕹️', color: '#f472b6' },
  { id: 'game3d', label: '3D Game', icon: '🎮', color: '#a78bfa' },
  { id: 'ar', label: 'AR Project', icon: '📱', color: '#34d399' },
  { id: 'vr', label: 'VR Project', icon: '🥽', color: '#fb923c' },
  { id: '3d', label: '3D/Animation', icon: '🎨', color: '#fbbf24' },
  { id: 'mobile', label: 'Mobile App', icon: '📲', color: '#4ade80' },
  { id: 'web', label: 'Web App', icon: '🌐', color: '#38bdf8' },
];

// ── Platform connectors ─────────────────────────────────────────────
const GAME_CONNECTORS = [
  { id: 'unreal', name: 'Unreal Engine', icon: '⚡', color: '#0d47a1', company: 'Epic Games', status: 'available' },
  { id: 'epic', name: 'Epic Games Store', icon: '🏪', color: '#2979ff', company: 'Epic Games', status: 'available' },
  { id: 'unity', name: 'Unity', icon: '🟫', color: '#222', company: 'Unity Technologies', status: 'available' },
  { id: 'playstation', name: 'PlayStation', icon: '🎮', color: '#003087', company: 'Sony', status: 'available' },
  { id: 'xbox', name: 'Xbox', icon: '🟩', color: '#107C10', company: 'Microsoft', status: 'available' },
  { id: 'ubisoft', name: 'Ubisoft Connect', icon: '🔷', color: '#0070f0', company: 'Ubisoft', status: 'available' },
  { id: 'steam', name: 'Steam', icon: '♨️', color: '#1b2838', company: 'Valve', status: 'available' },
  { id: 'godot', name: 'Godot', icon: '🐦', color: '#478cbf', company: 'Open Source', status: 'available' },
];

const PROJECT_STATUSES = [
  { id: 'planning', label: 'Planning', color: '#94a3b8' },
  { id: 'active', label: 'Active', color: '#4ade80' },
  { id: 'paused', label: 'Paused', color: '#fbbf24' },
  { id: 'review', label: 'In Review', color: '#a78bfa' },
  { id: 'shipped', label: 'Shipped', color: '#34d399' },
];

// ── Default project seed data ───────────────────────────────────────
const SEED_PROJECTS = [
  {
    id: 'proj-1', name: 'Nexus Runner', type: 'game3d', status: 'active',
    description: 'Third-person runner built in Unreal Engine 5',
    engine: 'unreal', platform: 'playstation',
    progress: 68, tasks: 24, done: 16,
    commits: 342, linesOfCode: 48200,
    milestones: [
      { id: 'm1', label: 'Alpha Build', done: true },
      { id: 'm2', label: 'Beta Testing', done: false },
      { id: 'm3', label: 'Gold Master', done: false },
    ],
    achievements: [
      { id: 'a1', name: 'First Commit', icon: '🌱', unlocked: true },
      { id: 'a2', name: '100 Commits', icon: '💯', unlocked: true },
      { id: 'a3', name: 'Alpha Ready', icon: '🏁', unlocked: true },
      { id: 'a4', name: 'Beta Launch', icon: '🚀', unlocked: false },
    ],
    tags: ['Unreal', 'C++', 'PS5', 'Xbox'],
    createdAt: Date.now() - 90 * 86400000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'proj-2', name: 'AR Explorer', type: 'ar', status: 'active',
    description: 'Augmented reality exploration app for iOS/Android',
    engine: 'unity', platform: 'mobile',
    progress: 42, tasks: 18, done: 7,
    commits: 128, linesOfCode: 22400,
    milestones: [
      { id: 'm1', label: 'Prototype', done: true },
      { id: 'm2', label: 'App Store', done: false },
    ],
    achievements: [
      { id: 'a1', name: 'First Build', icon: '🌱', unlocked: true },
      { id: 'a2', name: 'AR Working', icon: '📱', unlocked: true },
      { id: 'a3', name: 'App Submitted', icon: '📤', unlocked: false },
    ],
    tags: ['Unity', 'ARKit', 'ARCore', 'C#'],
    createdAt: Date.now() - 45 * 86400000,
    updatedAt: Date.now() - 7200000,
  },
  {
    id: 'proj-3', name: 'Nexus AI Dashboard', type: 'coding', status: 'active',
    description: 'Full-stack web platform with AI integrations',
    engine: null, platform: 'web',
    progress: 85, tasks: 52, done: 44,
    commits: 682, linesOfCode: 124800,
    milestones: [
      { id: 'm1', label: 'MVP', done: true },
      { id: 'm2', label: 'Beta', done: true },
      { id: 'm3', label: 'v2.0 Launch', done: false },
    ],
    achievements: [
      { id: 'a1', name: '500 Commits', icon: '🔥', unlocked: true },
      { id: 'a2', name: '100K Lines', icon: '📚', unlocked: true },
      { id: 'a3', name: 'v1 Ship', icon: '🚢', unlocked: true },
      { id: 'a4', name: 'v2 Ship', icon: '🛸', unlocked: false },
    ],
    tags: ['React', 'Node.js', 'TypeScript', 'AI'],
    createdAt: Date.now() - 180 * 86400000,
    updatedAt: Date.now() - 1800000,
  },
];

// ── Utilities ───────────────────────────────────────────────────────
function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── ConnectorCard ───────────────────────────────────────────────────
function ConnectorCard({ connector, connected, onToggle }) {
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${connected ? connector.color + '66' : 'var(--border)'}`,
      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
    }} onClick={() => onToggle(connector.id)}>
      <span style={{ fontSize: 20 }}>{connector.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{connector.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{connector.company}</div>
      </div>
      <div style={{
        padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
        background: connected ? '#4ade8022' : 'var(--border)',
        color: connected ? '#4ade80' : 'var(--text-3)',
      }}>
        {connected ? '● Connected' : 'Connect'}
      </div>
    </div>
  );
}

// ── AchievementBadge ────────────────────────────────────────────────
function AchievementBadge({ achievement }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: achievement.unlocked ? 'var(--accent-subtle)' : 'var(--surface)',
      border: `1px solid ${achievement.unlocked ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 8, padding: '5px 10px', fontSize: 12,
      opacity: achievement.unlocked ? 1 : 0.5,
    }}>
      <span style={{ fontSize: 16 }}>{achievement.icon}</span>
      <span style={{ color: 'var(--text-2)', fontWeight: achievement.unlocked ? 600 : 400 }}>
        {achievement.name}
      </span>
      {achievement.unlocked && <CheckCircle2 size={12} color="#4ade80" />}
    </div>
  );
}

// ── ProjectCard ─────────────────────────────────────────────────────
function ProjectCard({ project, onSelect, selected }) {
  const type = PROJECT_TYPES.find(t => t.id === project.type);
  const status = PROJECT_STATUSES.find(s => s.id === project.status);

  return (
    <div
      onClick={() => onSelect(project.id)}
      style={{
        background: selected ? 'var(--accent-subtle)' : 'var(--surface)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{type?.icon}</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 14 }}>{project.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{type?.label}</div>
          </div>
        </div>
        <div style={{
          padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
          background: `${status?.color}22`, color: status?.color,
        }}>
          {status?.label}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
          <span>Progress</span><span>{project.progress}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${project.progress}%`, height: '100%',
            background: `linear-gradient(90deg, ${type?.color || '#60a5fa'}, ${type?.color || '#60a5fa'}88)`,
            borderRadius: 3, transition: 'width 0.5s',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)' }}>
        <span><GitBranch size={10} style={{ marginRight: 3 }} />{project.commits} commits</span>
        <span><CheckCircle2 size={10} style={{ marginRight: 3 }} />{project.done}/{project.tasks} tasks</span>
        <span><Clock size={10} style={{ marginRight: 3 }} />{timeSince(project.updatedAt)}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {project.tags.slice(0, 3).map(tag => (
          <span key={tag} style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 10,
            background: 'var(--border)', color: 'var(--text-3)',
          }}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

// ── ProjectDetail ───────────────────────────────────────────────────
function ProjectDetail({ project, onUpdate }) {
  const type = PROJECT_TYPES.find(t => t.id === project.type);
  const status = PROJECT_STATUSES.find(s => s.id === project.status);
  const connector = GAME_CONNECTORS.find(c => c.id === project.engine);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 32 }}>{type?.icon}</span>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>{project.name}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>{project.description}</p>
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: `${status?.color}22`, color: status?.color,
        }}>
          {status?.label}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Progress', value: `${project.progress}%`, icon: <Target size={14} />, color: '#60a5fa' },
          { label: 'Tasks Done', value: `${project.done}/${project.tasks}`, icon: <CheckCircle2 size={14} />, color: '#4ade80' },
          { label: 'Commits', value: fmtNum(project.commits), icon: <GitBranch size={14} />, color: '#a78bfa' },
          { label: 'Lines of Code', value: fmtNum(project.linesOfCode), icon: <Code2 size={14} />, color: '#fb923c' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px', textAlign: 'center',
          }}>
            <div style={{ color: s.color, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>
          <span>Overall Progress</span><span style={{ fontWeight: 700, color: type?.color }}>{project.progress}%</span>
        </div>
        <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{
            width: `${project.progress}%`, height: '100%',
            background: `linear-gradient(90deg, ${type?.color || '#60a5fa'}, ${type?.color || '#60a5fa'}88)`,
            borderRadius: 5,
          }} />
        </div>
      </div>

      {/* Milestones */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
          <Target size={14} style={{ marginRight: 6 }} />Milestones
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {project.milestones.map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: m.done ? '#4ade8011' : 'var(--bg)',
              border: `1px solid ${m.done ? '#4ade8033' : 'var(--border)'}`,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: m.done ? '#4ade80' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
              }}>
                {m.done ? <CheckCircle2 size={12} color="#fff" /> : i + 1}
              </div>
              <span style={{ fontSize: 13, color: m.done ? '#4ade80' : 'var(--text-2)', fontWeight: m.done ? 600 : 400 }}>
                {m.label}
              </span>
              {m.done && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4ade80' }}>Complete</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
          <Trophy size={14} style={{ marginRight: 6 }} />Achievements
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
            {project.achievements.filter(a => a.unlocked).length}/{project.achievements.length} unlocked
          </span>
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {project.achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
        </div>
      </div>

      {/* Engine/platform connector */}
      {connector && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: `${connector.color}11`, border: `1px solid ${connector.color}33`,
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 18 }}>{connector.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              Engine: {connector.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{connector.company}</div>
          </div>
          <div style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 5, fontSize: 11, background: '#4ade8022', color: '#4ade80' }}>
            ● Connected
          </div>
        </div>
      )}
    </div>
  );
}

// ── New project form ────────────────────────────────────────────────
function NewProjectForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', engine: '' });

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--accent)',
      borderRadius: 14, padding: 20, marginBottom: 16,
    }}>
      <h4 style={{ margin: '0 0 16px', color: 'var(--text-1)' }}>New Project</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="Project name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: 14 }}
        />
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: 14 }}
        >
          {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: 14, resize: 'none' }}
        />
        <select
          value={form.engine}
          onChange={e => setForm(f => ({ ...f, engine: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: 14 }}
        >
          <option value="">No engine / framework</option>
          {GAME_CONNECTORS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              if (!form.name.trim()) return;
              onSave({
                id: `proj-${Date.now()}`, ...form,
                status: 'planning', progress: 0, tasks: 0, done: 0,
                commits: 0, linesOfCode: 0,
                milestones: [], achievements: [], tags: [],
                createdAt: Date.now(), updatedAt: Date.now(),
              });
            }}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >Create Project</button>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ProjectTracker ─────────────────────────────────────────────
export default function ProjectTracker() {
  const [projects, setProjects] = useState(SEED_PROJECTS);
  const [selectedId, setSelectedId] = useState(SEED_PROJECTS[0].id);
  const [showNew, setShowNew] = useState(false);
  const [connectedEngines, setConnectedEngines] = useState(new Set(['unreal', 'unity', 'godot']));
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('projects');

  const selected = projects.find(p => p.id === selectedId);

  const toggleConnector = useCallback((id) => {
    setConnectedEngines(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const filteredProjects = projects.filter(p =>
    filter === 'all' || p.type.includes(filter) || p.status === filter
  );

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>
            🚀 Project Tracker
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
            Real-time tracking for coding, game dev, AR/VR/3D
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13,
        }}>
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { id: 'projects', label: '📁 Projects' },
          { id: 'connectors', label: '🔌 Connectors' },
          { id: 'achievements', label: '🏆 Achievements' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none',
            background: tab === t.id ? 'var(--accent)' : 'transparent',
            color: tab === t.id ? '#fff' : 'var(--text-2)',
            cursor: 'pointer', fontWeight: 600, fontSize: 13,
            borderBottom: tab === t.id ? 'none' : '1px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* PROJECTS TAB */}
      {tab === 'projects' && (
        <div>
          {showNew && (
            <NewProjectForm
              onSave={p => { setProjects(prev => [p, ...prev]); setSelectedId(p.id); setShowNew(false); }}
              onCancel={() => setShowNew(false)}
            />
          )}

          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {['all', 'coding', 'game', 'ar', 'vr', 'active', 'paused', 'shipped'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: filter === f ? 'var(--accent)' : 'var(--surface)',
                color: filter === f ? '#fff' : 'var(--text-2)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
              }}>{f}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: 14 }}>
            {/* Project list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredProjects.map(p => (
                <ProjectCard key={p.id} project={p} selected={selectedId === p.id} onSelect={setSelectedId} />
              ))}
              {filteredProjects.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>
                  No projects match the current filter.
                </div>
              )}
            </div>

            {/* Project detail */}
            {selected && (
              <ProjectDetail project={selected} onUpdate={(id, upd) =>
                setProjects(prev => prev.map(p => p.id === id ? { ...p, ...upd } : p))
              } />
            )}
          </div>
        </div>
      )}

      {/* CONNECTORS TAB */}
      {tab === 'connectors' && (
        <div>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
            Connect your game engines and publishing platforms to sync project data in real-time.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {GAME_CONNECTORS.map(c => (
              <ConnectorCard key={c.id} connector={c} connected={connectedEngines.has(c.id)} onToggle={toggleConnector} />
            ))}
          </div>
          <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-2)' }}>OAuth Integration</h4>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
              Connectors use OAuth 2.0. API credentials are stored securely in environment variables — never hard-coded.
              Connect through the platform's developer portal and paste your Client ID in Settings.
            </p>
          </div>
        </div>
      )}

      {/* ACHIEVEMENTS TAB */}
      {tab === 'achievements' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {projects.map(p => {
              const type = PROJECT_TYPES.find(t => t.id === p.type);
              const unlocked = p.achievements.filter(a => a.unlocked).length;
              return (
                <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 18 }}>{type?.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{unlocked}/{p.achievements.length} achievements</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <Trophy size={16} color={unlocked > 0 ? '#fbbf24' : '#94a3b8'} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {p.achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
