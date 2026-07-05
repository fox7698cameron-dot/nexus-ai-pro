/**
 * src/components/dashboards/GameDevDashboard.jsx
 * Nexus AI Pro — Game Dev & Project Tracking Dashboard
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Game platform connections, achievement tracking, game progress,
 * AR/VR/3D project boards — real-time metrics
 */

import React, { useState, useEffect } from 'react';
import {
  Gamepad2, Trophy, Star, Zap, Box, Layers, Code,
  CheckCircle, AlertTriangle, Link, Unlink, Plus,
  BarChart3, TrendingUp, Clock, Users, Globe,
} from 'lucide-react';

// ─── Platform cards ───────────────────────────────────────────────────────────

const GAME_PLATFORMS = [
  { id: 'epic',    name: 'Epic Games / Unreal', icon: '🎮', color: 'border-blue-500/30 bg-blue-500/5'   },
  { id: 'sony',    name: 'PlayStation Network',  icon: '🎯', color: 'border-blue-600/30 bg-blue-600/5'  },
  { id: 'xbox',    name: 'Xbox Live',            icon: '🟢', color: 'border-green-500/30 bg-green-500/5' },
  { id: 'ubisoft', name: 'Ubisoft Connect',      icon: '🔵', color: 'border-indigo-500/30 bg-indigo-500/5' },
  { id: 'steam',   name: 'Steam',                icon: '🖥️', color: 'border-gray-500/30 bg-gray-500/5'  },
];

const PROJECT_TYPE_META = {
  coding: { icon: <Code size={14} />,     label: 'Coding',      color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  game:   { icon: <Gamepad2 size={14} />, label: 'Game Dev',    color: 'text-green-400',  bg: 'bg-green-400/10'  },
  ar_vr:  { icon: <Box size={14} />,      label: 'AR / VR',     color: 'text-purple-400', bg: 'bg-purple-400/10' },
  '3d':   { icon: <Layers size={14} />,   label: '3D Projects', color: 'text-pink-400',   bg: 'bg-pink-400/10'   },
};

const RARITY_COLORS = {
  legendary: 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10',
  epic:      'text-purple-300 border-purple-400/40 bg-purple-400/10',
  rare:      'text-blue-300   border-blue-400/40   bg-blue-400/10',
  uncommon:  'text-green-300  border-green-400/40  bg-green-400/10',
  common:    'text-gray-300   border-gray-400/40   bg-gray-400/10',
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ACHIEVEMENTS = [
  { id: 'a1',  name: 'First Commit',         icon: '🏆', points: 10,  rarity: 'common',    platform: 'nexus',  unlockedAt: Date.now() - 86400000 },
  { id: 'a2',  name: '100 Commit Streak',    icon: '🔥', points: 50,  rarity: 'rare',      platform: 'nexus',  unlockedAt: Date.now() - 3600000  },
  { id: 'a3',  name: 'Platinum Trophy',      icon: '💎', points: 200, rarity: 'legendary', platform: 'sony',   unlockedAt: Date.now() - 7200000  },
  { id: 'a4',  name: 'Achievement Hunter',   icon: '⭐', points: 30,  rarity: 'uncommon',  platform: 'xbox',   unlockedAt: Date.now() - 10800000 },
  { id: 'a5',  name: 'Epic Creator',         icon: '🚀', points: 75,  rarity: 'epic',      platform: 'epic',   unlockedAt: Date.now() - 14400000 },
  { id: 'a6',  name: 'AR Pioneer',           icon: '🥽', points: 100, rarity: 'rare',      platform: 'nexus',  unlockedAt: Date.now() - 18000000 },
];

const MOCK_PROJECTS = [
  { id: 'p1', name: 'Nexus Battle Royale',      type: 'game',   status: 'active',  engine: 'Unreal 5.4', metrics: { commits: 47, testCoverage: 78, buildStatus: 'passing', openIssues: 3, linesOfCode: 52400 } },
  { id: 'p2', name: 'AR Social Layer',          type: 'ar_vr',  status: 'active',  engine: 'Unity 6',   metrics: { commits: 23, testCoverage: 65, buildStatus: 'passing', openIssues: 7, linesOfCode: 18200 } },
  { id: 'p3', name: 'Nexus 3D Asset Pipeline',  type: '3d',     status: 'active',  engine: 'Blender',   metrics: { commits: 12, testCoverage: 40, buildStatus: 'failing', openIssues: 2, linesOfCode: 9400  } },
  { id: 'p4', name: 'Core AI Engine',           type: 'coding', status: 'active',  engine: 'Node.js',   metrics: { commits: 89, testCoverage: 91, buildStatus: 'passing', openIssues: 1, linesOfCode: 73100 } },
];

const MOCK_GAME_PROGRESS = [
  { gameId: 'nexus-royale', name: 'Nexus Battle Royale', platform: 'epic',  completion: 72, level: 45, hours: 120, achievements: 24 },
  { gameId: 'ghost-world',  name: 'Ghost World VR',      platform: 'sony',  completion: 38, level: 18, hours: 45,  achievements: 9  },
  { gameId: 'cyber-dash',   name: 'Cyber Dash',          platform: 'xbox',  completion: 95, level: 99, hours: 280, achievements: 48 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlatformConnectCard({ platform }) {
  const [connected, setConnected] = useState(false);
  return (
    <div className={`rounded-xl p-4 border flex items-center justify-between ${platform.color}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{platform.icon}</span>
        <div>
          <div className="text-white font-medium text-sm">{platform.name}</div>
          <div className={`text-xs ${connected ? 'text-green-400' : 'text-gray-500'}`}>
            {connected ? 'Connected' : 'Not connected'}
          </div>
        </div>
      </div>
      <button
        onClick={() => setConnected(c => !c)}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          connected
            ? 'border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20'
            : 'border-green-400/30 bg-green-400/10 text-green-400 hover:bg-green-400/20'
        }`}
      >
        {connected ? <><Unlink size={11} />Disconnect</> : <><Link size={11} />Connect</>}
      </button>
    </div>
  );
}

function AchievementCard({ ach }) {
  const rc = RARITY_COLORS[ach.rarity] || RARITY_COLORS.common;
  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${rc}`}>
      <span className="text-2xl flex-shrink-0">{ach.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium text-sm">{ach.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs capitalize">{ach.rarity}</span>
          <span className="text-xs text-gray-400">{ach.points} pts</span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-gray-500">{ach.platform}</span>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  const meta    = PROJECT_TYPE_META[project.type] || PROJECT_TYPE_META.coding;
  const passing = project.metrics.buildStatus === 'passing';
  const pct     = project.metrics.testCoverage;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`${meta.color} ${meta.bg} rounded px-1.5 py-0.5 text-xs flex items-center gap-1`}>
              {meta.icon}{meta.label}
            </span>
            {project.engine && (
              <span className="text-gray-500 text-xs">{project.engine}</span>
            )}
          </div>
          <h3 className="text-white font-medium mt-1">{project.name}</h3>
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
          passing
            ? 'border-green-400/30 bg-green-400/10 text-green-400'
            : 'border-red-400/30 bg-red-400/10 text-red-400'
        }`}>
          {passing ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
          {project.metrics.buildStatus}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Commits</span>
          <span className="text-white">{project.metrics.commits}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Issues</span>
          <span className="text-white">{project.metrics.openIssues}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Lines of code</span>
          <span className="text-white">{(project.metrics.linesOfCode / 1000).toFixed(1)}K</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Coverage</span>
          <span className={pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="mt-2 w-full bg-white/10 rounded-full h-1 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GameProgressRow({ progress }) {
  const pct = progress.completion;
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium text-sm">{progress.name}</div>
        <div className="text-gray-400 text-xs">{progress.platform} · Level {progress.level}</div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-300 flex-shrink-0">
        <span><Trophy size={10} className="inline mr-1" />{progress.achievements}</span>
        <span><Clock size={10} className="inline mr-1" />{progress.hours}h</span>
        <div className="w-20">
          <div className="text-right text-xs mb-0.5">{pct}%</div>
          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GameDevDashboard({ className = '' }) {
  const [tab, setTab] = useState('overview');
  const totalPoints   = MOCK_ACHIEVEMENTS.reduce((s, a) => s + a.points, 0);

  const TABS = ['overview', 'projects', 'achievements', 'progress', 'platforms'];

  return (
    <div className={`flex flex-col gap-4 text-white ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Gamepad2 size={20} /> Game Dev Hub</h2>
          <p className="text-gray-400 text-sm">Projects, achievements, platform connections & progress tracking</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Code size={16} className="text-blue-400" />,    label: 'Active Projects',   value: MOCK_PROJECTS.length },
          { icon: <Trophy size={16} className="text-yellow-400" />, label: 'Achievements',       value: MOCK_ACHIEVEMENTS.length },
          { icon: <Star size={16} className="text-purple-400" />,   label: 'Total Points',       value: totalPoints },
          { icon: <Gamepad2 size={16} className="text-green-400" />,label: 'Games Tracked',      value: MOCK_GAME_PROGRESS.length },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">{icon}</div>
            <div>
              <div className="text-lg font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-300">Recent Projects</h3>
            <div className="space-y-2">
              {MOCK_PROJECTS.slice(0, 2).map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-300">Recent Achievements</h3>
            <div className="space-y-2">
              {MOCK_ACHIEVEMENTS.slice(0, 4).map(a => <AchievementCard key={a.id} ach={a} />)}
            </div>
          </div>
        </div>
      )}

      {tab === 'projects' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {MOCK_PROJECTS.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {tab === 'achievements' && (
        <div>
          <div className="flex items-center justify-between mb-3 text-sm text-gray-400">
            <span>{MOCK_ACHIEVEMENTS.length} achievements · {totalPoints} total points</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {MOCK_ACHIEVEMENTS.map(a => <AchievementCard key={a.id} ach={a} />)}
          </div>
        </div>
      )}

      {tab === 'progress' && (
        <div className="space-y-2">
          {MOCK_GAME_PROGRESS.map(p => <GameProgressRow key={p.gameId} progress={p} />)}
        </div>
      )}

      {tab === 'platforms' && (
        <div className="space-y-2">
          {GAME_PLATFORMS.map(p => <PlatformConnectCard key={p.id} platform={p} />)}
        </div>
      )}
    </div>
  );
}
