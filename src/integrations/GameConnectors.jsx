// src/integrations/GameConnectors.jsx
// Nexus AI Pro — Gaming Platform Connectors + Achievement Tracking
// Updated: 2026-05-03

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Star, Lock, CheckCircle, RefreshCw,
  Plus, Zap, Target, Shield, Sword, Crown, Medal, ChevronRight,
  Activity, Link, Unlink, Settings
} from 'lucide-react';

const PLATFORMS = {
  unreal:    { label: 'Unreal Engine',    icon: '🎮', color: '#0070f3', company: 'Epic Games', category: 'engine', connected: false },
  epic:      { label: 'Epic Games Store', icon: '⚡', color: '#2d2d2d', company: 'Epic Games', category: 'store',  connected: false },
  sony:      { label: 'PlayStation',      icon: '🎮', color: '#003791', company: 'Sony',       category: 'console', connected: false },
  microsoft: { label: 'Xbox / MS',        icon: '🟢', color: '#107c10', company: 'Microsoft',  category: 'console', connected: false },
  ubisoft:   { label: 'Ubisoft Connect',  icon: '🔷', color: '#0033a0', company: 'Ubisoft',    category: 'store',   connected: false },
  steam:     { label: 'Steam',            icon: '🖥️', color: '#1b2838', company: 'Valve',       category: 'store',   connected: false },
};

const ACHIEVEMENT_TIERS = {
  bronze:   { color: '#cd7f32', glow: '#cd7f3240', label: 'Bronze',   icon: <Medal size={14} /> },
  silver:   { color: '#c0c0c0', glow: '#c0c0c040', label: 'Silver',   icon: <Star size={14} /> },
  gold:     { color: '#ffd700', glow: '#ffd70040', label: 'Gold',     icon: <Trophy size={14} /> },
  platinum: { color: '#e5e4e2', glow: '#e5e4e240', label: 'Platinum', icon: <Crown size={14} /> },
  diamond:  { color: '#b9f2ff', glow: '#b9f2ff40', label: 'Diamond',  icon: <Zap size={14} /> },
};

function generateAchievements(platformKey, count = 20) {
  const templates = [
    { name: 'First Blood',        desc: 'Complete your first game',              tier: 'bronze',   xp: 50   },
    { name: 'Code Warrior',       desc: 'Write 1,000 lines of game code',         tier: 'bronze',   xp: 75   },
    { name: 'Level Designer',     desc: 'Create 5 unique levels',                 tier: 'silver',   xp: 150  },
    { name: 'Bug Slayer',         desc: 'Fix 50 bugs in a single session',        tier: 'silver',   xp: 200  },
    { name: 'Optimization King',  desc: 'Achieve 60+ FPS on target hardware',     tier: 'gold',     xp: 400  },
    { name: 'Shader Master',      desc: 'Write 10 custom shaders',               tier: 'gold',     xp: 350  },
    { name: 'Ship It',            desc: 'Publish a game to a platform',          tier: 'platinum', xp: 1000 },
    { name: 'Speedrunner Dev',    desc: 'Ship within 48-hour game jam',           tier: 'platinum', xp: 800  },
    { name: 'Diamond Dev',        desc: '1M+ downloads across all titles',        tier: 'diamond',  xp: 5000 },
    { name: 'Physics God',        desc: 'Zero physics bugs in release build',     tier: 'diamond',  xp: 3000 },
    { name: 'Multiplayer Maestro',desc: 'Ship a multiplayer title',              tier: 'gold',     xp: 600  },
    { name: 'AI Director',        desc: 'Implement adaptive AI difficulty',       tier: 'silver',   xp: 250  },
    { name: 'Audio Engineer',     desc: 'Implement 3D spatial audio',            tier: 'bronze',   xp: 100  },
    { name: 'Localization Hero',  desc: 'Ship in 10+ languages',                 tier: 'gold',     xp: 500  },
    { name: 'Accessibility Award',desc: 'Pass all WCAG game accessibility tests', tier: 'platinum', xp: 700  },
    { name: 'Console Certified',  desc: 'Pass Sony or Microsoft cert process',    tier: 'platinum', xp: 900  },
    { name: 'Cross-Platform Dev', desc: 'Ship on 3+ platforms simultaneously',    tier: 'gold',     xp: 450  },
    { name: 'Engine Expert',      desc: 'Complete Unreal/Unity certification',    tier: 'silver',   xp: 300  },
    { name: 'Modder Friendly',    desc: 'Release official mod support tools',     tier: 'silver',   xp: 200  },
    { name: 'Streamer Ready',     desc: 'Implement streaming SDK integration',    tier: 'bronze',   xp: 125  },
  ];
  return templates.slice(0, count).map((t, i) => ({
    ...t,
    id: `ach-${platformKey}-${i}`,
    platform: platformKey,
    unlocked: Math.random() > 0.4,
    unlockedAt: Math.random() > 0.4 ? new Date(Date.now() - Math.random() * 90 * 86400000).toISOString() : null,
    progress: Math.round(Math.random() * 100),
    rarity: Math.random() > 0.7 ? 'rare' : Math.random() > 0.4 ? 'uncommon' : 'common'
  }));
}

function generateGameProgress(count = 6) {
  const games = [
    { name: 'Project Nova',      genre: 'Action RPG',       engine: 'Unreal 5' },
    { name: 'Void Protocol',     genre: 'FPS',              engine: 'Unity 6'  },
    { name: 'Crystal Ascent',    genre: 'Platformer',       engine: 'Godot 4'  },
    { name: 'Iron Syndicate',    genre: 'Strategy',         engine: 'Custom'   },
    { name: 'Echo Realm',        genre: 'VR Adventure',     engine: 'Unreal 5' },
    { name: 'Pixel Dynasty',     genre: 'Retro RPG',        engine: 'GameMaker'},
  ];
  return games.slice(0, count).map((g, i) => ({
    id: `game-${i}`, ...g,
    hours: Math.round(Math.random() * 500 + 50),
    completion: Math.round(Math.random() * 100),
    trophies: Math.round(Math.random() * 30),
    totalTrophies: 30,
    lastPlayed: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().slice(0, 10),
    platform: Object.keys(PLATFORMS)[Math.floor(Math.random() * Object.keys(PLATFORMS).length)]
  }));
}

function AchievementCard({ ach }) {
  const tier = ACHIEVEMENT_TIERS[ach.tier];
  return (
    <div
      className={`relative rounded-xl p-3 border transition-all ${
        ach.unlocked
          ? 'border-transparent shadow-sm'
          : 'border-gray-200 dark:border-gray-700 opacity-60 grayscale'
      }`}
      style={ach.unlocked ? { boxShadow: `0 0 12px ${tier.glow}`, borderColor: tier.color + '40' } : {}}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: ach.unlocked ? tier.glow : '#f3f4f6' }}
        >
          <span style={{ color: ach.unlocked ? tier.color : '#9ca3af' }}>{tier.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">{ach.name}</span>
            {ach.unlocked && <CheckCircle size={10} className="flex-shrink-0 text-green-500" />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{ach.desc}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs" style={{ color: tier.color }}>+{ach.xp} XP</span>
            {!ach.unlocked && (
              <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-400" style={{ width: `${ach.progress}%` }} />
              </div>
            )}
            {ach.unlocked && ach.unlockedAt && (
              <span className="text-xs text-gray-400">{new Date(ach.unlockedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
      {!ach.unlocked && (
        <Lock size={10} className="absolute top-2 right-2 text-gray-400" />
      )}
    </div>
  );
}

function PlatformCard({ platformKey, config, connected, onToggle }) {
  return (
    <div className={`rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
      connected
        ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">{config.label}</div>
            <div className="text-xs text-gray-400">{config.company}</div>
          </div>
        </div>
        <button
          onClick={() => onToggle(platformKey)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            connected
              ? 'bg-green-600 text-white hover:bg-red-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white'
          }`}
          style={connected ? {} : { borderColor: config.color }}
        >
          {connected ? <><Unlink size={10} /> Connected</> : <><Link size={10} /> Connect</>}
        </button>
      </div>
      <div className="mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          config.category === 'engine'  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700' :
          config.category === 'console' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700' :
                                          'bg-orange-100 dark:bg-orange-900/20 text-orange-700'
        }`}>
          {config.category}
        </span>
      </div>
    </div>
  );
}

function GameProgressCard({ game }) {
  const platformCfg = PLATFORMS[game.platform];
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{game.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{game.genre}</span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 rounded">{game.engine}</span>
          </div>
        </div>
        <span className="text-lg">{platformCfg?.icon || '🎮'}</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Completion</span>
            <span>{game.completion}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${game.completion}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1"><Activity size={10} /> {game.hours}h played</span>
          <span className="flex items-center gap-1">
            <Trophy size={10} className="text-yellow-500" />
            {game.trophies}/{game.totalTrophies}
          </span>
          <span>Last: {game.lastPlayed}</span>
        </div>
      </div>
    </div>
  );
}

export default function GameConnectors() {
  const [platforms, setPlatforms] = useState(
    Object.fromEntries(Object.entries(PLATFORMS).map(([k, v]) => [k, { ...v, connected: false }]))
  );
  const [achievements, setAchievements] = useState([]);
  const [gameProgress, setGameProgress] = useState([]);
  const [activeTab, setActiveTab] = useState('platforms');
  const [filterTier, setFilterTier] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allAch = [];
    Object.keys(PLATFORMS).forEach(pk => { allAch.push(...generateAchievements(pk, 5)); });
    setAchievements(allAch);
    setGameProgress(generateGameProgress(6));
    setLoading(false);
  }, []);

  const togglePlatform = useCallback((key) => {
    setPlatforms(prev => ({
      ...prev,
      [key]: { ...prev[key], connected: !prev[key].connected }
    }));
  }, []);

  const totalXP = achievements.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const filteredAch = filterTier === 'all' ? achievements : achievements.filter(a => a.tier === filterTier);
  const connectedCount = Object.values(platforms).filter(p => p.connected).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gamepad2 className="text-purple-600" size={24} />
            Gaming Hub
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Platform connectors · Achievements · Game progress tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            <Trophy size={14} />
            {totalXP.toLocaleString()} XP
          </div>
          <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            <Star size={14} />
            {unlockedCount}/{achievements.length}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 mb-6 w-fit">
        {[
          { key: 'platforms',    label: 'Platforms',    icon: <Link size={14} /> },
          { key: 'achievements', label: 'Achievements', icon: <Trophy size={14} /> },
          { key: 'progress',     label: 'Game Progress',icon: <Target size={14} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Platforms tab */}
      {activeTab === 'platforms' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-white">
              Connected: {connectedCount}/{Object.keys(platforms).length}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(platforms).map(([key, cfg]) => (
              <PlatformCard key={key} platformKey={key} config={cfg} connected={cfg.connected} onToggle={togglePlatform} />
            ))}
          </div>
        </div>
      )}

      {/* Achievements tab */}
      {activeTab === 'achievements' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilterTier('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterTier === 'all' ? 'bg-gray-700 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}
            >
              All
            </button>
            {Object.entries(ACHIEVEMENT_TIERS).map(([k, t]) => (
              <button
                key={k}
                onClick={() => setFilterTier(k)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  filterTier === k ? 'text-white border-transparent' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
                style={filterTier === k ? { backgroundColor: t.color } : {}}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAch.map(a => <AchievementCard key={a.id} ach={a} />)}
          </div>
        </div>
      )}

      {/* Progress tab */}
      {activeTab === 'progress' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gameProgress.map(g => <GameProgressCard key={g.id} game={g} />)}
        </div>
      )}
    </div>
  );
}
