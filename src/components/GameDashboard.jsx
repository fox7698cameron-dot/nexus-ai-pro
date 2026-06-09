// src/components/GameDashboard.jsx
// Nexus AI Pro — Game Platform Connectors, Achievements & Progress Tracking
// Platforms: Epic/Unreal, PlayStation, Xbox, Ubisoft Connect, Steam, Nintendo
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Star, Link, Unlink, RefreshCw,
  TrendingUp, Clock, Medal, Shield, Zap, Target,
  Plus, ChevronRight, CheckCircle, Circle, BarChart3,
  Play, Package, Wrench
} from 'lucide-react';

const PLATFORM_CONFIG = {
  epic:        { label: 'Epic Games',          emoji: '🎮', color: 'text-blue-400',    accent: '#0078f0', connected: false },
  playstation: { label: 'PlayStation',         emoji: '🔵', color: 'text-blue-500',    accent: '#003791', connected: false },
  xbox:        { label: 'Xbox / Microsoft',    emoji: '🟢', color: 'text-green-400',   accent: '#107c10', connected: false },
  ubisoft:     { label: 'Ubisoft Connect',     emoji: '🔷', color: 'text-sky-400',     accent: '#0057b8', connected: false },
  steam:       { label: 'Steam',               emoji: '🖥️', color: 'text-gray-300',    accent: '#1b2838', connected: false },
  gog:         { label: 'GOG Galaxy',          emoji: '🌙', color: 'text-purple-400',  accent: '#8b5cf6', connected: false },
  nintendo:    { label: 'Nintendo Online',     emoji: '🔴', color: 'text-red-400',     accent: '#e4000f', connected: false },
};

const RARITY_CONFIG = {
  common:    { label: 'Common',    color: 'text-gray-400',   bg: 'bg-gray-700',         icon: '⚪' },
  uncommon:  { label: 'Uncommon',  color: 'text-green-400',  bg: 'bg-green-900/30',     icon: '🟢' },
  rare:      { label: 'Rare',      color: 'text-blue-400',   bg: 'bg-blue-900/30',      icon: '🔵' },
  epic:      { label: 'Epic',      color: 'text-purple-400', bg: 'bg-purple-900/30',    icon: '🟣' },
  legendary: { label: 'Legendary', color: 'text-yellow-400', bg: 'bg-yellow-900/20',    icon: '🌟' },
};

function apiHeaders() {
  const token = localStorage.getItem('nexus:accessToken');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function AchievementCard({ achievement }) {
  const rarity  = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
  const unlocked = !!achievement.unlockedAt;

  return (
    <div className={`border rounded-lg p-3 flex items-center gap-3 transition-all ${
      unlocked ? `${rarity.bg} border-opacity-50 border-current` : 'bg-gray-800 border-gray-700 opacity-50 grayscale'
    }`}>
      <div className="text-2xl">{unlocked ? rarity.icon : '🔒'}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${unlocked ? 'text-white' : 'text-gray-500'}`}>{achievement.name}</p>
        <p className="text-gray-400 text-xs truncate">{achievement.desc}</p>
        {unlocked && (
          <p className="text-gray-500 text-xs mt-0.5">
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs font-bold ${rarity.color}`}>{achievement.points} pts</span>
        <span className={`text-xs ${rarity.color}`}>{rarity.label}</span>
      </div>
    </div>
  );
}

function GameProgressCard({ game }) {
  const completionColor = game.completionPct >= 90 ? '#22c55e' : game.completionPct >= 50 ? '#6366f1' : '#f59e0b';

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-white">{game.title}</p>
          <p className="text-gray-500 text-xs capitalize">{game.platform}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold" style={{ color: completionColor }}>{game.completionPct}%</p>
          <p className="text-gray-500 text-xs">complete</p>
        </div>
      </div>

      <div className="w-full h-2 bg-gray-700 rounded-full mb-3 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${game.completionPct}%`, backgroundColor: completionColor }} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-white text-sm font-medium">{Math.round(game.playTimeHours)}h</p>
          <p className="text-gray-500 text-xs">Play Time</p>
        </div>
        <div>
          <p className="text-white text-sm font-medium">Lv.{game.currentLevel}</p>
          <p className="text-gray-500 text-xs">Level</p>
        </div>
        <div>
          <p className="text-white text-sm font-medium">#{game.friendRank}</p>
          <p className="text-gray-500 text-xs">Friend Rank</p>
        </div>
      </div>

      {game.trophies && (
        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-700">
          {[
            { label: '🥇', count: game.trophies.gold,     title: 'Gold'     },
            { label: '🥈', count: game.trophies.silver,   title: 'Silver'   },
            { label: '🥉', count: game.trophies.bronze,   title: 'Bronze'   },
            { label: '🏆', count: game.trophies.platinum, title: 'Platinum' },
          ].map(t => (
            <div key={t.title} className="flex items-center gap-1" title={t.title}>
              <span>{t.label}</span>
              <span className="text-gray-300 text-xs">{t.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectModal({ platform, onClose, onConnected }) {
  const cfg      = PLATFORM_CONFIG[platform];
  const [accountId, setAccountId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!accountId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/games/connect/${platform}`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ accountId, displayName }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      onConnected(platform, data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-5">
          <span className="text-4xl">{cfg?.emoji}</span>
          <h2 className="text-white font-bold mt-2">Connect {cfg?.label}</h2>
          <p className="text-gray-400 text-sm mt-1">
            In production, this completes OAuth flow via your configured app credentials.
          </p>
        </div>
        <form onSubmit={handleConnect} className="space-y-3">
          <input
            type="text" value={accountId} onChange={e => setAccountId(e.target.value)}
            placeholder="Account ID / Gamertag" required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <input
            type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="Display name (optional)"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !accountId.trim()} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GameDashboard() {
  const [status,     setStatus]     = useState({});
  const [achievements, setAchievements] = useState({});
  const [progress,   setProgress]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('platforms');
  const [activePlat, setActivePlat] = useState(null);
  const [connecting, setConnecting] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/games/status', { headers: apiHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        const map = {};
        data.status.forEach(s => { map[s.platform] = s; });
        setStatus(map);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const fetchAchievements = useCallback(async (platform) => {
    const resp = await fetch(`/api/games/achievements/${platform}`, { headers: apiHeaders() });
    if (resp.ok) {
      const data = await resp.json();
      setAchievements(prev => ({ ...prev, [platform]: data }));
    }
  }, []);

  const fetchProgress = useCallback(async (platform) => {
    const resp = await fetch(`/api/games/progress/${platform}`, { headers: apiHeaders() });
    if (resp.ok) {
      const data = await resp.json();
      setProgress(prev => ({ ...prev, [platform]: data }));
    }
  }, []);

  const selectPlatform = useCallback(async (platform) => {
    setActivePlat(platform);
    if (!achievements[platform]) fetchAchievements(platform);
    if (!progress[platform])    fetchProgress(platform);
  }, [achievements, progress, fetchAchievements, fetchProgress]);

  const disconnect = async (platform) => {
    await fetch(`/api/games/connect/${platform}`, { method: 'DELETE', headers: apiHeaders() });
    fetchStatus();
    if (activePlat === platform) setActivePlat(null);
  };

  const connectedPlatforms = Object.entries(status).filter(([, s]) => s.connected).map(([k]) => k);
  const totalAchievements  = connectedPlatforms.reduce((sum, p) => sum + (achievements[p]?.unlocked?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 size={28} className="text-purple-400" />
            Game Hub
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {connectedPlatforms.length} platform{connectedPlatforms.length !== 1 ? 's' : ''} connected · {totalAchievements} achievements unlocked
          </p>
        </div>
        <button onClick={fetchStatus} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit mb-6 overflow-x-auto">
        {['platforms', 'achievements', 'progress', 'leaderboard'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
              activeTab === tab ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Platforms tab */}
      {activeTab === 'platforms' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(PLATFORM_CONFIG).map(([platform, cfg]) => {
            const s         = status[platform];
            const connected = s?.connected;

            return (
              <div
                key={platform}
                className={`border rounded-xl p-4 transition-all cursor-pointer ${
                  connected
                    ? activePlat === platform ? 'border-purple-500 bg-gray-800' : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                }`}
                onClick={() => connected && selectPlatform(platform)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span className={`text-sm font-medium ${connected ? 'text-white' : 'text-gray-500'}`}>{cfg.label}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-600'}`} />
                </div>

                {connected ? (
                  <>
                    <p className="text-gray-400 text-xs mb-3">
                      {s.connection?.displayName || s.connection?.accountId}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); selectPlatform(platform); }}
                        className="flex-1 py-1.5 bg-gray-700 text-gray-200 rounded-lg text-xs hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <ChevronRight size={12} /> View
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); disconnect(platform); }}
                        className="py-1.5 px-3 border border-red-700 text-red-400 rounded-lg text-xs hover:bg-red-900/20 transition-colors"
                      >
                        <Unlink size={12} />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setConnecting(platform); }}
                    className="w-full py-2 border border-gray-600 text-gray-400 rounded-lg text-xs hover:border-indigo-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1"
                  >
                    <Link size={12} /> Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Achievements tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          {connectedPlatforms.length === 0 ? (
            <div className="text-center py-16">
              <Trophy size={48} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Connect a platform to see your achievements</p>
            </div>
          ) : (
            connectedPlatforms.map(platform => {
              const data = achievements[platform];
              const cfg  = PLATFORM_CONFIG[platform];
              if (!data) return null;

              return (
                <div key={platform} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span>{cfg.emoji}</span>
                    <h2 className="text-white font-medium">{cfg.label}</h2>
                    <span className="text-gray-500 text-sm">· {data.unlocked?.length}/{data.total} · {data.totalPoints} pts</span>
                    <div className="flex-1 h-px bg-gray-700 ml-2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[...(data.unlocked || []), ...(data.locked || [])].map(a => (
                      <AchievementCard key={a.id} achievement={a} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Progress tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {connectedPlatforms.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 size={48} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Connect a platform to see your game progress</p>
            </div>
          ) : (
            connectedPlatforms.map(platform => {
              const data = progress[platform];
              const cfg  = PLATFORM_CONFIG[platform];
              if (!data) return <div key={platform} className="flex justify-center py-4"><RefreshCw size={18} className="text-indigo-400 animate-spin" /></div>;

              return (
                <div key={platform} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span>{cfg.emoji}</span>
                    <h2 className="text-white font-medium">{cfg.label}</h2>
                    <div className="flex-1 h-px bg-gray-700 ml-2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(data.games || []).map(game => (
                      <GameProgressCard key={game.gameId} game={game} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {connectedPlatforms.length === 0 ? (
            <div className="text-center py-16">
              <Medal size={48} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Connect a platform to see leaderboards</p>
            </div>
          ) : (
            connectedPlatforms.slice(0, 2).map(platform => (
              <LeaderboardPanel key={platform} platform={platform} />
            ))
          )}
        </div>
      )}

      {connecting && (
        <ConnectModal
          platform={connecting}
          onClose={() => setConnecting(null)}
          onConnected={() => { fetchStatus(); setConnecting(null); }}
        />
      )}
    </div>
  );
}

function LeaderboardPanel({ platform }) {
  const [data, setData] = useState(null);
  const cfg = PLATFORM_CONFIG[platform];

  useEffect(() => {
    const token = localStorage.getItem('nexus:accessToken');
    fetch(`/api/games/leaderboard/${platform}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d));
  }, [platform]);

  if (!data) return <div className="flex justify-center py-4"><RefreshCw size={18} className="text-indigo-400 animate-spin" /></div>;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h2 className="text-white font-medium mb-4 flex items-center gap-2">
        <span>{cfg.emoji}</span> {cfg.label} Leaderboard
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-700">
            <th className="text-left pb-2">Rank</th>
            <th className="text-left pb-2">Player</th>
            <th className="text-right pb-2">Score</th>
            <th className="text-right pb-2 hidden sm:table-cell">Games</th>
          </tr>
        </thead>
        <tbody>
          {data.leaderboard.map(entry => (
            <tr key={entry.rank} className="border-b border-gray-800">
              <td className="py-2 text-gray-400">{entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank-1] : `#${entry.rank}`}</td>
              <td className="py-2 text-gray-200">{entry.displayName}</td>
              <td className="py-2 text-right text-white font-medium">{entry.score.toLocaleString()}</td>
              <td className="py-2 text-right text-gray-500 hidden sm:table-cell">{entry.gamesPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
