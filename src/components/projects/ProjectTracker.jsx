// ProjectTracker - 2026-10-07
import React, { useState, useCallback } from 'react';
import {
  Code2, Gamepad2, Smartphone, Glasses, FolderKanban, Clock, Trophy,
  Plug, CheckCircle2, Circle, AlertCircle, XCircle, ChevronRight,
  ChevronDown, Users, Cpu, Monitor, Tablet, Tv, Play, Pause, Square,
  Timer, Target, Zap, GitBranch, BarChart3, Plus, MoreVertical,
  Layers, Shield, Wifi, WifiOff, RefreshCw
} from 'lucide-react';

const PROJECT_TYPES = {
  CODING: 'Coding',
  GAME_DEV: 'Game Development',
  AR_VR_3D: 'AR/VR/3D',
  MOBILE: 'Mobile Apps',
};

const ENGINES = {
  UNREAL: { id: 'unreal', label: 'Unreal Engine', vendor: 'Epic Games' },
  UNITY: { id: 'unity', label: 'Unity', vendor: 'Unity Technologies' },
  GODOT: { id: 'godot', label: 'Godot', vendor: 'Godot Foundation' },
};

const PLATFORMS = {
  PC: { id: 'pc', label: 'PC', icon: Monitor },
  CONSOLE: { id: 'console', label: 'Console', icon: Tv },
  MOBILE: { id: 'mobile', label: 'Mobile', icon: Tablet },
  VR: { id: 'vr', label: 'VR', icon: Glasses },
};

const SDK_CONNECTORS = [
  { id: 'unreal', label: 'Unreal / Epic Games', status: 'connected', version: '5.4.1' },
  { id: 'playstation', label: 'Sony PlayStation SDK', status: 'connected', version: 'PS5 SDK 9.0' },
  { id: 'xbox', label: 'Microsoft Xbox SDK', status: 'disconnected', version: 'GDK 2024.01' },
  { id: 'ubisoft', label: 'Ubisoft Connect', status: 'pending', version: '2.13.4' },
  { id: 'unity', label: 'Unity Services', status: 'connected', version: '1.12.0' },
  { id: 'godot', label: 'Godot Export', status: 'connected', version: '4.3' },
];

const TASK_COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];

const INITIAL_PROJECTS = [
  {
    id: 1,
    name: 'NexusWorld Alpha',
    type: PROJECT_TYPES.GAME_DEV,
    engine: 'unreal',
    platforms: ['pc', 'console', 'vr'],
    progress: 62,
    buildStatus: 'passing',
    team: ['AJ', 'MT', 'RK', 'SL'],
    milestones: [
      { id: 'm1', name: 'Pre-Alpha', completed: true, dueDate: '2026-06-01' },
      { id: 'm2', name: 'Alpha', completed: true, dueDate: '2026-09-01' },
      { id: 'm3', name: 'Beta', completed: false, dueDate: '2027-01-15' },
      { id: 'm4', name: 'Gold', completed: false, dueDate: '2027-06-01' },
    ],
    tasks: {
      Backlog: [
        { id: 't1', title: 'Implement LOD system', estimate: 8, actual: 0, assignee: 'AJ' },
        { id: 't2', title: 'PlayStation trophy integration', estimate: 4, actual: 0, assignee: 'SL' },
      ],
      'In Progress': [
        { id: 't3', title: 'Physics optimization pass', estimate: 12, actual: 7, assignee: 'MT' },
        { id: 't4', title: 'VR locomotion refactor', estimate: 6, actual: 3, assignee: 'RK' },
      ],
      Review: [
        { id: 't5', title: 'World partition streaming', estimate: 16, actual: 18, assignee: 'AJ' },
      ],
      Done: [
        { id: 't6', title: 'Core combat system', estimate: 20, actual: 19, assignee: 'MT' },
        { id: 't7', title: 'Inventory UI', estimate: 8, actual: 9, assignee: 'SL' },
      ],
    },
    achievements: [
      { id: 'a1', name: 'First Blood', description: 'Complete first combat encounter', xp: 100, unlocked: true },
      { id: 'a2', name: 'World Builder', description: 'Place 10,000 world objects', xp: 500, unlocked: true },
      { id: 'a3', name: 'Speed Runner', description: 'Complete tutorial in under 3 minutes', xp: 250, unlocked: false },
      { id: 'a4', name: 'Gold Collector', description: 'Reach shipping milestone', xp: 1000, unlocked: false },
    ],
    timeTracked: 847,
    timeEstimate: 1400,
  },
  {
    id: 2,
    name: 'AR Navigation Suite',
    type: PROJECT_TYPES.AR_VR_3D,
    engine: 'unity',
    platforms: ['mobile', 'vr'],
    progress: 38,
    buildStatus: 'warning',
    team: ['KP', 'DV'],
    milestones: [
      { id: 'm1', name: 'Prototype', completed: true, dueDate: '2026-08-01' },
      { id: 'm2', name: 'MVP', completed: false, dueDate: '2026-12-01' },
      { id: 'm3', name: 'v1.0', completed: false, dueDate: '2027-03-01' },
    ],
    tasks: {
      Backlog: [
        { id: 't1', title: 'Occlusion culling', estimate: 5, actual: 0, assignee: 'KP' },
      ],
      'In Progress': [
        { id: 't2', title: 'ARKit plane detection', estimate: 8, actual: 4, assignee: 'DV' },
      ],
      Review: [],
      Done: [
        { id: 't3', title: 'Marker tracking system', estimate: 10, actual: 11, assignee: 'KP' },
      ],
    },
    achievements: [
      { id: 'a1', name: 'Reality Bender', description: 'Display first AR overlay', xp: 200, unlocked: true },
      { id: 'a2', name: 'Pathfinder', description: 'Navigate 1km using AR', xp: 350, unlocked: false },
    ],
    timeTracked: 234,
    timeEstimate: 600,
  },
  {
    id: 3,
    name: 'Nexus Mobile Client',
    type: PROJECT_TYPES.MOBILE,
    engine: null,
    platforms: ['mobile'],
    progress: 81,
    buildStatus: 'passing',
    team: ['LM', 'JT', 'RS'],
    milestones: [
      { id: 'm1', name: 'iOS Alpha', completed: true, dueDate: '2026-07-01' },
      { id: 'm2', name: 'Android Alpha', completed: true, dueDate: '2026-08-01' },
      { id: 'm3', name: 'App Store Submission', completed: false, dueDate: '2026-11-01' },
    ],
    tasks: {
      Backlog: [],
      'In Progress': [
        { id: 't1', title: 'Push notification deep links', estimate: 3, actual: 1, assignee: 'LM' },
      ],
      Review: [
        { id: 't2', title: 'Offline sync layer', estimate: 12, actual: 14, assignee: 'JT' },
      ],
      Done: [
        { id: 't3', title: 'Auth flow', estimate: 6, actual: 5, assignee: 'RS' },
        { id: 't4', title: 'Dashboard UI', estimate: 10, actual: 10, assignee: 'LM' },
        { id: 't5', name: 'API client layer', estimate: 8, actual: 7, assignee: 'JT' },
      ],
    },
    achievements: [
      { id: 'a1', name: 'App Store Ready', description: 'Pass all App Store guidelines', xp: 500, unlocked: false },
      { id: 'a2', name: 'First Install', description: 'Reach 1,000 installs', xp: 300, unlocked: false },
    ],
    timeTracked: 412,
    timeEstimate: 500,
  },
];

function StatusDot({ status }) {
  const map = {
    connected: 'bg-emerald-500',
    disconnected: 'bg-red-500',
    pending: 'bg-amber-400',
    passing: 'bg-emerald-500',
    warning: 'bg-amber-400',
    failing: 'bg-red-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] ?? 'bg-zinc-400'}`} />;
}

function BuildBadge({ status }) {
  const styles = {
    passing: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
    failing: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const icons = {
    passing: <CheckCircle2 size={11} />,
    warning: <AlertCircle size={11} />,
    failing: <XCircle size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${styles[status] ?? ''}`}>
      {icons[status]}
      {status}
    </span>
  );
}

function Avatar({ initials, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <span className={`${sz} rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </span>
  );
}

function ProgressBar({ value, className = '', colorClass = 'bg-indigo-500' }) {
  return (
    <div className={`w-full h-1.5 bg-white/10 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${colorClass} transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function ProjectTypeIcon({ type }) {
  const map = {
    [PROJECT_TYPES.CODING]: <Code2 size={14} />,
    [PROJECT_TYPES.GAME_DEV]: <Gamepad2 size={14} />,
    [PROJECT_TYPES.AR_VR_3D]: <Glasses size={14} />,
    [PROJECT_TYPES.MOBILE]: <Smartphone size={14} />,
  };
  return map[type] ?? <FolderKanban size={14} />;
}

function ConnectorPanel() {
  const [refreshing, setRefreshing] = useState(null);

  const handleRefresh = useCallback((id) => {
    setRefreshing(id);
    setTimeout(() => setRefreshing(null), 1200);
  }, []);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Plug size={15} className="text-indigo-400" />
        <h3 className="text-sm font-semibold text-white">SDK Connectors</h3>
      </div>
      <div className="space-y-2">
        {SDK_CONNECTORS.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <StatusDot status={c.status} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{c.label}</p>
                <p className="text-[10px] text-white/40">{c.version}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.status === 'disconnected' ? (
                <WifiOff size={12} className="text-red-400" />
              ) : (
                <Wifi size={12} className="text-emerald-400" />
              )}
              <button
                onClick={() => handleRefresh(c.id)}
                className="text-white/30 hover:text-white/70 transition-colors"
                aria-label={`Refresh ${c.label}`}
              >
                <RefreshCw size={11} className={refreshing === c.id ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestoneList({ milestones }) {
  return (
    <div className="space-y-1.5">
      {milestones.map((m, i) => (
        <div key={m.id} className="flex items-center gap-2">
          {m.completed ? (
            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          ) : (
            <Circle size={13} className="text-white/30 shrink-0" />
          )}
          <span className={`text-xs ${m.completed ? 'text-white/60 line-through' : 'text-white/80'}`}>{m.name}</span>
          <span className="text-[10px] text-white/30 ml-auto">{m.dueDate}</span>
        </div>
      ))}
    </div>
  );
}

function AchievementPanel({ achievements }) {
  return (
    <div className="space-y-2">
      {achievements.map((a) => (
        <div
          key={a.id}
          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
            a.unlocked
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-white/3 border-white/8 opacity-50'
          }`}
        >
          <Trophy size={14} className={a.unlocked ? 'text-amber-400' : 'text-white/30'} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{a.name}</p>
            <p className="text-[10px] text-white/50 truncate">{a.description}</p>
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            a.unlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/30'
          }`}>
            +{a.xp} XP
          </span>
        </div>
      ))}
    </div>
  );
}

function KanbanBoard({ tasks }) {
  return (
    <div className="grid grid-cols-4 gap-3 min-w-0">
      {TASK_COLUMNS.map((col) => (
        <div key={col} className="min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">{col}</span>
            <span className="text-[10px] bg-white/10 text-white/50 rounded px-1.5">
              {(tasks[col] ?? []).length}
            </span>
          </div>
          <div className="space-y-1.5">
            {(tasks[col] ?? []).map((task) => (
              <div key={task.id} className="bg-white/5 border border-white/8 rounded-lg p-2 hover:border-white/15 transition-colors">
                <p className="text-[11px] text-white/80 leading-snug mb-1.5">{task.title || task.name}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-white/40">
                    <Timer size={9} />
                    <span>{task.actual > 0 ? `${task.actual}h / ` : ''}{task.estimate}h</span>
                    {task.actual > task.estimate && (
                      <AlertCircle size={9} className="text-amber-400" />
                    )}
                  </div>
                  <Avatar initials={task.assignee} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimeTrackingBar({ tracked, estimate }) {
  const pct = Math.min(100, Math.round((tracked / estimate) * 100));
  const overBudget = tracked > estimate;
  const colorClass = overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-indigo-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-[11px] text-white/50">
          <Clock size={11} />
          <span>Time</span>
        </div>
        <span className={`text-[11px] font-medium ${overBudget ? 'text-red-400' : 'text-white/60'}`}>
          {tracked}h / {estimate}h
        </span>
      </div>
      <ProgressBar value={pct} colorClass={colorClass} />
    </div>
  );
}

function PlatformTags({ platforms }) {
  return (
    <div className="flex flex-wrap gap-1">
      {platforms.map((p) => {
        const def = PLATFORMS[p.toUpperCase()];
        if (!def) return null;
        const Icon = def.icon;
        return (
          <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px] text-white/60">
            <Icon size={9} />
            {def.label}
          </span>
        );
      })}
    </div>
  );
}

function EngineBadge({ engineId }) {
  const engine = Object.values(ENGINES).find((e) => e.id === engineId);
  if (!engine) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500/15 border border-violet-500/25 rounded text-[10px] text-violet-300 font-medium">
      <Cpu size={9} />
      {engine.label}
    </span>
  );
}

function ProjectCard({ project, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  const totalTasks = Object.values(project.tasks).flat().length;
  const doneTasks = (project.tasks['Done'] ?? []).length;

  return (
    <div
      className={`bg-white/5 border rounded-xl transition-all ${
        isSelected ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-indigo-400 shrink-0">
              <ProjectTypeIcon type={project.type} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{project.name}</h3>
              <p className="text-[11px] text-white/40">{project.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <BuildBadge status={project.buildStatus} />
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="text-white/30 hover:text-white/70 transition-colors"
              aria-label="Expand project"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-white/50">Overall Progress</span>
            <span className="text-[11px] font-medium text-white/70">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} colorClass="bg-indigo-500" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex -space-x-1">
            {project.team.slice(0, 4).map((m) => (
              <Avatar key={m} initials={m} size="sm" />
            ))}
            {project.team.length > 4 && (
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/50 border border-white/20">
                +{project.team.length - 4}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/40">
            <span className="flex items-center gap-1">
              <Target size={10} />
              {doneTasks}/{totalTasks}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {project.timeTracked}h
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/8 p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {project.engine && <EngineBadge engineId={project.engine} />}
            <PlatformTags platforms={project.platforms} />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-2">Milestones</p>
            <MilestoneList milestones={project.milestones} />
          </div>

          <TimeTrackingBar tracked={project.timeTracked} estimate={project.timeEstimate} />

          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-2">Achievements</p>
            <AchievementPanel achievements={project.achievements} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailPanel({ project }) {
  const [activeTab, setActiveTab] = useState('kanban');

  const tabs = [
    { id: 'kanban', label: 'Board', icon: <Layers size={12} /> },
    { id: 'achievements', label: 'Achievements', icon: <Trophy size={12} /> },
    { id: 'milestones', label: 'Milestones', icon: <Target size={12} /> },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-indigo-400">
          <ProjectTypeIcon type={project.type} />
        </span>
        <div>
          <h2 className="text-base font-bold text-white">{project.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <BuildBadge status={project.buildStatus} />
            {project.engine && <EngineBadge engineId={project.engine} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/40 mb-1 flex items-center gap-1"><BarChart3 size={10} /> Progress</p>
          <p className="text-xl font-bold text-white">{project.progress}%</p>
          <ProgressBar value={project.progress} className="mt-2" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/40 mb-1 flex items-center gap-1"><Clock size={10} /> Time Logged</p>
          <p className="text-xl font-bold text-white">{project.timeTracked}h</p>
          <p className="text-[10px] text-white/40 mt-1">of {project.timeEstimate}h estimated</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/40 mb-1 flex items-center gap-1"><Trophy size={10} /> Achievements</p>
          <p className="text-xl font-bold text-white">
            {project.achievements.filter((a) => a.unlocked).length}
            <span className="text-sm text-white/30">/{project.achievements.length}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 bg-white/5 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === t.id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'kanban' && (
          <KanbanBoard tasks={project.tasks} />
        )}
        {activeTab === 'achievements' && (
          <AchievementPanel achievements={project.achievements} />
        )}
        {activeTab === 'milestones' && (
          <div className="space-y-3">
            {project.milestones.map((m) => (
              <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                m.completed ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-white/4 border-white/10'
              }`}>
                {m.completed
                  ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  : <Circle size={16} className="text-white/30 shrink-0" />
                }
                <div className="flex-1">
                  <p className={`text-sm font-medium ${m.completed ? 'text-white/60 line-through' : 'text-white'}`}>{m.name}</p>
                  <p className="text-[11px] text-white/40">{m.dueDate}</p>
                </div>
                {!m.completed && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Upcoming
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryBar({ projects }) {
  const total = projects.length;
  const passing = projects.filter((p) => p.buildStatus === 'passing').length;
  const avgProgress = Math.round(projects.reduce((s, p) => s + p.progress, 0) / total);
  const totalHours = projects.reduce((s, p) => s + p.timeTracked, 0);

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Projects', value: total, icon: <FolderKanban size={13} />, color: 'text-indigo-400' },
        { label: 'Builds Passing', value: `${passing}/${total}`, icon: <Zap size={13} />, color: 'text-emerald-400' },
        { label: 'Avg Progress', value: `${avgProgress}%`, icon: <BarChart3 size={13} />, color: 'text-violet-400' },
        { label: 'Hours Logged', value: `${totalHours}h`, icon: <Timer size={13} />, color: 'text-amber-400' },
      ].map((s) => (
        <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
          <span className={s.color}>{s.icon}</span>
          <div>
            <p className="text-lg font-bold text-white leading-none">{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectTracker() {
  const [projects] = useState(INITIAL_PROJECTS);
  const [selectedId, setSelectedId] = useState(INITIAL_PROJECTS[0].id);
  const [typeFilter, setTypeFilter] = useState('All');

  const selectedProject = projects.find((p) => p.id === selectedId);

  const typeOptions = ['All', ...Object.values(PROJECT_TYPES)];

  const filtered = typeFilter === 'All'
    ? projects
    : projects.filter((p) => p.type === typeFilter);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <GitBranch size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Project Tracker</h1>
              <p className="text-[11px] text-white/40 mt-0.5">Real-time multi-platform project management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium text-white transition-colors">
              <Plus size={12} />
              New Project
            </button>
            <button className="p-1.5 text-white/40 hover:text-white/70 transition-colors">
              <MoreVertical size={15} />
            </button>
          </div>
        </div>

        <SummaryBar projects={projects} />

        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {typeOptions.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                typeFilter === t
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
              }`}
            >
              {t !== 'All' && <ProjectTypeIcon type={t} />}
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[300px_1fr_240px] gap-5 min-h-0">
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isSelected={selectedId === p.id}
                onSelect={() => setSelectedId(p.id)}
              />
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 overflow-hidden">
            {selectedProject ? (
              <DetailPanel project={selectedProject} />
            ) : (
              <div className="flex items-center justify-center h-full text-white/30 text-sm">
                Select a project to view details
              </div>
            )}
          </div>

          <div className="space-y-4">
            <ConnectorPanel />

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Team Activity</h3>
              </div>
              <div className="space-y-2">
                {selectedProject?.team.map((m) => {
                  const allTasks = Object.values(selectedProject.tasks).flat();
                  const memberTasks = allTasks.filter((t) => t.assignee === m);
                  return (
                    <div key={m} className="flex items-center gap-2.5">
                      <Avatar initials={m} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70">{m}</p>
                        <p className="text-[10px] text-white/30">{memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Platform Targets</h3>
              </div>
              {selectedProject && (
                <div className="space-y-2">
                  {Object.values(PLATFORMS).map((plat) => {
                    const active = selectedProject.platforms.includes(plat.id);
                    const Icon = plat.icon;
                    return (
                      <div key={plat.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        active
                          ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
                          : 'bg-white/3 border-white/8 text-white/25'
                      }`}>
                        <Icon size={12} />
                        <span className="text-xs font-medium">{plat.label}</span>
                        {active && (
                          <CheckCircle2 size={11} className="ml-auto text-indigo-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
