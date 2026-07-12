// src/projects/ProjectTracker.jsx
// 2026-07-12 | Real-time project tracking: coding, game dev, AR/VR/3D

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Folder, Code, Gamepad2, Box, Activity,
  Clock, Users, GitBranch, CheckCircle, Circle,
  AlertCircle, TrendingUp, Calendar, Tag, Search,
  ChevronRight, MoreVertical, Zap, Star
} from 'lucide-react';

const PROJECT_TYPES = {
  coding: { label: 'Software', icon: Code, color: '#3b82f6', tags: ['Frontend', 'Backend', 'API', 'CLI', 'Library'] },
  gamedev: { label: 'Game Dev', icon: Gamepad2, color: '#7c3aed', tags: ['Unity', 'Unreal', 'Godot', '2D', '3D', 'Mobile', 'Console'] },
  arvr: { label: 'AR/VR', icon: Box, color: '#ec4899', tags: ['Quest', 'Vision Pro', 'HoloLens', 'WebXR', 'Unity XR', 'ARKit', 'ARCore'] },
  '3d': { label: '3D / Design', icon: Box, color: '#f97316', tags: ['Blender', 'Maya', 'Cinema4D', 'Assets', 'Animation', 'Rigging'] },
};

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: '#6b7280', bg: '#1f2937' },
  active: { label: 'Active', color: '#3b82f6', bg: '#1e3a5f' },
  review: { label: 'Review', color: '#eab308', bg: '#713f12' },
  testing: { label: 'Testing', color: '#8b5cf6', bg: '#3b0764' },
  done: { label: 'Done', color: '#10b981', bg: '#064e3b' },
  blocked: { label: 'Blocked', color: '#ef4444', bg: '#7f1d1d' },
};

const INITIAL_PROJECTS = [
  {
    id: '1', name: 'Nexus AI Pro', type: 'coding', status: 'active',
    description: 'Full-stack AI platform with multi-model support',
    progress: 78, team: 3, tags: ['React', 'Node.js', 'AI'],
    tasks: 24, completedTasks: 19, priority: 'high',
    lastActivity: Date.now() - 300000,
    metrics: { commits: 142, linesChanged: 8400, openPRs: 3, issues: 7 },
    milestones: [
      { name: 'MVP Release', due: Date.now() + 7 * 86400000, done: false },
      { name: 'Beta Launch', due: Date.now() + 30 * 86400000, done: false },
    ],
  },
  {
    id: '2', name: 'Cyberpunk Arena', type: 'gamedev', status: 'active',
    description: 'Multiplayer battle arena in Unreal Engine 5',
    progress: 42, team: 5, tags: ['Unreal', 'C++', 'Multiplayer'],
    tasks: 56, completedTasks: 24, priority: 'high',
    lastActivity: Date.now() - 900000,
    metrics: { builds: 34, assetsCreated: 128, bugsFixed: 47, fps: 120 },
    milestones: [
      { name: 'Alpha Build', due: Date.now() + 14 * 86400000, done: false },
      { name: 'Steam Page', due: Date.now() + 45 * 86400000, done: false },
    ],
  },
  {
    id: '3', name: 'VR Training Suite', type: 'arvr', status: 'review',
    description: 'Enterprise VR training using Meta Quest 3',
    progress: 91, team: 2, tags: ['Quest 3', 'Unity XR', 'Enterprise'],
    tasks: 18, completedTasks: 17, priority: 'medium',
    lastActivity: Date.now() - 1800000,
    metrics: { testSessions: 89, scenesBuilt: 12, interactions: 340, avgLatency: 18 },
    milestones: [
      { name: 'QA Complete', due: Date.now() + 3 * 86400000, done: false },
      { name: 'Client Delivery', due: Date.now() + 10 * 86400000, done: false },
    ],
  },
  {
    id: '4', name: 'Sci-Fi Asset Pack', type: '3d', status: 'active',
    description: 'High-poly 3D asset collection for games and film',
    progress: 55, team: 2, tags: ['Blender', 'PBR', 'Assets'],
    tasks: 30, completedTasks: 17, priority: 'medium',
    lastActivity: Date.now() - 3600000,
    metrics: { modelsCompleted: 34, textureRes: '4K', polyCount: '120K avg', formats: 3 },
    milestones: [
      { name: 'Vol. 1 Release', due: Date.now() + 21 * 86400000, done: false },
    ],
  },
];

function RelativeTime({ timestamp }) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return <span>Just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  if (hours < 24) return <span>{hours}h ago</span>;
  return <span>{Math.floor(hours / 24)}d ago</span>;
}

function ProgressBar({ value, color, height = 6 }) {
  return (
    <div style={{ height, background: '#222', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: height, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function ProjectCard({ project, onClick, isSelected }) {
  const typeConfig = PROJECT_TYPES[project.type];
  const statusCfg = STATUS_CONFIG[project.status];
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={`project-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ borderColor: isSelected ? typeConfig.color : 'transparent' }}
    >
      <div className="pc-header">
        <div className="pc-type" style={{ background: `${typeConfig.color}20`, color: typeConfig.color }}>
          <TypeIcon size={14} />
          <span>{typeConfig.label}</span>
        </div>
        <div className="pc-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>
          {statusCfg.label}
        </div>
      </div>

      <h3 className="pc-name">{project.name}</h3>
      <p className="pc-desc">{project.description}</p>

      <div className="pc-progress">
        <div className="pc-progress-header">
          <span className="pc-progress-label">Progress</span>
          <span className="pc-progress-value" style={{ color: typeConfig.color }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={typeConfig.color} />
      </div>

      <div className="pc-tags">
        {project.tags.slice(0, 3).map(tag => (
          <span key={tag} className="pc-tag">{tag}</span>
        ))}
      </div>

      <div className="pc-footer">
        <div className="pc-footer-stat">
          <CheckCircle size={12} style={{ color: '#10b981' }} />
          <span>{project.completedTasks}/{project.tasks}</span>
        </div>
        <div className="pc-footer-stat">
          <Users size={12} />
          <span>{project.team}</span>
        </div>
        <div className="pc-footer-stat">
          <Clock size={12} />
          <RelativeTime timestamp={project.lastActivity} />
        </div>
        {project.priority === 'high' && (
          <div className="pc-priority high">
            <Zap size={10} />
            High
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectDetail({ project, onClose }) {
  const typeConfig = PROJECT_TYPES[project.type];
  const statusCfg = STATUS_CONFIG[project.status];
  const TypeIcon = typeConfig.icon;

  return (
    <div className="project-detail">
      <div className="pd-header" style={{ borderColor: typeConfig.color }}>
        <div className="pd-title-row">
          <div className="pd-type-badge" style={{ background: `${typeConfig.color}20`, color: typeConfig.color }}>
            <TypeIcon size={16} />
            {typeConfig.label}
          </div>
          <h2>{project.name}</h2>
          <div className="pd-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>
            {statusCfg.label}
          </div>
        </div>
        <p className="pd-desc">{project.description}</p>
      </div>

      <div className="pd-progress-section">
        <div className="pd-progress-header">
          <span>Overall Progress</span>
          <span style={{ color: typeConfig.color, fontWeight: 700 }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={typeConfig.color} height={10} />
        <div className="pd-task-counts">
          <CheckCircle size={14} style={{ color: '#10b981' }} />
          <span>{project.completedTasks} completed</span>
          <Circle size={14} style={{ color: '#888' }} />
          <span>{project.tasks - project.completedTasks} remaining</span>
        </div>
      </div>

      <div className="pd-metrics">
        {Object.entries(project.metrics).map(([key, val]) => (
          <div key={key} className="pd-metric">
            <div className="pd-metric-value">{val}</div>
            <div className="pd-metric-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
          </div>
        ))}
      </div>

      <div className="pd-milestones">
        <h3>Milestones</h3>
        {project.milestones.map((m, i) => (
          <div key={i} className={`milestone ${m.done ? 'done' : ''}`}>
            {m.done ? <CheckCircle size={16} style={{ color: '#10b981' }} /> : <Circle size={16} style={{ color: '#888' }} />}
            <div className="milestone-info">
              <div className="milestone-name">{m.name}</div>
              <div className="milestone-due">
                <Calendar size={11} />
                {new Date(m.due).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pd-tags">
        {project.tags.map(tag => (
          <span key={tag} className="pd-tag" style={{ borderColor: typeConfig.color, color: typeConfig.color }}>
            <Tag size={10} />
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProjectTracker() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('coding');

  const liveRef = useRef(null);

  useEffect(() => {
    liveRef.current = setInterval(() => {
      setProjects(prev => prev.map(p =>
        p.status === 'active' && Math.random() > 0.7
          ? { ...p, lastActivity: Date.now(), progress: Math.min(100, p.progress + Math.random() * 0.5) }
          : p
      ));
    }, 10000);
    return () => clearInterval(liveRef.current);
  }, []);

  const filtered = projects.filter(p => {
    const matchType = filter === 'all' || p.type === filter || p.status === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const selected = projects.find(p => p.id === selectedId);

  const addProject = () => {
    if (!newProjectName.trim()) return;
    const newProject = {
      id: Date.now().toString(),
      name: newProjectName,
      type: newProjectType,
      status: 'planning',
      description: 'New project',
      progress: 0,
      team: 1,
      tags: [PROJECT_TYPES[newProjectType].tags[0]],
      tasks: 0,
      completedTasks: 0,
      priority: 'medium',
      lastActivity: Date.now(),
      metrics: {},
      milestones: [],
    };
    setProjects(prev => [newProject, ...prev]);
    setNewProjectName('');
    setIsAdding(false);
    setSelectedId(newProject.id);
  };

  const totals = {
    active: projects.filter(p => p.status === 'active').length,
    done: projects.filter(p => p.status === 'done').length,
    avgProgress: Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length),
  };

  return (
    <div className="project-tracker">
      <div className="pt-header">
        <div>
          <h1>Project Tracker</h1>
          <p className="pt-sub">Real-time tracking for all project types</p>
        </div>
        <button className="add-project-btn" onClick={() => setIsAdding(true)}>
          <Plus size={16} />
          New Project
        </button>
      </div>

      {isAdding && (
        <div className="add-project-form">
          <input
            type="text"
            placeholder="Project name..."
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProject()}
            autoFocus
          />
          <select value={newProjectType} onChange={e => setNewProjectType(e.target.value)}>
            {Object.entries(PROJECT_TYPES).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <button onClick={addProject}>Create</button>
          <button className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
        </div>
      )}

      <div className="pt-summary">
        <div className="pt-stat">
          <Activity size={18} style={{ color: '#3b82f6' }} />
          <div>
            <div className="pt-stat-value">{totals.active}</div>
            <div className="pt-stat-label">Active</div>
          </div>
        </div>
        <div className="pt-stat">
          <CheckCircle size={18} style={{ color: '#10b981' }} />
          <div>
            <div className="pt-stat-value">{totals.done}</div>
            <div className="pt-stat-label">Completed</div>
          </div>
        </div>
        <div className="pt-stat">
          <TrendingUp size={18} style={{ color: '#7c3aed' }} />
          <div>
            <div className="pt-stat-value">{totals.avgProgress}%</div>
            <div className="pt-stat-label">Avg Progress</div>
          </div>
        </div>
        <div className="pt-stat">
          <Folder size={18} style={{ color: '#f97316' }} />
          <div>
            <div className="pt-stat-value">{projects.length}</div>
            <div className="pt-stat-label">Total</div>
          </div>
        </div>
      </div>

      <div className="pt-controls">
        <div className="pt-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="pt-filters">
          {[['all', 'All'], ['coding', 'Code'], ['gamedev', 'Game Dev'], ['arvr', 'AR/VR'], ['3d', '3D'], ['active', 'Active'], ['done', 'Done']].map(([val, label]) => (
            <button
              key={val}
              className={`filter-btn ${filter === val ? 'active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-layout">
        <div className="pt-list">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
              isSelected={p.id === selectedId}
            />
          ))}
          {filtered.length === 0 && (
            <div className="pt-empty">
              <Folder size={32} style={{ opacity: 0.3 }} />
              <p>No projects found</p>
            </div>
          )}
        </div>

        {selected && (
          <div className="pt-detail-panel">
            <ProjectDetail project={selected} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>

      <style>{`
        .project-tracker { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
        .pt-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .pt-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }
        .pt-sub { margin: 0.25rem 0 0; font-size: 0.875rem; color: #888; }
        .add-project-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; }
        .add-project-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .add-project-form input, .add-project-form select { flex: 1; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid #333; background: #111; color: white; font-size: 0.875rem; min-width: 150px; }
        .add-project-form button { padding: 0.5rem 1rem; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer; }
        .cancel-btn { background: #333 !important; }
        .pt-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .pt-stat { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #111; border-radius: 10px; border: 1px solid #222; }
        .pt-stat-value { font-size: 1.5rem; font-weight: 700; }
        .pt-stat-label { font-size: 0.75rem; color: #888; }
        .pt-controls { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
        .pt-search { display: flex; align-items: center; gap: 0.5rem; background: #111; border: 1px solid #222; border-radius: 8px; padding: 0.4rem 0.75rem; flex: 1; min-width: 200px; }
        .pt-search input { background: transparent; border: none; color: white; font-size: 0.875rem; outline: none; flex: 1; }
        .pt-filters { display: flex; gap: 0.25rem; flex-wrap: wrap; }
        .filter-btn { padding: 0.35rem 0.7rem; border-radius: 6px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 0.8rem; color: #888; transition: all 0.15s; }
        .filter-btn.active { background: #7c3aed; color: white; border-color: #7c3aed; }
        .pt-layout { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 1000px) { .pt-layout { grid-template-columns: 1fr 400px; } }
        .pt-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; align-content: start; }
        .pt-empty { text-align: center; padding: 3rem; color: #888; grid-column: 1/-1; }
        .project-card { background: #111; border-radius: 12px; padding: 1rem; border: 2px solid; cursor: pointer; transition: all 0.2s; }
        .project-card:hover { transform: translateY(-2px); border-color: #333 !important; }
        .project-card.selected { box-shadow: 0 0 20px rgba(124,58,237,0.3); }
        .pc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .pc-type { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .pc-status { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .pc-name { margin: 0 0 0.3rem; font-size: 1rem; font-weight: 700; }
        .pc-desc { margin: 0 0 0.75rem; font-size: 0.8rem; color: #888; line-height: 1.4; }
        .pc-progress { margin-bottom: 0.75rem; }
        .pc-progress-header { display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.3rem; color: #888; }
        .pc-progress-value { font-weight: 700; }
        .pc-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.75rem; }
        .pc-tag { font-size: 0.7rem; padding: 0.15rem 0.4rem; background: #1a1a1a; border-radius: 4px; color: #888; }
        .pc-footer { display: flex; align-items: center; gap: 0.75rem; font-size: 0.78rem; color: #888; }
        .pc-footer-stat { display: flex; align-items: center; gap: 0.25rem; }
        .pc-priority.high { margin-left: auto; display: flex; align-items: center; gap: 0.2rem; color: #f97316; font-size: 0.7rem; font-weight: 700; }
        .pt-detail-panel { background: #111; border-radius: 12px; padding: 1.25rem; border: 1px solid #222; align-self: start; position: sticky; top: 1rem; }
        .pd-header { border-left: 3px solid; padding-left: 0.75rem; margin-bottom: 1rem; }
        .pd-title-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
        .pd-type-badge { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .pd-title-row h2 { margin: 0; font-size: 1.1rem; flex: 1; }
        .pd-status { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .pd-desc { margin: 0; font-size: 0.85rem; color: #888; }
        .pd-progress-section { margin-bottom: 1rem; }
        .pd-progress-header { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem; }
        .pd-task-counts { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: #888; margin-top: 0.4rem; }
        .pd-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
        .pd-metric { background: #1a1a1a; border-radius: 8px; padding: 0.5rem 0.75rem; }
        .pd-metric-value { font-weight: 700; font-size: 1rem; }
        .pd-metric-label { font-size: 0.7rem; color: #888; margin-top: 0.15rem; }
        .pd-milestones h3 { font-size: 0.9rem; margin: 0 0 0.5rem; color: #888; }
        .milestone { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #1a1a1a; }
        .milestone.done .milestone-name { color: #888; text-decoration: line-through; }
        .milestone-name { font-size: 0.875rem; font-weight: 500; }
        .milestone-due { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: #888; }
        .pd-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 1rem; }
        .pd-tag { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; padding: 0.2rem 0.5rem; border: 1px solid; border-radius: 4px; }
        @media (max-width: 640px) {
          .pt-summary { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
