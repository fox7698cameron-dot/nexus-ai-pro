// src/components/GamingConnectors.jsx
// 2026-07-24 | Nexus AI Pro - Gaming Platform Connectors UI
// Epic/Unreal, PlayStation, Xbox, Ubisoft + Achievement Tracking

import React, { useState, useEffect } from 'react';
import { Gamepad2, Trophy, Star, CheckCircle2, Zap, Link2, Loader2 } from 'lucide-react';

const PLATFORM_META = {
  epic:        { color: '#313131', emoji: '🎮', label: 'Epic Games / Unreal' },
  playstation: { color: '#003087', emoji: '🎯', label: 'PlayStation Network' },
  xbox:        { color: '#107C10', emoji: '🟢', label: 'Xbox / Microsoft' },
  ubisoft:     { color: '#0070FF', emoji: '🔷', label: 'Ubisoft Connect' },
};

const TROPHY_COLORS = {
  bronze: 'text-amber-600',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
  platinum: 'text-purple-400',
  legendary: 'text-yellow-300',
  rare: 'text-blue-400',
  common: 'text-gray-400',
};

function AchievementCard({ achievement }) {
  const color = achievement.unlocked
    ? (TROPHY_COLORS[achievement.type || achievement.rarity] || 'text-yellow-400')
    : 'text-gray-600';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${achievement.unlocked ? 'bg-gray-700/80' : 'bg-gray-800/50 opacity-50'}`}>
      <div className={`text-2xl ${color}`}>
        {achievement.unlocked ? '🏆' : '🔒'}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`}>
          {achievement.name}
        </div>
        <div className="text-xs text-gray-500 truncate">{achievement.description}</div>
        {achievement.unlocked && achievement.unlockedAt && (
          <div className="text-xs text-gray-600">{new Date(achievement.unlockedAt).toLocaleDateString()}</div>
        )}
      </div>
      <div className="shrink-0 text-right">
        {achievement.xp && <div className="text-xs text-yellow-400">+{achievement.xp} XP</div>}
        {achievement.gamerscore && <div className="text-xs text-green-400">{achievement.gamerscore}G</div>}
        {achievement.units && <div className="text-xs text-blue-400">{achievement.units} U</div>}
        {achievement.type && <div className={`text-xs font-medium capitalize ${TROPHY_COLORS[achievement.type]}`}>{achievement.type}</div>}
      </div>
    </div>
  );
}

function PlatformPanel({ platform, meta, progress, achievements, onConnect }) {
  const { color, emoji, label } = meta;
  const connected = progress?.connected;
  const pct = progress?.completionPercent ?? 0;
  const unlocked = progress?.unlockedAchievements ?? 0;
  const total = progress?.totalAchievements ?? 0;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <div>
              <div className="font-semibold text-white text-sm">{label}</div>
              <div className="text-xs text-gray-400">{connected ? `${unlocked}/${total} achievements` : 'Not connected'}</div>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
        </div>

        {connected && (
          <>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Completion</span>
              <span className="text-white font-medium">{pct}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </>
        )}

        {!connected && (
          <button
            onClick={() => onConnect(platform)}
            className="w-full py-2 text-sm border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Link2 size={14} />
            Connect {label}
          </button>
        )}
      </div>

      {connected && achievements?.length > 0 && (
        <div className="border-t border-gray-700 p-3 space-y-1.5 max-h-48 overflow-y-auto">
          {achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      )}
    </div>
  );
}

export function GamingConnectors() {
  const [platforms, setPlatforms] = useState([]);
  const [progress, setProgress] = useState({});
  const [achievements, setAchievements] = useState({});
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('nexus:accessToken');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const load = async () => {
      try {
        const [plats, prog] = await Promise.all([
          fetch('/api/gaming/platforms').then(r => r.json()),
          token ? fetch('/api/gaming/progress', { headers }).then(r => r.json()) : Promise.resolve({}),
        ]);
        setPlatforms(plats);
        if (prog?.platforms) {
          setProgress(prog.platforms);
          // Load achievements for connected platforms
          for (const [pid, pdata] of Object.entries(prog.platforms)) {
            if (pdata.connected) {
              fetch(`/api/gaming/${pid}/achievements`, { headers })
                .then(r => r.json())
                .then(data => {
                  if (data.achievements) setAchievements(prev => ({ ...prev, [pid]: data.achievements }));
                });
            }
          }
        }
      } catch { /* non-critical */ }
      setLoading(false);
    };
    load();
  }, []);

  const handleConnect = (platform) => {
    fetch(`/api/gaming/${platform}/oauth-url`, { headers })
      .then(r => r.json())
      .then(({ url }) => {
        if (url) window.open(url, '_blank', 'width=600,height=700');
        else alert('Platform OAuth not configured yet. Add client credentials to .env');
      });
  };

  const totalUnlocked = Object.values(achievements).flat().filter(a => a.unlocked).length;
  const totalAchievements = Object.values(achievements).flat().length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading gaming platforms…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gamepad2 size={22} className="text-green-400" />
            Gaming Platforms
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Connect Epic, PlayStation, Xbox, Ubisoft & track achievements
          </p>
        </div>
        {totalAchievements > 0 && (
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
            <Trophy size={16} className="text-yellow-400" />
            <span className="text-white text-sm font-medium">{totalUnlocked}/{totalAchievements}</span>
            <span className="text-gray-400 text-xs">unlocked</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map(p => (
          <PlatformPanel
            key={p.id}
            platform={p.id}
            meta={PLATFORM_META[p.id] || { color: '#666', emoji: '🎮', label: p.name }}
            progress={progress[p.id]}
            achievements={achievements[p.id]}
            onConnect={handleConnect}
          />
        ))}
      </div>

      {/* Note about Unreal Engine */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex gap-3">
        <Zap size={18} className="text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-white">Unreal Engine Integration</p>
          <p className="text-xs text-gray-400 mt-1">
            Full Unreal Engine / Epic Games SDK support is available via the Epic Games connector.
            C++ and Blueprint project tracking is included in the Projects dashboard.
            Use your Epic client credentials in the .env file to enable OAuth.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GamingConnectors;
