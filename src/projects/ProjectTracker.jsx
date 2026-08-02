// src/projects/ProjectTracker.jsx
// 2026-08-02 — Real-time Project Tracker
// Categories: Coding, Game Development, AR/VR/3D
// Features: progress tracking, milestones, achievements, deadlines, team collaboration

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Code, Gamepad2, Box, Layers, Plus, X, Edit3,
  CheckCircle, Clock, AlertTriangle, Zap, Trophy,
  Users, GitBranch, Calendar, Target, Activity,
  Play, Pause, RotateCcw, ChevronDown, ChevronRight,
  Star, Flag, Cpu, Globe, Smartphone
} from 'lucide-react';

const PROJECT_TYPES = [
  { id: 'coding',   label: 'Coding',         icon: Code,     color: '#00aaff', desc: 'Web, API, Backend, CLI' },
  { id: 'game',     label: 'Game Dev',        icon: Gamepad2, color: '#9146ff', desc: 'Unreal, Unity, Godot' },
  { id: 'arvr',     label: 'AR/VR/3D',        icon: Box,      color: '#ff6600', desc: 'XR, Immersive, 3D Art' },
  { id: 'mobile',   label: 'Mobile',          icon: Smartphone, color: '#00ff88', desc: 'iOS, Android, React Native' },
  { id: 'desktop',  label: 'Desktop',         icon: Cpu,      color: '#ff44aa', desc: 'Electron, Native, Cross-platform' },
  { id: 'web',      label: 'Web',             icon: Globe,    color: '#ffaa00', desc: 'Frontend, PWA, SPA' },
];

const STATUSES = [
  { id: 'planning',    label: 'Planning',    color: '#aaa',    bg: '#ffffff11' },
  { id: 'active',      label: 'Active',      color: '#00ff88', bg: '#00ff8811' },
  { id: 'review',      label: 'In Review',   color: '#ffaa00', bg: '#ffaa0011' },
  { id: 'paused',      label: 'Paused',      color: '#ff8800', bg: '#ff880011' },
  { id: 'completed',   label: 'Completed',   color: '#00aaff', bg: '#00aaff11' },
  { id: 'cancelled',   label: 'Cancelled',   color: '#ff4444', bg: '#ff444411' },
];

const PLATFORMS_GAME = ['Unreal Engine', 'Unity', 'Godot', 'GameMaker', 'Custom Engine'];
const PLATFORMS_ARVR = ['Meta Quest', 'Apple Vision Pro', 'HoloLens', 'SteamVR', 'WebXR', 'Unreal XR'];

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function daysLeft(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  return Math.ceil(diff / 86400000);
}

function StatusBadge({ statusId }) {
  const s = STATUSES.find(x => x.id === statusId) || STATUSES[0];
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 12,
      background: s.bg, border: `1px solid ${s.color}44`, color: s.color,
      fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

function ProgressBar({ value, color = '#00ff88', height = 6 }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: height, height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: `linear-gradient(90deg, ${color}aa, ${color})`,
        borderRadius: height, transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function MilestoneList({ milestones, onToggle, projectColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {milestones.map((m, i) => (
        <div key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 8,
          background: m.done ? 'rgba(0,255,136,0.06)' : 'rgba(255,255,255,0.03)',
          cursor: 'pointer',
          border: `1px solid ${m.done ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)'}`,
        }} onClick={() => onToggle && onToggle(m.id)}>
          <CheckCircle size={14} color={m.done ? '#00ff88' : 'rgba(255,255,255,0.2)'} />
          <span style={{
            fontSize: 12, flex: 1, color: m.done ? 'rgba(255,255,255,0.5)' : '#fff',
            textDecoration: m.done ? 'line-through' : 'none',
          }}>{m.label}</span>
          {m.dueDate && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {new Date(m.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function AchievementBadge({ achievement }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 10,
      background: 'linear-gradient(135deg, rgba(255,170,0,0.1), rgba(255,100,0,0.05))',
      border: '1px solid rgba(255,170,0,0.25)',
    }}>
      <span style={{ fontSize: 18 }}>{achievement.icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#ffaa00' }}>{achievement.name}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{achievement.desc}</div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onEdit, onDelete, onUpdateMilestone, onUpdateStatus, onUpdateProgress }) {
  const [expanded, setExpanded] = useState(false);
  const type = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  const TypeIcon = type.icon;
  const days = daysLeft(project.deadline);
  const doneMs = project.milestones?.filter(m => m.done).length || 0;
  const totalMs = project.milestones?.length || 0;
  const msProgress = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : project.progress || 0;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${type.color}22`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: `0 4px 20px ${type.color}08`,
    }}>
      {/* Card header */}
      <div style={{ padding: '16px 18px', cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${type.color}15`, border: `1px solid ${type.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <TypeIcon size={18} color={type.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{project.name}</span>
              <StatusBadge statusId={project.status} />
              {project.featured && <Star size={12} color="#ffaa00" fill="#ffaa00" />}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{type.label} · {project.platform || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {days !== null && (
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 10,
                background: days < 7 ? 'rgba(255,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${days < 7 ? '#ff4444' : 'rgba(255,255,255,0.1)'}`,
                color: days < 7 ? '#ff4444' : 'rgba(255,255,255,0.5)',
                fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                {days < 0 ? 'OVERDUE' : `${days}d left`}
              </span>
            )}
            {expanded ? <ChevronDown size={14} color="rgba(255,255,255,0.4)" /> : <ChevronRight size={14} color="rgba(255,255,255,0.4)" />}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {totalMs > 0 ? `${doneMs}/${totalMs} milestones` : 'Progress'}
            </span>
            <span style={{ fontSize: 10, color: type.color, fontWeight: 700 }}>{msProgress}%</span>
          </div>
          <ProgressBar value={msProgress} color={type.color} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px' }}>
          {project.description && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px', lineHeight: 1.6 }}>
              {project.description}
            </p>
          )}

          {/* Milestones */}
          {project.milestones?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 8 }}>
                MILESTONES
              </div>
              <MilestoneList
                milestones={project.milestones}
                projectColor={type.color}
                onToggle={id => onUpdateMilestone && onUpdateMilestone(project.id, id)}
              />
            </div>
          )}

          {/* Achievements */}
          {project.achievements?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 8 }}>
                ACHIEVEMENTS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {project.achievements.map((a, i) => (
                  <AchievementBadge key={i} achievement={a} />
                ))}
              </div>
            </div>
          )}

          {/* Status & quick actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={project.status}
              onChange={e => onUpdateStatus && onUpdateStatus(project.id, e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '4px 8px', color: '#fff', fontSize: 11, cursor: 'pointer',
              }}
            >
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            <button
              onClick={() => onEdit && onEdit(project)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '4px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
                fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Edit3 size={10} /> Edit
            </button>

            <button
              onClick={() => onDelete && onDelete(project.id)}
              style={{
                background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',
                borderRadius: 8, padding: '4px 12px', cursor: 'pointer', color: '#ff6666',
                fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto',
              }}
            >
              <X size={10} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const DEMO_PROJECTS = [
  {
    id: 'p1', name: 'Nexus AI Pro Platform', type: 'coding', status: 'active', platform: 'Node.js + React',
    progress: 72, featured: true, deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    description: 'Enterprise-grade AI platform with multi-model support, analytics, and security dashboards.',
    milestones: [
      { id: 'm1', label: 'Auth system with RBAC', done: true },
      { id: 'm2', label: 'Analytics dashboard (all platforms)', done: true },
      { id: 'm3', label: 'Security dashboard real-time', done: false },
      { id: 'm4', label: 'Payment integration', done: false },
      { id: 'm5', label: 'i18n + multi-language', done: false },
    ],
    achievements: [
      { icon: '🔐', name: 'Secure First', desc: 'AES-256-GCM encryption' },
      { icon: '⚡', name: 'Real-time Ready', desc: 'WebSocket live updates' },
    ],
  },
  {
    id: 'p2', name: 'MetaVerse FPS', type: 'game', status: 'active', platform: 'Unreal Engine 5',
    progress: 35, featured: false, deadline: new Date(Date.now() + 90 * 86400000).toISOString(),
    description: 'First-person shooter with physics-based gameplay and cross-platform multiplayer.',
    milestones: [
      { id: 'm1', label: 'Core movement mechanics', done: true },
      { id: 'm2', label: 'Level design - Arena 1', done: true },
      { id: 'm3', label: 'Multiplayer netcode', done: false },
      { id: 'm4', label: 'Achievement system', done: false },
    ],
    achievements: [
      { icon: '🎮', name: 'Engine Master', desc: 'UE5 Nanite + Lumen' },
    ],
  },
  {
    id: 'p3', name: 'AR Navigation App', type: 'arvr', status: 'planning', platform: 'Apple Vision Pro',
    progress: 12, featured: false, deadline: new Date(Date.now() + 180 * 86400000).toISOString(),
    description: 'Spatial computing navigation overlay using Apple Vision Pro and ARKit.',
    milestones: [
      { id: 'm1', label: 'visionOS setup + provisioning', done: true },
      { id: 'm2', label: 'AR anchor placement', done: false },
      { id: 'm3', label: 'Real-time map integration', done: false },
    ],
    achievements: [],
  },
];

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'coding', status: 'planning', platform: '', description: '', deadline: '', milestones: [] });
  const [milestoneInput, setMilestoneInput] = useState('');

  const addMilestone = () => {
    if (!milestoneInput.trim()) return;
    setForm(f => ({ ...f, milestones: [...f.milestones, { id: generateId(), label: milestoneInput.trim(), done: false }] }));
    setMilestoneInput('');
  };

  const submit = () => {
    if (!form.name.trim()) return;
    onCreate({ ...form, id: generateId(), progress: 0, achievements: [], featured: false });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#0d1117', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>New Project</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
            <X size={18} />
          </button>
        </div>

        {[
          { label: 'Project Name', key: 'name', type: 'text', placeholder: 'My Awesome Project' },
          { label: 'Platform / Engine', key: 'platform', type: 'text', placeholder: 'e.g. Unreal Engine 5, React' },
          { label: 'Deadline', key: 'deadline', type: 'date' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input
              type={f.type} value={form[f.key]} placeholder={f.placeholder}
              onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROJECT_TYPES.map(t => {
              const TI = t.icon;
              return (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  style={{
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: form.type === t.id ? `${t.color}22` : 'transparent',
                    border: `1px solid ${form.type === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
                    color: form.type === t.id ? t.color : 'rgba(255,255,255,0.4)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  <TI size={10} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Brief project description..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Milestones</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              value={milestoneInput}
              onChange={e => setMilestoneInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMilestone()}
              placeholder="Add milestone..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12,
              }}
            />
            <button onClick={addMilestone} style={{
              background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#00ff88', fontSize: 11,
            }}>Add</button>
          </div>
          {form.milestones.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
              background: 'rgba(255,255,255,0.03)', borderRadius: 6, marginBottom: 4,
            }}>
              <CheckCircle size={12} color="rgba(255,255,255,0.2)" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{m.label}</span>
              <button onClick={() => setForm(f => ({ ...f, milestones: f.milestones.filter(x => x.id !== m.id) }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6666', padding: 0 }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)',
          }}>Cancel</button>
          <button onClick={submit} style={{
            padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #00ff88, #00aaff)', border: 'none', color: '#000',
          }}>Create Project</button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectTracker({ userRole = 'user' }) {
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const filtered = projects.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    return true;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    avgProgress: projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) : 0,
  };

  const handleCreate = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const handleDelete = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateMilestone = (projectId, milestoneId) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const updated = p.milestones.map(m => m.id === milestoneId ? { ...m, done: !m.done } : m);
      const doneCount = updated.filter(m => m.done).length;
      const progress = updated.length ? Math.round((doneCount / updated.length) * 100) : p.progress;
      return { ...p, milestones: updated, progress };
    }));
  };

  const handleUpdateStatus = (projectId, status) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p));
  };

  return (
    <div style={{ background: '#080b10', minHeight: '100vh', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={22} color="#00ff88" /> Project Tracker
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Coding · Game Dev · AR/VR/3D — Real-time progress
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: 'linear-gradient(135deg, #00ff88, #00aaff)', border: 'none',
            borderRadius: 10, cursor: 'pointer', color: '#000', fontWeight: 700, fontSize: 13,
          }}
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '14px 24px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: stats.total, color: '#00aaff' },
          { label: 'Active', value: stats.active, color: '#00ff88' },
          { label: 'Completed', value: stats.completed, color: '#aa44ff' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, color: '#ffaa00' },
        ].map(s => (
          <div key={s.label} style={{
            flex: '1 1 100px', padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{s.label}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '0 24px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...STATUSES.map(s => s.id)].map(id => {
            const s = STATUSES.find(x => x.id === id);
            return (
              <button key={id} onClick={() => setFilter(id)} style={{
                padding: '3px 10px', borderRadius: 16, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: filter === id ? (s ? `${s.color}22` : 'rgba(0,255,136,0.12)') : 'transparent',
                border: `1px solid ${filter === id ? (s ? s.color : '#00ff88') : 'rgba(255,255,255,0.1)'}`,
                color: filter === id ? (s ? s.color : '#00ff88') : 'rgba(255,255,255,0.4)',
              }}>
                {id === 'all' ? 'All' : (s?.label || id)}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {['all', ...PROJECT_TYPES.map(t => t.id)].map(id => {
            const t = PROJECT_TYPES.find(x => x.id === id);
            return (
              <button key={id} onClick={() => setTypeFilter(id)} style={{
                padding: '3px 10px', borderRadius: 16, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: typeFilter === id ? `${t ? t.color : '#00ff88'}22` : 'transparent',
                border: `1px solid ${typeFilter === id ? (t ? t.color : '#00ff88') : 'rgba(255,255,255,0.08)'}`,
                color: typeFilter === id ? (t ? t.color : '#00ff88') : 'rgba(255,255,255,0.35)',
              }}>
                {id === 'all' ? 'All Types' : (t?.label || id)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Project grid */}
      <div style={{ padding: '0 24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
            <Target size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No projects match the current filter.</p>
          </div>
        ) : (
          filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={setEditProject}
              onDelete={handleDelete}
              onUpdateMilestone={handleUpdateMilestone}
              onUpdateStatus={handleUpdateStatus}
            />
          ))
        )}
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
    </div>
  );
}
