// src/dashboards/ProjectTrackingDashboard.jsx
// Nexus AI Pro — Real-Time Project Tracking + Game Platform Connectors
// Tracks: coding, game dev, AR/VR/3D projects
// Platform connectors: Epic/Unreal, Sony, Microsoft, Ubisoft
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// 2026-04-23

import { useState, useEffect, useCallback } from 'react';
import {
  Code2, Gamepad2, Box, Cpu, GitBranch, GitCommit,
  Play, Pause, CheckCircle, Clock, AlertTriangle, Plus,
  Trophy, Star, TrendingUp, Users, Layers, Globe,
  RefreshCw, ExternalLink, Activity, Zap, Target, Award,
  Wifi, WifiOff, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─── Platform Connectors ─────────────────────────────────────────────────────

const GAME_PLATFORMS = [
  {
    id: 'epic',
    label: 'Epic / Unreal',
    icon: '🎮',
    color: '#0078F2',
    engine: 'Unreal Engine 5',
    connected: true,
    features: ['Achievements', 'Leaderboards', 'Matchmaking', 'Friends', 'Store'],
  },
  {
    id: 'sony',
    label: 'PlayStation',
    icon: '🎮',
    color: '#003087',
    engine: 'PS5 SDK',
    connected: true,
    features: ['Trophies', 'PSN Leaderboards', 'Share Play', 'Remote Play', 'PS Store'],
  },
  {
    id: 'microsoft',
    label: 'Xbox / Game Pass',
    icon: '🎮',
    color: '#107C10',
    engine: 'GDK / Xbox SDK',
    connected: false,
    features: ['Achievements', 'Game Pass', 'xCloud', 'Smart Delivery', 'Xbox Store'],
  },
  {
    id: 'ubisoft',
    label: 'Ubisoft Connect',
    icon: '🎮',
    color: '#0070FF',
    engine: 'Ubisoft SDK',
    connected: true,
    features: ['Challenges', 'Rewards', 'Units Currency', 'Club', 'Ubisoft Store'],
  },
];

const PROJECT_TYPES = [
  { id: 'coding',  label: 'Coding',     icon: Code2,    color: '#6366F1' },
  { id: 'game',    label: 'Game Dev',   icon: Gamepad2, color: '#10B981' },
  { id: 'ar',      label: 'AR/VR',      icon: Box,      color: '#F59E0B' },
  { id: '3d',      label: '3D',         icon: Layers,   color: '#EC4899' },
];

const STATUS_COLORS = {
  active:     { bg: 'bg-emerald-900/30', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  paused:     { bg: 'bg-yellow-900/30',  border: 'border-yellow-500/30',  text: 'text-yellow-400' },
  completed:  { bg: 'bg-indigo-900/30',  border: 'border-indigo-500/30',  text: 'text-indigo-400' },
  blocked:    { bg: 'bg-red-900/30',     border: 'border-red-500/30',     text: 'text-red-400' },
};

const SAMPLE_PROJECTS = [
  {
    id: 'p1', type: 'game', name: 'Nexus Legends',
    engine: 'Unreal Engine 5', language: 'C++',
    status: 'active', platform: ['epic', 'sony'],
    progress: 68, milestone: 'Alpha Build',
    commits: 847, coverage: 72, builds: 23,
    lastCommit: '2 hours ago',
    achievements: [
      { name: 'First Boot', unlocked: true,  xp: 100 },
      { name: 'Level 10',   unlocked: true,  xp: 250 },
      { name: 'Boss Fight',  unlocked: false, xp: 500 },
    ],
    leaderboard: { rank: 4, score: 94200 },
    targets: ['Windows', 'PS5', 'Xbox Series X', 'Switch 2'],
  },
  {
    id: 'p2', type: 'ar', name: 'HoloWorld AR',
    engine: 'Unity 6 / ARKit', language: 'C#',
    status: 'active', platform: ['microsoft'],
    progress: 41, milestone: 'Prototype',
    commits: 312, coverage: 58, builds: 11,
    lastCommit: '5 hours ago',
    achievements: [],
    leaderboard: null,
    targets: ['iOS', 'Android', 'HoloLens 2', 'Vision Pro'],
  },
  {
    id: 'p3', type: '3d', name: 'Vertex Studio',
    engine: 'Blender + Three.js', language: 'Python / JS',
    status: 'paused', platform: [],
    progress: 85, milestone: 'Beta',
    commits: 1243, coverage: 81, builds: 47,
    lastCommit: '2 days ago',
    achievements: [],
    leaderboard: null,
    targets: ['Web', 'Electron'],
  },
  {
    id: 'p4', type: 'coding', name: 'NexusCore API',
    engine: 'Node.js / Rust', language: 'TypeScript + Rust',
    status: 'active', platform: [],
    progress: 92, milestone: 'Production Ready',
    commits: 2891, coverage: 94, builds: 156,
    lastCommit: '30 minutes ago',
    achievements: [],
    leaderboard: null,
    targets: ['Linux', 'Windows', 'macOS', 'Docker'],
  },
];

function buildCommitHistory() {
  return Array.from({ length: 14 }, (_, i) => ({
    day: `Day ${i + 1}`,
    commits: Math.round(2 + Math.random() * 18),
    linesAdded: Math.round(50 + Math.random() * 800),
    linesRemoved: Math.round(10 + Math.random() * 200),
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, color = '#6366F1', label }) {
  return (
    <div className="space-y-1">
      {label && <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{label}</span><span>{value}%</span>
      </div>}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function PlatformBadge({ platformId }) {
  const p = GAME_PLATFORMS.find(g => g.id === platformId);
  if (!p) return null;
  return (
    <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: `${p.color}22`, color: p.color }}>
      {p.label}
    </span>
  );
}

function AchievementList({ achievements }) {
  if (!achievements?.length) return null;
  return (
    <div className="space-y-1.5 mt-2">
      {achievements.map((ach, i) => (
        <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${
          ach.unlocked ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <Trophy size={13} className={ach.unlocked ? 'text-yellow-400' : 'text-gray-600'} />
            <span className={`text-xs font-medium ${ach.unlocked ? 'text-yellow-300' : 'text-gray-500'}`}>
              {ach.name}
            </span>
          </div>
          <span className="text-xs text-gray-500">{ach.xp} XP</span>
        </div>
      ))}
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const type = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  const status = STATUS_COLORS[project.status] || STATUS_COLORS.active;

  return (
    <div
      onClick={() => onSelect(project)}
      className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-all ${
        selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${type.color}22` }}>
            <type.icon size={16} style={{ color: type.color }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{project.name}</div>
            <div className="text-xs text-gray-500">{project.engine}</div>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border capitalize ${status.bg} ${status.border} ${status.text}`}>
          {project.status}
        </span>
      </div>

      <ProgressBar value={project.progress} color={type.color} label={project.milestone} />

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="bg-gray-900 rounded-lg p-1.5">
          <div className="text-sm font-bold text-white">{project.commits}</div>
          <div className="text-xs text-gray-500">Commits</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-1.5">
          <div className="text-sm font-bold text-white">{project.coverage}%</div>
          <div className="text-xs text-gray-500">Coverage</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-1.5">
          <div className="text-sm font-bold text-white">{project.builds}</div>
          <div className="text-xs text-gray-500">Builds</div>
        </div>
      </div>

      {project.platform?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {project.platform.map(pid => <PlatformBadge key={pid} platformId={pid} />)}
        </div>
      )}

      <div className="text-xs text-gray-600 mt-2 flex items-center gap-1">
        <GitCommit size={10} /> Last commit {project.lastCommit}
      </div>
    </div>
  );
}

function PlatformConnector({ platform, onConnect }) {
  return (
    <div className={`bg-gray-800 rounded-xl p-4 border transition-all ${
      platform.connected ? 'border-emerald-500/30' : 'border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `${platform.color}22` }}>
            {platform.icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{platform.label}</div>
            <div className="text-xs text-gray-500">{platform.engine}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {platform.connected
            ? <><Wifi size={13} className="text-emerald-400" /><span className="text-xs text-emerald-400">Connected</span></>
            : <><WifiOff size={13} className="text-gray-500" /><span className="text-xs text-gray-500">Disconnected</span></>
          }
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {platform.features.map(f => (
          <span key={f} className="text-xs px-2 py-0.5 rounded-md bg-gray-700 text-gray-300">{f}</span>
        ))}
      </div>

      {!platform.connected && (
        <button
          onClick={() => onConnect(platform.id)}
          className="w-full py-1.5 text-xs font-semibold rounded-lg transition-colors border"
          style={{ borderColor: platform.color, color: platform.color }}
        >
          Connect Platform
        </button>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ProjectTrackingDashboard({ socket }) {
  const [projects, setProjects]       = useState(SAMPLE_PROJECTS);
  const [selected, setSelected]       = useState(SAMPLE_PROJECTS[0]);
  const [platforms, setPlatforms]     = useState(GAME_PLATFORMS);
  const [filterType, setFilterType]   = useState('all');
  const [commitHistory, setHistory]   = useState(() => buildCommitHistory());
  const [activeTab, setActiveTab]     = useState('projects');
  const [liveBuilding, setLiveBuilding] = useState(false);

  // Simulate live build updates via socket
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setProjects(prev => prev.map(p => p.id === data.projectId ? { ...p, ...data.updates } : p));
    };
    socket.on('project:update', handler);
    return () => socket.off('project:update', handler);
  }, [socket]);

  // Simulate real-time commit activity
  useEffect(() => {
    const iv = setInterval(() => {
      setHistory(prev => [
        ...prev.slice(-13),
        {
          day: `Day ${prev.length + 1}`,
          commits: Math.round(2 + Math.random() * 18),
          linesAdded: Math.round(50 + Math.random() * 800),
          linesRemoved: Math.round(10 + Math.random() * 200),
        }
      ]);
      setProjects(prev => prev.map(p => ({
        ...p,
        commits: p.status === 'active' ? p.commits + Math.round(Math.random() * 2) : p.commits,
      })));
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  const connectPlatform = useCallback(async (platformId) => {
    setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, connected: true } : p));
  }, []);

  const filtered = filterType === 'all'
    ? projects
    : projects.filter(p => p.type === filterType);

  const totalCommits   = projects.reduce((s, p) => s + p.commits, 0);
  const avgCoverage    = Math.round(projects.reduce((s, p) => s + p.coverage, 0) / projects.length);
  const activeProjects = projects.filter(p => p.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity size={24} className="text-indigo-400" />
            Project Tracking
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time tracking across all projects &amp; platforms</p>
        </div>
        <div className="flex items-center gap-2">
          {liveBuilding && (
            <div className="flex items-center gap-1.5 bg-indigo-900/30 border border-indigo-500/40 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-indigo-300 text-sm">Building…</span>
            </div>
          )}
          <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg text-sm transition-colors">
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Projects', value: projects.length, icon: Code2,    color: '#6366F1' },
          { label: 'Active',         value: activeProjects,  icon: Play,     color: '#10B981' },
          { label: 'Total Commits',  value: totalCommits,    icon: GitCommit, color: '#F59E0B' },
          { label: 'Avg Coverage',   value: `${avgCoverage}%`, icon: Target,  color: '#EC4899' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{label}</span>
              <Icon size={15} style={{ color }} />
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 w-fit">
        {['projects','platforms','achievements','analytics'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${activeTab === t ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >{t}</button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <>
          {/* Type Filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterType('all')} className={`px-3 py-1 rounded-lg text-sm transition-colors ${filterType === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'}`}>All</button>
            {PROJECT_TYPES.map(t => (
              <button key={t.id} onClick={() => setFilterType(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm transition-colors border ${
                  filterType === t.id ? 'text-white border-transparent' : 'border-gray-600 text-gray-400 bg-gray-800'
                }`}
                style={filterType === t.id ? { background: `${t.color}33`, borderColor: t.color } : {}}
              >
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Project List */}
            <div className="lg:col-span-1 space-y-3 max-h-[720px] overflow-y-auto">
              {filtered.map(p => <ProjectCard key={p.id} project={p} onSelect={setSelected} selected={selected?.id === p.id} />)}
            </div>

            {/* Project Detail */}
            {selected && (
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                      <p className="text-sm text-gray-400">{selected.engine} · {selected.language}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selected.targets?.map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-gray-700 text-gray-300">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <ProgressBar value={selected.progress} label={`${selected.milestone} — ${selected.progress}%`} color="#6366F1" />
                    <ProgressBar value={selected.coverage} label={`Test Coverage — ${selected.coverage}%`} color="#10B981" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Commits', value: selected.commits, icon: GitCommit },
                      { label: 'Builds',        value: selected.builds,  icon: Zap       },
                      { label: 'Coverage',      value: `${selected.coverage}%`, icon: Target },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-gray-900 rounded-xl p-3 text-center">
                        <Icon size={16} className="text-indigo-400 mx-auto mb-1" />
                        <div className="text-xl font-bold text-white">{value}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  {selected.leaderboard && (
                    <div className="mt-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy size={16} className="text-yellow-400" />
                        <div>
                          <div className="text-sm font-semibold text-yellow-300">Leaderboard Rank #{selected.leaderboard.rank}</div>
                          <div className="text-xs text-gray-400">Score: {selected.leaderboard.score.toLocaleString()}</div>
                        </div>
                      </div>
                      <TrendingUp size={18} className="text-yellow-400" />
                    </div>
                  )}

                  {selected.achievements?.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Award size={12} /> Achievements
                      </h3>
                      <AchievementList achievements={selected.achievements} />
                    </div>
                  )}
                </div>

                {/* Commit History Chart */}
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <BarChart3 size={14} className="text-indigo-400" /> Commit Activity (14 days)
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={commitHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="day" hide />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                      <Bar dataKey="commits" fill="#6366F1" radius={[2,2,0,0]} name="Commits" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'platforms' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {platforms.map(p => <PlatformConnector key={p.id} platform={p} onConnect={connectPlatform} />)}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-4">
          {projects.filter(p => p.achievements?.length > 0).map(p => (
            <div key={p.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-yellow-400" /> {p.name}
              </h3>
              <AchievementList achievements={p.achievements} />
            </div>
          ))}
          {projects.every(p => !p.achievements?.length) && (
            <div className="text-center py-12 text-gray-500">
              <Trophy size={32} className="mx-auto mb-3 opacity-30" />
              <p>No achievements yet. Keep building!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Lines Changed (14 days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={commitHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="linesAdded"   fill="#10B981" name="Lines Added"   radius={[2,2,0,0]} />
                <Bar dataKey="linesRemoved" fill="#EF4444" name="Lines Removed" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
