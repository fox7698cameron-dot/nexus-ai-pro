// GameDevTracker.jsx
// Created: 2026-10-27
// Game dev, AR/VR/3D project tracker with real-time metrics and platform connectors
// Platform connector credentials must be set via environment variables

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Cpu, Code, Trophy, Star, Layers, Box,
  Play, Pause, CheckCircle, Clock, Users, TrendingUp,
  Settings, Plus, ChevronRight, ChevronDown, Zap,
  Monitor, Smartphone, Globe, Activity, Target,
  AlertCircle, RefreshCw, Download, Upload, GitBranch,
  BarChart3, Shield, Wrench, Rocket, Camera
} from 'lucide-react';

// i18n strings
const STRINGS = {
  en: {
    title: 'Game & Dev Tracker',
    subtitle: 'Real-time project tracking for games, AR/VR & 3D',
    newProject: 'New Project',
    allProjects: 'All Projects',
    milestones: 'Milestones',
    tasks: 'Tasks',
    progress: 'Progress',
    contributors: 'Contributors',
    buildTime: 'Build Time',
    coverage: 'Test Coverage',
    commitVelocity: 'Commit Velocity',
    connectors: 'Platform Connectors',
    achievements: 'Achievements',
    configure: 'Configure',
    connected: 'Connected',
    notConnected: 'Not Connected',
    loading: 'Loading projects...',
    noProjects: 'No projects yet',
    techStack: 'Tech Stack',
    targetPlatforms: 'Target Platforms',
  },
};

// Project type definitions
const PROJECT_TYPES = {
  game_2d: { label: '2D Game', icon: '🎮', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  game_3d: { label: '3D Game', icon: '🧊', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  vr: { label: 'VR', icon: '🥽', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  ar: { label: 'AR', icon: '📡', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  mobile_game: { label: 'Mobile Game', icon: '📱', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  console_game: { label: 'Console Game', icon: '🕹️', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  app: { label: 'App', icon: '💻', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  '3d_project': { label: '3D Project', icon: '🔷', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
};

// Tech stack tags
const TECH_TAGS = ['C++', 'C#', 'Swift', 'GDScript', 'Unreal Blueprint', 'Python', 'Rust', 'JavaScript', 'Kotlin', 'Objective-C', 'HLSL', 'GLSL'];

// Target platforms
const TARGET_PLATFORMS = [
  { id: 'pc', label: 'PC', icon: Monitor },
  { id: 'console', label: 'Console', icon: Gamepad2 },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'vr_headset', label: 'VR/AR', icon: Camera },
  { id: 'web', label: 'Web', icon: Globe },
];

// Platform connectors config — credentials from env vars only
const PLATFORM_CONNECTORS = [
  {
    id: 'unreal',
    name: 'Unreal Engine / Epic Games',
    icon: '⚙️',
    color: 'text-gray-300',
    bg: 'bg-gray-600/10',
    border: 'border-gray-600/30',
    envVars: ['VITE_EPIC_CLIENT_ID', 'VITE_EPIC_CLIENT_SECRET'],
    features: ['Build pipelines', 'Asset management', 'Marketplace', 'Live metrics'],
  },
  {
    id: 'sony',
    name: 'Sony / PlayStation',
    icon: '🎮',
    color: 'text-blue-300',
    bg: 'bg-blue-900/10',
    border: 'border-blue-900/30',
    envVars: ['VITE_SONY_CLIENT_ID', 'VITE_SONY_CLIENT_SECRET'],
    features: ['PS5 dev kit', 'PSN publishing', 'Trophy system', 'Analytics'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft / Xbox',
    icon: '🟩',
    color: 'text-green-300',
    bg: 'bg-green-900/10',
    border: 'border-green-900/30',
    envVars: ['VITE_XBOX_CLIENT_ID', 'VITE_XBOX_CLIENT_SECRET'],
    features: ['Xbox Game Pass', 'Achievement system', 'GDK builds', 'PlayFab'],
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    icon: '⚜️',
    color: 'text-purple-300',
    bg: 'bg-purple-900/10',
    border: 'border-purple-900/30',
    envVars: ['VITE_UBISOFT_APP_ID', 'VITE_UBISOFT_APP_SECRET'],
    features: ['Cross-play', 'Ubisoft Club', 'DLC management', 'Player stats'],
  },
  {
    id: 'steam',
    name: 'Steam',
    icon: '🔵',
    color: 'text-sky-300',
    bg: 'bg-sky-900/10',
    border: 'border-sky-900/30',
    envVars: ['VITE_STEAM_API_KEY', 'VITE_STEAM_APP_ID'],
    features: ['Steamworks SDK', 'Workshop', 'Steam Achievements', 'Sales data'],
  },
];

// Demo project data
function buildDemoProjects() {
  return [
    {
      id: 'p1',
      name: 'Nexus Chronicles',
      type: 'game_3d',
      description: 'Open-world RPG with procedural terrain generation',
      techStack: ['C++', 'Unreal Blueprint', 'HLSL'],
      targetPlatforms: ['pc', 'console'],
      progress: 68,
      milestones: [
        { id: 'm1', title: 'Core engine', done: true },
        { id: 'm2', title: 'Multiplayer lobby', done: true },
        { id: 'm3', title: 'Level design v1', done: false },
        { id: 'm4', title: 'Beta release', done: false },
      ],
      metrics: { contributors: 8, buildTime: '4m 32s', coverage: 74, commitVelocity: 23 },
      connectors: ['unreal', 'steam'],
      achievements: [
        { id: 'a1', name: 'First commit', description: 'Pushed initial codebase', unlocked: true, icon: '🚀' },
        { id: 'a2', name: '1K stars', description: 'Repo reached 1K GitHub stars', unlocked: true, icon: '⭐' },
        { id: 'a3', name: 'Beta milestone', description: 'Shipped beta to 100 testers', unlocked: false, icon: '🎯' },
      ],
      lastActivity: '2 hours ago',
    },
    {
      id: 'p2',
      name: 'VR Training Sim',
      type: 'vr',
      description: 'Enterprise VR training platform for industrial workflows',
      techStack: ['C#', 'C++', 'GLSL'],
      targetPlatforms: ['vr_headset', 'pc'],
      progress: 42,
      milestones: [
        { id: 'm1', title: 'Locomotion system', done: true },
        { id: 'm2', title: 'Hand tracking', done: false },
        { id: 'm3', title: 'Asset pipeline', done: false },
      ],
      metrics: { contributors: 5, buildTime: '6m 18s', coverage: 58, commitVelocity: 14 },
      connectors: ['microsoft'],
      achievements: [
        { id: 'a1', name: 'First prototype', description: 'Working VR prototype delivered', unlocked: true, icon: '🥽' },
      ],
      lastActivity: '1 day ago',
    },
    {
      id: 'p3',
      name: 'AR Street Guide',
      type: 'ar',
      description: 'Mobile AR navigation app with real-time POI overlays',
      techStack: ['Swift', 'Objective-C', 'Python'],
      targetPlatforms: ['mobile'],
      progress: 85,
      milestones: [
        { id: 'm1', title: 'ARKit integration', done: true },
        { id: 'm2', title: 'Map data pipeline', done: true },
        { id: 'm3', title: 'App Store review', done: false },
      ],
      metrics: { contributors: 3, buildTime: '2m 45s', coverage: 88, commitVelocity: 31 },
      connectors: ['sony'],
      achievements: [
        { id: 'a1', name: 'TestFlight launch', description: 'Beta out to 500 testers', unlocked: true, icon: '✈️' },
        { id: 'a2', name: '90% coverage', description: 'Achieved 90%+ test coverage', unlocked: false, icon: '🛡️' },
      ],
      lastActivity: '3 hours ago',
    },
  ];
}

// ---- Sub-components ----

function ProgressBar({ value, color = 'bg-purple-500' }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function MetricPill({ icon: Icon, label, value, color = 'text-white/60' }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon size={12} className={color} />
      <span className="text-white/40">{label}:</span>
      <span className="text-white/80 font-medium">{value}</span>
    </div>
  );
}

function TechTag({ label }) {
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/70 border border-white/10">
      {label}
    </span>
  );
}

function AchievementBadge({ achievement }) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all
        ${achievement.unlocked ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5 border border-white/10 opacity-50'}`}
    >
      <span className="text-base">{achievement.icon}</span>
      <div>
        <div className={`font-medium ${achievement.unlocked ? 'text-yellow-400' : 'text-white/40'}`}>
          {achievement.name}
        </div>
        <div className="text-white/30">{achievement.description}</div>
      </div>
      {achievement.unlocked && <Trophy size={12} className="ml-auto text-yellow-400 flex-shrink-0" />}
    </div>
  );
}

function ConnectorBadge({ connectorId, onConfigure }) {
  const connector = PLATFORM_CONNECTORS.find((c) => c.id === connectorId);
  if (!connector) return null;
  const isConnected = Boolean(
    typeof window !== 'undefined' &&
    connector.envVars.some((v) => window.__ENV?.[v] || import.meta?.env?.[v])
  );

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border cursor-pointer hover:opacity-80 transition-opacity
        ${isConnected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white/40'}`}
      onClick={() => onConfigure(connectorId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onConfigure(connectorId)}
    >
      <span>{connector.icon}</span>
      {connector.name.split(' / ')[0]}
      {isConnected
        ? <CheckCircle size={10} />
        : <Settings size={10} />}
    </div>
  );
}

function ProjectCard({ project, onSelect, isSelected }) {
  const typeConfig = PROJECT_TYPES[project.type] || PROJECT_TYPES.app;
  const progressColor =
    project.progress >= 75 ? 'bg-green-500' :
    project.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(project.id)}
      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200
        ${isSelected ? 'ring-2 ring-white/40 scale-[1.01]' : 'hover:scale-[1.005]'}
        ${typeConfig.bg} ${typeConfig.border}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeConfig.icon}</span>
          <div>
            <div className="font-semibold text-white text-sm">{project.name}</div>
            <div className={`text-[10px] font-medium ${typeConfig.color}`}>{typeConfig.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/40">
          <Clock size={11} />
          {project.lastActivity}
        </div>
      </div>

      <p className="text-xs text-white/50 mb-3 line-clamp-2">{project.description}</p>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Progress</span>
          <span className={typeConfig.color}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={progressColor} />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <MetricPill icon={Users} label="Contributors" value={project.metrics.contributors} color={typeConfig.color} />
        <MetricPill icon={Clock} label="Build" value={project.metrics.buildTime} color={typeConfig.color} />
        <MetricPill icon={Shield} label="Coverage" value={`${project.metrics.coverage}%`} color={typeConfig.color} />
        <MetricPill icon={GitBranch} label="Velocity" value={`${project.metrics.commitVelocity}/wk`} color={typeConfig.color} />
      </div>

      {/* Tech tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {project.techStack.map((tag) => <TechTag key={tag} label={tag} />)}
      </div>

      {/* Target platforms */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {project.targetPlatforms.map((pid) => {
          const p = TARGET_PLATFORMS.find((x) => x.id === pid);
          return p ? (
            <div key={pid} className="flex items-center gap-1 text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
              <p.icon size={10} />
              {p.label}
            </div>
          ) : null;
        })}
      </div>

      {/* Connector badges (non-interactive preview) */}
      <div className="flex flex-wrap gap-1">
        {project.connectors.map((cid) => {
          const c = PLATFORM_CONNECTORS.find((x) => x.id === cid);
          return c ? (
            <span key={cid} className="text-[10px] text-white/30 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">
              {c.icon} {c.name.split(' / ')[0]}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}

function ProjectDetail({ project, onConfigure }) {
  const [tab, setTab] = useState('milestones');
  const typeConfig = PROJECT_TYPES[project.type] || PROJECT_TYPES.app;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{typeConfig.icon}</span>
        <div>
          <h2 className="text-lg font-bold text-white">{project.name}</h2>
          <p className="text-xs text-white/40">{project.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {['milestones', 'achievements', 'connectors'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-xs capitalize transition-colors
              ${tab === t ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'milestones' && (
        <div className="space-y-2">
          {project.milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              {m.done
                ? <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                : <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />}
              <span className={m.done ? 'text-white/60 line-through' : 'text-white'}>{m.title}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'achievements' && (
        <div className="space-y-2">
          {project.achievements.map((a) => <AchievementBadge key={a.id} achievement={a} />)}
        </div>
      )}

      {tab === 'connectors' && (
        <div className="space-y-3">
          {PLATFORM_CONNECTORS.map((c) => {
            const linked = project.connectors.includes(c.id);
            return (
              <div key={c.id} className={`rounded-lg p-3 border ${c.bg} ${c.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.icon}</span>
                    <span className={`font-medium text-sm ${c.color}`}>{c.name}</span>
                  </div>
                  <button
                    onClick={() => onConfigure(c.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/60 text-xs transition-colors"
                  >
                    <Settings size={12} />
                    {linked ? 'Manage' : 'Connect'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.features.map((f) => (
                    <span key={f} className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/40">{f}</span>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-white/20">
                  Configure via env: {c.envVars.join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConnectorConfigModal({ connectorId, onClose }) {
  const connector = PLATFORM_CONNECTORS.find((c) => c.id === connectorId);
  if (!connector) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{connector.icon}</span>
          <h3 className="text-lg font-bold text-white">{connector.name}</h3>
        </div>
        <p className="text-sm text-white/50 mb-4">
          Set the following environment variables in your <code className="bg-white/10 px-1 rounded text-white/70">.env</code> file.
          Never paste credentials here directly.
        </p>
        {connector.envVars.map((v) => (
          <div key={v} className="mb-2 p-2 rounded bg-white/5 border border-white/10 font-mono text-xs text-white/60">
            {v}=<span className="text-white/30">your_value_here</span>
          </div>
        ))}
        <div className="mt-4 text-xs text-white/30">
          Supported features: {connector.features.join(' · ')}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Main export
export default function GameDevTracker({ userId, projectId = null, darkMode = false }) {
  const locale = navigator?.language?.startsWith('es') ? 'es' : 'en';
  const t = STRINGS[locale] || STRINGS.en;

  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(projectId);
  const [loading, setLoading] = useState(true);
  const [configConnector, setConfigConnector] = useState(null);
  const [tick, setTick] = useState(0);

  const loadProjects = useCallback(() => {
    setProjects(buildDemoProjects());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Real-time metric refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((n) => n + 1);
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          metrics: {
            ...p.metrics,
            commitVelocity: p.metrics.commitVelocity + (Math.random() > 0.7 ? 1 : 0),
          },
        }))
      );
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedId) || null;

  const containerClass = `min-h-screen p-4 sm:p-6 ${darkMode ? 'bg-gray-950' : 'bg-gray-900'} text-white`;

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center h-64 gap-3">
          <RefreshCw size={20} className="animate-spin text-purple-400" />
          <span className="text-white/60">{t.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 size={24} className="text-purple-400" />
            {t.title}
          </h1>
          <p className="text-white/40 text-sm mt-1">{t.subtitle}</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm transition-colors">
          <Plus size={14} /> {t.newProject}
        </button>
      </div>

      {/* Project type filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(PROJECT_TYPES).map(([key, cfg]) => (
          <span key={key} className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Project list */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-2 text-center text-white/30 py-16">{t.noProjects}</div>
          ) : (
            projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isSelected={selectedId === p.id}
                onSelect={setSelectedId}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedProject && (
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            <ProjectDetail project={selectedProject} onConfigure={setConfigConnector} />
          </div>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center gap-2 mt-6 text-xs text-white/30">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Live metrics — auto-refreshes every 15 seconds
      </div>

      {/* Connector config modal */}
      {configConnector && (
        <ConnectorConfigModal
          connectorId={configConnector}
          onClose={() => setConfigConnector(null)}
        />
      )}
    </div>
  );
}
