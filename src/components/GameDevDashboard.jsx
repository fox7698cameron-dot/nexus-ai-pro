// ================================================
// File: src/components/GameDevDashboard.jsx
// Date: 2026-10-05
// Description: Game development tracking dashboard with project management,
// achievement tracking, build status, asset pipeline monitoring, and
// platform connectors for Unreal Engine, Epic Games, PlayStation, Xbox, Ubisoft.
// ================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  Gamepad2, Trophy, Layers, GitBranch, Users, Monitor, Package,
  Play, Pause, CheckCircle, XCircle, Clock, AlertCircle, Plus,
  RefreshCw, ChevronRight, Star, Zap, Activity, Settings
} from 'lucide-react';

// ---- Platform configuration ----
const GAME_PLATFORMS = {
  unreal:      { name: 'Unreal Engine', color: '#0D96F2', emoji: '🎮', org: 'Epic Games' },
  epic:        { name: 'Epic Games',    color: '#313131', emoji: '🏪', org: 'Epic Games' },
  playstation: { name: 'PlayStation',   color: '#003087', emoji: '🎮', org: 'Sony' },
  xbox:        { name: 'Xbox',          color: '#107C10', emoji: '🟢', org: 'Microsoft' },
  ubisoft:     { name: 'Ubisoft',       color: '#0070CC', emoji: '💎', org: 'Ubisoft' },
};

const BUILD_STATUSES = {
  success:    { label: 'Success',    icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' },
  failed:     { label: 'Failed',     icon: XCircle,     color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
  running:    { label: 'Running',    icon: RefreshCw,   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  pending:    { label: 'Pending',    icon: Clock,       color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,     color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/30' },
};

const PROJECT_TYPES = ['Coding', 'Game Development', 'AR/VR/3D'];

// ---- Mock data generators ----
function mockProjects() {
  return [
    {
      id: '1', name: 'Nexus Runner', type: 'Game Development', platform: 'unreal',
      progress: 68, status: 'active', buildStatus: 'success',
      lastBuild: new Date(Date.now() - 1800000).toISOString(),
      team: 4, assets: 287, openIssues: 12,
      description: 'Endless runner with procedural generation and UE5 Lumen lighting',
    },
    {
      id: '2', name: 'AR Portal SDK', type: 'AR/VR/3D', platform: 'playstation',
      progress: 34, status: 'active', buildStatus: 'running',
      lastBuild: new Date(Date.now() - 300000).toISOString(),
      team: 2, assets: 91, openIssues: 5,
      description: 'Augmented reality portal system for PS5 VR2 headset',
    },
    {
      id: '3', name: 'Backend Services', type: 'Coding', platform: 'epic',
      progress: 92, status: 'review', buildStatus: 'success',
      lastBuild: new Date(Date.now() - 7200000).toISOString(),
      team: 3, assets: 0, openIssues: 2,
      description: 'Multiplayer matchmaking and leaderboard microservices',
    },
    {
      id: '4', name: 'Open World RPG', type: 'Game Development', platform: 'xbox',
      progress: 18, status: 'planning', buildStatus: 'pending',
      lastBuild: null,
      team: 6, assets: 42, openIssues: 0,
      description: 'Next-gen open world RPG with Xbox Smart Delivery',
    },
  ];
}

function mockAchievements() {
  return [
    { id: 'a1', title: 'First Release', description: 'Shipped your first game build', earned: true, points: 100, icon: '🚀' },
    { id: 'a2', title: '1K Downloads',  description: 'Reached 1,000 downloads',       earned: true, points: 200, icon: '📥' },
    { id: 'a3', title: 'Bug Slayer',    description: 'Closed 50 issues in one week',   earned: false, points: 150, icon: '🐛' },
    { id: 'a4', title: 'Team Player',  description: 'Added 5 collaborators',           earned: true, points: 75,  icon: '👥' },
    { id: 'a5', title: 'Asset King',   description: 'Imported 500 game assets',        earned: false, points: 300, icon: '🎨' },
    { id: 'a6', title: 'CI Hero',      description: '100 consecutive green builds',    earned: false, points: 500, icon: '✅' },
  ];
}

function mockBuildHistory() {
  return [
    { id: 'b1', project: 'Nexus Runner', branch: 'main',    status: 'success',  duration: '4m 22s', ago: '30m ago' },
    { id: 'b2', project: 'AR Portal SDK', branch: 'feat/portal', status: 'running', duration: '—',  ago: '5m ago'  },
    { id: 'b3', project: 'Backend Services', branch: 'release/v2', status: 'success', duration: '1m 55s', ago: '2h ago' },
    { id: 'b4', project: 'Nexus Runner', branch: 'fix/lumen', status: 'failed', duration: '2m 10s', ago: '3h ago' },
  ];
}

function mockAssetPipeline() {
  return [
    { id: 'ap1', name: 'Character Rig Pack',   type: 'mesh',    size: '124 MB', status: 'imported',  project: 'Nexus Runner' },
    { id: 'ap2', name: 'Skybox HDR Set',        type: 'texture', size: '512 MB', status: 'processing', project: 'Open World RPG' },
    { id: 'ap3', name: 'Soundtrack Vol. 2',     type: 'audio',   size: '89 MB',  status: 'imported',  project: 'AR Portal SDK' },
    { id: 'ap4', name: 'Portal VFX Bundle',     type: 'vfx',     size: '256 MB', status: 'pending',   project: 'AR Portal SDK' },
    { id: 'ap5', name: 'LOD Mesh Optimizer',    type: 'tool',    size: '3 MB',   status: 'imported',  project: 'Nexus Runner' },
  ];
}

// ---- Sub-components ----

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ background: `${color}22` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function ProgressBar({ value, color = '#6366F1' }) {
  return (
    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const platform = GAME_PLATFORMS[project.platform];
  const buildCfg = BUILD_STATUSES[project.buildStatus];
  const BuildIcon = buildCfg?.icon || CheckCircle;

  return (
    <button
      type="button"
      onClick={() => onSelect(project.id)}
      className={`w-full text-left p-4 rounded-xl border transition-all
        ${selected
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'
        }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-white font-medium text-sm">{project.name}</p>
          <p className="text-gray-400 text-xs">{project.type}</p>
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${buildCfg?.bg}`}>
          <BuildIcon size={10} className={`${buildCfg?.color} ${project.buildStatus === 'running' ? 'animate-spin' : ''}`} />
          <span className={buildCfg?.color}>{buildCfg?.label}</span>
        </div>
      </div>
      <ProgressBar value={project.progress} color={platform?.color} />
      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>{project.progress}% complete</span>
        <span className="flex items-center gap-1">
          <span>{platform?.emoji}</span>
          {platform?.name}
        </span>
      </div>
    </button>
  );
}

function BuildRow({ build }) {
  const cfg = BUILD_STATUSES[build.status];
  const Icon = cfg?.icon || CheckCircle;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700/50 last:border-0">
      <Icon size={14} className={`${cfg?.color} ${build.status === 'running' ? 'animate-spin' : ''} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{build.project}</p>
        <p className="text-gray-400 text-xs">{build.branch}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-300">{build.duration}</p>
        <p className="text-xs text-gray-500">{build.ago}</p>
      </div>
    </div>
  );
}

function AssetRow({ asset }) {
  const statusColors = {
    imported: 'text-green-400',
    processing: 'text-yellow-400',
    pending: 'text-gray-400',
    failed: 'text-red-400',
  };
  const typeEmojis = { mesh: '🧊', texture: '🎨', audio: '🎵', vfx: '✨', tool: '🔧' };
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700/50 last:border-0">
      <span className="text-lg">{typeEmojis[asset.type] || '📦'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{asset.name}</p>
        <p className="text-gray-400 text-xs">{asset.project}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-300">{asset.size}</p>
        <p className={`text-xs capitalize ${statusColors[asset.status] || 'text-gray-400'}`}>{asset.status}</p>
      </div>
    </div>
  );
}

function AchievementCard({ achievement }) {
  return (
    <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all
      ${achievement.earned
        ? 'border-yellow-500/40 bg-yellow-500/5'
        : 'border-gray-700 bg-gray-800/30 opacity-60'
      }`}
    >
      <span className="text-2xl">{achievement.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${achievement.earned ? 'text-white' : 'text-gray-400'}`}>
          {achievement.title}
        </p>
        <p className="text-xs text-gray-500">{achievement.description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-bold ${achievement.earned ? 'text-yellow-400' : 'text-gray-600'}`}>
          +{achievement.points}
        </p>
        {achievement.earned && <CheckCircle size={12} className="text-green-400 ml-auto mt-0.5" />}
      </div>
    </div>
  );
}

function PlatformConnectorCard({ platformId, connected, onConnect }) {
  const cfg = GAME_PLATFORMS[platformId];
  return (
    <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all
      ${connected
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-gray-700 bg-gray-800/40'
      }`}
    >
      <span className="text-xl">{cfg.emoji}</span>
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{cfg.name}</p>
        <p className="text-xs text-gray-400">{cfg.org}</p>
      </div>
      {connected ? (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle size={12} /> Connected
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onConnect(platformId)}
          className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );
}

// ---- Tabs ----
const TABS = [
  { id: 'overview',      label: 'Overview',      icon: Monitor },
  { id: 'projects',      label: 'Projects',      icon: Gamepad2 },
  { id: 'achievements',  label: 'Achievements',  icon: Trophy },
  { id: 'builds',        label: 'Builds',        icon: GitBranch },
  { id: 'assets',        label: 'Assets',        icon: Package },
  { id: 'platforms',     label: 'Platforms',     icon: Layers },
];

// ---- Create Project Modal ----
function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Game Development');
  const [platform, setPlatform] = useState('unreal');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/gamedev/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type, platform, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');
      onCreate(data);
      onClose();
    } catch (err) {
      // Fallback: create locally
      onCreate({ id: Date.now().toString(), name: name.trim(), type, platform, description, progress: 0, buildStatus: 'pending', team: 1, assets: 0, openIssues: 0, status: 'planning' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-white mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Project Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="My Awesome Game"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Project Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Platform</label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {Object.entries(GAME_PLATFORMS).map(([id, cfg]) => (
                <option key={id} value={id}>{cfg.emoji} {cfg.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Brief description..."
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-600 rounded-lg text-gray-400 text-sm hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm font-medium
                flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function GameDevDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [projects, setProjects] = useState(mockProjects());
  const [achievements] = useState(mockAchievements());
  const [buildHistory] = useState(mockBuildHistory());
  const [assetPipeline] = useState(mockAssetPipeline());
  const [selectedProject, setSelectedProject] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState(new Set(['unreal', 'epic']));
  const [showCreateModal, setShowCreateModal] = useState(false);

  const earnedAchievements = achievements.filter(a => a.earned).length;
  const totalPoints = achievements.filter(a => a.earned).reduce((s, a) => s + a.points, 0);
  const activeBuild = buildHistory.find(b => b.status === 'running');

  const handleConnectPlatform = useCallback(async (platformId) => {
    try {
      const res = await fetch('/api/gamedev/platforms/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId }),
      }).catch(() => null);
      // Optimistic update regardless of server response
      setConnectedPlatforms(prev => new Set([...prev, platformId]));
    } catch {}
  }, []);

  const selected = projects.find(p => p.id === selectedProject);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Gamepad2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Game Dev Dashboard</h1>
              <p className="text-xs text-gray-400">{projects.length} active projects</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium"
          >
            <Plus size={14} />
            New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 overflow-x-auto">
        <div className="flex gap-0 max-w-7xl mx-auto px-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              <Icon size={14} />
              {label}
              {id === 'builds' && activeBuild && (
                <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Projects"     value={projects.length}    icon={Gamepad2}    color="#6366F1" />
              <StatCard label="Achievements" value={`${earnedAchievements}/${achievements.length}`} icon={Trophy} color="#FBBF24" />
              <StatCard label="Total Points" value={totalPoints}         icon={Star}        color="#F59E0B" />
              <StatCard label="Platforms"    value={connectedPlatforms.size} icon={Layers}  color="#10B981" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" />
                  Recent Builds
                </h3>
                {buildHistory.slice(0, 3).map(b => <BuildRow key={b.id} build={b} />)}
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Package size={14} className="text-green-400" />
                  Asset Pipeline
                </h3>
                {assetPipeline.slice(0, 3).map(a => <AssetRow key={a.id} asset={a} />)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={selectedProject === p.id}
                  onSelect={id => { setSelectedProject(id); setActiveTab('projects'); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={selectedProject === p.id}
                  onSelect={setSelectedProject}
                />
              ))}
            </div>
            {selected && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
                <h3 className="text-white font-medium">{selected.name}</h3>
                <p className="text-gray-400 text-sm">{selected.description}</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Team</p>
                    <p className="text-white font-medium">{selected.team} members</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Assets</p>
                    <p className="text-white font-medium">{selected.assets}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Issues</p>
                    <p className="text-white font-medium">{selected.openIssues} open</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                {earnedAchievements} of {achievements.length} earned &bull; {totalPoints} points
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
            </div>
          </div>
        )}

        {/* Builds Tab */}
        {activeTab === 'builds' && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Build History</h3>
            <div className="space-y-0">
              {buildHistory.map(b => <BuildRow key={b.id} build={b} />)}
            </div>
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Asset Pipeline</h3>
            <div className="space-y-0">
              {assetPipeline.map(a => <AssetRow key={a.id} asset={a} />)}
            </div>
          </div>
        )}

        {/* Platforms Tab */}
        {activeTab === 'platforms' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-2">Connect your development platforms to sync builds, assets, and analytics.</p>
            {Object.keys(GAME_PLATFORMS).map(pid => (
              <PlatformConnectorCard
                key={pid}
                platformId={pid}
                connected={connectedPlatforms.has(pid)}
                onConnect={handleConnectPlatform}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={newProject => setProjects(prev => [newProject, ...prev])}
        />
      )}
    </div>
  );
}
