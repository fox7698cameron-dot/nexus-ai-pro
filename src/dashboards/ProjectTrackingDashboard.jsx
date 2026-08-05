// src/dashboards/ProjectTrackingDashboard.jsx
// Nexus AI Pro — Real-Time Project Tracking Dashboard
// Updated: 2026-08-05
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Tracks: software, game dev, AR/VR/3D projects.
// Connectors: Unreal/Epic, Sony, Microsoft, Ubisoft, Steam, GitHub, Bitbucket.
// Supports: desktop, mobile, tablet; light & dark themes; real-time metrics.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Code, Box, Layers, Rocket, Plus, RefreshCw,
  Check, X, Clock, Star, Zap, Trophy, Users, GitBranch,
  Activity, TrendingUp, BarChart3, Settings, ChevronRight,
  Monitor, Smartphone, Globe, Cpu, Play, Pause, Edit3,
  Package, Crosshair, Radio, Wifi, AlertTriangle, CheckCircle2
} from 'lucide-react';

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const PROJECT_TYPES = [
  { id: 'SOFTWARE', label: 'Software',      icon: Code,    color: '#3b82f6' },
  { id: 'GAME',     label: 'Game Dev',      icon: Gamepad2,color: '#8b5cf6' },
  { id: 'AR',       label: 'AR',            icon: Smartphone, color: '#06b6d4' },
  { id: 'VR',       label: 'VR',            icon: Box,     color: '#10b981' },
  { id: 'XR',       label: 'Mixed Reality', icon: Layers,  color: '#f59e0b' },
  { id: '3D',       label: '3D Project',    icon: Cpu,     color: '#ec4899' },
];

const GAME_PLATFORMS = [
  { id: 'UNREAL',  label: 'Unreal Engine', icon: '🔵' },
  { id: 'EPIC',    label: 'Epic Games',    icon: '🎮' },
  { id: 'UNITY',   label: 'Unity',         icon: '◼' },
  { id: 'GODOT',   label: 'Godot',         icon: '🤖' },
  { id: 'SONY',    label: 'PlayStation',   icon: '🕹️' },
  { id: 'XBOX',    label: 'Xbox',          icon: '🟩' },
  { id: 'UBISOFT', label: 'Ubisoft',       icon: '💠' },
  { id: 'STEAM',   label: 'Steam',         icon: '♨️' },
];

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'REVIEW', 'SHIPPED', 'ARCHIVED'];
const STATUS_COLORS = {
  PLANNING:  { bg: 'bg-blue-100    dark:bg-blue-900/30',  text: 'text-blue-700    dark:text-blue-300'  },
  ACTIVE:    { bg: 'bg-green-100   dark:bg-green-900/30', text: 'text-green-700   dark:text-green-300' },
  ON_HOLD:   { bg: 'bg-yellow-100  dark:bg-yellow-900/30',text: 'text-yellow-700  dark:text-yellow-300'},
  REVIEW:    { bg: 'bg-purple-100  dark:bg-purple-900/30',text: 'text-purple-700  dark:text-purple-300'},
  SHIPPED:   { bg: 'bg-gray-100    dark:bg-gray-800',      text: 'text-gray-700   dark:text-gray-300'  },
  ARCHIVED:  { bg: 'bg-red-100     dark:bg-red-900/30',   text: 'text-red-700    dark:text-red-300'   },
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] ?? STATUS_COLORS.PLANNING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls.bg} ${cls.text}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ProgressBar({ value, max, color = '#3b82f6' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// METRIC CARD
// ---------------------------------------------------------------------------
function MetricCard({ label, value, icon: Icon, color, subtitle }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        {Icon && <Icon size={13} style={{ color }} />}
      </div>
      <span className="text-xl font-bold tabular-nums">{fmtNum(value)}</span>
      {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROJECT CARD
// ---------------------------------------------------------------------------
function ProjectCard({ project, selected, onClick, onSync }) {
  const typeCfg = PROJECT_TYPES.find(t => t.id === project.type) ?? PROJECT_TYPES[0];
  const Icon    = typeCfg.icon;

  const completedMs  = (project.milestones ?? []).filter(m => m.status === 'COMPLETED').length;
  const totalMs      = (project.milestones ?? []).length;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 border transition-all duration-200 ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/25 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="p-2 rounded-xl shrink-0"
          style={{ background: typeCfg.color + '22', color: typeCfg.color }}
        >
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{project.name}</span>
            <StatusBadge status={project.status} />
          </div>
          <div className="text-xs text-gray-500 truncate mt-0.5">{typeCfg.label}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onSync?.(project.id); }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
          title="Sync metrics"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        {[
          { label: 'Commits',    value: project.metrics?.commits     ?? 0 },
          { label: 'Issues',     value: project.metrics?.openIssues  ?? 0 },
          { label: 'Coverage',   value: (project.metrics?.testCoverage ?? 0) + '%' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-sm font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {/* Milestone progress */}
      {totalMs > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Milestones</span>
            <span>{completedMs}/{totalMs}</span>
          </div>
          <ProgressBar value={completedMs} max={totalMs} color={typeCfg.color} />
        </div>
      )}

      {/* Platform chips */}
      {(project.platforms ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {project.platforms.slice(0, 4).map(p => {
            const cfg = GAME_PLATFORMS.find(g => g.id === p);
            return (
              <span
                key={p}
                className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full"
              >
                {cfg?.icon} {cfg?.label ?? p}
              </span>
            );
          })}
          {project.platforms.length > 4 && (
            <span className="text-xs text-gray-400">+{project.platforms.length - 4} more</span>
          )}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ACHIEVEMENT BADGE
// ---------------------------------------------------------------------------
function AchievementBadge({ achievement }) {
  const rarityColors = {
    COMMON:     'border-gray-400    bg-gray-50    dark:bg-gray-800',
    UNCOMMON:   'border-green-400   bg-green-50   dark:bg-green-900/20',
    RARE:       'border-blue-400    bg-blue-50    dark:bg-blue-900/20',
    EPIC:       'border-purple-400  bg-purple-50  dark:bg-purple-900/20',
    LEGENDARY:  'border-yellow-400  bg-yellow-50  dark:bg-yellow-900/20',
  };
  const cls = rarityColors[achievement.rarity] ?? rarityColors.COMMON;
  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl border ${cls}`}>
      <span className="text-xl">{achievement.icon}</span>
      <div>
        <div className="text-xs font-medium">{achievement.name}</div>
        <div className="text-xs text-gray-500">{achievement.points} pts · {achievement.rarity}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NEW PROJECT FORM
// ---------------------------------------------------------------------------
function NewProjectForm({ onCreate, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: 'SOFTWARE', description: '', platforms: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePlatform = (id) => {
    set('platforms', form.platforms.includes(id)
      ? form.platforms.filter(p => p !== id)
      : [...form.platforms, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-lg mb-4">New Project</h3>

        <div className="space-y-4">
          <input
            placeholder="Project name *"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          />

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Project Type</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => set('type', t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      form.type === t.id
                        ? 'border-transparent text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                    style={form.type === t.id ? { background: t.color } : {}}
                  >
                    <Icon size={12} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {['GAME', 'AR', 'VR', 'XR', '3D'].includes(form.type) && (
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Platforms / Engines</label>
              <div className="flex flex-wrap gap-1.5">
                {GAME_PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                      form.platforms.includes(p.id)
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                    }`}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm">
            Cancel
          </button>
          <button
            onClick={() => form.name.trim() && onCreate(form)}
            disabled={!form.name.trim()}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function ProjectTrackingDashboard({ userId, onClose }) {
  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [achievements,    setAchievements]    = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showNewForm,     setShowNewForm]      = useState(false);
  const [filter,          setFilter]          = useState('ALL');
  const [syncingId,       setSyncingId]        = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`/api/projects?userId=${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        }),
        fetch(`/api/achievements?userId=${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        }),
      ]);
      const [pData, aData] = await Promise.all([pRes.json(), aRes.json()]);
      setProjects(pData ?? []);
      setAchievements(aData ?? []);
    } catch (err) {
      console.error('Project fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async (formData) => {
    try {
      const res  = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('nexus:token')}`,
        },
        body: JSON.stringify({ ...formData, ownerId: userId }),
      });
      const project = await res.json();
      setProjects(prev => [project, ...prev]);
      setShowNewForm(false);
    } catch (err) {
      console.error('Create project error:', err);
    }
  };

  const handleSync = async (projectId) => {
    setSyncingId(projectId);
    try {
      await fetch(`/api/projects/${projectId}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
      });
      await fetchProjects();
    } finally {
      setSyncingId(null);
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const filteredProjects = filter === 'ALL'
    ? projects
    : projects.filter(p => p.type === filter || p.status === filter);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <Rocket size={18} className="text-purple-500" />
          <h2 className="font-bold text-base">Project Tracker</h2>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
            {projects.length} projects
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchProjects}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium"
          >
            <Plus size={12} /> New Project
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto shrink-0">
        {['ALL', ...PROJECT_TYPES.map(t => t.id)].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30'
            }`}
          >
            {f === 'ALL' ? '📋 All' : `${PROJECT_TYPES.find(t => t.id === f)?.label ?? f}`}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading projects…
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Rocket size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to get started.</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium"
            >
              + Create Project
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Project cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProjects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={selectedProject === p.id}
                  onClick={() => setSelectedProject(selectedProject === p.id ? null : p.id)}
                  onSync={handleSync}
                />
              ))}
            </div>

            {/* Expanded detail */}
            {selectedProject && selectedProjectData && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">{selectedProjectData.name}</h3>
                  <StatusBadge status={selectedProjectData.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <MetricCard label="Commits"      value={selectedProjectData.metrics?.commits      ?? 0} icon={GitBranch} color="#3b82f6" />
                  <MetricCard label="Open Issues"  value={selectedProjectData.metrics?.openIssues   ?? 0} icon={AlertTriangle} color="#f59e0b" />
                  <MetricCard label="Pull Requests"value={selectedProjectData.metrics?.pullRequests  ?? 0} icon={Activity} color="#8b5cf6" />
                  <MetricCard label="Coverage"     value={(selectedProjectData.metrics?.testCoverage ?? 0) + '%'} icon={CheckCircle2} color="#10b981" />
                </div>

                {/* Game metrics */}
                {selectedProjectData.gameMetrics && (
                  <>
                    <h4 className="text-sm font-medium mb-3 text-purple-600 dark:text-purple-400">
                      🎮 Game Metrics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <MetricCard label="Players"     value={selectedProjectData.gameMetrics.players}        icon={Users}      color="#8b5cf6" />
                      <MetricCard label="DAU"          value={selectedProjectData.gameMetrics.dau}            icon={Activity}   color="#ec4899" />
                      <MetricCard label="D1 Retention" value={selectedProjectData.gameMetrics.retentionD1 + '%'} icon={TrendingUp} color="#10b981" />
                      <MetricCard label="Avg Session"  value={selectedProjectData.gameMetrics.avgSessionMin + 'm'} icon={Clock}    color="#3b82f6" />
                    </div>

                    {/* Achievements */}
                    {(selectedProjectData.gameMetrics.achievements ?? []).length > 0 && (
                      <>
                        <h4 className="text-sm font-medium mb-2">🏆 Achievements</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {achievements
                            .filter(a => selectedProjectData.gameMetrics.achievements.includes(a.id))
                            .map(a => <AchievementBadge key={a.id} achievement={a} />)
                          }
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* AR/VR metrics */}
                {selectedProjectData.arvrMetrics && (
                  <>
                    <h4 className="text-sm font-medium mb-3 text-cyan-600 dark:text-cyan-400">
                      🥽 AR/VR Metrics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MetricCard label="Active Users" value={selectedProjectData.arvrMetrics.activeUsers} icon={Users}  color="#06b6d4" />
                      <MetricCard label="Avg FPS"       value={selectedProjectData.arvrMetrics.avgFps}      icon={Zap}    color="#10b981" />
                      <MetricCard label="Latency"       value={selectedProjectData.arvrMetrics.latencyMs + 'ms'} icon={Radio} color="#f59e0b" />
                      <MetricCard label="Sessions"      value={selectedProjectData.arvrMetrics.sessionCount} icon={Play}  color="#8b5cf6" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* User achievements panel */}
            {achievements.length > 0 && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-500" /> Your Achievements ({achievements.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewForm && (
        <NewProjectForm onCreate={handleCreate} onCancel={() => setShowNewForm(false)} />
      )}
    </div>
  );
}
