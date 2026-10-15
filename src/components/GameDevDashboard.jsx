// GameDevDashboard.jsx | Nexus AI Pro | Created: 2026-10-15 | Game Development Tracking

import React, { useState, useEffect } from 'react';
import {
  Gamepad2, Cpu, Box, Layers, Trophy, CheckCircle,
  Circle, Play, Pause, AlertCircle, Clock, Monitor,
  Smartphone, Globe, Rocket, Activity, RefreshCw,
  ChevronRight, Star, Lock, Hammer, Wrench
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const BUILD_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  BUILDING: 'building',
  PENDING: 'pending'
};

const DEPLOY_TARGETS = [
  { id: 'pc', label: 'PC', icon: Monitor },
  { id: 'console', label: 'Console', icon: Gamepad2 },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'vr', label: 'VR', icon: Globe }
];

const CONNECTORS = [
  { id: 'unreal', name: 'Unreal Engine', version: '5.3', connected: true, color: 'text-blue-400' },
  { id: 'epic', name: 'Epic Games', version: '15.x', connected: true, color: 'text-purple-400' },
  { id: 'sony', name: 'Sony PlayStation', version: 'PS5 SDK 8.0', connected: false, color: 'text-blue-300' },
  { id: 'xbox', name: 'Microsoft Xbox', version: 'GDK 2024', connected: true, color: 'text-green-400' },
  { id: 'ubisoft', name: 'Ubisoft Connect', version: '2.14', connected: false, color: 'text-orange-400' }
];

const SAMPLE_PROJECTS = [
  {
    id: 'game1',
    name: 'Project Nexus: Origins',
    type: 'game',
    status: 'active',
    engine: 'Unreal Engine 5',
    progress: 68,
    buildStatus: BUILD_STATUS.SUCCESS,
    targets: ['pc', 'console'],
    milestones: [
      { name: 'Core Mechanics', done: true },
      { name: 'Level Design — Act 1', done: true },
      { name: 'Level Design — Act 2', done: false },
      { name: 'Multiplayer Integration', done: false },
      { name: 'Beta Testing', done: false }
    ],
    lastBuild: '2026-10-14 22:14',
    team: ['CF', 'AJ', 'SR', 'ML']
  },
  {
    id: 'ar1',
    name: 'AR City Explorer',
    type: 'ar',
    status: 'active',
    engine: 'Unity + ARKit/ARCore',
    progress: 42,
    buildStatus: BUILD_STATUS.BUILDING,
    targets: ['mobile'],
    milestones: [
      { name: 'AR Marker Detection', done: true },
      { name: 'City Layer Rendering', done: true },
      { name: 'User Interactions', done: false },
      { name: 'POI Database', done: false }
    ],
    lastBuild: '2026-10-15 08:30',
    team: ['CF', 'TK']
  },
  {
    id: 'vr1',
    name: 'VR Training Sim',
    type: 'vr',
    status: 'paused',
    engine: 'Unreal Engine 5 + OpenXR',
    progress: 25,
    buildStatus: BUILD_STATUS.FAILED,
    targets: ['vr', 'pc'],
    milestones: [
      { name: 'Environment Setup', done: true },
      { name: 'Hand Tracking', done: false },
      { name: 'Physics Module', done: false },
      { name: 'Scenario Library', done: false }
    ],
    lastBuild: '2026-10-13 16:45',
    team: ['SR', 'ML', 'PW']
  },
  {
    id: '3d1',
    name: '3D Asset Pipeline',
    type: '3d',
    status: 'completed',
    engine: 'Blender / Houdini',
    progress: 100,
    buildStatus: BUILD_STATUS.SUCCESS,
    targets: ['pc', 'console', 'mobile'],
    milestones: [
      { name: 'Modeling Standards', done: true },
      { name: 'Rig Library', done: true },
      { name: 'Texture Atlas', done: true },
      { name: 'LOD Generation', done: true }
    ],
    lastBuild: '2026-10-12 11:00',
    team: ['AJ', 'GR']
  }
];

const SAMPLE_ACHIEVEMENTS = [
  { id: 'a1', name: 'First Commit', desc: 'Repository initialized', unlocked: true, icon: '🚀' },
  { id: 'a2', name: 'Alpha Build', desc: 'First playable build shipped', unlocked: true, icon: '🎮' },
  { id: 'a3', name: 'Multiplayer Ready', desc: 'Online play stable', unlocked: true, icon: '🌐' },
  { id: 'a4', name: 'Cross-Platform', desc: 'Deploy on 3+ platforms', unlocked: false, icon: '🏆' },
  { id: 'a5', name: '100K Players', desc: 'Reach 100,000 active players', unlocked: false, icon: '👥' },
  { id: 'a6', name: 'Console Gold', desc: 'Pass console certification', unlocked: false, icon: '🥇' }
];

// ============================================
// HELPERS
// ============================================

function statusColor(status) {
  switch (status) {
    case 'active': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
    case 'paused': return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400';
    case 'completed': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400';
    case 'archived': return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}

function buildStatusBadge(status) {
  switch (status) {
    case BUILD_STATUS.SUCCESS:
      return <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle size={12} /> Success</span>;
    case BUILD_STATUS.FAILED:
      return <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle size={12} /> Failed</span>;
    case BUILD_STATUS.BUILDING:
      return <span className="flex items-center gap-1 text-xs text-blue-500 animate-pulse"><RefreshCw size={12} className="animate-spin" /> Building</span>;
    default:
      return <span className="flex items-center gap-1 text-xs text-gray-400"><Circle size={12} /> Pending</span>;
  }
}

function projectTypeIcon(type) {
  switch (type) {
    case 'game': return <Gamepad2 size={16} />;
    case 'ar': return <Layers size={16} />;
    case 'vr': return <Globe size={16} />;
    case '3d': return <Box size={16} />;
    default: return <Cpu size={16} />;
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * @param {{ project: object }} props
 */
function ProjectCard({ project }) {
  const [expanded, setExpanded] = useState(false);
  const doneMilestones = project.milestones.filter(m => m.done).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">{projectTypeIcon(project.type)}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(project.status)}`}>
            {project.status}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{project.engine}</p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Deploy targets */}
        <div className="flex items-center gap-2 mb-3">
          {DEPLOY_TARGETS.map(t => {
            const Icon = t.icon;
            const active = project.targets.includes(t.id);
            return (
              <span
                key={t.id}
                title={t.label}
                className={`p-1 rounded ${active ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}
              >
                <Icon size={14} />
              </span>
            );
          })}
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            Build: {project.lastBuild}
          </span>
        </div>

        {/* Build status */}
        <div className="flex items-center justify-between">
          {buildStatusBadge(project.buildStatus)}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            Milestones {doneMilestones}/{project.milestones.length}
            <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Milestones expanded */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-700/30">
          <ul className="space-y-2">
            {project.milestones.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                {m.done
                  ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  : <Circle size={14} className="text-gray-400 flex-shrink-0" />}
                <span className={m.done ? 'text-gray-600 dark:text-gray-300 line-through' : 'text-gray-800 dark:text-gray-200'}>
                  {m.name}
                </span>
              </li>
            ))}
          </ul>
          {/* Team avatars */}
          <div className="flex items-center gap-1 mt-3">
            {project.team.map((member, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold"
                title={member}
              >
                {member[0]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @param {{ achievement: object }} props
 */
function AchievementBadge({ achievement }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      achievement.unlocked
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
        : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-50'
    }`}>
      <span className="text-2xl">{achievement.unlocked ? achievement.icon : '🔒'}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{achievement.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{achievement.desc}</p>
      </div>
      {achievement.unlocked && <Trophy size={14} className="ml-auto text-yellow-500" />}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * GameDevDashboard — game / AR / VR / 3D project tracking
 * @param {{ className?: string }} props
 */
export default function GameDevDashboard({ className = '' }) {
  const [activeTab, setActiveTab] = useState('projects');
  const [buildQueue, setBuildQueue] = useState([]);

  // Simulate a new build arriving
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuildQueue([{ id: 'build-live', name: 'Project Nexus: Origins', status: BUILD_STATUS.BUILDING }]);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const activeProjects = SAMPLE_PROJECTS.filter(p => p.status === 'active').length;
  const unlockedAchievements = SAMPLE_ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gamepad2 className="text-purple-500" size={24} />
            Game Dev Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeProjects} active projects · {unlockedAchievements}/{SAMPLE_ACHIEVEMENTS.length} achievements
          </p>
        </div>

        {buildQueue.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-400">
            <RefreshCw size={12} className="animate-spin" />
            Build in progress: {buildQueue[0].name}
          </div>
        )}
      </div>

      {/* Connector status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          Platform Connectors
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CONNECTORS.map(c => (
            <div key={c.id} className="flex flex-col gap-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${c.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className={`text-xs font-medium ${c.color}`}>{c.name}</span>
              </div>
              <span className="text-xs text-gray-400">{c.version}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'projects', label: 'Projects', icon: Layers },
          { id: 'achievements', label: 'Achievements', icon: Trophy }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {SAMPLE_PROJECTS.map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SAMPLE_ACHIEVEMENTS.map(a => (
              <AchievementBadge key={a.id} achievement={a} />
            ))}
          </div>
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            <Trophy size={14} className="inline mr-2 text-yellow-500" />
            {unlockedAchievements} of {SAMPLE_ACHIEVEMENTS.length} achievements unlocked
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${(unlockedAchievements / SAMPLE_ACHIEVEMENTS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
