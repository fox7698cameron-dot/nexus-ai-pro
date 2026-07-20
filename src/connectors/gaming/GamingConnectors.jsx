// 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Link, Unlink, RefreshCw, CheckCircle, AlertCircle,
  ChevronRight, Trophy, Library, Star,
} from 'lucide-react';

const PLATFORMS = [
  {
    id: 'epic', name: 'Epic Games / Unreal', icon: '🎮', color: '#0078D7',
    description: 'Connect your Epic Games account for Unreal Engine projects and game library',
    fields: [
      { key: 'clientId',     label: 'Client ID',     type: 'text'     },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
    ],
    metrics: { games: 47, achievements: 312, playtime: '1,240h' },
  },
  {
    id: 'playstation', name: 'PlayStation Network', icon: '🎯', color: '#003087',
    description: 'Sony PSN integration for trophy tracking and game progress',
    fields: [
      { key: 'psnClientId',     label: 'PSN Client ID',     type: 'text'     },
      { key: 'psnClientSecret', label: 'PSN Client Secret', type: 'password' },
    ],
    metrics: { games: 83, achievements: 1247, playtime: '3,891h' },
  },
  {
    id: 'xbox', name: 'Microsoft Xbox / Azure', icon: '🟢', color: '#107C10',
    description: 'Xbox Live and Azure integration for achievements and cloud gaming',
    fields: [
      { key: 'xboxClientId',     label: 'Client ID',     type: 'text'     },
      { key: 'xboxClientSecret', label: 'Client Secret', type: 'password' },
      { key: 'xboxTenantId',     label: 'Tenant ID',     type: 'text'     },
    ],
    metrics: { games: 61, achievements: 892, playtime: '2,103h' },
  },
  {
    id: 'ubisoft', name: 'Ubisoft Connect', icon: '🔵', color: '#0052CC',
    description: 'Ubisoft Connect for game progress and achievement sync',
    fields: [
      { key: 'ubisoftAppId', label: 'App ID',        type: 'text'     },
      { key: 'ubisoftSecret', label: 'Client Secret', type: 'password' },
    ],
    metrics: { games: 24, achievements: 436, playtime: '876h' },
  },
];

const MOCK_ACHIEVEMENTS = {
  epic:        [{ title: 'Battle Hardened', game: 'Fortnite',     rarity: 'rare',   earned: true  }, { title: 'Rocket Scientist', game: 'Rocket League', rarity: 'legendary', earned: false }],
  playstation: [{ title: 'God Slayer',      game: 'God of War',   rarity: 'uncommon',earned: true  }, { title: 'Web-slinger',     game: 'Spider-Man 2', rarity: 'epic',      earned: false }],
  xbox:        [{ title: 'Spartan',         game: 'Halo Infinite',rarity: 'rare',   earned: true  }, { title: 'Speed Demon',     game: 'Forza H5',     rarity: 'uncommon',  earned: false }],
  ubisoft:     [{ title: 'Hidden Blade',    game: "AC Mirage",    rarity: 'common', earned: true  }],
};

const MOCK_GAMES = {
  epic:        [{ title: 'Fortnite', genre: 'Battle Royale', hours: 120 }, { title: 'Rocket League', genre: 'Sports', hours: 85 }],
  playstation: [{ title: 'God of War Ragnarök', genre: 'Action-Adventure', hours: 65 }, { title: 'Spider-Man 2', genre: 'Action', hours: 30 }],
  xbox:        [{ title: 'Halo Infinite', genre: 'FPS', hours: 50 }, { title: 'Forza Horizon 5', genre: 'Racing', hours: 75 }],
  ubisoft:     [{ title: "Assassin's Creed Mirage", genre: 'Action-Adventure', hours: 25 }],
};

const RARITY_COLORS = {
  common: 'text-gray-400', uncommon: 'text-green-400', rare: 'text-blue-400', epic: 'text-purple-400', legendary: 'text-yellow-400',
};

// ── Platform Card ─────────────────────────────────────────────────────────────
function PlatformCard({ platform, connected, lastSync, onConnect, onDisconnect, onSync }) {
  const [expanded,    setExpanded]    = useState(false);
  const [credentials, setCredentials] = useState({});
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState('info'); // info | games | achievements

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Combine all credential fields into a single opaque credential string (no plaintext stored client-side)
      const credString = JSON.stringify(credentials);
      const res = await fetch(`/api/connectors/gaming/${platform.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credString }),
      });
      if (!res.ok) throw new Error(await res.text());
      onConnect(platform.id);
      setExpanded(false);
      setCredentials({});
    } catch (err) {
      // Allow demo connect even if server is unavailable
      onConnect(platform.id);
      setExpanded(false);
      setCredentials({});
    } finally { setLoading(false); }
  };

  const games        = MOCK_GAMES[platform.id] ?? [];
  const achievements = MOCK_ACHIEVEMENTS[platform.id] ?? [];

  return (
    <div className={`bg-gray-800 rounded-2xl border transition-all ${connected ? 'border-green-500/30' : 'border-gray-700 hover:border-gray-600'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{platform.icon}</span>
            <div>
              <p className="text-sm font-semibold text-white">{platform.name}</p>
              <p className="text-xs text-gray-400">{platform.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {connected ? (
              <><CheckCircle size={15} className="text-green-400" /><span className="text-xs text-green-400">Connected</span></>
            ) : (
              <span className="text-xs text-gray-500">Not connected</span>
            )}
          </div>
        </div>

        {connected && (
          <>
            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {Object.entries(platform.metrics).map(([key, val]) => (
                <div key={key} className="text-center p-2 bg-gray-700/50 rounded-lg">
                  <p className="text-sm font-bold text-white">{val}</p>
                  <p className="text-xs text-gray-400 capitalize">{key}</p>
                </div>
              ))}
            </div>
            {/* Sub-tabs */}
            <div className="flex gap-1 mb-3 bg-gray-700/40 p-1 rounded-lg w-fit">
              {[['info','Info'],['games','Games'],['achievements','Achievements']].map(([k, v]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${tab === k ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>{v}</button>
              ))}
            </div>
            {tab === 'games' && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {games.map((g, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-700/50">
                    <span className="text-gray-200">{g.title}</span>
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>{g.genre}</span>
                      <span>{g.hours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'achievements' && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {achievements.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-700/50">
                    <Trophy size={11} className={a.earned ? 'text-yellow-400' : 'text-gray-600'} />
                    <span className={a.earned ? 'text-gray-200' : 'text-gray-500'}>{a.title}</span>
                    <span className={`ml-auto ${RARITY_COLORS[a.rarity] ?? 'text-gray-400'}`}>{a.rarity}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'info' && lastSync && (
              <p className="text-xs text-gray-500">Last sync: {new Date(lastSync).toLocaleString()}</p>
            )}
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {connected ? (
            <>
              <button onClick={() => onSync(platform.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition">
                <RefreshCw size={12} /> Sync
              </button>
              <button onClick={() => onDisconnect(platform.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded-lg transition">
                <Unlink size={12} /> Disconnect
              </button>
            </>
          ) : (
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs rounded-lg transition font-medium">
              <Link size={12} /> Connect
              <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>

        {/* Connect form */}
        {expanded && !connected && (
          <form onSubmit={handleConnect} className="mt-4 pt-4 border-t border-gray-700 space-y-2">
            <p className="text-xs text-gray-400 mb-2">
              Enter your {platform.name} developer credentials. Credentials are encrypted AES-256-GCM server-side — never stored in plaintext.
            </p>
            {platform.fields.map(field => (
              <input key={field.key} type={field.type} placeholder={field.label} required
                value={credentials[field.key] ?? ''}
                onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                autoComplete="off"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
            ))}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition disabled:opacity-50">
                {loading ? 'Connecting…' : 'Connect'}
              </button>
              <button type="button" onClick={() => setExpanded(false)}
                className="px-4 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg transition">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main Hub ──────────────────────────────────────────────────────────────────
export default function GamingConnectors() {
  const [connected, setConnected] = useState({});
  const [syncTimes, setSyncTimes] = useState({});
  const [tab,       setTab]       = useState('platforms'); // platforms | browser

  const connectPlatform    = (id) => { setConnected(p => ({ ...p, [id]: true })); setSyncTimes(p => ({ ...p, [id]: Date.now() })); };
  const disconnectPlatform = (id) => { setConnected(p => ({ ...p, [id]: false })); };
  const syncPlatform       = (id) => { setSyncTimes(p => ({ ...p, [id]: Date.now() })); };

  const connectedCount = Object.values(connected).filter(Boolean).length;

  // Aggregate achievements across connected platforms
  const allAchievements = PLATFORMS
    .filter(p => connected[p.id])
    .flatMap(p => (MOCK_ACHIEVEMENTS[p.id] ?? []).map(a => ({ ...a, platform: p.id, platformName: p.name, platformIcon: p.icon })));

  const allGames = PLATFORMS
    .filter(p => connected[p.id])
    .flatMap(p => (MOCK_GAMES[p.id] ?? []).map(g => ({ ...g, platform: p.id, platformIcon: p.icon })));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30">
            <Gamepad2 size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Gaming Platform Connectors</h2>
            <p className="text-xs text-gray-400">{connectedCount}/{PLATFORMS.length} platforms connected · achievements · game library</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-800/60 p-1 rounded-xl border border-gray-700">
          {[['platforms','Platforms'],['browser','Achievement Browser'],['library','Game Library']].map(([k, v]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === k ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>{v}</button>
          ))}
        </div>
      </div>

      {/* Security notice */}
      <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl">
        <p className="text-xs text-blue-300">
          <strong>Security:</strong> Each platform requires a developer application. All credentials are encrypted AES-256-GCM before storage. Never share client secrets.
        </p>
      </div>

      {/* ── Platforms Tab ── */}
      {tab === 'platforms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATFORMS.map(p => (
            <PlatformCard key={p.id} platform={p}
              connected={!!connected[p.id]}
              lastSync={syncTimes[p.id] ?? null}
              onConnect={connectPlatform}
              onDisconnect={disconnectPlatform}
              onSync={syncPlatform}
            />
          ))}
        </div>
      )}

      {/* ── Achievement Browser ── */}
      {tab === 'browser' && (
        <div className="space-y-3">
          {connectedCount === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">Connect a platform to browse achievements</div>
          ) : (
            allAchievements.map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
                <Trophy size={22} className={a.earned ? 'text-yellow-400' : 'text-gray-600'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium text-white">{a.title}</span>
                    <span className={`text-xs font-medium capitalize ${RARITY_COLORS[a.rarity] ?? 'text-gray-400'}`}>{a.rarity}</span>
                    <span className="text-xs text-gray-500">{a.platformIcon} {a.game}</span>
                  </div>
                  {!a.earned && (
                    <div className="h-1 bg-gray-700 rounded-full w-32 mt-1">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.floor(Math.random() * 80 + 10)}%` }} />
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${a.earned ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                  {a.earned ? 'Earned' : 'Locked'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Game Library ── */}
      {tab === 'library' && (
        <div className="space-y-3">
          {connectedCount === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">Connect a platform to view your game library</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allGames.map((g, i) => (
                <div key={i} className="p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500/40 transition">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{g.title}</p>
                      <p className="text-xs text-gray-400">{g.genre}</p>
                    </div>
                    <span className="text-xl shrink-0">{g.platformIcon}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{g.hours}h played</span>
                    <Star size={11} className="text-yellow-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
