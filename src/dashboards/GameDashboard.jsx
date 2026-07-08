// src/dashboards/GameDashboard.jsx
// Date: 2026-07-08
// Game development, AR/VR/3D project tracking, achievements, platform connectors

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Star, Target, Cpu, Layers, Box,
  RefreshCw, Plus, ChevronRight, Award, BarChart3,
  Globe, Rocket, Activity, Zap, Monitor, Smartphone,
  Play, CheckCircle, AlertCircle, Clock, Users
} from 'lucide-react';

const STATUS_CONFIG = {
  planning: { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', label: 'Planning' },
  in_dev: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'In Dev' },
  alpha: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Alpha' },
  beta: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Beta' },
  release: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Release' },
  live: { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Live' }
};

const PLATFORM_ICONS = {
  epic: '🎮', sony: '🎮', microsoft: '🎮', ubisoft: '🎮', steam: '🎮', mobile: '📱'
};

const RARITY_COLORS = {
  common: 'text-gray-500', uncommon: 'text-green-500', rare: 'text-blue-500',
  epic: 'text-purple-500', legendary: 'text-yellow-500'
};

function ProjectCard({ project, onClick }) {
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const buildRate = project.metrics?.buildSuccessRate ?? 100;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{project.engine} · {project.type?.replace(/_/g, ' ')}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Cpu size={10} />
          <span>v{project.version}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Activity size={10} />
          <span>Build: {buildRate}%</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Trophy size={10} />
          <span>{project.achievements?.length || 0} achievements</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Target size={10} />
          <span>{project.milestones?.length || 0} milestones</span>
        </div>
      </div>
      {/* Build success rate bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Build success</span>
          <span className={buildRate >= 90 ? 'text-green-600' : buildRate >= 70 ? 'text-yellow-600' : 'text-red-500'}>
            {buildRate}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${buildRate >= 90 ? 'bg-green-500' : buildRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${buildRate}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function AchievementBadge({ achievement }) {
  const rarityColor = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
      <span className="text-2xl">{achievement.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{achievement.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{achievement.description}</p>
        <p className={`text-xs font-semibold capitalize ${rarityColor}`}>{achievement.rarity} · {achievement.points} pts</p>
      </div>
      <span className="text-xs text-gray-400">{achievement.unlockedBy?.length || 0}x</span>
    </div>
  );
}

function ARVRMetrics({ metrics }) {
  if (!metrics) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Box size={16} className="text-purple-500" />
        AR/VR Metrics
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Frame Rate', value: `${metrics.frameRate} fps`, good: metrics.frameRate >= 72 },
          { label: 'Latency', value: `${metrics.latencyMs}ms`, good: metrics.latencyMs <= 20 },
          { label: 'Memory', value: `${metrics.memoryUsageMB}MB`, good: metrics.memoryUsageMB < 2000 },
          { label: 'Draw Calls', value: metrics.drawCalls, good: metrics.drawCalls < 150 },
          { label: 'Poly Count', value: `${(metrics.polyCount / 1000).toFixed(0)}K`, good: metrics.polyCount < 500000 },
          { label: 'Load Time', value: `${(metrics.loadTimeMs / 1000).toFixed(1)}s`, good: metrics.loadTimeMs < 3000 }
        ].map((stat, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
            <span className={`text-sm font-bold ${stat.good ? 'text-green-600' : 'text-orange-500'}`}>{stat.value}</span>
          </div>
        ))}
      </div>
      {metrics.supportedDevices && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">Supported Devices</p>
          <div className="flex flex-wrap gap-1">
            {metrics.supportedDevices.map((d, i) => (
              <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-0.5 text-gray-600 dark:text-gray-300">{d}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformStats({ stats }) {
  if (!stats) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <BarChart3 size={16} className="text-blue-500" />
        {stats.platform?.toUpperCase()} Stats
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xl font-bold text-blue-600">{(stats.downloads || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500">Downloads</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-xl font-bold text-green-600">${(stats.revenue || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500">Revenue</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-xl font-bold text-yellow-600">{stats.rating}</div>
          <div className="text-xs text-gray-500">Rating ⭐</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-xl font-bold text-purple-600">{(stats.dailyActiveUsers || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500">DAU</div>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">D1 Retention</span>
          <span className="font-medium text-gray-900 dark:text-white">{stats.retentionD1}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">D7 Retention</span>
          <span className="font-medium text-gray-900 dark:text-white">{stats.retentionD7}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Session Length</span>
          <span className="font-medium text-gray-900 dark:text-white">{stats.sessionLength}min</span>
        </div>
      </div>
    </div>
  );
}

export default function GameDashboard({ token }) {
  const [projects, setProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [arvrMetrics, setArvrMetrics] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', type: 'game_3d', engine: 'unreal', genre: 'Action' });

  const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [projectsRes, dashRes] = await Promise.all([
        fetch('/api/game/projects', { headers }),
        fetch('/api/game/dashboard', { headers })
      ]);
      if (projectsRes.ok) setProjects((await projectsRes.json()).projects || []);
      if (dashRes.ok) setDashboard(await dashRes.json());
    } catch (e) {
      setError('Failed to load game data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const selectProject = useCallback(async (project) => {
    setSelectedProject(project);
    setActiveTab('detail');
    if (!token) return;
    try {
      const [achRes, arRes] = await Promise.all([
        fetch(`/api/game/projects/${project.id}/achievements`, { headers }),
        fetch(`/api/game/projects/${project.id}/arvr-metrics`, { headers })
      ]);
      if (achRes.ok) setAchievements((await achRes.json()).achievements || []);
      if (arRes.ok) setArvrMetrics(await arRes.json());

      // Load stats for first connected platform
      const statsRes = await fetch(`/api/game/projects/${project.id}/stats/epic`, { headers });
      if (statsRes.ok) setPlatformStats(await statsRes.json());
    } catch {}
  }, [token]);

  const createProject = useCallback(async () => {
    if (!token || !newProject.name) return;
    try {
      const r = await fetch('/api/game/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify(newProject)
      });
      if (r.ok) {
        const project = await r.json();
        setProjects(prev => [project, ...prev]);
        setShowNewProject(false);
        setNewProject({ name: '', type: 'game_3d', engine: 'unreal', genre: 'Action' });
      }
    } catch (e) {
      setError('Failed to create project');
    }
  }, [token, newProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gamepad2 size={24} className="text-purple-500" />
            Game Dev Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Projects, AR/VR/3D tracking, achievements & platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Summary stats */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 mb-1">Total Projects</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.totalProjects}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 mb-1">Achievements</div>
            <div className="text-2xl font-bold text-yellow-500">{dashboard.totalAchievements}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 mb-1">In Dev</div>
            <div className="text-2xl font-bold text-blue-500">{dashboard.byStatus?.in_dev || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 mb-1">Live</div>
            <div className="text-2xl font-bold text-green-500">{dashboard.byStatus?.live || 0}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white dark:bg-gray-800 rounded-xl p-1 w-fit">
        {['projects', selectedProject && 'detail', 'achievements'].filter(Boolean).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-purple-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* New project form */}
      {showNewProject && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">New Project</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={newProject.name}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              placeholder="Project name"
              className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <select
              value={newProject.type}
              onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {['game_2d','game_3d','ar','vr','xr','metaverse','simulation','tool'].map(t => (
                <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
              ))}
            </select>
            <select
              value={newProject.engine}
              onChange={e => setNewProject(p => ({ ...p, engine: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {['unreal','unity','godot','custom'].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={createProject} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">Create</button>
            <button onClick={() => setShowNewProject(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        !token ? (
          <div className="text-center py-12 text-gray-400">
            <Gamepad2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>Sign in to access game development tracking</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Gamepad2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>No projects yet. Create your first project!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => selectProject(p)} />
            ))}
          </div>
        )
      )}

      {activeTab === 'detail' && selectedProject && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <Gamepad2 size={20} className="text-purple-500" />
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{selectedProject.name}</h2>
                <p className="text-xs text-gray-500">{selectedProject.engine} · v{selectedProject.version}</p>
              </div>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedProject.status]?.bg} ${STATUS_CONFIG[selectedProject.status]?.color}`}>
                {STATUS_CONFIG[selectedProject.status]?.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div><div className="font-bold text-gray-900 dark:text-white">{selectedProject.metrics?.commits || 0}</div><div className="text-xs text-gray-400">Commits</div></div>
              <div><div className="font-bold text-gray-900 dark:text-white">{selectedProject.metrics?.buildSuccessRate || 100}%</div><div className="text-xs text-gray-400">Build Rate</div></div>
              <div><div className="font-bold text-gray-900 dark:text-white">{selectedProject.milestones?.length || 0}</div><div className="text-xs text-gray-400">Milestones</div></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {arvrMetrics && <ARVRMetrics metrics={arvrMetrics} />}
            {platformStats && <PlatformStats stats={platformStats} />}
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-2">
          {achievements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Trophy size={48} className="mx-auto mb-3 opacity-30" />
              <p>No achievements defined yet. Select a project and add achievements!</p>
            </div>
          ) : (
            achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)
          )}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        Real-time tracking · {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
