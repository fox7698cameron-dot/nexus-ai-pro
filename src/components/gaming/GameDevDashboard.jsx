// GameDevDashboard.jsx
// Date: 2026-08-04
// Game development and project tracking dashboard for Nexus AI Pro

import { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2,
  Trophy,
  Star,
  Zap,
  Globe,
  Users,
  TrendingUp,
  Plus,
  Settings,
  CheckCircle,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants / default data
// ---------------------------------------------------------------------------

const TABS = ['Projects', 'Achievements', 'Progress', 'Connectors', 'Leaderboard'];

const PROJECT_TYPES = ['All', 'game', 'ar', 'vr', '3d', 'coding'];

const DEFAULT_PROJECTS = [
  { id: 1, name: 'NexusRealms',      type: 'game',   engine: 'Unreal 5.4', status: 'active',  completion: 68, health: 'good'    },
  { id: 2, name: 'AR City Explorer', type: 'ar',     engine: 'Unity 2025', status: 'active',  completion: 44, health: 'good'    },
  { id: 3, name: 'VR Training Sim',  type: 'vr',     engine: 'Unreal 5.4', status: 'paused',  completion: 21, health: 'warning' },
  { id: 4, name: '3D Asset Library', type: '3d',     engine: 'Blender',    status: 'active',  completion: 89, health: 'good'    },
  { id: 5, name: 'AI Game Engine',   type: 'coding', engine: 'Custom',     status: 'draft',   completion: 12, health: 'warning' },
];

const DEFAULT_ACHIEVEMENTS = [
  { id: 1,  name: 'First Blood',        desc: 'Win your first PvP match',             category: 'combat',      icon: '⚔️',  unlocked: true,  progress: 1,  max: 1  },
  { id: 2,  name: 'World Builder',      desc: 'Create 10 unique levels',              category: 'story',       icon: '🏗️',  unlocked: true,  progress: 10, max: 10 },
  { id: 3,  name: 'Social Butterfly',   desc: 'Play with 50 different teammates',     category: 'social',      icon: '🦋',  unlocked: false, progress: 23, max: 50 },
  { id: 4,  name: 'Explorer Supreme',   desc: 'Discover all hidden zones',            category: 'exploration', icon: '🗺️',  unlocked: false, progress: 7,  max: 12 },
  { id: 5,  name: 'Speed Runner',       desc: 'Complete campaign in under 2 hours',   category: 'combat',      icon: '⚡',  unlocked: false, progress: 0,  max: 1  },
  { id: 6,  name: 'Meta Master',        desc: 'Reach level 100',                      category: 'meta',        icon: '👑',  unlocked: false, progress: 62, max: 100},
  { id: 7,  name: 'Story Teller',       desc: 'Complete the main campaign',           category: 'story',       icon: '📖',  unlocked: true,  progress: 1,  max: 1  },
  { id: 8,  name: 'Collector',          desc: 'Own 200 in-game items',                category: 'meta',        icon: '🎒',  unlocked: false, progress: 148,max: 200},
];

const ACHIEVEMENT_CATEGORIES = ['All', 'story', 'combat', 'exploration', 'social', 'meta'];

const DEFAULT_CONNECTORS = [
  {
    id: 'unreal',
    name: 'Unreal Engine',
    icon: '🎮',
    status: 'connected',
    lastSync: '2026-08-04 09:30',
    features: ['Asset Pipeline', 'Build Automation', 'Profiling'],
  },
  {
    id: 'epic',
    name: 'Epic Games Store',
    icon: '🛒',
    status: 'connected',
    lastSync: '2026-08-04 08:15',
    features: ['Publishing', 'Analytics', 'Revenue'],
  },
  {
    id: 'psn',
    name: 'PlayStation Network',
    icon: '🎮',
    status: 'disconnected',
    lastSync: null,
    features: ['Trophy Sync', 'Cloud Saves', 'Leaderboards'],
  },
  {
    id: 'xbox',
    name: 'Xbox Live',
    icon: '🟢',
    status: 'disconnected',
    lastSync: null,
    features: ['Achievements', 'GamePass', 'Cloud Gaming'],
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    icon: '🔷',
    status: 'error',
    lastSync: '2026-08-03 14:00',
    features: ['Rewards', 'Cross-play', 'Stats'],
  },
  {
    id: 'steam',
    name: 'Steam',
    icon: '🌊',
    status: 'connected',
    lastSync: '2026-08-04 09:58',
    features: ['Workshop', 'Achievements', 'Cloud Saves', 'Stats'],
  },
];

const DEFAULT_LEADERBOARD = [
  { rank: 1,  username: 'NexusMaster',   score: 98_420, achievements: 142 },
  { rank: 2,  username: 'PixelWarrior',  score: 87_310, achievements: 128 },
  { rank: 3,  username: 'CodeSlayer99',  score: 76_890, achievements: 114 },
  { rank: 4,  username: 'VRVirtuoso',    score: 65_440, achievements: 101 },
  { rank: 5,  username: 'ArenaKing',     score: 54_200, achievements: 93  },
  { rank: 6,  username: 'ShadowCraft',   score: 48_700, achievements: 87  },
  { rank: 7,  username: 'BinaryBeast',   score: 43_100, achievements: 79  },
  { rank: 8,  username: 'QuantumQ',      score: 38_500, achievements: 71  },
];

const DEFAULT_PROGRESS = [
  { game: 'NexusRealms',      level: 62,  xp: 148_400, xpNext: 200_000, completion: 68, playTime: '124h', sessions: 89, lastPlayed: '2026-08-04' },
  { game: 'AR City Explorer', level: 28,  xp: 42_100,  xpNext: 60_000,  completion: 44, playTime: '38h',  sessions: 31, lastPlayed: '2026-08-03' },
  { game: '3D Asset Library', level: 91,  xp: 312_000, xpNext: 350_000, completion: 89, playTime: '210h', sessions: 142,lastPlayed: '2026-08-04' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

function ProgressBar({ value, max = 100, color = 'bg-blue-500', thin }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${thin ? 'h-1.5' : 'h-3'}`}>
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    connected:    'bg-green-900 text-green-300',
    disconnected: 'bg-gray-700 text-gray-400',
    error:        'bg-red-900 text-red-300',
    active:       'bg-blue-900 text-blue-300',
    paused:       'bg-yellow-900 text-yellow-300',
    draft:        'bg-gray-700 text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-gray-700 text-gray-400'}`}>
      {status}
    </span>
  );
}

function HealthDot({ health }) {
  return (
    <span className={`w-2 h-2 rounded-full inline-block ${health === 'good' ? 'bg-green-400' : health === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}`} />
  );
}

// ---------------------------------------------------------------------------
// Create Project Modal
// ---------------------------------------------------------------------------

function CreateProjectModal({ onCreate, onClose }) {
  const [name, setName]     = useState('');
  const [type, setType]     = useState('game');
  const [engine, setEngine] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate?.({ id: Date.now(), name, type, engine, status: 'draft', completion: 0, health: 'good' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">New Project</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Project Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Game"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full appearance-none bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-blue-500">
              {['game', 'ar', 'vr', '3d', 'coding'].map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Engine / Framework</label>
            <input
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              placeholder="Unreal 5, Unity, Custom…"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Projects
// ---------------------------------------------------------------------------

function ProjectsTab({ projects, onCreate }) {
  const [filter, setFilter]  = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [items, setItems]    = useState(projects?.length ? projects : DEFAULT_PROJECTS);

  const filtered = filter === 'All' ? items : items.filter((p) => p.type === filter);

  const handleCreate = useCallback((proj) => {
    setItems((prev) => [...prev, proj]);
    onCreate?.(proj);
  }, [onCreate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <HealthDot health={p.health} />
                  <span className="text-white font-semibold">{p.name}</span>
                </div>
                <div className="text-gray-500 text-xs mt-0.5">{p.engine} · {p.type.toUpperCase()}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Completion</span>
                <span>{p.completion}%</span>
              </div>
              <ProgressBar value={p.completion} color={p.completion >= 70 ? 'bg-green-500' : p.completion >= 40 ? 'bg-blue-500' : 'bg-yellow-500'} />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 text-xs py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-1">
                <Settings size={11} /> Settings
              </button>
              <button className="flex-1 text-xs py-1.5 bg-blue-900 hover:bg-blue-800 text-blue-300 rounded-lg transition-colors flex items-center justify-center gap-1">
                <Zap size={11} /> Open
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && <CreateProjectModal onCreate={handleCreate} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Achievements
// ---------------------------------------------------------------------------

function AchievementsTab({ achievements }) {
  const [catFilter, setCatFilter]   = useState('All');
  const [recentOnly, setRecentOnly] = useState(false);
  const items = achievements?.length ? achievements : DEFAULT_ACHIEVEMENTS;

  const recent = items.filter((a) => a.unlocked).slice(-3).reverse();
  const filtered = items.filter((a) => {
    if (catFilter !== 'All' && a.category !== catFilter) return false;
    if (recentOnly && !a.unlocked) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Recent unlocks */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Trophy size={14} className="text-yellow-400" /> Recent Unlocks</h3>
        <div className="flex flex-wrap gap-3">
          {recent.map((a) => (
            <div key={a.id} className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-800 rounded-lg px-3 py-1.5">
              <span>{a.icon}</span>
              <span className="text-yellow-300 text-sm font-medium">{a.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {ACHIEVEMENT_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${catFilter === c ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setRecentOnly((v) => !v)}
          className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border transition-colors ${recentOnly ? 'bg-green-900 border-green-700 text-green-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
        >
          Unlocked only
        </button>
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl border p-4 space-y-2 ${a.unlocked ? 'bg-gray-800 border-yellow-800/50' : 'bg-gray-900 border-gray-700 opacity-70'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold text-sm ${a.unlocked ? 'text-white' : 'text-gray-400'}`}>{a.name}</span>
                  {a.unlocked ? <CheckCircle size={13} className="text-green-400 shrink-0" /> : <Lock size={13} className="text-gray-600 shrink-0" />}
                </div>
                <div className="text-gray-500 text-xs">{a.desc}</div>
              </div>
            </div>
            {a.max > 1 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{a.progress} / {a.max}</span>
                  <span>{Math.round((a.progress / a.max) * 100)}%</span>
                </div>
                <ProgressBar value={a.progress} max={a.max} color={a.unlocked ? 'bg-yellow-500' : 'bg-gray-600'} thin />
              </div>
            )}
            <div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{a.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Progress
// ---------------------------------------------------------------------------

function ProgressTab() {
  return (
    <div className="space-y-4">
      {DEFAULT_PROGRESS.map((p) => (
        <div key={p.game} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">{p.game}</h3>
              <div className="text-gray-500 text-xs mt-0.5">
                Last played: {p.lastPlayed} · {p.sessions} sessions · {p.playTime}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">Lv. {p.level}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>XP</span>
                <span>{fmt(p.xp)} / {fmt(p.xpNext)}</span>
              </div>
              <ProgressBar value={p.xp} max={p.xpNext} color="bg-purple-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Completion</span>
                <span>{p.completion}%</span>
              </div>
              <ProgressBar value={p.completion} color="bg-green-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <div className="text-white font-bold">{p.playTime}</div>
              <div className="text-gray-500 text-xs">Play Time</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold">{p.sessions}</div>
              <div className="text-gray-500 text-xs">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold">{p.completion}%</div>
              <div className="text-gray-500 text-xs">Complete</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Connectors
// ---------------------------------------------------------------------------

function ConnectorsTab({ connectors, onConnectPlatform }) {
  const [items, setItems]    = useState(connectors?.length ? connectors : DEFAULT_CONNECTORS);
  const [apiKeys, setApiKeys] = useState({});
  const [expanding, setExpanding] = useState(null);

  const handleConnect = (id) => {
    const key = apiKeys[id] ?? '';
    setItems((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: 'connected', lastSync: new Date().toISOString().slice(0, 16).replace('T', ' ') } : c)
    );
    onConnectPlatform?.(id, key);
    setExpanding(null);
  };

  const handleDisconnect = (id) => {
    setItems((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: 'disconnected', lastSync: null } : c)
    );
  };

  const statusIcon = (s) =>
    s === 'connected'    ? '🟢' :
    s === 'disconnected' ? '⚫' : '🔴';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((c) => (
        <div key={c.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{c.icon}</span>
              <span className="text-white font-semibold text-sm">{c.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{statusIcon(c.status)}</span>
              <StatusBadge status={c.status} />
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-1">
            {c.features.map((f) => (
              <span key={f} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{f}</span>
            ))}
          </div>

          {c.lastSync && (
            <div className="text-gray-500 text-xs flex items-center gap-1">
              <RefreshCw size={10} /> Last sync: {c.lastSync}
            </div>
          )}

          {/* API key input (shown when expanding) */}
          {expanding === c.id && c.status !== 'connected' && (
            <input
              type="password"
              value={apiKeys[c.id] ?? ''}
              onChange={(e) => setApiKeys((prev) => ({ ...prev, [c.id]: e.target.value }))}
              placeholder="Paste API key…"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg py-1.5 px-3 text-white text-xs focus:outline-none focus:border-blue-500"
            />
          )}

          <div className="flex gap-2">
            {c.status === 'connected' ? (
              <button
                onClick={() => handleDisconnect(c.id)}
                className="flex-1 text-xs py-1.5 bg-red-900 hover:bg-red-800 text-red-300 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            ) : expanding === c.id ? (
              <>
                <button onClick={() => setExpanding(null)} className="flex-1 text-xs py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">Cancel</button>
                <button onClick={() => handleConnect(c.id)} className="flex-1 text-xs py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">Confirm</button>
              </>
            ) : (
              <button
                onClick={() => setExpanding(c.id)}
                className="flex-1 text-xs py-1.5 bg-green-900 hover:bg-green-800 text-green-300 rounded-lg transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Leaderboard
// ---------------------------------------------------------------------------

function LeaderboardTab({ leaderboard }) {
  const [gameFilter, setGameFilter]   = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All Time');
  const [score, setScore]             = useState('');
  const items = leaderboard?.length ? leaderboard : DEFAULT_LEADERBOARD;

  const rankColor = (r) => r === 1 ? 'text-yellow-400' : r === 2 ? 'text-gray-300' : r === 3 ? 'text-amber-600' : 'text-gray-500';
  const rankBg    = (r) => r === 1 ? 'bg-yellow-900/30 border-yellow-800/50' : r === 2 ? 'bg-gray-700/30 border-gray-600' : r === 3 ? 'bg-amber-900/20 border-amber-800/40' : 'bg-gray-800 border-gray-700';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {['All', 'NexusRealms', 'AR City Explorer', '3D Asset Library'].map((g) => (
            <button
              key={g}
              onClick={() => setGameFilter(g)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${gameFilter === g ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['All Time', '30d', '7d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${periodFilter === p ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Submit score */}
      <div className="flex gap-2">
        <input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Enter your score"
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => { if (score) { alert(`Score ${score} submitted!`); setScore(''); } }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
        >
          <TrendingUp size={14} /> Submit
        </button>
      </div>

      {/* Table */}
      <div className="space-y-2">
        {items.map((entry) => (
          <div key={entry.rank} className={`flex items-center gap-4 rounded-xl border p-4 ${rankBg(entry.rank)}`}>
            <div className={`text-2xl font-black w-8 text-center ${rankColor(entry.rank)}`}>
              {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold">{entry.username}</div>
              <div className="text-gray-500 text-xs">{entry.achievements} achievements</div>
            </div>
            <div className="text-right">
              <div className={`font-bold text-lg ${rankColor(entry.rank)}`}>{fmt(entry.score)}</div>
              <div className="text-gray-600 text-xs">pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GameDevDashboard({
  projects,
  achievements,
  connectors,
  leaderboard,
  onConnectPlatform,
  onCreate,
}) {
  const [activeTab, setActiveTab] = useState('Projects');
  const [syncedProjects, setSyncedProjects] = useState(projects?.length ? projects : DEFAULT_PROJECTS);

  // Sync external project prop changes
  useEffect(() => {
    if (projects?.length) setSyncedProjects(projects);
  }, [projects]);

  // Simulate periodic leaderboard/connector status refresh every 60 s
  useEffect(() => {
    const id = setInterval(() => {
      // In production: fetch('/api/gaming/status').then(r => r.json()).then(setSyncedProjects)
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const TAB_ICONS = {
    Projects:     <Gamepad2 size={14} />,
    Achievements: <Trophy size={14} />,
    Progress:     <TrendingUp size={14} />,
    Connectors:   <Globe size={14} />,
    Leaderboard:  <Users size={14} />,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 className="text-purple-400" size={26} />
            Game Dev Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Project tracking, achievements & platform connectors</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500">
            <Star className="inline text-yellow-400 mr-1" size={12} />
            {(achievements ?? DEFAULT_ACHIEVEMENTS).filter((a) => a.unlocked).length} / {(achievements ?? DEFAULT_ACHIEVEMENTS).length} unlocked
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-gray-800 p-1 rounded-xl border border-gray-700 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-purple-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {TAB_ICONS[tab]}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'Projects'     && <ProjectsTab     projects={syncedProjects}   onCreate={onCreate}                                    />}
      {activeTab === 'Achievements' && <AchievementsTab achievements={achievements}                                                        />}
      {activeTab === 'Progress'     && <ProgressTab                                                                                        />}
      {activeTab === 'Connectors'   && <ConnectorsTab   connectors={connectors}     onConnectPlatform={onConnectPlatform}                  />}
      {activeTab === 'Leaderboard'  && <LeaderboardTab  leaderboard={leaderboard}                                                          />}
    </div>
  );
}
