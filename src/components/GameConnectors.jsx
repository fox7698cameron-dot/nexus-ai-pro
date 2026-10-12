// Nexus AI Pro - GameConnectors | 2026-10-12
import { useState, useEffect, useCallback } from 'react';

const CONNECTORS = [
  { id: 'unreal', name: 'Unreal Engine / Epic Games', icon: 'U', color: '#0078BF', description: 'Unreal Engine & Epic Games Store' },
  { id: 'playstation', name: 'PlayStation Network', icon: 'PS', color: '#003087', description: 'Sony PlayStation Network' },
  { id: 'xbox', name: 'Xbox Live', icon: 'X', color: '#107C10', description: 'Microsoft Xbox Live' },
  { id: 'ubisoft', name: 'Ubisoft Connect', icon: 'UB', color: '#0036A3', description: 'Ubisoft Connect' },
];

function ConnectorIcon({ connector }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
      style={{ backgroundColor: connector.color }}
      aria-hidden="true"
    >
      {connector.icon}
    </div>
  );
}

function AchievementBar({ earned, total }) {
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Achievements</span>
        <span>{earned}/{total} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5" role="progressbar" aria-valuenow={earned} aria-valuemin={0} aria-valuemax={total}>
        <div className="h-1.5 rounded-full bg-yellow-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ConnectorCard({ connector, data, onConnect, onDisconnect, onSync }) {
  const connected = data?.connected ?? false;
  const syncing = data?.syncing ?? false;

  return (
    <article className="bg-gray-800 rounded-xl p-4 flex flex-col gap-4" aria-label={`${connector.name} connector`}>
      <div className="flex items-start gap-3">
        <ConnectorIcon connector={connector} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{connector.name}</div>
          <div className="text-gray-400 text-xs">{connector.description}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`}
            aria-hidden="true"
          />
          <span className={`text-xs ${connected ? 'text-green-400' : 'text-gray-400'}`}>
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {connected && data && (
        <>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-gray-700/50 rounded-lg p-2">
              <div className="text-white font-semibold">{data.activeGames ?? 0}</div>
              <div className="text-gray-400 text-xs">Active Games</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-2">
              <div className="text-white font-semibold">{data.achievementCount ?? 0}</div>
              <div className="text-gray-400 text-xs">Achievements</div>
            </div>
          </div>

          {data.achievementsEarned !== undefined && (
            <AchievementBar earned={data.achievementsEarned} total={data.achievementCount ?? data.achievementsEarned} />
          )}

          {data.lastSync && (
            <div className="text-xs text-gray-500">
              Last sync: {new Date(data.lastSync).toLocaleString()}
            </div>
          )}

          {(data.recentGames ?? []).length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-2">Recent Games</div>
              <div className="space-y-1">
                {(data.recentGames ?? []).slice(0, 3).map((game, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded px-2 py-1.5">
                    <span className="text-sm text-gray-200 truncate">{game.name}</span>
                    {game.progress !== undefined && (
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{game.progress}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data.leaderboard ?? []).length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-2">Leaderboard</div>
              <div className="space-y-1">
                {(data.leaderboard ?? []).slice(0, 3).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-4">{i + 1}</span>
                      <span className="text-gray-200">{entry.name}</span>
                    </div>
                    <span className="text-gray-400">{entry.score?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 mt-auto">
        {connected ? (
          <>
            <button
              onClick={() => onSync(connector.id)}
              disabled={syncing}
              className="flex-1 bg-gray-700 hover:bg-gray-600 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
              aria-label={`Sync ${connector.name}`}
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={() => onDisconnect(connector.id)}
              className="flex-1 bg-red-900/50 hover:bg-red-900 border border-red-700 text-red-300 py-1.5 rounded-lg text-xs transition-colors"
              aria-label={`Disconnect from ${connector.name}`}
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(connector.id)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors text-white"
            style={{ backgroundColor: connector.color }}
            aria-label={`Connect to ${connector.name}`}
          >
            Connect
          </button>
        )}
      </div>
    </article>
  );
}

export default function GameConnectors() {
  const [connectorData, setConnectorData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch('/api/gamedev/connectors');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConnectorData(data.connectors ?? data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const handleConnect = async (id) => {
    try {
      const res = await fetch(`/api/gamedev/connectors/${id}/connect`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setConnectorData(prev => ({ ...prev, [id]: updated }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this platform?')) return;
    try {
      const res = await fetch(`/api/gamedev/connectors/${id}/disconnect`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConnectorData(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), connected: false } }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSync = async (id) => {
    setConnectorData(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), syncing: true } }));
    try {
      const res = await fetch(`/api/gamedev/connectors/${id}/sync`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setConnectorData(prev => ({ ...prev, [id]: { ...updated, syncing: false } }));
    } catch (err) {
      setError(err.message);
      setConnectorData(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), syncing: false } }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-live="polite" aria-busy="true">
        <div className="text-gray-400 animate-pulse">Loading connectors...</div>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-6 text-white min-h-screen bg-gray-900" aria-label="Game Platform Connectors">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Game Connectors</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your game development platforms</p>
        </div>
        <button
          onClick={fetchConnectors}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition-colors"
          aria-label="Refresh connector status"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CONNECTORS.map(connector => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            data={connectorData[connector.id]}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
          />
        ))}
      </div>
    </main>
  );
}
