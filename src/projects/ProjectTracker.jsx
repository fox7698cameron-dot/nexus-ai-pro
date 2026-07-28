// Created: 2026-07-28
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Code2, Gamepad2, Glasses, CheckCircle2, Circle,
  GitCommit, Target, Zap, AlertCircle, Clock, X,
  Calendar, Users, Tag, FolderKanban,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_META = {
  coding: { label: 'Coding', color: 'text-blue-400 bg-blue-900/30 border-blue-800', icon: Code2 },
  'game-development': { label: 'Game Dev', color: 'text-purple-400 bg-purple-900/30 border-purple-800', icon: Gamepad2 },
  'ar-vr-3d': { label: 'AR/VR/3D', color: 'text-cyan-400 bg-cyan-900/30 border-cyan-800', icon: Glasses },
};

const STATUS_META = {
  planning: { label: 'Planning', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-800' },
  active:   { label: 'Active',   color: 'text-green-400 bg-green-900/30 border-green-800' },
  review:   { label: 'Review',   color: 'text-blue-400 bg-blue-900/30 border-blue-800' },
  complete: { label: 'Complete', color: 'text-gray-400 bg-gray-800 border-gray-700' },
  paused:   { label: 'Paused',   color: 'text-orange-400 bg-orange-900/30 border-orange-800' },
};

const PRIORITY_META = {
  high:   { label: 'High',   color: 'text-red-400 bg-red-900/30 border-red-800' },
  medium: { label: 'Medium', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-800' },
  low:    { label: 'Low',    color: 'text-green-400 bg-green-900/30 border-green-800' },
};

const PLATFORM_META = {
  unreal:    { emoji: '🎮', label: 'Unreal' },
  epic:      { emoji: '⚡', label: 'Epic' },
  sony:      { emoji: '🎯', label: 'Sony' },
  microsoft: { emoji: '🟦', label: 'Microsoft' },
  ubisoft:   { emoji: '🔷', label: 'Ubisoft' },
};

const RARITY_META = {
  common:    { label: 'Common',    color: 'text-gray-400 bg-gray-800' },
  rare:      { label: 'Rare',      color: 'text-blue-400 bg-blue-900/30' },
  epic:      { label: 'Epic',      color: 'text-purple-400 bg-purple-900/30' },
  legendary: { label: 'Legendary', color: 'text-yellow-400 bg-yellow-900/30' },
};

const MOCK_PROJECTS = [
  {
    id: 'mock_1', name: 'Nexus API v3', type: 'coding',
    description: 'Next-generation API platform with real-time capabilities and WebSocket support.',
    status: 'active', progress: 68, tags: ['api', 'nodejs', 'websockets'],
    platform: 'AWS', engine: '', createdAt: '2026-01-15T10:00:00Z',
    teamMembers: ['Cameron', 'Alex', 'Jordan'],
    milestones: [
      { id: 'ms1', name: 'Core API Design',       dueDate: '2026-02-01', completed: true },
      { id: 'ms2', name: 'Authentication System', dueDate: '2026-03-01', completed: true },
      { id: 'ms3', name: 'Rate Limiting',          dueDate: '2026-04-01', completed: false },
      { id: 'ms4', name: 'Documentation',          dueDate: '2026-05-01', completed: false },
    ],
    tasks: [
      { id: 't1', title: 'Design rate limiting strategy',  assignee: 'Cameron', priority: 'high',   status: 'planning' },
      { id: 't2', title: 'Implement WebSocket handlers',    assignee: 'Alex',    priority: 'high',   status: 'active' },
      { id: 't3', title: 'Write integration tests',         assignee: 'Jordan',  priority: 'medium', status: 'active' },
      { id: 't4', title: 'Set up CI/CD pipeline',           assignee: 'Cameron', priority: 'medium', status: 'complete' },
      { id: 't5', title: 'Database schema migration',       assignee: 'Alex',    priority: 'low',    status: 'complete' },
    ],
    commits: [
      { hash: 'a1b2c3d4e5f6', message: 'feat: add WebSocket connection manager',  author: 'Cameron', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { hash: 'b2c3d4e5f6a7', message: 'fix: resolve auth token expiry edge case', author: 'Alex',    timestamp: new Date(Date.now() - 7200000).toISOString() },
      { hash: 'c3d4e5f6a7b8', message: 'refactor: optimize database query layer',  author: 'Jordan',  timestamp: new Date(Date.now() - 90000000).toISOString() },
    ],
    deployments: [{ platform: 'AWS', version: '2.9.0', status: 'success', timestamp: new Date(Date.now() - 86400000).toISOString() }],
    metadata: { connectedPlatforms: [] },
  },
  {
    id: 'mock_2', name: 'Shadow Realm', type: 'game-development',
    description: 'Open-world RPG with procedural generation, dynamic AI, and co-op multiplayer.',
    status: 'planning', progress: 22, tags: ['rpg', 'unreal', 'procedural'],
    platform: 'PC / Console', engine: 'Unreal Engine', createdAt: '2026-03-01T09:00:00Z',
    teamMembers: ['Cameron', 'Riley', 'Sam', 'Taylor'],
    milestones: [
      { id: 'ms5', name: 'Prototype Level',    dueDate: '2026-04-15', completed: true },
      { id: 'ms6', name: 'Core Combat System', dueDate: '2026-06-01', completed: false },
      { id: 'ms7', name: 'Alpha Build',        dueDate: '2026-09-01', completed: false },
    ],
    tasks: [
      { id: 't6', title: 'Design world map layout',        assignee: 'Riley',   priority: 'high',   status: 'active' },
      { id: 't7', title: 'Enemy AI behavior tree',          assignee: 'Cameron', priority: 'high',   status: 'planning' },
      { id: 't8', title: 'Create asset pipeline',           assignee: 'Sam',     priority: 'medium', status: 'planning' },
      { id: 't9', title: 'Audio system integration',        assignee: 'Taylor',  priority: 'low',    status: 'complete' },
    ],
    commits: [
      { hash: 'd4e5f6a7b8c9', message: 'feat: procedural terrain generation system', author: 'Cameron', timestamp: new Date(Date.now() - 1800000).toISOString() },
      { hash: 'e5f6a7b8c9d0', message: 'art: import base character skeletal meshes',  author: 'Riley',   timestamp: new Date(Date.now() - 10800000).toISOString() },
    ],
    deployments: [],
    metadata: {
      engine: 'unreal', connectedPlatforms: ['unreal', 'epic'],
      achievements: [
        { id: 'ach1', name: 'First Blood',    description: 'Defeat your first enemy in combat.',  icon: '⚔️',  rarity: 'common',    points: 10,  unlockedAt: '2026-03-15T12:00:00Z' },
        { id: 'ach2', name: 'Explorer',       description: 'Discover 10 hidden areas in the world.',icon: '🗺️',  rarity: 'rare',      points: 50,  unlockedAt: '2026-03-20T14:00:00Z' },
        { id: 'ach3', name: 'Shadow Master',  description: 'Complete the main story campaign.',   icon: '🌑',  rarity: 'legendary', points: 500, unlockedAt: null },
      ],
    },
  },
  {
    id: 'mock_3', name: 'Virtual Studio', type: 'ar-vr-3d',
    description: 'Immersive AR workspace for collaborative real-time 3D design sessions.',
    status: 'active', progress: 45, tags: ['ar', 'collaboration', '3d'],
    platform: 'Meta Quest / HoloLens', engine: '', createdAt: '2026-02-10T11:00:00Z',
    teamMembers: ['Cameron', 'Morgan'],
    milestones: [
      { id: 'ms8',  name: 'Hand Tracking Integration', dueDate: '2026-03-01', completed: true },
      { id: 'ms9',  name: 'Multi-user Sync',            dueDate: '2026-04-15', completed: true },
      { id: 'ms10', name: 'Asset Library',              dueDate: '2026-06-30', completed: false },
    ],
    tasks: [
      { id: 't10', title: 'Implement spatial audio',    assignee: 'Morgan',  priority: 'medium', status: 'active' },
      { id: 't11', title: 'Optimize render pipeline',   assignee: 'Cameron', priority: 'high',   status: 'active' },
      { id: 't12', title: 'UI widget system',            assignee: 'Morgan',  priority: 'medium', status: 'planning' },
      { id: 't13', title: 'Session recording feature',  assignee: 'Cameron', priority: 'low',    status: 'complete' },
    ],
    commits: [
      { hash: 'f6a7b8c9d0e1', message: 'fix: resolve hand tracking drift on Quest 3',  author: 'Cameron', timestamp: new Date(Date.now() - 5400000).toISOString() },
      { hash: 'a7b8c9d0e1f2', message: 'feat: multi-user presence indicators',          author: 'Morgan',  timestamp: new Date(Date.now() - 43200000).toISOString() },
      { hash: 'b8c9d0e1f2a3', message: 'perf: reduce draw calls by 40% via batching',  author: 'Cameron', timestamp: new Date(Date.now() - 172800000).toISOString() },
    ],
    deployments: [{ platform: 'Meta Quest', version: '0.4.5', status: 'success', timestamp: new Date(Date.now() - 259200000).toISOString() }],
    metadata: { xrType: 'AR', connectedPlatforms: [] },
  },
];

// ── Utility helpers ──────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Small shared UI ──────────────────────────────────────────────────────────

function Badge({ text, className }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}>
      {text}
    </span>
  );
}

function TypeBadge({ type }) {
  const m = TYPE_META[type] || TYPE_META.coding;
  return <Badge text={m.label} className={m.color} />;
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.planning;
  return <Badge text={m.label} className={m.color} />;
}

function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  return <Badge text={m.label} className={m.color} />;
}

// ── Tab sub-panels ───────────────────────────────────────────────────────────

function OverviewTab({ project, onTogglePlatform }) {
  const connected = project.metadata?.connectedPlatforms || [];
  const completedTasks = project.tasks?.filter(t => t.status === 'complete').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2"><Calendar size={13} /> Created</div>
          <div className="text-white font-medium">{formatDate(project.createdAt)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2"><Users size={13} /> Team</div>
          <div className="text-white font-medium text-sm">{project.teamMembers?.join(', ') || 'Solo'}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 col-span-2">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2"><Tag size={13} /> Tags</div>
          <div className="flex flex-wrap gap-2">
            {(project.tags || []).map(tag => (
              <span key={tag} className="text-xs text-purple-300 bg-purple-900/20 px-2 py-0.5 rounded-full border border-purple-800">
                {tag}
              </span>
            ))}
            {!project.tags?.length && <span className="text-gray-600 text-xs">No tags</span>}
          </div>
        </div>
      </div>

      {project.type === 'game-development' && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Platform Connections</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PLATFORM_META).map(([key, meta]) => {
              const isOn = connected.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => onTogglePlatform(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${isOn
                    ? 'bg-purple-900/30 border-purple-600 text-purple-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}
                >
                  <span>{meta.emoji}</span><span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { value: project.commits?.length ?? 0,      label: 'Total Commits' },
          { value: project.deployments?.length ?? 0,  label: 'Deployments' },
          { value: completedTasks,                     label: 'Tasks Done' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-gray-400 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestonesTab({ project, onToggle, newMilestone, setNewMilestone, onAdd }) {
  return (
    <div className="space-y-3">
      {(project.milestones || []).map(m => (
        <div key={m.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
          <button
            onClick={() => onToggle(project.id, m.id)}
            className="flex-shrink-0 text-gray-400 hover:text-green-400 transition-colors"
          >
            {m.completed
              ? <CheckCircle2 size={18} className="text-green-400" />
              : <Circle size={18} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm truncate ${m.completed ? 'line-through text-gray-500' : 'text-white'}`}>
              {m.name}
            </div>
            {m.dueDate && (
              <div className="text-xs text-gray-500 mt-0.5">Due {formatDate(m.dueDate)}</div>
            )}
          </div>
          {m.completed && (
            <span className="flex-shrink-0 text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full border border-green-800">
              Done
            </span>
          )}
        </div>
      ))}
      {!project.milestones?.length && (
        <div className="text-center text-gray-600 py-6 text-sm">No milestones yet</div>
      )}
      <div className="flex gap-2 pt-2">
        <input
          value={newMilestone.name}
          onChange={e => setNewMilestone(p => ({ ...p, name: e.target.value }))}
          placeholder="New milestone..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
        />
        <input
          type="date"
          value={newMilestone.dueDate}
          onChange={e => setNewMilestone(p => ({ ...p, dueDate: e.target.value }))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-600"
        />
        <button
          onClick={onAdd}
          className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function TasksTab({ project }) {
  const columns = [
    { key: 'planning', label: 'Planning', color: 'text-yellow-400' },
    { key: 'active',   label: 'Active',   color: 'text-green-400' },
    { key: 'complete', label: 'Complete', color: 'text-gray-400' },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {columns.map(col => {
        const colTasks = (project.tasks || []).filter(t => t.status === col.key);
        return (
          <div key={col.key}>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${col.color}`}>
              {col.label} <span className="opacity-50">({colTasks.length})</span>
            </div>
            <div className="space-y-2">
              {colTasks.map(task => (
                <div key={task.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 space-y-2">
                  <div className="text-sm text-white font-medium leading-snug">{task.title}</div>
                  {task.assignee && (
                    <div className="text-xs text-gray-500">{task.assignee}</div>
                  )}
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
              {!colTasks.length && (
                <div className="text-center text-gray-700 text-xs py-4 border border-dashed border-gray-800 rounded-lg">
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommitsTab({ project }) {
  const commits = project.commits || [];
  return (
    <div className="space-y-2">
      {!commits.length && (
        <div className="text-center text-gray-600 py-10 text-sm">No commits yet</div>
      )}
      {commits.map((c, i) => (
        <div key={i} className="flex items-start gap-3 bg-gray-800/50 rounded-lg p-3">
          <GitCommit size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <code className="text-xs text-purple-400 font-mono bg-purple-900/20 px-1.5 py-0.5 rounded">
                {c.hash.slice(0, 7)}
              </code>
              <span className="text-sm text-white">{c.message}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {c.author} · {formatRelTime(c.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AchievementsTab({ project, newAch, setNewAch, onGrant }) {
  const achievements = project.metadata?.achievements || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {achievements.map(ach => {
          const rarity = RARITY_META[ach.rarity] || RARITY_META.common;
          return (
            <div key={ach.id} className="bg-gray-800/70 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ach.icon || '🏆'}</span>
                  <div>
                    <div className="text-white font-medium text-sm leading-tight">{ach.name}</div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${rarity.color}`}>
                      {rarity.label}
                    </span>
                  </div>
                </div>
                <div className="text-yellow-400 font-bold text-sm whitespace-nowrap">{ach.points}pts</div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{ach.description}</p>
              {ach.unlockedAt && (
                <div className="text-xs text-gray-600 mt-2">Unlocked {formatDate(ach.unlockedAt)}</div>
              )}
              {!ach.unlockedAt && (
                <div className="text-xs text-gray-700 mt-2 italic">Locked</div>
              )}
            </div>
          );
        })}
        {!achievements.length && (
          <div className="col-span-2 text-center text-gray-600 py-6 text-sm">No achievements granted yet</div>
        )}
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">Grant Achievement</h4>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={newAch.name}
            onChange={e => setNewAch(p => ({ ...p, name: e.target.value }))}
            placeholder="Name"
            className="col-span-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
          />
          <input
            value={newAch.description}
            onChange={e => setNewAch(p => ({ ...p, description: e.target.value }))}
            placeholder="Description"
            className="col-span-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
          />
          <input
            value={newAch.icon}
            onChange={e => setNewAch(p => ({ ...p, icon: e.target.value }))}
            placeholder="Icon (emoji)"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
          />
          <input
            type="number"
            value={newAch.points}
            min={1}
            onChange={e => setNewAch(p => ({ ...p, points: Number(e.target.value) }))}
            placeholder="Points"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
          />
          <select
            value={newAch.rarity}
            onChange={e => setNewAch(p => ({ ...p, rarity: e.target.value }))}
            className="col-span-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-600"
          >
            {Object.entries(RARITY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onGrant}
          disabled={!newAch.name}
          className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Grant Achievement
        </button>
      </div>
    </div>
  );
}

// ── Create Project Modal ─────────────────────────────────────────────────────

function CreateProjectModal({ onClose, newProject, setNewProject, onCreate }) {
  const TARGET_PLATFORMS = ['PC', 'Mac', 'iOS', 'Android', 'PS5', 'Xbox', 'Switch', 'Web'];

  function togglePlatform(plat) {
    setNewProject(p => ({
      ...p,
      platforms: p.platforms.includes(plat)
        ? p.platforms.filter(x => x !== plat)
        : [...p.platforms, plat],
    }));
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">New Project</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Project Name *</label>
            <input
              value={newProject.name}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              placeholder="My awesome project"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
            <select
              value={newProject.type}
              onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600"
            >
              <option value="coding">Coding</option>
              <option value="game-development">Game Development</option>
              <option value="ar-vr-3d">AR / VR / 3D</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={newProject.description}
              onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 resize-none"
            />
          </div>
          {newProject.type === 'game-development' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Game Engine</label>
              <select
                value={newProject.engine}
                onChange={e => setNewProject(p => ({ ...p, engine: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600"
              >
                <option value="">Select engine</option>
                <option value="unreal">Unreal Engine</option>
                <option value="unity">Unity</option>
                <option value="godot">Godot</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}
          {newProject.type === 'ar-vr-3d' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">XR Type</label>
              <select
                value={newProject.xrType}
                onChange={e => setNewProject(p => ({ ...p, xrType: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600"
              >
                <option value="AR">AR — Augmented Reality</option>
                <option value="VR">VR — Virtual Reality</option>
                <option value="MR">MR — Mixed Reality</option>
                <option value="XR">XR — Extended Reality</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Target Platforms</label>
            <div className="flex flex-wrap gap-3">
              {TARGET_PLATFORMS.map(plat => (
                <label key={plat} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newProject.platforms.includes(plat)}
                    onChange={() => togglePlatform(plat)}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-gray-300">{plat}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!newProject.name.trim()}
            className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ProjectTracker({ socket }) {
  const [projects,     setProjects]     = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [filterType,   setFilterType]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab,    setActiveTab]    = useState('overview');
  const [showModal,    setShowModal]    = useState(false);
  const [newProject,   setNewProject]   = useState({ name: '', type: 'coding', description: '', engine: '', xrType: 'XR', platforms: [] });
  const [newMilestone, setNewMilestone] = useState({ name: '', dueDate: '' });
  const [newAch,       setNewAch]       = useState({ name: '', description: '', icon: '', rarity: 'common', points: 10 });

  // Fetch projects from API, fall back to mock data
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      const list = data?.length ? data : MOCK_PROJECTS;
      setProjects(list);
      setSelected(list[0] ?? null);
    } catch {
      setProjects(MOCK_PROJECTS);
      setSelected(MOCK_PROJECTS[0]);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (data) => {
      setProjects(prev => prev.map(p => p.id === data.id ? { ...p, ...data } : p));
      setSelected(prev => prev?.id === data.id ? { ...prev, ...data } : prev);
    };
    socket.on('project:update', onUpdate);
    return () => socket.off('project:update', onUpdate);
  }, [socket]);

  // Sync selected when projects list changes
  const updateBoth = useCallback((id, updater) => {
    setProjects(prev => prev.map(p => p.id === id ? updater(p) : p));
    setSelected(prev => prev?.id === id ? updater(prev) : prev);
  }, []);

  const handleCreateProject = useCallback(async () => {
    const optimistic = {
      ...newProject, id: `local_${Date.now()}`, progress: 0, status: 'planning',
      tags: [], milestones: [], tasks: [], commits: [], deployments: [],
      teamMembers: [], createdAt: new Date().toISOString(), metadata: { connectedPlatforms: [] },
    };
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      const created = await res.json();
      setProjects(prev => [...prev, created]);
      setSelected(created);
    } catch {
      setProjects(prev => [...prev, optimistic]);
      setSelected(optimistic);
    }
    setShowModal(false);
    setNewProject({ name: '', type: 'coding', description: '', engine: '', xrType: 'XR', platforms: [] });
    setActiveTab('overview');
  }, [newProject]);

  const handleToggleMilestone = useCallback(async (projectId, milestoneId) => {
    updateBoth(projectId, p => ({
      ...p,
      milestones: p.milestones.map(m =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      ),
    }));
    try { await fetch(`/api/projects/${projectId}/milestones/${milestoneId}/complete`, { method: 'POST' }); } catch {}
  }, [updateBoth]);

  const handleAddMilestone = useCallback(async () => {
    if (!selected || !newMilestone.name.trim()) return;
    const entry = { id: `ms_${Date.now()}`, ...newMilestone, completed: false };
    updateBoth(selected.id, p => ({ ...p, milestones: [...p.milestones, entry] }));
    setNewMilestone({ name: '', dueDate: '' });
    try {
      await fetch(`/api/projects/${selected.id}/milestones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMilestone),
      });
    } catch {}
  }, [selected, newMilestone, updateBoth]);

  const handleTogglePlatform = useCallback(async (platform) => {
    if (!selected) return;
    const connected = selected.metadata?.connectedPlatforms || [];
    const isOn = connected.includes(platform);
    updateBoth(selected.id, p => ({
      ...p,
      metadata: {
        ...p.metadata,
        connectedPlatforms: isOn
          ? connected.filter(x => x !== platform)
          : [...connected, platform],
      },
    }));
    try {
      await fetch(`/api/projects/${selected.id}/platforms/${platform}`, { method: isOn ? 'DELETE' : 'POST' });
    } catch {}
  }, [selected, updateBoth]);

  const handleUpdateStatus = useCallback(async (status) => {
    if (!selected) return;
    updateBoth(selected.id, p => ({ ...p, status }));
    try {
      await fetch(`/api/projects/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {}
  }, [selected, updateBoth]);

  const handleUpdateProgress = useCallback(async (progress) => {
    if (!selected) return;
    updateBoth(selected.id, p => ({ ...p, progress: Number(progress) }));
    try {
      await fetch(`/api/projects/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: Number(progress) }),
      });
    } catch {}
  }, [selected, updateBoth]);

  const handleGrantAchievement = useCallback(async () => {
    if (!selected || !newAch.name.trim()) return;
    const entry = { id: `ach_${Date.now()}`, ...newAch, unlockedAt: new Date().toISOString() };
    updateBoth(selected.id, p => ({
      ...p,
      metadata: { ...p.metadata, achievements: [...(p.metadata?.achievements || []), entry] },
    }));
    setNewAch({ name: '', description: '', icon: '', rarity: 'common', points: 10 });
    try {
      await fetch(`/api/projects/${selected.id}/achievements`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {}
  }, [selected, newAch, updateBoth]);

  const filteredProjects = projects.filter(p => {
    if (filterType   !== 'all' && p.type   !== filterType)   return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  const tabs = selected
    ? ['overview', 'milestones', 'tasks', 'commits', ...(selected.type === 'game-development' ? ['achievements'] : [])]
    : [];

  const metrics = selected ? {
    velocity:      selected.tasks?.filter(t => t.status === 'complete').length ?? 0,
    openTasks:     selected.tasks?.filter(t => t.status !== 'complete').length ?? 0,
    recentCommits: selected.commits?.filter(c => new Date(c.timestamp) > new Date(Date.now() - 86400000)).length ?? 0,
  } : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white tracking-tight">Project Tracker</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> New Project
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-1">
            {['all', 'coding', 'game-development', 'ar-vr-3d'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterType === t ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {t === 'all' ? 'All Types' : (TYPE_META[t]?.label ?? t)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-1">
            {['all', 'planning', 'active', 'review', 'complete', 'paused'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterStatus === s ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {s === 'all' ? 'All Status' : (STATUS_META[s]?.label ?? s)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main split layout ───────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left: project list */}
        <div className="w-full md:w-1/3 border-r border-gray-800 overflow-y-auto flex-shrink-0">
          {filteredProjects.map(project => {
            const Icon = TYPE_META[project.type]?.icon ?? Code2;
            const completedMs = project.milestones?.filter(m => m.completed).length ?? 0;
            const totalMs     = project.milestones?.length ?? 0;
            const isSelected  = selected?.id === project.id;

            return (
              <div
                key={project.id}
                onClick={() => { setSelected(project); setActiveTab('overview'); }}
                className={`p-4 border-b border-gray-800 cursor-pointer transition-colors ${isSelected ? 'bg-gray-800' : 'hover:bg-gray-900'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="font-semibold text-sm text-white truncate">{project.name}</span>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <div className="mb-3">
                  <TypeBadge type={project.type} />
                </div>
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>Progress</span><span>{project.progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-green-500 transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                {totalMs > 0 && (
                  <div className="text-xs text-gray-600">{completedMs}/{totalMs} milestones</div>
                )}
              </div>
            );
          })}
          {!filteredProjects.length && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600">
              <FolderKanban size={32} className="mb-3 opacity-30" />
              <div className="text-sm">No projects match filters</div>
            </div>
          )}
        </div>

        {/* Right: project detail */}
        {selected ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* Project header */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{selected.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <TypeBadge type={selected.type} />
                    {selected.engine && (
                      <span className="text-xs text-gray-500">Engine: <span className="text-gray-300">{selected.engine}</span></span>
                    )}
                    {selected.platform && (
                      <span className="text-xs text-gray-500">Platform: <span className="text-gray-300">{selected.platform}</span></span>
                    )}
                    {selected.metadata?.xrType && (
                      <span className="text-xs text-gray-500">XR: <span className="text-gray-300">{selected.metadata.xrType}</span></span>
                    )}
                  </div>
                  {selected.description && (
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">{selected.description}</p>
                  )}
                </div>
                <select
                  value={selected.status}
                  onChange={e => handleUpdateStatus(e.target.value)}
                  className="flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-600"
                >
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span className="font-semibold text-white">{selected.progress}%</span>
                </div>
                <input
                  type="range" min="0" max="100"
                  value={selected.progress}
                  onChange={e => handleUpdateProgress(e.target.value)}
                  className="w-full h-2 accent-purple-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Tabs bar */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 flex-shrink-0">
              <div className="flex">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <OverviewTab project={selected} onTogglePlatform={handleTogglePlatform} />
              )}
              {activeTab === 'milestones' && (
                <MilestonesTab
                  project={selected}
                  onToggle={handleToggleMilestone}
                  newMilestone={newMilestone}
                  setNewMilestone={setNewMilestone}
                  onAdd={handleAddMilestone}
                />
              )}
              {activeTab === 'tasks' && <TasksTab project={selected} />}
              {activeTab === 'commits' && <CommitsTab project={selected} />}
              {activeTab === 'achievements' && selected.type === 'game-development' && (
                <AchievementsTab
                  project={selected}
                  newAch={newAch}
                  setNewAch={setNewAch}
                  onGrant={handleGrantAchievement}
                />
              )}
            </div>

            {/* Real-time metrics bar */}
            {metrics && (
              <div className="bg-gray-900 border-t border-gray-800 px-6 py-3 flex items-center gap-6 flex-shrink-0 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <Zap size={13} className="text-yellow-400" />
                  <span className="text-gray-400">Velocity:</span>
                  <span className="text-white font-semibold">{metrics.velocity} tasks/wk</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle size={13} className="text-orange-400" />
                  <span className="text-gray-400">Open tasks:</span>
                  <span className="text-white font-semibold">{metrics.openTasks}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={13} className="text-blue-400" />
                  <span className="text-gray-400">Recent commits:</span>
                  <span className="text-white font-semibold">{metrics.recentCommits} (24h)</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Target size={40} className="mx-auto mb-3 opacity-20" />
              <div className="text-sm">Select a project to view details</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Project Modal ────────────────────────────────────────────── */}
      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          newProject={newProject}
          setNewProject={setNewProject}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
