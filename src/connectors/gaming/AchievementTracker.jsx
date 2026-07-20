// src/connectors/gaming/AchievementTracker.jsx - 2026-07-20
import React, { useState } from 'react';
import { Trophy, Star, Clock, TrendingUp, Filter } from 'lucide-react';

const RARITY_CONFIG = {
  common: { label: 'Common', color: '#9ca3af', bg: 'bg-gray-600/20', text: 'text-gray-400' },
  uncommon: { label: 'Uncommon', color: '#22c55e', bg: 'bg-green-600/20', text: 'text-green-400' },
  rare: { label: 'Rare', color: '#3b82f6', bg: 'bg-blue-600/20', text: 'text-blue-400' },
  epic: { label: 'Epic', color: '#a855f7', bg: 'bg-purple-600/20', text: 'text-purple-400' },
  legendary: { label: 'Legendary', color: '#f59e0b', bg: 'bg-yellow-600/20', text: 'text-yellow-400' }
};

const PLATFORM_ICONS = { epic: '🎮', psn: '🎯', xbox: '🟢', ubisoft: '🔵' };

const MOCK_ACHIEVEMENTS = [
  { id: 'a1', name: 'First Steps', game: 'Epic Game A', platform: 'epic', description: 'Complete the tutorial', rarity: 'common', progress: 100, maxProgress: 100, earned: true, earnedAt: Date.now() - 86400000 },
  { id: 'a2', name: 'Speed Demon', game: 'Epic Game A', platform: 'epic', description: 'Finish level 1 in under 60 seconds', rarity: 'rare', progress: 47, maxProgress: 60, earned: false },
  { id: 'a3', name: 'Platinum Champion', game: 'PlayStation Game B', platform: 'psn', description: 'Earn all other trophies', rarity: 'legendary', progress: 87, maxProgress: 100, earned: false },
  { id: 'a4', name: 'Night Owl', game: 'Xbox Game C', platform: 'xbox', description: 'Play for 10 hours between midnight and 6am', rarity: 'uncommon', progress: 100, maxProgress: 100, earned: true, earnedAt: Date.now() - 172800000 },
  { id: 'a5', name: 'Completionist', game: 'Ubisoft Game D', platform: 'ubisoft', description: 'Complete all side missions', rarity: 'epic', progress: 62, maxProgress: 100, earned: false },
  { id: 'a6', name: 'Social Butterfly', game: 'PlayStation Game B', platform: 'psn', description: 'Play with 5 different friends', rarity: 'uncommon', progress: 3, maxProgress: 5, earned: false },
  { id: 'a7', name: 'Legend', game: 'Xbox Game C', platform: 'xbox', description: 'Reach max prestige level', rarity: 'legendary', progress: 8, maxProgress: 10, earned: false }
];

function AchievementCard({ achievement }) {
  const rarity = RARITY_CONFIG[achievement.rarity];
  const progressPct = Math.round((achievement.progress / achievement.maxProgress) * 100);

  return (
    <div className={`p-4 rounded-xl border transition-all ${achievement.earned ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/60 border-gray-700/50'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${rarity.bg} flex-shrink-0`}>
          <Trophy size={18} style={{ color: rarity.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm font-semibold ${achievement.earned ? 'text-white' : 'text-gray-400'}`}>
              {achievement.name}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-sm">{PLATFORM_ICONS[achievement.platform]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rarity.bg} ${rarity.text}`}>
                {rarity.label}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">{achievement.game}</p>
          <p className="text-xs text-gray-400 mb-2">{achievement.description}</p>

          {!achievement.earned && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{achievement.progress}/{achievement.maxProgress} ({progressPct}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%`, background: rarity.color }} />
              </div>
            </div>
          )}

          {achievement.earned && (
            <p className="text-xs text-green-400 flex items-center gap-1">
              <Star size={10} /> Earned {new Date(achievement.earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AchievementTracker() {
  const [filter, setFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');

  const filtered = MOCK_ACHIEVEMENTS.filter(a => {
    if (filter === 'earned' && !a.earned) return false;
    if (filter === 'unearned' && a.earned) return false;
    if (platformFilter !== 'all' && a.platform !== platformFilter) return false;
    if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false;
    return true;
  });

  const earned = MOCK_ACHIEVEMENTS.filter(a => a.earned).length;
  const total = MOCK_ACHIEVEMENTS.length;
  const byRarity = Object.keys(RARITY_CONFIG).reduce((acc, r) => ({
    ...acc,
    [r]: MOCK_ACHIEVEMENTS.filter(a => a.rarity === r && a.earned).length
  }), {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-600/20 rounded-lg">
          <Trophy size={20} className="text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Achievement Tracker</h2>
          <p className="text-xs text-gray-400">Cross-platform trophy and achievement progress</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 p-4 bg-gray-800 rounded-xl border border-gray-700 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-white mb-1">{Math.round((earned / total) * 100)}%</div>
          <p className="text-xs text-gray-400">{earned}/{total} achievements</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
            <div className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-yellow-500"
              style={{ width: `${(earned / total) * 100}%` }} />
          </div>
        </div>
        {Object.entries(RARITY_CONFIG).map(([rarity, config]) => (
          <div key={rarity} className="p-3 bg-gray-800 rounded-xl border border-gray-700 text-center">
            <Trophy size={16} className="mx-auto mb-1" style={{ color: config.color }} />
            <p className="text-lg font-bold text-white">{byRarity[rarity]}</p>
            <p className="text-xs text-gray-400">{config.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {['all', 'earned', 'unearned'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs transition-colors capitalize ${filter === f ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}>
              {f}
            </button>
          ))}
        </div>
        <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
          className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-xs focus:outline-none">
          <option value="all">All Platforms</option>
          <option value="epic">Epic Games</option>
          <option value="psn">PlayStation</option>
          <option value="xbox">Xbox</option>
          <option value="ubisoft">Ubisoft</option>
        </select>
        <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}
          className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-xs focus:outline-none">
          <option value="all">All Rarities</option>
          {Object.entries(RARITY_CONFIG).map(([r, c]) => <option key={r} value={r}>{c.label}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No achievements match the current filters</div>
        ) : filtered.map(a => <AchievementCard key={a.id} achievement={a} />)}
      </div>
    </div>
  );
}
