// 2026-07-20
import React, { useState, useMemo } from 'react';
import { Trophy, Star, Clock, Filter, Medal } from 'lucide-react';

// ── Mock data ────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'epic',        name: 'Epic Games',  icon: '🎮' },
  { id: 'playstation', name: 'PlayStation', icon: '🎯' },
  { id: 'xbox',        name: 'Xbox',        icon: '🟢' },
  { id: 'ubisoft',     name: 'Ubisoft',     icon: '🔵' },
];

const ALL_ACHIEVEMENTS = [
  { id: 'ea1', platform: 'epic',        game: 'Fortnite',               title: 'Battle Hardened',    description: '100 wins in competitive',          rarity: 'rare',      earned: true,  earnedAt: Date.now() - 864000000,  progress: 100, maxProgress: 100, points: 50  },
  { id: 'ea2', platform: 'epic',        game: 'Rocket League',          title: 'Rocket Scientist',   description: 'Reach Grand Champion rank',         rarity: 'legendary', earned: false, earnedAt: null,                    progress: 62,  maxProgress: 100, points: 100 },
  { id: 'ea3', platform: 'epic',        game: 'Fall Guys',              title: 'Bean King',          description: 'Win 50 episodes',                  rarity: 'uncommon',  earned: true,  earnedAt: Date.now() - 1728000000, progress: 100, maxProgress: 100, points: 25  },
  { id: 'pa1', platform: 'playstation', game: 'God of War Ragnarök',    title: 'God Slayer',         description: 'Defeat Odin in battle',             rarity: 'uncommon',  earned: true,  earnedAt: Date.now() - 2592000000, progress: 100, maxProgress: 100, points: 30,  trophy: 'gold'     },
  { id: 'pa2', platform: 'playstation', game: 'Spider-Man 2',           title: 'Web-slinger',        description: '100% completion',                  rarity: 'epic',      earned: false, earnedAt: null,                    progress: 45,  maxProgress: 100, points: 90,  trophy: 'platinum' },
  { id: 'pa3', platform: 'playstation', game: 'Horizon Forbidden West', title: 'Horizon Cleared',    description: 'Complete the main story',          rarity: 'common',    earned: true,  earnedAt: Date.now() - 3456000000, progress: 100, maxProgress: 100, points: 15,  trophy: 'silver'   },
  { id: 'xa1', platform: 'xbox',        game: 'Halo Infinite',          title: 'Spartan',            description: 'Complete campaign on Legendary',   rarity: 'rare',      earned: true,  earnedAt: Date.now() - 1728000000, progress: 100, maxProgress: 100, points: 75  },
  { id: 'xa2', platform: 'xbox',        game: 'Forza Horizon 5',        title: 'Speed Demon',        description: 'Set a speed record on any road',   rarity: 'uncommon',  earned: false, earnedAt: null,                    progress: 80,  maxProgress: 100, points: 25  },
  { id: 'xa3', platform: 'xbox',        game: 'Halo Infinite',          title: 'Multiplayer Master', description: 'Reach Onyx rank',                  rarity: 'epic',      earned: false, earnedAt: null,                    progress: 33,  maxProgress: 100, points: 80  },
  { id: 'ua1', platform: 'ubisoft',     game: "Assassin's Creed Mirage",title: 'Hidden Blade',       description: 'Complete the main story',          rarity: 'common',    earned: true,  earnedAt: Date.now() - 432000000,  progress: 100, maxProgress: 100, points: 20  },
  { id: 'ua2', platform: 'ubisoft',     game: 'Rainbow Six Siege',      title: 'Elite Operator',     description: 'Reach Diamond rank in Ranked',     rarity: 'legendary', earned: false, earnedAt: null,                    progress: 18,  maxProgress: 100, points: 120 },
];

const TIMELINE = ALL_ACHIEVEMENTS
  .filter(a => a.earned && a.earnedAt)
  .sort((a, b) => b.earnedAt - a.earnedAt);

const RARITY_CONFIG = {
  common:    { color: 'text-gray-400',   bg: 'bg-gray-700/40',    border: 'border-gray-600',       sort: 1 },
  uncommon:  { color: 'text-green-400',  bg: 'bg-green-900/20',   border: 'border-green-600/40',   sort: 2 },
  rare:      { color: 'text-blue-400',   bg: 'bg-blue-900/20',    border: 'border-blue-600/40',    sort: 3 },
  epic:      { color: 'text-purple-400', bg: 'bg-purple-900/20',  border: 'border-purple-600/40',  sort: 4 },
  legendary: { color: 'text-yellow-400', bg: 'bg-yellow-900/20',  border: 'border-yellow-600/40',  sort: 5 },
};

const TROPHY_COLORS = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' };

// ── Achievement Card ──────────────────────────────────────────────────────────
function AchievementCard({ ach }) {
  const rc       = RARITY_CONFIG[ach.rarity] ?? RARITY_CONFIG.common;
  const platform = PLATFORMS.find(p => p.id === ach.platform);
  const pct      = Math.round((ach.progress / ach.maxProgress) * 100);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${rc.bg} ${rc.border}`}>
      <div className="shrink-0 relative">
        <Trophy size={28} className={ach.earned ? rc.color : 'text-gray-700'} />
        {ach.trophy && (
          <span className="absolute -bottom-1 -right-1 text-[9px] font-bold" style={{ color: TROPHY_COLORS[ach.trophy] }}>
            {ach.trophy[0].toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-sm font-semibold ${ach.earned ? 'text-white' : 'text-gray-400'}`}>{ach.title}</span>
          <span className={`text-[10px] font-medium uppercase ${rc.color}`}>{ach.rarity}</span>
          <span className="text-[10px] text-gray-500">{platform?.icon} {ach.game}</span>
        </div>
        <p className="text-xs text-gray-500 mb-1.5">{ach.description}</p>
        {!ach.earned && (
          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Progress</span><span>{ach.progress}% of {ach.maxProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden w-full">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: '#818cf8' }} />
            </div>
          </div>
        )}
        {ach.earned && ach.earnedAt && (
          <p className="text-[10px] text-gray-600 flex items-center gap-1">
            <Clock size={9} /> Earned {new Date(ach.earnedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-gray-500">Pts</p>
        <p className={`text-base font-bold ${ach.earned ? rc.color : 'text-gray-600'}`}>{ach.points}</p>
      </div>
    </div>
  );
}

// ── Main Tracker ──────────────────────────────────────────────────────────────
export default function AchievementTracker() {
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterRarity,   setFilterRarity]   = useState('all');
  const [filterEarned,   setFilterEarned]   = useState('all');
  const [sortBy,         setSortBy]         = useState('rarity');
  const [sortDir,        setSortDir]        = useState('desc');
  const [tab,            setTab]            = useState('list');

  const filtered = useMemo(() => {
    let list = [...ALL_ACHIEVEMENTS];
    if (filterPlatform !== 'all') list = list.filter(a => a.platform === filterPlatform);
    if (filterRarity   !== 'all') list = list.filter(a => a.rarity   === filterRarity);
    if (filterEarned === 'earned') list = list.filter(a =>  a.earned);
    if (filterEarned === 'locked') list = list.filter(a => !a.earned);
    list.sort((a, b) => {
      let av, bv;
      if (sortBy === 'rarity') { av = RARITY_CONFIG[a.rarity]?.sort ?? 0; bv = RARITY_CONFIG[b.rarity]?.sort ?? 0; }
      else if (sortBy === 'date')   { av = a.earnedAt ?? 0; bv = b.earnedAt ?? 0; }
      else if (sortBy === 'points') { av = a.points;  bv = b.points; }
      else                          { av = a.game;    bv = b.game; }
      if (typeof av === 'string') return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [filterPlatform, filterRarity, filterEarned, sortBy, sortDir]);

  const earnedCount  = ALL_ACHIEVEMENTS.filter(a => a.earned).length;
  const totalPoints  = ALL_ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.points, 0);
  const rarityBreakdown = Object.keys(RARITY_CONFIG).map(r => ({
    rarity: r,
    total:  ALL_ACHIEVEMENTS.filter(a => a.rarity === r).length,
    earned: ALL_ACHIEVEMENTS.filter(a => a.rarity === r && a.earned).length,
  }));

  const platformStats = PLATFORMS.map(p => ({
    ...p,
    earned: ALL_ACHIEVEMENTS.filter(a => a.platform === p.id && a.earned).length,
    total:  ALL_ACHIEVEMENTS.filter(a => a.platform === p.id).length,
    points: ALL_ACHIEVEMENTS.filter(a => a.platform === p.id && a.earned).reduce((s, a) => s + a.points, 0),
  }));

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-600/20 rounded-xl border border-yellow-500/30">
          <Trophy size={22} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Achievement Tracker</h1>
          <p className="text-xs text-gray-500">Cross-platform trophies · progress · rarity</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Earned',       val: `${earnedCount}/${ALL_ACHIEVEMENTS.length}`, color: 'text-yellow-400' },
          { label: 'Total Points', val: totalPoints,                                 color: 'text-indigo-400' },
          { label: 'Platforms',    val: PLATFORMS.length,                            color: 'text-purple-400' },
          { label: 'Completion',   val: `${Math.round((earnedCount/ALL_ACHIEVEMENTS.length)*100)}%`, color: 'text-green-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/60 p-1 rounded-xl w-fit">
        {[['list','List'],['timeline','Timeline'],['compare','Compare']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === k ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-white'}`}>{v}</button>
        ))}
      </div>

      {/* ── List ── */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
              <option value="all">All Platforms</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
            <select value={filterRarity} onChange={e => setFilterRarity(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
              <option value="all">All Rarities</option>
              {Object.keys(RARITY_CONFIG).map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
            <select value={filterEarned} onChange={e => setFilterEarned(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
              <option value="all">All</option>
              <option value="earned">Earned</option>
              <option value="locked">Locked</option>
            </select>
            <div className="flex gap-1 ml-auto">
              {[['rarity','Rarity'],['points','Points'],['date','Date']].map(([f, l]) => (
                <button key={f} onClick={() => toggleSort(f)}
                  className={`px-2 py-1 rounded text-[10px] border transition ${sortBy === f ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                  {l} {sortBy === f && (sortDir === 'desc' ? '↓' : '↑')}
                </button>
              ))}
            </div>
          </div>

          {/* Rarity pills */}
          <div className="flex gap-2 flex-wrap">
            {rarityBreakdown.map(rb => {
              const rc = RARITY_CONFIG[rb.rarity];
              return (
                <button key={rb.rarity} onClick={() => setFilterRarity(rb.rarity === filterRarity ? 'all' : rb.rarity)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition capitalize ${filterRarity === rb.rarity ? rc.bg + ' ' + rc.border : 'bg-gray-800/60 border-gray-700 text-gray-400'}`}>
                  <span className={rc.color}>{rb.rarity}</span>
                  <span className="text-gray-500 ml-1">{rb.earned}/{rb.total}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {filtered.length === 0
              ? <p className="text-center text-gray-500 py-8 text-sm">No achievements match your filters</p>
              : filtered.map(a => <AchievementCard key={a.id} ach={a} />)
            }
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      {tab === 'timeline' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-300 flex items-center gap-2"><Clock size={14} /> Recently Earned</h3>
          {TIMELINE.map((a, i) => {
            const rc = RARITY_CONFIG[a.rarity] ?? RARITY_CONFIG.common;
            const platform = PLATFORMS.find(p => p.id === a.platform);
            return (
              <div key={a.id} className="flex items-center gap-4">
                <div className="w-20 text-right text-xs text-gray-500 shrink-0">
                  {new Date(a.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="relative shrink-0">
                  <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-yellow-400' : 'bg-gray-600'}`} />
                  {i < TIMELINE.length - 1 && <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-700" />}
                </div>
                <div className={`flex-1 flex items-center gap-3 p-3 rounded-xl border ${rc.bg} ${rc.border}`}>
                  <Trophy size={18} className={rc.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <p className="text-xs text-gray-500">{platform?.icon} {a.game}</p>
                  </div>
                  <span className={`text-xs font-medium ${rc.color} shrink-0`}>{a.rarity}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Compare Platforms ── */}
      {tab === 'compare' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {platformStats.map(p => (
              <div key={p.id} className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-4 text-center">
                <span className="text-3xl">{p.icon}</span>
                <p className="text-sm font-semibold text-white mt-2">{p.name}</p>
                <p className={`text-2xl font-bold text-indigo-300 mt-1`}>{p.total ? Math.round((p.earned/p.total)*100) : 0}%</p>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden my-2">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.total ? (p.earned/p.total)*100 : 0}%` }} />
                </div>
                <p className="text-xs text-gray-500">{p.earned}/{p.total} · <span className="text-yellow-400">{p.points} pts</span></p>
              </div>
            ))}
          </div>

          {/* Cross-platform rarity table */}
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5 overflow-x-auto">
            <h3 className="font-semibold text-sm text-gray-300 mb-4">Rarity Breakdown by Platform</h3>
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                  <th className="text-left py-2 font-medium">Platform</th>
                  {Object.entries(RARITY_CONFIG).map(([k, v]) => (
                    <th key={k} className={`py-2 text-center font-medium ${v.color} capitalize`}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {platformStats.map(p => (
                  <tr key={p.id} className="hover:bg-gray-700/20">
                    <td className="py-2 text-gray-200">{p.icon} {p.name}</td>
                    {Object.keys(RARITY_CONFIG).map(r => {
                      const earned = ALL_ACHIEVEMENTS.filter(a => a.platform === p.id && a.rarity === r && a.earned).length;
                      const total  = ALL_ACHIEVEMENTS.filter(a => a.platform === p.id && a.rarity === r).length;
                      return <td key={r} className="py-2 text-center text-gray-400">{earned}/{total}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
