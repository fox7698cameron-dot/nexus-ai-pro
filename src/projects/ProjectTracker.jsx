// File: ProjectTracker.jsx | Created: 2026-08-31 | Nexus AI Pro

import { useState, useEffect, useRef } from 'react';
import {
  Code2, Gamepad2, Box, CheckCircle2, Clock, PauseCircle,
  PlayCircle, GitCommit, Cpu, Layers, Triangle, Zap, Users,
  Trophy, Lock, Target, Timer, MoreHorizontal, Plus,
  ChevronRight, Star, Shield, Building2
} from 'lucide-react';

// ─── Static data ──────────────────────────────────────────────────────────────

const CODING_PROJECTS = [
  { id: 'c1', name: 'Nexus AI Pro',        status: 'active',    progress: 78, language: 'JavaScript/React', deadline: '2026-09-30', team: 3, commits: 1842, lastCommit: '14m ago',  buildStatus: 'passing' },
  { id: 'c2', name: 'Neural API Gateway',  status: 'active',    progress: 54, language: 'Node.js',          deadline: '2026-10-15', team: 2, commits: 430,  lastCommit: '2h ago',   buildStatus: 'passing' },
  { id: 'c3', name: 'Crypto Vault CLI',    status: 'paused',    progress: 32, language: 'Rust',             deadline: '2026-12-01', team: 1, commits: 218,  lastCommit: '3d ago',   buildStatus: 'warning' },
  { id: 'c4', name: 'EdgeSync Mobile',     status: 'completed', progress: 100, language: 'Swift/Kotlin',   deadline: '2026-07-01', team: 4, commits: 2100, lastCommit: '7d ago',   buildStatus: 'passing' },
];

const GAME_PROJECTS = [
  { id: 'g1', name: 'NeonRift',           engine: 'Unreal Engine 5', status: 'active',    progress: 61, deadline: '2026-11-01', team: 6, buildStatus: 'passing', genre: 'Action RPG',   version: 'UE 5.4', platform: ['PC','PS5','XSX'] },
  { id: 'g2', name: 'HorizonMark',        engine: 'Unity 6',         status: 'active',    progress: 43, deadline: '2026-12-20', team: 3, buildStatus: 'failing', genre: 'Platformer',   version: 'Unity 6.0.0', platform: ['PC','Switch'] },
  { id: 'g3', name: 'Verdant Realms',     engine: 'Godot 4.3',       status: 'paused',    progress: 19, deadline: '2027-03-01', team: 2, buildStatus: 'warning', genre: 'Open World',   version: 'Godot 4.3', platform: ['PC'] },
  { id: 'g4', name: 'StrikeForce Arena',  engine: 'Unreal Engine 5', status: 'completed', progress: 100, deadline: '2026-06-15', team: 8, buildStatus: 'passing', genre: 'FPS',         version: 'UE 5.3', platform: ['PC','PS5','XSX','Mobile'] },
];

const AR_PROJECTS = [
  { id: 'a1', name: 'CityScape XR',       type: 'AR',   status: 'active',    progress: 52, deadline: '2026-10-31', team: 4, polygons: '2.4M', scenes: 12, assets: 340, engine: 'Unreal Engine 5' },
  { id: 'a2', name: 'NeuroSphere VR',     type: 'VR',   status: 'active',    progress: 68, deadline: '2026-09-15', team: 3, polygons: '5.8M', scenes: 8,  assets: 210, engine: 'Unity 6' },
  { id: 'a3', name: 'HoloDesk Workspace', type: 'MR',   status: 'paused',    progress: 24, deadline: '2027-01-01', team: 2, polygons: '880K', scenes: 5,  assets: 95,  engine: 'Unreal Engine 5' },
  { id: 'a4', name: 'Atlas 3D Viewer',    type: '3D',   status: 'completed', progress: 100, deadline: '2026-07-20', team: 1, polygons: '1.1M', scenes: 3, assets: 67,  engine: 'Godot 4.3' },
];

const PLUGIN_BADGES = [
  { id: 'unreal',   label: 'Unreal / Epic',      icon: Triangle,   active: true,  version: '5.4.1' },
  { id: 'sony',     label: 'PlayStation SDK',    icon: Shield,     active: true,  version: '9.0.0' },
  { id: 'microsoft',label: 'Xbox GDK',           icon: Building2,  active: true,  version: '231001' },
  { id: 'ubisoft',  label: 'Ubisoft Connect',    icon: Star,       active: false, version: '—' },
];

const ACHIEVEMENTS = [
  { id: 'ach1', name: '1K Commits',      desc: 'Push 1,000 git commits',          unlocked: true,  icon: GitCommit },
  { id: 'ach2', name: 'Ship It',         desc: 'Complete first production deploy', unlocked: true,  icon: Zap },
  { id: 'ach3', name: 'Multiplayer',     desc: 'Ship a multiplayer game mode',     unlocked: true,  icon: Users },
  { id: 'ach4', name: 'XR Pioneer',      desc: 'Publish an AR/VR experience',      unlocked: true,  icon: Box },
  { id: 'ach5', name: '10K Players',     desc: 'Reach 10K concurrent players',     unlocked: false, icon: Target },
  { id: 'ach6', name: 'Console Gold',    desc: 'Cert-pass on two consoles',        unlocked: false, icon: Trophy },
  { id: 'ach7', name: 'Platform Titan',  desc: 'Ship on 5+ platforms',             unlocked: false, icon: Layers },
  { id: 'ach8', name: 'Speed Runner',    desc: 'Complete sprint with 0 carryover', unlocked: false, icon: Timer },
];

const ENGINE_COLORS = {
  'Unreal Engine 5': '#9146FF',
  'Unity 6':         '#22d3ee',
  'Godot 4.3':       '#478cbf',
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

const statusConfig = {
  active:    { label: 'Active',     className: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', icon: PlayCircle },
  paused:    { label: 'Paused',     className: 'bg-amber-100   dark:bg-amber-900/40   text-amber-700   dark:text-amber-400',   icon: PauseCircle },
  completed: { label: 'Completed',  className: 'bg-blue-100    dark:bg-blue-900/40    text-blue-700    dark:text-blue-400',    icon: CheckCircle2 },
};

const buildConfig = {
  passing: { label: 'Passing', className: 'text-emerald-500' },
  failing: { label: 'Failing', className: 'text-red-500' },
  warning: { label: 'Warning', className: 'text-amber-500' },
};

const projectsByStatus = (projects) => ({
  todo:       projects.filter((p) => p.progress === 0),
  inprogress: projects.filter((p) => p.progress > 0 && p.status !== 'completed'),
  done:       projects.filter((p) => p.status === 'completed'),
});

const fmt = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const cfg = statusConfig[status] || statusConfig.active;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function BuildBadge({ status }) {
  const cfg = buildConfig[status] || buildConfig.passing;
  return (
    <span className={`text-xs font-semibold ${cfg.className}`}>
      ● {cfg.label}
    </span>
  );
}

function ProgressBar({ pct, color = '#6366f1' }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, color }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={20} style={{ color }} />
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
      <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
        {count}
      </span>
    </div>
  );
}

function TimeTracker({ projectId, isActive }) {
  const [elapsed, setElapsed] = useState(() => Math.floor(Math.random() * 7200 + 1800));
  const ref = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    ref.current = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(ref.current);
  }, [isActive]);

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
      <Timer size={11} className="inline mr-1" />
      {hh}:{mm}:{ss}
    </span>
  );
}

// ─── Coding project card ──────────────────────────────────────────────────────

function CodingCard({ project }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{project.language}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span>{project.progress}%</span>
        <BuildBadge status={project.buildStatus} />
      </div>
      <ProgressBar pct={project.progress} color="#6366f1" />

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span><GitCommit size={11} className="inline mr-1" />{project.commits.toLocaleString()} commits</span>
        <span><Clock size={11} className="inline mr-1" />{project.lastCommit}</span>
        <span><Users size={11} className="inline mr-1" />{project.team} devs</span>
        <span><Target size={11} className="inline mr-1" />{project.deadline}</span>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <TimeTracker projectId={project.id} isActive={project.status === 'active'} />
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <MoreHorizontal size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Game project card ────────────────────────────────────────────────────────

function GameCard({ project }) {
  const engineColor = ENGINE_COLORS[project.engine] || '#6366f1';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: engineColor }}>{project.version}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <p className="text-xs text-gray-400 mb-2">{project.genre}</p>

      <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span>{project.progress}%</span>
        <BuildBadge status={project.buildStatus} />
      </div>
      <ProgressBar pct={project.progress} color={engineColor} />

      <div className="mt-2 flex flex-wrap gap-1">
        {project.platform.map((p) => (
          <span key={p} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
            {p}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span><Users size={11} className="inline mr-1" />{project.team} devs</span>
        <span><Target size={11} className="inline mr-1" />{project.deadline}</span>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <TimeTracker projectId={project.id} isActive={project.status === 'active'} />
        <div className="flex items-center gap-1.5">
          <Cpu size={11} className="text-gray-400" />
          <span className="text-xs text-gray-400">Last build: 23m ago</span>
        </div>
      </div>
    </div>
  );
}

// ─── AR/VR project card ───────────────────────────────────────────────────────

function ARCard({ project }) {
  const typeColors = { AR: '#f59e0b', VR: '#8b5cf6', MR: '#06b6d4', '3D': '#10b981' };
  const color = typeColors[project.type] || '#6366f1';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-xs font-bold text-white" style={{ background: color }}>{project.type}</span>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{project.engine}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span>{project.progress}%</span>
        <span className="text-xs">Due {project.deadline}</span>
      </div>
      <ProgressBar pct={project.progress} color={color} />

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Polygons', value: project.polygons },
          { label: 'Scenes',   value: project.scenes },
          { label: 'Assets',   value: project.assets },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-750 rounded-lg p-2">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <TimeTracker projectId={project.id} isActive={project.status === 'active'} />
        <span className="text-xs text-gray-400"><Users size={11} className="inline mr-1" />{project.team}</span>
      </div>
    </div>
  );
}

// ─── Kanban board ─────────────────────────────────────────────────────────────

function KanbanColumn({ title, projects, color, renderCard }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{title}</h3>
        <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{projects.length}</span>
      </div>
      <div className="flex flex-col gap-3">
        {projects.map((p) => renderCard(p))}
        {projects.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center text-gray-400 text-xs">
            No projects
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Achievement panel ────────────────────────────────────────────────────────

function AchievementPanel() {
  const unlocked = ACHIEVEMENTS.filter((a) => a.unlocked);
  const locked   = ACHIEVEMENTS.filter((a) => !a.unlocked);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-amber-500" />
        <h2 className="font-bold text-gray-900 dark:text-white">Achievements</h2>
        <span className="ml-auto text-sm font-semibold text-amber-500">{unlocked.length}/{ACHIEVEMENTS.length}</span>
      </div>
      {/* Progress */}
      <ProgressBar pct={(unlocked.length / ACHIEVEMENTS.length) * 100} color="#f59e0b" />
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ACHIEVEMENTS.map((ach) => {
          const Icon = ach.icon;
          return (
            <div
              key={ach.id}
              className={`rounded-xl p-3 text-center transition-all ${
                ach.unlocked
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
                  : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 opacity-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 ${ach.unlocked ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                {ach.unlocked ? <Icon size={16} className="text-white" /> : <Lock size={14} className="text-gray-500" />}
              </div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">{ach.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{ach.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Plugin badges panel ──────────────────────────────────────────────────────

function PluginBadges() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-indigo-500" />
        <h2 className="font-bold text-gray-900 dark:text-white text-sm">Platform Plugins</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLUGIN_BADGES.map((plugin) => {
          const Icon = plugin.icon;
          return (
            <div
              key={plugin.id}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                plugin.active
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-60'
              }`}
            >
              <Icon size={18} className={plugin.active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'} />
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{plugin.label}</p>
                <p className="text-xs text-gray-400">v{plugin.version}</p>
              </div>
              <span className={`ml-auto w-2 h-2 rounded-full flex-shrink-0 ${plugin.active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectTracker({ userId, userRole = 'developer' }) {
  const [activeTab, setActiveTab] = useState('coding');
  const [kanbanType, setKanbanType] = useState('coding');

  const tabs = [
    { id: 'coding',  label: 'Coding',          icon: Code2,    color: '#6366f1' },
    { id: 'gamedev', label: 'Game Dev',         icon: Gamepad2, color: '#9146FF' },
    { id: 'arvr',    label: 'AR / VR / 3D',     icon: Box,      color: '#f59e0b' },
    { id: 'kanban',  label: 'Kanban',           icon: Layers,   color: '#22d3ee' },
  ];

  const allProjects = [...CODING_PROJECTS, ...GAME_PROJECTS, ...AR_PROJECTS];
  const activeCount = allProjects.filter((p) => p.status === 'active').length;
  const completedCount = allProjects.filter((p) => p.status === 'completed').length;

  const kanbanProjects =
    kanbanType === 'coding' ? CODING_PROJECTS
    : kanbanType === 'gamedev' ? GAME_PROJECTS
    : AR_PROJECTS;

  const kanbanBuckets = {
    todo:       kanbanProjects.filter((p) => p.progress === 0),
    inprogress: kanbanProjects.filter((p) => p.progress > 0 && p.status !== 'completed'),
    done:       kanbanProjects.filter((p) => p.status === 'completed'),
  };

  const renderCard = (p) =>
    activeTab === 'kanban'
      ? kanbanType === 'coding' ? <CodingCard key={p.id} project={p} />
        : kanbanType === 'gamedev' ? <GameCard key={p.id} project={p} />
        : <ARCard key={p.id} project={p} />
      : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target size={24} className="text-indigo-500" />
            Project Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeCount} active · {completedCount} completed · {allProjects.length} total
            {userId && <span className="ml-2 text-xs text-gray-400">· User {userId} · {userRole}</span>}
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
          <Plus size={15} /> New Project
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Projects',  value: allProjects.length, icon: Layers,     color: '#6366f1' },
          { label: 'Active',          value: activeCount,         icon: PlayCircle, color: '#10b981' },
          { label: 'Completed',       value: completedCount,      icon: CheckCircle2, color: '#3b82f6' },
          { label: 'Team Members',    value: [...new Set(allProjects.map((p) => p.team))].reduce((a, b) => a + b, 0), icon: Users, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plugin badges */}
      <div className="mb-6"><PluginBadges /></div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-gray-700 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all
                ${activeTab === tab.id ? 'text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              style={activeTab === tab.id ? { background: tab.color } : {}}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'coding' && (
        <div>
          <SectionHeader icon={Code2} title="Coding Projects" count={CODING_PROJECTS.length} color="#6366f1" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {CODING_PROJECTS.map((p) => <CodingCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {activeTab === 'gamedev' && (
        <div>
          <SectionHeader icon={Gamepad2} title="Game Development" count={GAME_PROJECTS.length} color="#9146FF" />
          {/* Engine legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(ENGINE_COLORS).map(([engine, color]) => (
              <span key={engine} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {engine}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {GAME_PROJECTS.map((p) => <GameCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {activeTab === 'arvr' && (
        <div>
          <SectionHeader icon={Box} title="AR / VR / 3D Projects" count={AR_PROJECTS.length} color="#f59e0b" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {AR_PROJECTS.map((p) => <ARCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {activeTab === 'kanban' && (
        <div>
          {/* Kanban type selector */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'coding', label: 'Coding', color: '#6366f1' },
              { id: 'gamedev', label: 'Game Dev', color: '#9146FF' },
              { id: 'arvr', label: 'AR/VR/3D', color: '#f59e0b' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setKanbanType(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${kanbanType === t.id ? 'text-white border-transparent' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                style={kanbanType === t.id ? { background: t.color } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            <KanbanColumn title="To Do"       projects={kanbanBuckets.todo}       color="#94a3b8" renderCard={(p) => kanbanType === 'coding' ? <CodingCard key={p.id} project={p} /> : kanbanType === 'gamedev' ? <GameCard key={p.id} project={p} /> : <ARCard key={p.id} project={p} />} />
            <KanbanColumn title="In Progress" projects={kanbanBuckets.inprogress} color="#f59e0b" renderCard={(p) => kanbanType === 'coding' ? <CodingCard key={p.id} project={p} /> : kanbanType === 'gamedev' ? <GameCard key={p.id} project={p} /> : <ARCard key={p.id} project={p} />} />
            <KanbanColumn title="Done"        projects={kanbanBuckets.done}       color="#10b981" renderCard={(p) => kanbanType === 'coding' ? <CodingCard key={p.id} project={p} /> : kanbanType === 'gamedev' ? <GameCard key={p.id} project={p} /> : <ARCard key={p.id} project={p} />} />
          </div>
        </div>
      )}

      {/* Achievements — always visible */}
      <div className="mt-6"><AchievementPanel /></div>
    </div>
  );
}
