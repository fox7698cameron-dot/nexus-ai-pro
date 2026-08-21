/**
 * GameDashboard.jsx
 * Nexus AI Pro — Game Development & Project Tracking Dashboard
 * Connectors: Unreal/Epic Games, Sony PlayStation, Microsoft Xbox, Ubisoft Connect
 * Features: Achievement tracking, game progress, AR/VR/3D project tracking
 * Multi-platform: Linux, Windows, macOS, iOS, Electron, Desktop, Mobile, Tablet
 * Updated: 2026-08-21
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Star, Zap, Target, Shield,
  Play, Pause, Square, GitBranch, Code, Box,
  Layers, Monitor, Smartphone, Globe, Cpu,
  BarChart3, TrendingUp, Clock, Users, Activity,
  CheckCircle, AlertTriangle, RefreshCw, Plus,
  ArrowRight, Eye, Lock, Unlock, Award
} from 'lucide-react';

// ─── Platform connectors ──────────────────────────────────────────────────────
const GAME_PLATFORMS = {
  epic_unreal: {
    name: 'Unreal / Epic Games',
    icon: '⚡',
    color: '#2563eb',
    engineVersions: ['UE 5.4', 'UE 5.3', 'UE 4.27'],
    features: ['Blueprint Visual Scripting', 'Nanite Geometry', 'Lumen GI', 'MetaSounds', 'Chaos Physics'],
    achievementSupport: true,
    cloudSaves: true,
    storeConnect: 'Epic Games Store',
  },
  sony_playstation: {
    name: 'Sony PlayStation',
    icon: '🎮',
    color: '#003087',
    platforms: ['PS5', 'PS4', 'PSVR2', 'PSN'],
    features: ['Trophy System', 'Share Play', 'PSN Cloud Saves', 'DualSense Haptics', 'PSVR2 Headset'],
    achievementSupport: true,
    trophyTypes: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    cloudSaves: true,
  },
  microsoft_xbox: {
    name: 'Microsoft Xbox',
    icon: '🟢',
    color: '#107C10',
    platforms: ['Xbox Series X/S', 'Xbox One', 'Windows PC', 'Xbox Cloud'],
    features: ['Achievement Points', 'Xbox Live', 'Game Pass', 'DirectX 12 Ultimate', 'Smart Delivery'],
    achievementSupport: true,
    cloudSaves: true,
    storeConnect: 'Xbox Marketplace',
  },
  ubisoft: {
    name: 'Ubisoft Connect',
    icon: '🔷',
    color: '#0070d1',
    platforms: ['PC', 'PlayStation', 'Xbox', 'Luna', 'Stadia'],
    features: ['Ubisoft Points', 'Club Challenges', 'Rewards', 'Cross-play', 'Cloud Saves'],
    achievementSupport: true,
    cloudSaves: true,
    storeConnect: 'Ubisoft Store',
  },
};

// ─── Project types ────────────────────────────────────────────────────────────
const PROJECT_TYPES = {
  game_2d: { label: '2D Game', icon: '🕹️', color: 'blue' },
  game_3d: { label: '3D Game', icon: '🎲', color: 'purple' },
  vr: { label: 'VR Experience', icon: '🥽', color: 'teal' },
  ar: { label: 'AR Application', icon: '📱', color: 'orange' },
  mixed_reality: { label: 'Mixed Reality', icon: '🌐', color: 'indigo' },
  app_mobile: { label: 'Mobile App', icon: '📲', color: 'green' },
  app_desktop: { label: 'Desktop App', icon: '🖥️', color: 'gray' },
  multiplayer: { label: 'Multiplayer', icon: '👥', color: 'red' },
  simulation: { label: 'Simulation', icon: '🔬', color: 'yellow' },
};

// ─── Mock achievement data ────────────────────────────────────────────────────
const generateAchievements = (platform) => {
  const pools = {
    epic_unreal: [
      { id: 'ue_first_blueprint', name: 'Blueprint Architect', desc: 'Create your first Blueprint', points: 10, unlocked: true, rarity: 'Common', icon: '🔵' },
      { id: 'ue_nanite_master', name: 'Nanite Virtuoso', desc: 'Use Nanite on 1M+ polygons', points: 25, unlocked: true, rarity: 'Rare', icon: '💠' },
      { id: 'ue_lumen_guru', name: 'Lumen Guru', desc: 'Achieve 60fps with full Lumen GI', points: 50, unlocked: false, rarity: 'Epic', icon: '✨' },
      { id: 'ue_published', name: 'Published Creator', desc: 'Publish to Epic Games Store', points: 100, unlocked: false, rarity: 'Legendary', icon: '👑' },
    ],
    sony_playstation: [
      { id: 'ps_first_trophy', name: 'First Blood', desc: 'Earn your first trophy', points: 15, unlocked: true, rarity: 'Bronze', icon: '🥉' },
      { id: 'ps_online_play', name: 'Connected', desc: 'Play online with PSN', points: 30, unlocked: true, rarity: 'Silver', icon: '🥈' },
      { id: 'ps_psvr2', name: 'VR Pioneer', desc: 'Complete a PSVR2 session', points: 75, unlocked: false, rarity: 'Gold', icon: '🥇' },
      { id: 'ps_platinum', name: 'True Champion', desc: 'Earn all trophies', points: 200, unlocked: false, rarity: 'Platinum', icon: '🏆' },
    ],
    microsoft_xbox: [
      { id: 'xb_first_achievement', name: 'Achieved!', desc: 'Unlock your first achievement', points: 10, unlocked: true, rarity: 'Common', icon: '⭐' },
      { id: 'xb_gamepass', name: 'Pass Holder', desc: 'Play via Game Pass', points: 20, unlocked: true, rarity: 'Common', icon: '🎫' },
      { id: 'xb_directx', name: 'Ray Tracer', desc: 'Enable DXR ray tracing', points: 60, unlocked: false, rarity: 'Rare', icon: '💡' },
      { id: 'xb_cloud', name: 'Cloud Gamer', desc: 'Stream from Xbox Cloud', points: 40, unlocked: true, rarity: 'Uncommon', icon: '☁️' },
    ],
    ubisoft: [
      { id: 'ubi_units', name: 'Point Collector', desc: 'Earn 1000 Ubisoft Points', points: 20, unlocked: true, rarity: 'Common', icon: '🔷' },
      { id: 'ubi_challenge', name: 'Challenger', desc: 'Complete 10 Club Challenges', points: 50, unlocked: false, rarity: 'Rare', icon: '🎯' },
      { id: 'ubi_crossplay', name: 'Cross-Platform', desc: 'Play on 3+ platforms', points: 75, unlocked: false, rarity: 'Epic', icon: '🔗' },
    ],
  };
  return pools[platform] || [];
};

// ─── Mock project data ────────────────────────────────────────────────────────
const DEMO_PROJECTS = [
  {
    id: 'proj_1', name: 'Shadow Realm VR', type: 'vr', platform: 'epic_unreal',
    engine: 'UE 5.4', language: 'C++/Blueprint', progress: 68,
    status: 'active', team: 4, commits: 842, openIssues: 12,
    lastCommit: Date.now() - 3_600_000, milestones: [
      { name: 'Alpha', done: true }, { name: 'Beta', done: true },
      { name: 'RC', done: false }, { name: 'Release', done: false },
    ],
    metrics: { fps: 72, polyCount: 2_400_000, buildSize: '4.2 GB', testPass: 94 },
  },
  {
    id: 'proj_2', name: 'City Builder 3D', type: 'game_3d', platform: 'microsoft_xbox',
    engine: 'Unity 6', language: 'C#', progress: 41,
    status: 'active', team: 7, commits: 1_204, openIssues: 28,
    lastCommit: Date.now() - 7_200_000, milestones: [
      { name: 'Prototype', done: true }, { name: 'Alpha', done: false },
      { name: 'Beta', done: false }, { name: 'Release', done: false },
    ],
    metrics: { fps: 60, polyCount: 1_800_000, buildSize: '2.1 GB', testPass: 81 },
  },
  {
    id: 'proj_3', name: 'AR Street Art', type: 'ar', platform: 'sony_playstation',
    engine: 'ARCore/ARKit', language: 'Swift/Kotlin', progress: 85,
    status: 'review', team: 2, commits: 367, openIssues: 3,
    lastCommit: Date.now() - 900_000, milestones: [
      { name: 'MVP', done: true }, { name: 'Beta', done: true },
      { name: 'QA', done: true }, { name: 'Launch', done: false },
    ],
    metrics: { fps: 60, polyCount: 450_000, buildSize: '380 MB', testPass: 98 },
  },
];

// ─── Achievement badge ────────────────────────────────────────────────────────
const AchievementBadge = ({ achievement }) => {
  const rarityColors = {
    Common: 'border-gray-500 bg-gray-800',
    Uncommon: 'border-green-500 bg-green-900/30',
    Rare: 'border-blue-500 bg-blue-900/30',
    Epic: 'border-purple-500 bg-purple-900/30',
    Legendary: 'border-yellow-500 bg-yellow-900/30',
    Bronze: 'border-amber-700 bg-amber-900/30',
    Silver: 'border-gray-400 bg-gray-700/30',
    Gold: 'border-yellow-400 bg-yellow-800/30',
    Platinum: 'border-cyan-400 bg-cyan-900/30',
  };
  const rarity = achievement.rarity || 'Common';

  return (
    <div
      className={`border ${rarityColors[rarity] || 'border-gray-600 bg-gray-800'} rounded-xl p-3 flex gap-3 items-center transition-all ${
        achievement.unlocked ? 'opacity-100' : 'opacity-40 grayscale'
      }`}
    >
      <span className="text-2xl">{achievement.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{achievement.name}</p>
        <p className="text-gray-400 text-xs truncate">{achievement.desc}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            achievement.unlocked ? 'bg-emerald-900/60 text-emerald-400' : 'bg-gray-700 text-gray-500'
          }`}>
            {achievement.unlocked ? '✓ Unlocked' : 'Locked'}
          </span>
          <span className="text-xs text-gray-500">{rarity}</span>
          <span className="text-xs text-yellow-400">+{achievement.points}pts</span>
        </div>
      </div>
    </div>
  );
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max = 100, color = 'bg-purple-500', label }) => (
  <div>
    {label && <div className="flex justify-between text-xs text-gray-400 mb-1">
      <span>{label}</span>
      <span>{value}%</span>
    </div>}
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  </div>
);

// ─── ProjectCard ──────────────────────────────────────────────────────────────
const ProjectCard = ({ project }) => {
  const [expanded, setExpanded] = useState(false);
  const ptCfg = PROJECT_TYPES[project.type] || {};
  const platCfg = GAME_PLATFORMS[project.platform] || {};
  const achievements = generateAchievements(project.platform);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const statusColors = {
    active: 'text-emerald-400 bg-emerald-900/30',
    review: 'text-yellow-400 bg-yellow-900/30',
    paused: 'text-gray-400 bg-gray-700',
    released: 'text-blue-400 bg-blue-900/30',
  };

  return (
    <div className="bg-gray-800/70 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Card header */}
      <div
        className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{ptCfg.icon}</span>
            <div>
              <h3 className="font-bold text-white text-lg">{project.name}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{project.engine}</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{project.language}</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                  {platCfg.icon} {platCfg.name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${statusColors[project.status] || 'text-gray-400 bg-gray-700'}`}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
            <span className="text-xs text-gray-400">{project.team} members</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <ProgressBar value={project.progress} label="Overall Progress" color="bg-purple-500" />
        </div>

        {/* Milestones */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {project.milestones.map((ms) => (
            <span
              key={ms.name}
              className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                ms.done ? 'bg-emerald-900/60 text-emerald-400' : 'bg-gray-700 text-gray-400'
              }`}
            >
              {ms.done ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {ms.name}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-700 p-5 space-y-5">
          {/* Tech metrics */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Technical Metrics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(project.metrics).map(([k, v]) => (
                <div key={k} className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-white font-bold mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dev stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900/50 rounded-xl p-3 text-center">
              <GitBranch className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-white font-bold">{project.commits.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Commits</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-3 text-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-white font-bold">{project.openIssues}</p>
              <p className="text-xs text-gray-500">Open Issues</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-3 text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-white font-bold">{unlockedCount}/{achievements.length}</p>
              <p className="text-xs text-gray-500">Achievements</p>
            </div>
          </div>

          {/* Test pass rate */}
          <ProgressBar value={project.metrics.testPass} label="Test Pass Rate" color="bg-emerald-500" />

          {/* Achievements */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" /> Achievements
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {achievements.map((a) => (
                <AchievementBadge key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Platform connector panel ─────────────────────────────────────────────────
const ConnectorPanel = ({ platformKey }) => {
  const cfg = GAME_PLATFORMS[platformKey];
  const [connected, setConnected] = useState(false);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{cfg.icon}</span>
        <div>
          <p className="font-semibold text-white">{cfg.name}</p>
          <p className="text-xs text-gray-400">
            {cfg.platforms ? cfg.platforms.slice(0, 3).join(' · ') : cfg.storeConnect}
          </p>
        </div>
      </div>
      <button
        onClick={() => setConnected(!connected)}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          connected
            ? 'bg-emerald-700 text-emerald-100 hover:bg-emerald-800'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        {connected ? '● Connected' : 'Connect'}
      </button>
    </div>
  );
};

// ─── Main dashboard ───────────────────────────────────────────────────────────
const GameDashboard = () => {
  const [tab, setTab] = useState('projects'); // projects | achievements | connectors
  const [projects] = useState(DEMO_PROJECTS);

  const tabs = [
    { key: 'projects', label: 'Projects', icon: Code },
    { key: 'achievements', label: 'Achievements', icon: Trophy },
    { key: 'connectors', label: 'Connectors', icon: Zap },
  ];

  const allAchievements = Object.keys(GAME_PLATFORMS).flatMap((p) =>
    generateAchievements(p).map((a) => ({ ...a, platform: p }))
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-purple-400" />
            Game Dev Tracker
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Unreal · PlayStation · Xbox · Ubisoft · AR/VR/3D
          </p>
        </div>
        <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Projects tab */}
      {tab === 'projects' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Active Projects', value: projects.filter((p) => p.status === 'active').length, icon: Activity, color: 'text-emerald-400' },
              { label: 'Avg Progress', value: `${Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)}%`, icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Total Commits', value: projects.reduce((s, p) => s + p.commits, 0).toLocaleString(), icon: GitBranch, color: 'text-purple-400' },
              { label: 'Open Issues', value: projects.reduce((s, p) => s + p.openIssues, 0), icon: AlertTriangle, color: 'text-yellow-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
                <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
                <p className="text-white font-bold text-xl">{value}</p>
                <p className="text-gray-400 text-xs">{label}</p>
              </div>
            ))}
          </div>
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {/* Achievements tab */}
      {tab === 'achievements' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400 text-sm">
              {allAchievements.filter((a) => a.unlocked).length} / {allAchievements.length} unlocked
            </p>
            <p className="text-yellow-400 font-bold text-sm">
              {allAchievements.filter((a) => a.unlocked).reduce((s, a) => s + a.points, 0)} pts total
            </p>
          </div>
          {Object.keys(GAME_PLATFORMS).map((pk) => {
            const achs = generateAchievements(pk);
            if (!achs.length) return null;
            return (
              <div key={pk} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <span>{GAME_PLATFORMS[pk].icon}</span> {GAME_PLATFORMS[pk].name}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {achs.map((a) => <AchievementBadge key={a.id} achievement={a} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connectors tab */}
      {tab === 'connectors' && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm mb-4">
            Connect your game development and publishing platforms to sync data, track achievements, and manage cloud saves.
          </p>
          {Object.keys(GAME_PLATFORMS).map((pk) => (
            <ConnectorPanel key={pk} platformKey={pk} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GameDashboard;
