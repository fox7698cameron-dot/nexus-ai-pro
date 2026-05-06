// src/components/ProjectTracker.jsx
// Nexus AI Pro — Real-Time Project Tracker
// Tracks: Coding · Game Dev · AR/VR · 3D Projects
// Game engine connectors: Unreal · Epic · Sony · Microsoft · Ubisoft
// Achievement & progress tracking included
// Updated: 2026-05-06

import React, { useState, useEffect, useCallback } from 'react';
import {
  Code2, Gamepad2, Box, Cpu, Trophy, Star, Zap, Clock,
  GitBranch, Play, Pause, CheckCircle2, Circle, AlertCircle,
  Users, TrendingUp, BarChart3, Plus, Trash2, Edit3,
  Link, Unlink, RefreshCw, Activity, Target, Award,
  Monitor, Layers, Globe, Server, Shield, Rocket,
  ChevronRight, ChevronDown, Save, X
} from 'lucide-react';

// ── Engine connector config ───────────────────────────────────────────────────
const ENGINES = {
  unreal:    { label: 'Unreal Engine',   icon: '⚡', color: 'text-blue-400',   versions: ['5.4', '5.3', '5.2', '4.27'] },
  epic:      { label: 'Epic Games Store',icon: '🏪', color: 'text-purple-400', versions: ['SDK 1.0', 'SDK 2.0'] },
  sony:      { label: 'PlayStation SDK', icon: '🎮', color: 'text-blue-500',   versions: ['PS5 SDK', 'PS4 SDK'] },
  microsoft: { label: 'Xbox GDK',        icon: '🟩', color: 'text-green-400',  versions: ['GDK 2024', 'GDK 2023', 'XDK'] },
  ubisoft:   { label: 'Ubisoft Connect', icon: '🔵', color: 'text-sky-400',    versions: ['PC SDK', 'Console SDK'] },
  unity:     { label: 'Unity Engine',    icon: '🎲', color: 'text-gray-300',   versions: ['6.0', '2023 LTS', '2022 LTS'] },
  godot:     { label: 'Godot Engine',    icon: '🦎', color: 'text-teal-400',   versions: ['4.3', '4.2', '3.6'] },
};

const PROJECT_TYPES = {
  coding:  { label: 'Coding',       icon: <Code2 size={14} />,    color: 'text-blue-400',   bg: 'bg-blue-900/30' },
  game:    { label: 'Game Dev',     icon: <Gamepad2 size={14} />, color: 'text-purple-400', bg: 'bg-purple-900/30' },
  arvr:    { label: 'AR / VR',      icon: <Box size={14} />,      color: 'text-cyan-400',   bg: 'bg-cyan-900/30' },
  '3d':    { label: '3D / Graphics',icon: <Layers size={14} />,   color: 'text-orange-400', bg: 'bg-orange-900/30' },
};

const STATUS_META = {
  active:    { label: 'Active',     color: 'text-green-400',  bg: 'bg-green-900/30',  icon: <Play size={12} /> },
  paused:    { label: 'Paused',     color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: <Pause size={12} /> },
  completed: { label: 'Completed',  color: 'text-blue-400',   bg: 'bg-blue-900/30',   icon: <CheckCircle2 size={12} /> },
  blocked:   { label: 'Blocked',    color: 'text-red-400',    bg: 'bg-red-900/30',    icon: <AlertCircle size={12} /> },
};

// ── Seed data ─────────────────────────────────────────────────────────────────
const DEMO_PROJECTS = [
  {
    id: 'p1', name: 'Nexus AI Core',      type: 'coding', status: 'active',
    progress: 78, hoursLogged: 340, linesOfCode: 42_800, commits: 189,
    engines: [], milestones: ['API integration', 'Auth system', 'Dashboard UI'],
    completedMilestones: ['API integration'],
    achievements: ['first-commit', 'century-commits', 'milestone-master'],
    createdAt: Date.now() - 30 * 86_400_000,
  },
  {
    id: 'p2', name: 'Shadow Realm VR',    type: 'arvr',   status: 'active',
    progress: 45, hoursLogged: 210, linesOfCode: 28_500, commits: 97,
    engines: ['unreal', 'sony'],
    milestones: ['World design', 'Physics engine', 'Multiplayer', 'Sony cert'],
    completedMilestones: ['World design'],
    achievements: ['first-commit', 'engine-connected'],
    createdAt: Date.now() - 60 * 86_400_000,
  },
  {
    id: 'p3', name: 'Crystal Forge 3D',   type: '3d',     status: 'paused',
    progress: 32, hoursLogged: 88,  linesOfCode: 12_000, commits: 41,
    engines: ['unreal'],
    milestones: ['Asset pipeline', 'Shader system', 'Level editor'],
    completedMilestones: [],
    achievements: ['first-commit'],
    createdAt: Date.now() - 90 * 86_400_000,
  },
  {
    id: 'p4', name: 'Pixel Warriors',     type: 'game',   status: 'active',
    progress: 91, hoursLogged: 520, linesOfCode: 67_200, commits: 312,
    engines: ['unity', 'microsoft', 'epic'],
    milestones: ['Gameplay loop', 'Xbox cert', 'Epic store listing', 'Launch'],
    completedMilestones: ['Gameplay loop', 'Xbox cert', 'Epic store listing'],
    achievements: ['first-commit', 'century-commits', 'engine-connected', 'platform-certified', 'milestone-master'],
    createdAt: Date.now() - 180 * 86_400_000,
  },
];

const ACHIEVEMENTS_META = {
  'first-commit':       { label: 'First Commit',         icon: '🌱', desc: 'Created the project' },
  'century-commits':    { label: '100 Commits',          icon: '💯', desc: 'Reached 100 commits' },
  'milestone-master':   { label: 'Milestone Master',     icon: '🏆', desc: 'Completed 3+ milestones' },
  'engine-connected':   { label: 'Engine Connected',     icon: '⚙️', desc: 'Linked a game engine' },
  'platform-certified': { label: 'Platform Certified',   icon: '✅', desc: 'Passed platform certification' },
  'code-10k':           { label: '10K Lines',            icon: '📝', desc: 'Wrote 10,000+ lines' },
  'team-player':        { label: 'Team Player',          icon: '👥', desc: 'Added 3+ collaborators' },
};

// ── Utilities ─────────────────────────────────────────────────────────────────
const fmt = (n) => n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
const daysSince = (ts) => Math.floor((Date.now() - ts) / 86_400_000);

// ── Sub-components ────────────────────────────────────────────────────────────
function ProgressBar({ value, color = 'bg-blue-500' }) {
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function EngineTag({ engineId, connected, onToggle }) {
  const e = ENGINES[engineId];
  if (!e) return null;
  return (
    <button
      onClick={() => onToggle(engineId)}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${connected ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-400'}`}
    >
      <span>{e.icon}</span>
      <span>{e.label}</span>
      {connected ? <Link size={10} /> : <Unlink size={10} />}
    </button>
  );
}

function AchievementBadge({ id }) {
  const a = ACHIEVEMENTS_META[id];
  if (!a) return null;
  return (
    <div title={a.desc} className="flex flex-col items-center gap-0.5">
      <span className="text-xl">{a.icon}</span>
      <span className="text-gray-400 text-xs text-center leading-tight">{a.label}</span>
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const type = PROJECT_TYPES[project.type] || PROJECT_TYPES.coding;
  const status = STATUS_META[project.status] || STATUS_META.active;

  return (
    <button
      onClick={() => onSelect(project.id)}
      className={`w-full rounded-xl border p-4 text-left transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-500/30 bg-gray-800' : 'border-gray-700 bg-gray-800/60 hover:border-gray-500'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={type.color}>{type.icon}</span>
          <span className="text-white font-semibold text-sm">{project.name}</span>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${status.color} ${status.bg}`}>
          {status.icon}{status.label}
        </span>
      </div>

      <ProgressBar
        value={project.progress}
        color={project.progress >= 80 ? 'bg-green-500' : project.progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}
      />
      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>{project.progress}% complete</span>
        <span>{fmt(project.commits)} commits</span>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {project.engines.slice(0, 3).map((e) => (
          <span key={e} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{ENGINES[e]?.icon} {ENGINES[e]?.label}</span>
        ))}
        {project.engines.length > 3 && <span className="text-xs text-gray-500">+{project.engines.length - 3}</span>}
      </div>
    </button>
  );
}

function ProjectDetail({ project, onUpdate }) {
  const [enginesOpen, setEnginesOpen] = useState(false);
  const type   = PROJECT_TYPES[project.type]   || PROJECT_TYPES.coding;
  const status = STATUS_META[project.status]   || STATUS_META.active;

  const toggleEngine = (engineId) => {
    const engines = project.engines.includes(engineId)
      ? project.engines.filter((e) => e !== engineId)
      : [...project.engines, engineId];
    onUpdate({ ...project, engines });
  };

  const toggleMilestone = (m) => {
    const done = project.completedMilestones.includes(m)
      ? project.completedMilestones.filter((x) => x !== m)
      : [...project.completedMilestones, m];
    onUpdate({ ...project, completedMilestones: done, progress: Math.round((done.length / project.milestones.length) * 100) });
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 space-y-5">
      {/* Title row */}
      <div className="flex items-start gap-3">
        <span className={`text-2xl ${type.color}`}>{type.icon}</span>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg">{project.name}</h3>
          <p className="text-gray-400 text-xs">{type.label} · {daysSince(project.createdAt)} days ago</p>
        </div>
        <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${status.color} ${status.bg}`}>
          {status.icon}{status.label}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Progress',     value: `${project.progress}%`,        icon: <Target size={13} /> },
          { label: 'Hours',        value: `${project.hoursLogged}h`,     icon: <Clock size={13} /> },
          { label: 'Commits',      value: fmt(project.commits),          icon: <GitBranch size={13} /> },
          { label: 'Lines',        value: fmt(project.linesOfCode),      icon: <Code2 size={13} /> },
        ].map((s) => (
          <div key={s.label} className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">{s.icon}{s.label}</div>
            <p className="text-white font-bold text-base">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Overall Progress</span><span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color="bg-blue-500" />
      </div>

      {/* Milestones */}
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Milestones</p>
        <div className="space-y-2">
          {project.milestones.map((m) => {
            const done = project.completedMilestones.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggleMilestone(m)}
                className="w-full flex items-center gap-2 text-sm hover:bg-gray-700/30 rounded p-1 transition-colors"
              >
                {done ? <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" /> : <Circle size={16} className="text-gray-500 flex-shrink-0" />}
                <span className={done ? 'text-gray-400 line-through' : 'text-white'}>{m}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Engine connectors */}
      <div>
        <button
          onClick={() => setEnginesOpen((o) => !o)}
          className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2 hover:text-white"
        >
          {enginesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Engine &amp; Platform Connectors
        </button>
        {enginesOpen && (
          <div className="flex flex-wrap gap-2">
            {Object.keys(ENGINES).map((id) => (
              <EngineTag
                key={id}
                engineId={id}
                connected={project.engines.includes(id)}
                onToggle={toggleEngine}
              />
            ))}
          </div>
        )}
        {!enginesOpen && project.engines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.engines.map((id) => (
              <EngineTag key={id} engineId={id} connected={true} onToggle={toggleEngine} />
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Achievements</p>
        <div className="flex flex-wrap gap-4">
          {project.achievements.map((id) => (
            <AchievementBadge key={id} id={id} />
          ))}
          {project.achievements.length === 0 && <p className="text-gray-500 text-xs">No achievements yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main tracker ──────────────────────────────────────────────────────────────
export default function ProjectTracker() {
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [selected, setSelected] = useState('p1');
  const [filter, setFilter]     = useState('all');
  const [tick, setTick]         = useState(0);

  // Simulate real-time metric updates
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setProjects((ps) => ps.map((p) => {
        if (p.status !== 'active') return p;
        return {
          ...p,
          commits:     p.commits + Math.floor(Math.random() * 2),
          hoursLogged: p.hoursLogged + Math.round(Math.random() * 10) / 100,
          linesOfCode: p.linesOfCode + Math.floor(Math.random() * 15),
        };
      }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const updateProject = useCallback((updated) => {
    setProjects((ps) => ps.map((p) => p.id === updated.id ? updated : p));
  }, []);

  const filtered = projects.filter((p) => filter === 'all' || p.type === filter || p.status === filter);
  const selectedProject = projects.find((p) => p.id === selected);

  const totals = projects.reduce((acc, p) => ({
    hoursLogged: acc.hoursLogged + p.hoursLogged,
    commits:     acc.commits     + p.commits,
    linesOfCode: acc.linesOfCode + p.linesOfCode,
  }), { hoursLogged: 0, commits: 0, linesOfCode: 0 });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="text-purple-400" size={24} />
            Project Tracker
          </h1>
          <p className="text-gray-400 text-sm">Real-time progress for coding, game dev, AR/VR &amp; 3D projects</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-green-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live (5s)
          </span>
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Hours', value: `${Math.round(totals.hoursLogged)}h`,    icon: <Clock size={16} />,     color: 'text-blue-400' },
          { label: 'Commits',     value: fmt(totals.commits),                      icon: <GitBranch size={16} />, color: 'text-purple-400' },
          { label: 'Lines',       value: fmt(totals.linesOfCode),                  icon: <Code2 size={16} />,     color: 'text-green-400' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl bg-gray-800 border border-gray-700 p-4">
            <div className={`flex items-center gap-2 mb-1 ${c.color}`}>{c.icon}<span className="text-xs text-gray-400">{c.label}</span></div>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {[
          { id: 'all',       label: 'All' },
          { id: 'active',    label: 'Active' },
          { id: 'coding',    label: 'Coding' },
          { id: 'game',      label: 'Game Dev' },
          { id: 'arvr',      label: 'AR / VR' },
          { id: '3d',        label: '3D' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filter === f.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid: project list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={setSelected}
              selected={selected === p.id}
            />
          ))}
          {filtered.length === 0 && <p className="text-gray-500 text-sm">No projects match this filter.</p>}
        </div>
        <div className="lg:col-span-2">
          {selectedProject && (
            <ProjectDetail project={selectedProject} onUpdate={updateProject} />
          )}
        </div>
      </div>

      {/* Game engine legend */}
      <div className="mt-8 rounded-xl bg-gray-800 border border-gray-700 p-5">
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Supported Engine &amp; Platform Connectors</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(ENGINES).map(([id, e]) => (
            <div key={id} className="flex items-start gap-2">
              <span className="text-lg">{e.icon}</span>
              <div>
                <p className={`text-xs font-semibold ${e.color}`}>{e.label}</p>
                <p className="text-gray-500 text-xs">{e.versions[0]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
