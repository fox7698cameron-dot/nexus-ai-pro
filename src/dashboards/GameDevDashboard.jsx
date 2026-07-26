// src/dashboards/GameDevDashboard.jsx — 2026-07-26
// Game dev, AR/VR, 3D project tracking with engine/publisher connectors
import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Link2, Plus, Loader2, AlertTriangle,
  CheckCircle2, GitBranch, Bug, Layers, Monitor, Smartphone,
  Globe, Cpu, Zap, RefreshCw, Target, BarChart3, Star, Lock,
} from 'lucide-react';

const ENGINE_META = {
  unreal:    { name: 'Unreal Engine', emoji: '⚙️', color: 'bg-gray-900' },
  unity:     { name: 'Unity',         emoji: '🎮', color: 'bg-gray-700' },
  godot:     { name: 'Godot',         emoji: '👾', color: 'bg-blue-700' },
  gamemaker: { name: 'GameMaker',     emoji: '🕹️', color: 'bg-orange-700' },
  custom:    { name: 'Custom Engine', emoji: '🔧', color: 'bg-purple-700' },
};

const PUBLISHER_META = {
  epic:      { name: 'Epic Games',     emoji: '⚡', color: 'bg-gray-800' },
  sony:      { name: 'PlayStation',    emoji: '🎮', color: 'bg-blue-800' },
  microsoft: { name: 'Xbox/Microsoft', emoji: '💚', color: 'bg-green-700' },
  ubisoft:   { name: 'Ubisoft',        emoji: '🦅', color: 'bg-blue-600' },
  steam:     { name: 'Steam',          emoji: '🎯', color: 'bg-gray-700' },
  gog:       { name: 'GOG',            emoji: '🌿', color: 'bg-green-600' },
  itch:      { name: 'itch.io',        emoji: '🕹️', color: 'bg-red-700' },
};

const CATEGORY_ICONS = {
  game: Gamepad2, ar: Target, vr: Monitor, xr: Layers,
  '3d_modeling': Cpu, animation: Zap, simulation: Globe,
};

function fmt(n) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }

function ProjectCard({ project }) {
  const CategoryIcon = CATEGORY_ICONS[project.category] || Gamepad2;
  const engineMeta = ENGINE_META[project.engine] || {};
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white">
            <CategoryIcon size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{project.name}</h3>
            <p className="text-xs text-gray-500 capitalize">{project.category?.replace('_', ' ')} • {engineMeta.emoji || ''} {engineMeta.name || project.engine || 'No engine'}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${project.status === 'released' ? 'bg-green-100 text-green-700' : project.status === 'in_development' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
          {project.status?.replace('_', ' ')}
        </span>
      </div>

      {project.description && <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>}

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-gray-500">Progress</span><span className="font-medium text-gray-900 dark:text-white">{project.progress}%</span></div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[['Commits', project.commits, GitBranch], ['Bugs', project.openBugs, Bug], ['Tasks', project.tasks?.length, CheckCircle2], ['FPS', project.avgFPS ?? '—', Zap]].map(([label, value, Icon]) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            <Icon size={12} className="mx-auto mb-1 text-gray-400" />
            <div className="font-bold text-gray-900 dark:text-white">{value ?? 0}</div>
            <div className="text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {project.buildVersion && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full font-mono">v{project.buildVersion}</span>
          {project.targetPlatforms?.map(p => <span key={p} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">{p}</span>)}
        </div>
      )}
    </div>
  );
}

function AchievementBadge({ achievement }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex items-center gap-3">
      <div className="text-3xl">{achievement.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{achievement.title}</div>
        {achievement.description && <div className="text-xs text-gray-500 truncate">{achievement.description}</div>}
        <div className="text-xs text-yellow-600 font-medium">+{achievement.xp} XP</div>
      </div>
      <div className="text-xs text-gray-400 text-right shrink-0">
        {new Date(achievement.unlockedAt).toLocaleDateString()}
      </div>
    </div>
  );
}

function ConnectorChip({ platform, meta, connected, onConnect, onDisconnect }) {
  return (
    <div className={`rounded-xl p-4 border-2 transition-all ${connected ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <span className="font-medium text-gray-900 dark:text-white text-sm">{meta.name}</span>
        </div>
        {connected ? <CheckCircle2 size={14} className="text-green-500" /> : <Lock size={14} className="text-gray-400" />}
      </div>
      <button
        onClick={connected ? onDisconnect : onConnect}
        className={`w-full text-xs py-1.5 rounded-lg font-medium transition ${connected ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}

export default function GameDevDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [progress, setProgress] = useState(null);
  const [connectors, setConnectors] = useState([]);
  const [connectorStatus, setConnectorStatus] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [projRes, achRes, progRes, connRes, statRes, connStatusRes] = await Promise.all([
        fetch('/api/gamedev/projects', { headers }),
        fetch('/api/gamedev/achievements', { headers }),
        fetch('/api/gamedev/achievements/progress', { headers }),
        fetch('/api/gamedev/connectors'),
        fetch('/api/gamedev/stats', { headers }),
        fetch('/api/gamedev/connectors/status', { headers }),
      ]);
      setProjects(await projRes.json());
      setAchievements(await achRes.json());
      setProgress(await progRes.json());
      const connData = await connRes.json();
      setConnectors([...connData.engines, ...connData.publishers]);
      setStats(await statRes.json());
      const statusList = await connStatusRes.json();
      const statusMap = {};
      for (const s of statusList) statusMap[s.platform] = s;
      setConnectorStatus(statusMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const connectPlatform = async (platform) => {
    const accountId = prompt(`Enter your ${platform} account ID:`);
    if (!accountId) return;
    const token_ = `demo-token-${Date.now()}`;
    await fetch('/api/gamedev/connectors/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ platform, token: token_, accountId }),
    });
    await load();
  };

  const disconnectPlatform = async (platform) => {
    await fetch(`/api/gamedev/connectors/${platform}`, { method: 'DELETE', headers });
    await load();
  };

  if (loading) return <div className="flex items-center justify-center h-64 gap-2 text-gray-500"><Loader2 size={20} className="animate-spin" /> Loading…</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gamepad2 size={24} className="text-purple-500" /> Game Dev Dashboard
          </h1>
          <p className="text-sm text-gray-500">Games, AR/VR, 3D — engine & publisher connectors</p>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <RefreshCw size={14} className="text-gray-500" />
        </button>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"><AlertTriangle size={14} /> {error}</div>}

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.projects.total}</div>
            <div className="text-xs text-gray-500">Total Projects</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.projects.active}</div>
            <div className="text-xs text-gray-500">In Development</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.achievements.total}</div>
            <div className="text-xs text-gray-500">Achievements</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.connectors}</div>
            <div className="text-xs text-gray-500">Connected Platforms</div>
          </div>
        </div>
      )}

      {/* XP / Level bar */}
      {progress && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-4 text-white flex items-center gap-4">
          <Star size={32} className="shrink-0 text-yellow-300" />
          <div className="flex-1">
            <div className="font-bold">Level {progress.level} Developer</div>
            <div className="text-sm opacity-80">{progress.totalXP} XP total · {progress.total} achievements unlocked</div>
            <div className="h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-yellow-300 rounded-full" style={{ width: `${(progress.totalXP % 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[['projects', 'Projects', Gamepad2], ['achievements', 'Achievements', Trophy], ['connectors', 'Connectors', Link2]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition">
              <Plus size={14} /> New Project
            </button>
          </div>
          {projects.length === 0
            ? <div className="text-center py-16 text-gray-500"><Gamepad2 size={40} className="mx-auto mb-3 opacity-30" /><p>No projects yet.</p></div>
            : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{projects.map(p => <ProjectCard key={p.id} project={p} />)}</div>}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-3">
          {achievements.length === 0
            ? <div className="text-center py-16 text-gray-500"><Trophy size={40} className="mx-auto mb-3 opacity-30" /><p>No achievements unlocked yet.</p></div>
            : achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
        </div>
      )}

      {activeTab === 'connectors' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Engine Connectors</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(ENGINE_META).map(([id, meta]) => (
              <ConnectorChip key={id} platform={id} meta={meta}
                connected={!!connectorStatus[id]}
                onConnect={() => connectPlatform(id)}
                onDisconnect={() => disconnectPlatform(id)} />
            ))}
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white mt-4">Publisher / Store Connectors</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(PUBLISHER_META).map(([id, meta]) => (
              <ConnectorChip key={id} platform={id} meta={meta}
                connected={!!connectorStatus[id]}
                onConnect={() => connectPlatform(id)}
                onDisconnect={() => disconnectPlatform(id)} />
            ))}
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white mt-4">Dev Tools</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[['github','GitHub','🐙'],['bitbucket','Bitbucket','🪣'],['azure','Azure DevOps','☁️'],['jira','Jira','📋']].map(([id, name, emoji]) => (
              <ConnectorChip key={id} platform={id} meta={{ name, emoji }} connected={!!connectorStatus[id]}
                onConnect={() => connectPlatform(id)} onDisconnect={() => disconnectPlatform(id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
