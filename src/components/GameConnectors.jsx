// GameConnectors.jsx | 2026-10-08

import { useState } from 'react';
import { Gamepad2, Trophy, Star, CheckCircle2, Lock, Zap, Users, Activity } from 'lucide-react';

export const Platform = Object.freeze({
  EPIC: 'EPIC',
  PLAYSTATION: 'PLAYSTATION',
  XBOX: 'XBOX',
  UBISOFT: 'UBISOFT',
  STEAM: 'STEAM',
  NINTENDO: 'NINTENDO',
});

const PLATFORM_CONFIG = [
  {
    id: Platform.EPIC,
    label: 'Epic Games / Unreal',
    color: '#2D2D2D',
    accentColor: '#0078D4',
    envVar: 'EPIC_CLIENT_ID',
    logo: '⚡',
  },
  {
    id: Platform.PLAYSTATION,
    label: 'PlayStation (Sony)',
    color: '#003087',
    accentColor: '#00439C',
    envVar: 'PSN_API_KEY',
    logo: '🎮',
  },
  {
    id: Platform.XBOX,
    label: 'Xbox (Microsoft)',
    color: '#107C10',
    accentColor: '#52B043',
    envVar: 'XBOX_CLIENT_ID',
    logo: '🟩',
  },
  {
    id: Platform.UBISOFT,
    label: 'Ubisoft Connect',
    color: '#0051A2',
    accentColor: '#1B98F5',
    envVar: 'UBISOFT_CLIENT_ID',
    logo: '🔷',
  },
];

const DEMO_ACHIEVEMENTS = {
  [Platform.EPIC]: [
    { id: 'ea1', name: 'First Victory', description: 'Win your first match', unlocked: true, xp: 100 },
    { id: 'ea2', name: 'Legend Status', description: 'Reach legendary tier', unlocked: false, xp: 500 },
    { id: 'ea3', name: 'Unreal Master', description: 'Complete Unreal tutorial', unlocked: true, xp: 250 },
  ],
  [Platform.PLAYSTATION]: [
    { id: 'pa1', name: 'Platinum Hunter', description: 'Earn first platinum trophy', unlocked: true, xp: 1000, type: 'platinum' },
    { id: 'pa2', name: 'Gold Rush', description: 'Earn 10 gold trophies', unlocked: false, xp: 300, type: 'gold' },
    { id: 'pa3', name: 'Speed Runner', description: 'Complete a game in under 2h', unlocked: false, xp: 200, type: 'silver' },
  ],
  [Platform.XBOX]: [
    { id: 'xa1', name: 'Xbox Champion', description: 'Reach 50,000 gamerscore', unlocked: true, xp: 50000 },
    { id: 'xa2', name: 'Co-op Hero', description: 'Complete 10 co-op missions', unlocked: false, xp: 100 },
  ],
  [Platform.UBISOFT]: [
    { id: 'ua1', name: 'Ghost Recon Elite', description: 'Complete Ghost Recon campaign', unlocked: true, xp: 400 },
    { id: 'ua2', name: 'AC Completionist', description: 'Finish all AC origins quests', unlocked: false, xp: 800 },
  ],
};

const DEMO_GAMES = {
  [Platform.EPIC]: [
    { title: 'Fortnite', completion: 78, hoursPlayed: 312, trophies: 14 },
    { title: 'Unreal Tournament', completion: 45, hoursPlayed: 89, trophies: 6 },
  ],
  [Platform.PLAYSTATION]: [
    { title: 'God of War Ragnarok', completion: 91, hoursPlayed: 42, trophies: 39, platinum: true },
    { title: 'Spider-Man 2', completion: 63, hoursPlayed: 18, trophies: 24 },
  ],
  [Platform.XBOX]: [
    { title: 'Halo Infinite', completion: 85, hoursPlayed: 76, gamerscore: 7500 },
    { title: 'Forza Horizon 5', completion: 55, hoursPlayed: 120, gamerscore: 4200 },
  ],
  [Platform.UBISOFT]: [
    { title: 'Assassin\'s Creed Mirage', completion: 72, hoursPlayed: 35, xp: 3200 },
    { title: 'Rainbow Six Siege', completion: 30, hoursPlayed: 210, xp: 12500 },
  ],
};

function TrophyIcon({ type }) {
  const map = { platinum: '🏆', gold: '🥇', silver: '🥈', bronze: '🥉' };
  return <span>{map[type] || '🏅'}</span>;
}

function ConnectorCard({ config, connected, account, onConnect, onDisconnect }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: config.color }}>
            {config.logo}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{config.label}</h3>
            {connected && account && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{account}</p>
            )}
          </div>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${connected ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
          {connected ? <CheckCircle2 size={10} /> : <Lock size={10} />}
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {connected ? (
        <button
          onClick={() => onDisconnect(config.id)}
          className="w-full py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={() => onConnect(config.id)}
          className="w-full py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90 font-medium"
          style={{ backgroundColor: config.accentColor }}
        >
          Connect Account
        </button>
      )}
    </div>
  );
}

function AchievementList({ platform }) {
  const list = DEMO_ACHIEVEMENTS[platform] || [];
  return (
    <div className="space-y-2">
      {list.map(a => (
        <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl ${a.unlocked ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-700/50 opacity-60'}`}>
          <div className="flex-shrink-0">
            {a.unlocked
              ? a.type ? <TrophyIcon type={a.type} /> : <Trophy size={18} className="text-yellow-500" />
              : <Lock size={18} className="text-gray-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
          </div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">+{a.xp} XP</span>
        </div>
      ))}
    </div>
  );
}

function GameProgressList({ platform }) {
  const games = DEMO_GAMES[platform] || [];
  return (
    <div className="space-y-3">
      {games.map((g, i) => (
        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Gamepad2 size={14} className="text-indigo-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{g.title}</span>
              {g.platinum && <Star size={12} className="text-purple-500" />}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{g.completion}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${g.completion}%` }} />
          </div>
          <div className="flex gap-3 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-0.5"><Activity size={9} />{g.hoursPlayed}h played</span>
            {g.trophies !== undefined && <span className="flex items-center gap-0.5"><Trophy size={9} />{g.trophies} trophies</span>}
            {g.gamerscore !== undefined && <span className="flex items-center gap-0.5"><Star size={9} />{g.gamerscore.toLocaleString()} G</span>}
            {g.xp !== undefined && <span className="flex items-center gap-0.5"><Zap size={9} />{g.xp.toLocaleString()} XP</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GameConnectors() {
  const [connections, setConnections] = useState({});
  const [activePlatform, setActivePlatform] = useState(Platform.EPIC);
  const [tab, setTab] = useState('achievements');

  const handleConnect = (platformId) => {
    // In production: redirect to OAuth flow using env-configured client IDs
    const mockAccount = {
      [Platform.EPIC]: 'CamFox_2026',
      [Platform.PLAYSTATION]: 'CamFox_PSN',
      [Platform.XBOX]: 'CamFox Xbox',
      [Platform.UBISOFT]: 'CamFox_Ubi',
    }[platformId] || 'Connected User';
    setConnections(c => ({ ...c, [platformId]: { connected: true, account: mockAccount } }));
  };

  const handleDisconnect = (platformId) => {
    setConnections(c => { const n = { ...c }; delete n[platformId]; return n; });
  };

  const connectedCount = Object.values(connections).filter(c => c.connected).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-indigo-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Game Connectors</h1>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Users size={16} />
          <span>{connectedCount} / {PLATFORM_CONFIG.length} connected</span>
        </div>
      </div>

      {/* Connector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLATFORM_CONFIG.map(config => (
          <ConnectorCard
            key={config.id}
            config={config}
            connected={connections[config.id]?.connected || false}
            account={connections[config.id]?.account}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {/* Platform details */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Platform selector */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {PLATFORM_CONFIG.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activePlatform === p.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {p.logo} {p.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Tab selector */}
        <div className="flex gap-4 px-5 pt-4 pb-0">
          {['achievements', 'progress'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 text-sm font-medium pb-3 border-b-2 transition-colors capitalize ${tab === t ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {t === 'achievements' ? <Trophy size={14} /> : <Activity size={14} />}
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'achievements'
            ? <AchievementList platform={activePlatform} />
            : <GameProgressList platform={activePlatform} />
          }
        </div>
      </div>
    </div>
  );
}
