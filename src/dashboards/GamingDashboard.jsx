// File: GamingDashboard.jsx | Date: 2026-06-16 | Nexus AI Pro

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import {
  Gamepad2, Trophy, Star, Zap, Monitor, Smartphone, Layers, Link, Check,
  Clock, Activity, Target, Award, Globe, Users, Cpu
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_GAME_PROJECTS = [
  {
    id: 'g1', name: 'Quantum Breach', engine: 'Unreal Engine', phase: 'Beta',
    progress: 72, genre: 'FPS', platforms: ['PC', 'PS5', 'Xbox Series X'],
    builds: {
      'PS5': 'passing', 'Xbox Series X': 'passing', 'PC': 'failing', 'Switch': 'pending', 'Mobile': 'pending',
    },
    stats: { targetFps: 60, polyCount: '2.4M', textureMem: '8 GB', drawCalls: 1200 },
  },
  {
    id: 'g2', name: 'Pixel Realm', engine: 'Godot', phase: 'Production',
    progress: 45, genre: 'RPG', platforms: ['Web', 'Windows', 'macOS'],
    builds: {
      'PS5': 'pending', 'Xbox Series X': 'pending', 'PC': 'passing', 'Switch': 'pending', 'Mobile': 'pending',
    },
    stats: { targetFps: 60, polyCount: '120K', textureMem: '512 MB', drawCalls: 280 },
  },
  {
    id: 'g3', name: 'AR Garden', engine: 'Unity', phase: 'Alpha',
    progress: 28, genre: 'AR/VR', platforms: ['iOS', 'Android', 'Meta Quest'],
    builds: {
      'PS5': 'pending', 'Xbox Series X': 'pending', 'PC': 'pending', 'Switch': 'pending', 'Mobile': 'passing',
    },
    stats: { targetFps: 90, polyCount: '450K', textureMem: '2 GB', drawCalls: 600 },
    framework: 'Unity XR',
    headsets: ['Meta Quest', 'Apple Vision Pro'],
  },
];

const MOCK_ACHIEVEMENTS = [
  { id: 'a1', icon: '🏆', name: 'First Deploy',      desc: 'Deploy your first game build',    rarity: 'Common',    points: 50,  unlocked: true,  unlockedAt: '2026-03-15', progress: 100 },
  { id: 'a2', icon: '💎', name: 'Diamond Developer', desc: 'Ship 3 completed games',           rarity: 'Legendary', points: 500, unlocked: false, progress: 33 },
  { id: 'a3', icon: '⚡', name: 'Speed Coder',       desc: '1000 commits in a month',          rarity: 'Epic',      points: 250, unlocked: false, progress: 67 },
  { id: 'a4', icon: '🎯', name: 'Bug Hunter',        desc: 'Resolve 100 critical bugs',        rarity: 'Rare',      points: 150, unlocked: true,  unlockedAt: '2026-05-02', progress: 100 },
  { id: 'a5', icon: '🌍', name: 'Platform Master',   desc: 'Ship on 5+ platforms',             rarity: 'Epic',      points: 300, unlocked: false, progress: 40 },
  { id: 'a6', icon: '🔥', name: 'Hot Streak',        desc: '30 day coding streak',             rarity: 'Rare',      points: 100, unlocked: true,  unlockedAt: '2026-06-01', progress: 100 },
];

const MOCK_PLATFORMS = [
  { id: 'epic',     name: 'Epic Games',          icon: '🎮', connected: true,  lastSync: '2026-06-16T09:00:00Z', games: 12 },
  { id: 'steam',    name: 'Steam',               icon: '💨', connected: true,  lastSync: '2026-06-15T18:00:00Z', games: 48 },
  { id: 'psn',      name: 'PlayStation Network', icon: '🎮', connected: false, lastSync: null, games: 0 },
  { id: 'xbox',     name: 'Xbox Live',           icon: '🟢', connected: false, lastSync: null, games: 0 },
  { id: 'nintendo', name: 'Nintendo',            icon: '🔴', connected: false, lastSync: null, games: 0 },
  { id: 'ubisoft',  name: 'Ubisoft Connect',     icon: '🔷', connected: false, lastSync: null, games: 0 },
];

const MOCK_LEADERBOARD = [
  { rank: 1, user: 'ProGamer99',   score: 98420, country: '🇺🇸' },
  { rank: 2, user: 'NexusPlayer',  score: 87300, country: '🇬🇧' },
  { rank: 3, user: 'you',          score: 72150, country: '🇺🇸', isMe: true },
  { rank: 4, user: 'SpeedRunner',  score: 68900, country: '🇩🇪' },
  { rank: 5, user: 'ArcadeKing',   score: 61200, country: '🇯🇵' },
];

const MOCK_STATS = [
  { game: 'Quantum Breach', playtime: '124h 32m', level: 42, completion: 78, highScore: 1_204_500 },
  { game: 'Pixel Realm',    playtime: '67h 10m',  level: 28, completion: 45, highScore: 430_200 },
  { game: 'AR Garden',      playtime: '12h 05m',  level: 8,  completion: 20, highScore: 89_000 },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'projects',    label: 'Game Projects',       icon: Gamepad2 },
  { id: 'platforms',   label: 'Platform Connections', icon: Link },
  { id: 'achievements',label: 'Achievements',         icon: Trophy },
  { id: 'statistics',  label: 'Statistics',           icon: Activity },
  { id: 'arvr',        label: 'AR/VR Tracker',        icon: Layers },
];

const ENGINE_STYLES = {
  'Unreal Engine': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Unity':         'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  'Godot':         'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'GameMaker':     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const PHASE_STYLES = {
  'Pre-Alpha': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  'Alpha':     'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
  'Beta':      'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Production':'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Released':  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

const RARITY_STYLES = {
  Common:    'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  Rare:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Epic:      'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Legendary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700/40 dark:text-yellow-200',
};

const BUILD_PLATFORM_ORDER = ['PS5', 'Xbox Series X', 'PC', 'Switch', 'Mobile'];

const BUILD_DOT = {
  passing: 'bg-green-500',
  failing: 'bg-red-500',
  pending: 'bg-gray-400 dark:bg-gray-600',
};

const ALL_HEADSETS = [
  { name: 'Meta Quest',       check: (g) => g.headsets?.includes('Meta Quest') },
  { name: 'Apple Vision Pro', check: (g) => g.headsets?.includes('Apple Vision Pro') },
  { name: 'PlayStation VR',   check: (_) => false },
  { name: 'Valve Index',      check: (_) => false },
  { name: 'HTC Vive',         check: (_) => false },
  { name: 'Pico',             check: (_) => false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSync(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function totalAchievementPoints(list) {
  return list.filter(a => a.unlocked).reduce((acc, a) => acc + a.points, 0);
}

function rankLabel(points) {
  if (points >= 1000) return 'Platinum I';
  if (points >= 600)  return 'Gold IV';
  if (points >= 300)  return 'Silver II';
  return 'Bronze III';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressCircle({ pct, size = 56, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-200 dark:text-gray-700" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round"
        className="text-indigo-500 transition-all duration-700"
      />
    </svg>
  );
}

function BuildMatrix({ builds }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {BUILD_PLATFORM_ORDER.map(plat => {
        const status = builds[plat] ?? 'pending';
        return (
          <div key={plat} className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${BUILD_DOT[status]}`} />
            {plat}
          </div>
        );
      })}
    </div>
  );
}

function GameProjectCard({ project, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all hover:shadow-md ${
        selected
          ? 'border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-300 dark:ring-indigo-700'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="p-4">
        {/* Engine + Phase */}
        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ENGINE_STYLES[project.engine] ?? 'bg-gray-100 text-gray-600'}`}>
            {project.engine}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PHASE_STYLES[project.phase] ?? 'bg-gray-100 text-gray-600'}`}>
            {project.phase}
          </span>
        </div>

        {/* Name + Progress Circle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{project.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{project.genre}</p>
          </div>
          <div className="relative flex-shrink-0">
            <ProgressCircle pct={project.progress} size={48} stroke={4} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700 dark:text-gray-200 rotate-90">
              {project.progress}%
            </span>
          </div>
        </div>

        {/* Platforms */}
        <div className="flex flex-wrap gap-1 mt-2">
          {project.platforms.map(p => (
            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
              {p}
            </span>
          ))}
        </div>

        {/* Build matrix */}
        <BuildMatrix builds={project.builds} />

        {/* AR/VR note */}
        {project.framework && (
          <div className="mt-2 text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {project.framework}
            {project.headsets && ` · ${project.headsets.join(', ')}`}
          </div>
        )}
      </div>
    </button>
  );
}

function PlatformCard({ platform, onToggle, loading }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{platform.icon}</span>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{platform.name}</p>
            {platform.connected ? (
              <p className="text-[11px] text-gray-400">
                {platform.games} game{platform.games !== 1 ? 's' : ''} synced
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">Not connected</p>
            )}
          </div>
        </div>
        {platform.connected ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
            <Check className="w-3 h-3" /> Connected
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            Disconnected
          </span>
        )}
      </div>

      {platform.connected && platform.lastSync && (
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last sync: {formatSync(platform.lastSync)}
        </p>
      )}

      <button
        onClick={() => onToggle(platform)}
        disabled={loading === platform.id}
        className={`w-full mt-auto py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
          platform.connected
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-700'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        {loading === platform.id ? (
          <span className="flex items-center justify-center gap-1.5">
            <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            {platform.connected ? 'Disconnecting…' : 'Connecting…'}
          </span>
        ) : platform.connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}

function AchievementCard({ achievement }) {
  const isUnlocked = achievement.unlocked;
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2 transition-all ${isUnlocked ? '' : 'opacity-80'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl">{achievement.icon}</span>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${RARITY_STYLES[achievement.rarity] ?? 'bg-gray-100 text-gray-600'}`}>
            {achievement.rarity}
          </span>
          <span className="text-xs font-bold text-yellow-500 flex items-center gap-0.5">
            <Star className="w-3 h-3" />
            {achievement.points} pts
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{achievement.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{achievement.desc}</p>
      </div>

      {isUnlocked ? (
        <div className="flex items-center gap-1.5 mt-auto">
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span className="text-[11px] text-green-600 dark:text-green-400 font-semibold">
            Unlocked {achievement.unlockedAt}
          </span>
        </div>
      ) : (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-400">Progress</span>
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">{achievement.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${achievement.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab views
// ---------------------------------------------------------------------------

function GameProjectsTab({ projects, selected, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map(p => (
        <GameProjectCard
          key={p.id}
          project={p}
          selected={selected?.id === p.id}
          onClick={() => onSelect(p)}
        />
      ))}
    </div>
  );
}

function PlatformConnectionsTab({ platforms, onPlatformsChange }) {
  const [loadingId, setLoadingId] = useState(null);

  async function handleToggle(platform) {
    setLoadingId(platform.id);
    const action = platform.connected ? 'disconnect' : 'connect';
    try {
      const res = await fetch(`/api/gaming/platforms/${platform.id}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onPlatformsChange(prev => prev.map(p => p.id === platform.id ? { ...p, ...updated } : p));
    } catch {
      // Optimistic toggle
      onPlatformsChange(prev => prev.map(p =>
        p.id === platform.id
          ? { ...p, connected: !p.connected, lastSync: !p.connected ? new Date().toISOString() : null, games: !p.connected ? Math.floor(Math.random() * 30) + 1 : 0 }
          : p
      ));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {platforms.map(plat => (
        <PlatformCard key={plat.id} platform={plat} onToggle={handleToggle} loading={loadingId} />
      ))}
    </div>
  );
}

function AchievementsTab({ achievements }) {
  const [rarityFilter, setRarityFilter] = useState('All');
  const rarities = ['All', 'Common', 'Rare', 'Epic', 'Legendary'];

  const totalPts    = totalAchievementPoints(achievements);
  const unlockedCnt = achievements.filter(a => a.unlocked).length;
  const rank        = rankLabel(totalPts);

  const filtered = achievements.filter(a => rarityFilter === 'All' || a.rarity === rarityFilter);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Points</p>
          <p className="text-2xl font-bold text-yellow-500 flex items-center justify-center gap-1">
            <Star className="w-5 h-5" />
            {totalPts.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Unlocked</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {unlockedCnt}<span className="text-base text-gray-400">/{achievements.length}</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Rank</p>
          <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
            <Award className="w-4 h-4" />
            {rank}
          </p>
        </div>
      </div>

      {/* Rarity filter pills */}
      <div className="flex flex-wrap gap-2">
        {rarities.map(r => (
          <button
            key={r}
            onClick={() => setRarityFilter(r)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              rarityFilter === r
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}

function StatisticsTab({ stats, leaderboard }) {
  return (
    <div className="space-y-6">
      {/* Per-game stats table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Game Statistics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/40">
                <th className="px-5 py-3 text-left">Game</th>
                <th className="px-5 py-3 text-right">Playtime</th>
                <th className="px-5 py-3 text-right">Level</th>
                <th className="px-5 py-3 text-right">Completion</th>
                <th className="px-5 py-3 text-right">High Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{row.game}</td>
                  <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{row.playtime}</td>
                  <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{row.level}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${row.completion}%` }}
                        />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 tabular-nums">{row.completion}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    {row.highScore.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Leaderboard
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {leaderboard.map(row => (
            <div
              key={row.rank}
              className={`flex items-center gap-4 px-5 py-3 transition-colors ${
                row.isMe
                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              {/* Rank badge */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                row.rank === 1 ? 'bg-yellow-400 text-yellow-900'
                : row.rank === 2 ? 'bg-gray-300 text-gray-700 dark:bg-gray-500 dark:text-white'
                : row.rank === 3 ? 'bg-orange-400 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {row.rank}
              </div>

              <span className="text-lg">{row.country}</span>

              <span className={`flex-1 font-semibold text-sm ${row.isMe ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                {row.isMe ? <strong>you (me)</strong> : row.user}
              </span>

              <span className="font-mono font-bold text-sm text-gray-700 dark:text-gray-200 tabular-nums">
                {row.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ARVRTrackerTab({ selectedProject, allProjects }) {
  const project = selectedProject?.genre === 'AR/VR' ? selectedProject : allProjects.find(p => p.genre === 'AR/VR') ?? null;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600 gap-3">
        <Layers className="w-12 h-12 opacity-40" />
        <p className="text-sm font-semibold">No AR/VR project found</p>
        <p className="text-xs">Create a project with AR/VR genre to use this tracker.</p>
      </div>
    );
  }

  const headsetCompat = ALL_HEADSETS.map(h => ({ ...h, supported: h.check(project) }));

  return (
    <div className="space-y-6">
      {/* Project header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{project.name}</h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {project.framework ?? 'No framework set'}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">AR/VR development tracking for headset compatibility and performance metrics.</p>
      </div>

      {/* Headset compatibility grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          Headset Compatibility
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {headsetCompat.map(h => (
            <div
              key={h.name}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
                h.supported
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-400 dark:text-gray-600'
              }`}
            >
              {h.supported
                ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                : <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-400 text-base leading-none">✕</span>
              }
              <span className="truncate">{h.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-teal-400" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-center">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Target FPS</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{project.stats.targetFps}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-center">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Poly Count</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{project.stats.polyCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-center">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Texture Mem</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{project.stats.textureMem}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-center">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Draw Calls</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.stats.drawCalls.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Framework + WebXR link */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 flex items-center gap-3">
          <Layers className="w-8 h-8 text-purple-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Framework in Use</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{project.framework ?? 'Not configured'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 flex items-center gap-3">
          <Globe className="w-8 h-8 text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">WebXR Test</p>
            <a
              href="https://immersive-web.github.io/webxr-samples/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
            >
              Open WebXR Test Environment
              <Link className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GamingDashboard() {
  // Auth & socket (optional)
  let auth = null;
  let socket = null;
  try { auth = useAuth(); } catch {}
  try { socket = useSocket(); } catch {}

  const [activeTab, setActiveTab]                   = useState('projects');
  const [gameProjects, setGameProjects]             = useState([]);
  const [achievements, setAchievements]             = useState([]);
  const [platforms, setPlatforms]                   = useState(MOCK_PLATFORMS);
  const [stats]                                     = useState(MOCK_STATS);
  const [leaderboard]                               = useState(MOCK_LEADERBOARD);
  const [selectedGame, setSelectedGame]             = useState(null);
  const [loading, setLoading]                       = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {};
      if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

      const [projRes, achRes] = await Promise.all([
        fetch('/api/gaming/projects', { headers }),
        fetch('/api/gaming/achievements', { headers }),
      ]);

      if (!projRes.ok || !achRes.ok) throw new Error();

      const [projData, achData] = await Promise.all([projRes.json(), achRes.json()]);
      const projs = Array.isArray(projData) ? projData : (projData.projects ?? MOCK_GAME_PROJECTS);
      const achs  = Array.isArray(achData)  ? achData  : (achData.achievements ?? MOCK_ACHIEVEMENTS);
      setGameProjects(projs);
      setAchievements(achs);
      setSelectedGame(projs[0] ?? null);
    } catch {
      setGameProjects(MOCK_GAME_PROJECTS);
      setAchievements(MOCK_ACHIEVEMENTS);
      setSelectedGame(MOCK_GAME_PROJECTS[0]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Socket
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (data) => {
      setGameProjects(prev => prev.map(p => p.id === data.id ? { ...p, ...data } : p));
    };
    socket.on?.('game:update', onUpdate);
    return () => { socket.off?.('game:update', onUpdate); };
  }, [socket]);

  const totalPts    = totalAchievementPoints(achievements);
  const rank        = rankLabel(totalPts);
  const unlockedCnt = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Top header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                🎮 Gaming Dashboard
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Track your games, achievements, and performance</p>
            </div>
          </div>

          {/* Points + rank */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl px-4 py-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">{totalPts.toLocaleString()} pts</span>
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-xl px-4 py-2">
              <Award className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{rank}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-bold text-gray-700 dark:text-gray-200">{unlockedCnt}</span>/{achievements.length} achievements
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'projects' && (
              <GameProjectsTab
                projects={gameProjects}
                selected={selectedGame}
                onSelect={setSelectedGame}
              />
            )}
            {activeTab === 'platforms' && (
              <PlatformConnectionsTab
                platforms={platforms}
                onPlatformsChange={setPlatforms}
              />
            )}
            {activeTab === 'achievements' && (
              <AchievementsTab achievements={achievements} />
            )}
            {activeTab === 'statistics' && (
              <StatisticsTab stats={stats} leaderboard={leaderboard} />
            )}
            {activeTab === 'arvr' && (
              <ARVRTrackerTab selectedProject={selectedGame} allProjects={gameProjects} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
