// src/projects/ProjectTracker.jsx
// Nexus AI Pro — Project Tracking Dashboard
// Covers: Coding · Game Development · AR/VR/3D
// Platform connectors: Unreal/Epic · Sony · Microsoft · Ubisoft Connect
// Real-time tracking · Achievement & game progress
// Date: 2026-08-18

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Code, Box, Layers, Cpu, Play, Pause, CheckCircle,
  Clock, Star, Award, TrendingUp, Users, Zap, GitBranch,
  Plus, Trash2, Edit3, ChevronRight, ChevronDown, Activity,
  Shield, Globe, Rocket, BarChart3, Target, Trophy
} from 'lucide-react';

// ─── Project Types ────────────────────────────────────────────────────────────
const PROJECT_TYPES = {
  coding: {
    label: 'Software',
    emoji: '💻',
    color: '#3b82f6',
    icon: <Code size={16} />,
    languages: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'C++', 'Swift', 'Kotlin', 'Java', 'C#'],
  },
  game: {
    label: 'Game Dev',
    emoji: '🎮',
    color: '#8b5cf6',
    icon: <Gamepad2 size={16} />,
    engines: ['Unreal Engine 5', 'Unity', 'Godot', 'GameMaker', 'Defold', 'O3DE', 'Custom'],
  },
  ar_vr: {
    label: 'AR/VR/XR',
    emoji: '🥽',
    color: '#ec4899',
    icon: <Box size={16} />,
    platforms: ['Meta Quest', 'Apple Vision Pro', 'HoloLens', 'Magic Leap', 'Valve Index', 'PS VR2'],
  },
  '3d': {
    label: '3D / Animation',
    emoji: '🎨',
    color: '#f59e0b',
    icon: <Layers size={16} />,
    tools: ['Blender', 'Maya', 'Cinema 4D', '3ds Max', 'Houdini', 'ZBrush'],
  },
};

// ─── Platform Connectors ──────────────────────────────────────────────────────
const PLATFORM_CONNECTORS = {
  epic_games: {
    name: 'Epic Games / Unreal',
    emoji: '🎯',
    color: '#0078f2',
    capabilities: ['project_sync', 'marketplace', 'version_control', 'build_pipeline', 'achievements'],
    connected: false,
  },
  sony_playstation: {
    name: 'PlayStation (Sony)',
    emoji: '🎮',
    color: '#003087',
    capabilities: ['dev_kit', 'trophies', 'psn_analytics', 'certification', 'publishing'],
    connected: false,
  },
  microsoft_xbox: {
    name: 'Xbox (Microsoft)',
    emoji: '🟢',
    color: '#107c10',
    capabilities: ['xbox_live', 'achievements', 'game_pass', 'azure_playfab', 'certification'],
    connected: false,
  },
  ubisoft_connect: {
    name: 'Ubisoft Connect',
    emoji: '🔷',
    color: '#1a63bf',
    capabilities: ['achievements', 'units_currency', 'challenges', 'rewards', 'analytics'],
    connected: false,
  },
  steam: {
    name: 'Steam',
    emoji: '♨️',
    color: '#1b2838',
    capabilities: ['achievements', 'workshop', 'analytics', 'inventory', 'remote_play'],
    connected: false,
  },
  nintendo: {
    name: 'Nintendo',
    emoji: '🔴',
    color: '#e60012',
    capabilities: ['switch_online', 'eshop', 'certification', 'publishing'],
    connected: false,
  },
};

// ─── Project Status ───────────────────────────────────────────────────────────
const PROJECT_STATUSES = {
  planning: { label: 'Planning', color: '#6b7280', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' },
  active: { label: 'Active', color: '#22c55e', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  review: { label: 'In Review', color: '#f59e0b', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  testing: { label: 'Testing', color: '#3b82f6', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  shipped: { label: 'Shipped', color: '#8b5cf6', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  paused: { label: 'Paused', color: '#ef4444', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = '#3b82f6', label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{label}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Achievement Badge ────────────────────────────────────────────────────────
function AchievementBadge({ achievement }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border
      ${achievement.unlocked
        ? 'border-yellow-500/50 bg-yellow-500/10'
        : 'border-gray-700/50 bg-gray-800/30 opacity-60'
      }`}
    >
      <span className="text-xl">{achievement.icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{achievement.name}</p>
        <p className="text-xs text-gray-400 truncate">{achievement.description}</p>
      </div>
      {achievement.unlocked && <CheckCircle size={12} className="text-yellow-400 flex-shrink-0" />}
    </div>
  );
}

// ─── Platform Connector Card ──────────────────────────────────────────────────
function PlatformConnectorCard({ id, platform, onConnect }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{platform.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-white">{platform.name}</p>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${platform.connected ? 'bg-green-400' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">{platform.connected ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onConnect(id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all
            ${platform.connected
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {platform.connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {platform.capabilities.map(cap => (
          <span key={cap} className="px-2 py-0.5 text-xs bg-gray-700/50 text-gray-300 rounded-full">
            {cap.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onSelect, onEdit, onDelete }) {
  const typeConfig = PROJECT_TYPES[project.type];
  const statusConfig = PROJECT_STATUSES[project.status];

  return (
    <div
      className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 cursor-pointer transition-all"
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeConfig?.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-white">{project.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig?.bgColor} ${statusConfig?.textColor}`}>
              {statusConfig?.label}
            </span>
          </div>
        </div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(project)} className="p-1.5 text-gray-400 hover:text-blue-400 rounded transition-colors">
            <Edit3 size={12} />
          </button>
          <button onClick={() => onDelete(project.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <ProgressBar value={project.progress} color={typeConfig?.color} label="Progress" />

      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { label: 'Tasks', value: `${project.completedTasks}/${project.totalTasks}` },
          { label: 'Time', value: `${project.hoursLogged}h` },
          { label: 'Team', value: project.teamSize || '1' },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <p className="text-sm font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {project.platforms && project.platforms.length > 0 && (
        <div className="flex gap-1 mt-2">
          {project.platforms.map(pid => (
            <span key={pid} className="text-sm" title={PLATFORM_CONNECTORS[pid]?.name}>
              {PLATFORM_CONNECTORS[pid]?.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Project Detail View ──────────────────────────────────────────────────────
function ProjectDetail({ project, onClose }) {
  const typeConfig = PROJECT_TYPES[project.type];
  const [activeTab, setActiveTab] = useState('overview');

  const DETAIL_TABS = ['overview', 'achievements', 'progress', 'team'];

  const mockAchievements = [
    { id: '1', name: 'First Commit', description: 'Made the first commit', icon: '🚀', unlocked: true },
    { id: '2', name: 'Milestone 25%', description: 'Reached 25% completion', icon: '🎯', unlocked: true },
    { id: '3', name: 'Milestone 50%', description: 'Halfway there!', icon: '⭐', unlocked: project.progress >= 50 },
    { id: '4', name: 'Milestone 75%', description: 'Almost there!', icon: '🔥', unlocked: project.progress >= 75 },
    { id: '5', name: 'Ship It', description: 'Released to production', icon: '🏆', unlocked: project.status === 'shipped' },
    { id: '6', name: 'Team Player', description: 'Added 3+ team members', icon: '👥', unlocked: (project.teamSize || 1) >= 3 },
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeConfig?.emoji}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{project.name}</h2>
            <p className="text-sm text-gray-400">{typeConfig?.label} Project</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-4">
        {DETAIL_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium capitalize transition-colors border-b-2
              ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <ProgressBar value={project.progress} color={typeConfig?.color} label={`Overall Progress — ${project.progress}%`} />

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Status', value: PROJECT_STATUSES[project.status]?.label },
                { label: 'Type', value: typeConfig?.label },
                { label: 'Hours Logged', value: `${project.hoursLogged}h` },
                { label: 'Team Size', value: project.teamSize || '1' },
                { label: 'Tasks Done', value: `${project.completedTasks}/${project.totalTasks}` },
                { label: 'Deadline', value: project.deadline || 'Not set' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            {project.description && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-300">{project.description}</p>
              </div>
            )}

            {project.platforms && project.platforms.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Connected Platforms</p>
                <div className="flex gap-2">
                  {project.platforms.map(pid => {
                    const pc = PLATFORM_CONNECTORS[pid];
                    return pc ? (
                      <div key={pid} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-lg">
                        <span>{pc.emoji}</span>
                        <span className="text-xs text-white">{pc.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
              <Trophy size={14} className="text-yellow-400" />
              <span>{mockAchievements.filter(a => a.unlocked).length}/{mockAchievements.length} Unlocked</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mockAchievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-4">
            {[
              { label: 'Core Features', value: project.progress * 0.9 },
              { label: 'Testing', value: project.progress * 0.7 },
              { label: 'Documentation', value: project.progress * 0.5 },
              { label: 'Performance', value: project.progress * 0.8 },
              { label: 'Security', value: project.progress * 0.85 },
            ].map(item => (
              <ProgressBar
                key={item.label}
                value={item.value}
                color={typeConfig?.color}
                label={item.label}
              />
            ))}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">{project.teamSize || 1} member(s)</p>
            </div>
            {Array.from({ length: project.teamSize || 1 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm">
                  {String.fromCodePoint(0x1F464)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {i === 0 ? 'You (Owner)' : `Team Member ${i + 1}`}
                  </p>
                  <p className="text-xs text-gray-400">{i === 0 ? 'Project Lead' : 'Contributor'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Project Form ─────────────────────────────────────────────────────────
function NewProjectForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    type: 'coding',
    status: 'planning',
    description: '',
    deadline: '',
    teamSize: 1,
    platforms: [],
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const togglePlatform = (id) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter(p => p !== id)
        : [...prev.platforms, id],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      ...form,
      id: crypto.randomUUID(),
      progress: 0,
      hoursLogged: 0,
      completedTasks: 0,
      totalTasks: 0,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-white">New Project</h3>

      <input
        type="text"
        placeholder="Project name"
        value={form.name}
        onChange={e => handleChange('name', e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        required
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={form.type}
          onChange={e => handleChange('type', e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(PROJECT_TYPES).map(([id, cfg]) => (
            <option key={id} value={id}>{cfg.emoji} {cfg.label}</option>
          ))}
        </select>

        <select
          value={form.status}
          onChange={e => handleChange('status', e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(PROJECT_STATUSES).map(([id, cfg]) => (
            <option key={id} value={id}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={e => handleChange('description', e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Team Size</label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.teamSize}
            onChange={e => handleChange('teamSize', parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Deadline</label>
          <input
            type="date"
            value={form.deadline}
            onChange={e => handleChange('deadline', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-2">Platform Connectors</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PLATFORM_CONNECTORS).map(([id, pc]) => (
            <button
              key={id}
              type="button"
              onClick={() => togglePlatform(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all
                ${form.platforms.includes(id)
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
            >
              {pc.emoji} {pc.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm text-gray-400 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          Create
        </button>
      </div>
    </form>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// ─── Main Project Tracker ─────────────────────────────────────────────────────
export default function ProjectTracker({ apiBase = '' }) {
  const [projects, setProjects] = useState([
    {
      id: '1', name: 'Nexus AI Pro', type: 'coding', status: 'active',
      progress: 72, hoursLogged: 340, completedTasks: 36, totalTasks: 50,
      teamSize: 3, deadline: '2026-12-01', description: 'Full-stack AI platform',
      platforms: ['epic_games'],
    },
    {
      id: '2', name: 'Space Shooter VR', type: 'ar_vr', status: 'active',
      progress: 35, hoursLogged: 120, completedTasks: 14, totalTasks: 40,
      teamSize: 2, deadline: '2027-03-01', description: 'Immersive VR space game',
      platforms: ['sony_playstation', 'microsoft_xbox'],
    },
    {
      id: '3', name: 'Tactical Legends', type: 'game', status: 'planning',
      progress: 10, hoursLogged: 40, completedTasks: 4, totalTasks: 80,
      teamSize: 5, deadline: '2027-06-01', description: 'Multiplayer tactical shooter',
      platforms: ['epic_games', 'ubisoft_connect', 'steam'],
    },
  ]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeView, setActiveView] = useState('projects');
  const [platforms, setPlatforms] = useState({ ...PLATFORM_CONNECTORS });
  const [filter, setFilter] = useState('all');

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.type === filter || p.status === filter);

  const handleCreateProject = useCallback((project) => {
    setProjects(prev => [project, ...prev]);
    setShowNewForm(false);
  }, []);

  const handleDeleteProject = useCallback((id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) setSelectedProject(null);
  }, [selectedProject]);

  const handleConnectPlatform = useCallback((id) => {
    setPlatforms(prev => ({
      ...prev,
      [id]: { ...prev[id], connected: !prev[id].connected },
    }));
  }, []);

  const totalHours = projects.reduce((s, p) => s + p.hoursLogged, 0);
  const activeCount = projects.filter(p => p.status === 'active').length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Rocket size={20} className="text-purple-400" />
            Project Tracker
          </h1>
          <div className="flex gap-2">
            {['projects', 'platforms', 'achievements'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all
                  ${activeView === view
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
        <StatCard label="Total Projects" value={projects.length} icon={<Layers size={14} />} color="#3b82f6" />
        <StatCard label="Active" value={activeCount} icon={<Activity size={14} />} color="#22c55e" />
        <StatCard label="Hours Logged" value={`${totalHours}h`} icon={<Clock size={14} />} color="#f59e0b" />
        <StatCard label="Avg Progress" value={`${avgProgress}%`} icon={<TrendingUp size={14} />} color="#8b5cf6" />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex gap-4 px-4 pb-4">
        {/* Left panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeView === 'projects' && (
            <>
              {/* Filter */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {['all', 'coding', 'game', 'ar_vr', '3d', 'active', 'planning', 'shipped'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-1 text-xs rounded-lg capitalize transition-all
                      ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                  >
                    {f === 'ar_vr' ? 'AR/VR' : f}
                  </button>
                ))}
                <button
                  onClick={() => setShowNewForm(true)}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Plus size={12} />
                  New Project
                </button>
              </div>

              {showNewForm && (
                <div className="mb-3">
                  <NewProjectForm
                    onSubmit={handleCreateProject}
                    onCancel={() => setShowNewForm(false)}
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                {filteredProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelect={setSelectedProject}
                    onEdit={p => setSelectedProject(p)}
                    onDelete={handleDeleteProject}
                  />
                ))}
                {filteredProjects.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No projects match the current filter
                  </div>
                )}
              </div>
            </>
          )}

          {activeView === 'platforms' && (
            <div className="flex-1 overflow-y-auto">
              <p className="text-sm text-gray-400 mb-4">
                Connect your development platforms to sync projects, achievements, and analytics.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(platforms).map(([id, platform]) => (
                  <PlatformConnectorCard
                    key={id}
                    id={id}
                    platform={platform}
                    onConnect={handleConnectPlatform}
                  />
                ))}
              </div>
            </div>
          )}

          {activeView === 'achievements' && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {projects.map(project => (
                <div key={project.id}>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <span>{PROJECT_TYPES[project.type]?.emoji}</span>
                    {project.name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      { id: '1', name: 'First Commit', description: 'Project initialized', icon: '🚀', unlocked: true },
                      { id: '2', name: `${project.progress >= 50 ? '50%' : 'In Progress'}`, description: 'Halfway milestone', icon: '⭐', unlocked: project.progress >= 50 },
                      { id: '3', name: 'Team Builder', description: '3+ team members', icon: '👥', unlocked: (project.teamSize || 1) >= 3 },
                      { id: '4', name: 'Multi-Platform', description: 'Connected 2+ platforms', icon: '🌐', unlocked: (project.platforms || []).length >= 2 },
                    ].map(a => <AchievementBadge key={a.id} achievement={a} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedProject && activeView === 'projects' && (
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <ProjectDetail
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
