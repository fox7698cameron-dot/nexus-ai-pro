// ================================================
// NEXUS AI PRO - Game Dev Dashboard
// File: src/components/GameDevDashboard.jsx
// Updated: 2026-07-01
// Platforms: Epic/Unreal, PSN, Xbox, Ubisoft, Steam
// Engines: Unreal, Unity, Godot, O3DE, Blender
// AR/VR: ARKit, ARCore, OpenXR, Oculus, VIVE
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Star, Zap, Plus, RefreshCw, Link,
  Link2Off, Loader2, ChevronRight, X, AlertTriangle,
  Glasses, Cpu, Package, BarChart3, Check, Circle,
  Shield, Users, Clock,
} from 'lucide-react';

const GAMING_PLATFORMS = [
  { id: 'epic',        label: 'Epic Games',     color: '#2d2d2d', accent: '#3b82f6', logo: '🎮' },
  { id: 'playstation', label: 'PlayStation',    color: '#00439C', accent: '#60a5fa', logo: '🎮' },
  { id: 'xbox',        label: 'Xbox',           color: '#107C10', accent: '#4ade80', logo: '🎮' },
  { id: 'ubisoft',     label: 'Ubisoft Connect',color: '#1b1b5e', accent: '#818cf8', logo: '🎮' },
  { id: 'steam',       label: 'Steam',          color: '#1b2838', accent: '#7dd3fc', logo: '🎮' },
];

const ENGINES = [
  { id: 'unreal',  label: 'Unreal Engine',  tag: 'UE5',   color: 'from-blue-600 to-cyan-500' },
  { id: 'unity',   label: 'Unity',          tag: 'Unity', color: 'from-gray-700 to-gray-500' },
  { id: 'godot',   label: 'Godot',          tag: 'Godot', color: 'from-indigo-600 to-blue-400' },
  { id: 'o3de',    label: 'O3DE',           tag: 'O3DE',  color: 'from-orange-600 to-yellow-500' },
  { id: 'blender', label: 'Blender',        tag: '3D',    color: 'from-orange-500 to-amber-400' },
];

const XR_FRAMEWORKS = [
  { id: 'arkit',    label: 'ARKit',      platform: 'iOS/macOS' },
  { id: 'arcore',   label: 'ARCore',     platform: 'Android' },
  { id: 'openxr',   label: 'OpenXR',     platform: 'Cross-platform' },
  { id: 'oculus',   label: 'Meta XR',    platform: 'Quest / PC' },
  { id: 'vive',     label: 'VIVE SDK',   platform: 'SteamVR' },
  { id: 'webxr',    label: 'WebXR',      platform: 'Browser' },
];

function PlatformTile({ platform, isConnected, onConnect, onDisconnect }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: platform.color }}>
          {platform.logo}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{platform.label}</p>
          <p className={`text-xs ${isConnected ? 'text-green-500' : 'text-gray-400'}`}>
            {isConnected ? 'Connected' : 'Not connected'}
          </p>
        </div>
      </div>
      <button
        onClick={() => isConnected ? onDisconnect(platform.id) : onConnect(platform.id)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isConnected ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
        {isConnected ? <><Link2Off size={12} /> Disconnect</> : <><Link size={12} /> Connect</>}
      </button>
    </div>
  );
}

function AchievementCard({ achievement }) {
  const pct = achievement.max_value > 0 ? Math.min(100, (achievement.current_value / achievement.max_value) * 100) : (achievement.is_unlocked ? 100 : 0);
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all ${achievement.is_unlocked ? 'border-yellow-300 dark:border-yellow-700' : 'border-gray-200 dark:border-gray-700 opacity-70'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${achievement.is_unlocked ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
          {achievement.icon_url ? <img src={achievement.icon_url} alt="" className="w-6 h-6" /> : <Trophy size={20} className={achievement.is_unlocked ? 'text-yellow-500' : 'text-gray-400'} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm">{achievement.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{achievement.description}</p>
          {achievement.max_value > 1 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{achievement.current_value} / {achievement.max_value}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          {achievement.is_unlocked && achievement.unlocked_at && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
              <Star size={9} /> {new Date(achievement.unlocked_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${achievement.rarity === 'legendary' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : achievement.rarity === 'rare' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
          {achievement.rarity || 'common'}
        </div>
      </div>
    </div>
  );
}

function ConnectModal({ platform, onClose, onSave }) {
  const [accessToken, setAccessToken] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexus_access_token');
      const res = await fetch(`/api/gaming/connect/${platform.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accessToken, username }),
      });
      if (res.ok) { onSave(platform.id); onClose(); }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Connect {platform.label}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Username / Player ID</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your gamertag or player ID" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Access Token</label>
            <input type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)}
              className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste your API token" />
          </div>
          <p className="text-xs text-gray-400">Tokens are stored encrypted and never shared.</p>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
          <button onClick={handleConnect} disabled={loading || !accessToken}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Connect
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GameDevDashboard({ socket }) {
  const [tab, setTab] = useState('platforms'); // platforms | achievements | progress | engines
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectTarget, setConnectTarget] = useState(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [syncingPlatform, setSyncingPlatform] = useState(null);

  const token = () => localStorage.getItem('nexus_access_token');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [platRes, achRes, progRes] = await Promise.all([
        fetch('/api/gaming/platforms', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/gaming/achievements', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/gaming/progress', { headers: { Authorization: `Bearer ${token()}` } }).catch(() => ({ ok: false })),
      ]);
      if (platRes.ok) { const d = await platRes.json(); setConnectedPlatforms(d.connected || []); }
      if (achRes.ok) { const d = await achRes.json(); setAchievements(d.achievements || []); }
      if (progRes.ok) { const d = await progRes.json(); setProgress(d.progress || []); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;
    const handler = data => {
      if (data.type === 'achievement') setAchievements(prev => [...prev, data]);
      if (data.type === 'progress') setProgress(prev => prev.map(p => p.game_id === data.game_id ? data : p));
    };
    socket.on('gaming:update', handler);
    return () => socket.off('gaming:update', handler);
  }, [socket]);

  const syncAchievements = async (platformId) => {
    setSyncingPlatform(platformId);
    try {
      await fetch('/api/gaming/achievements/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ platform: platformId }),
      });
      await fetchAll();
    } catch {}
    setSyncingPlatform(null);
  };

  const filteredAchievements = achievements.filter(a => filterPlatform === 'all' || a.platform === filterPlatform);
  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const totalCount = achievements.length;
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const TABS = [
    { id: 'platforms',    label: 'Platforms',    icon: Gamepad2 },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'progress',     label: 'Progress',     icon: BarChart3 },
    { id: 'engines',      label: 'Engines & XR', icon: Cpu },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gamepad2 size={20} className="text-purple-500" /> Game Dev Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {connectedPlatforms.length} platform{connectedPlatforms.length !== 1 ? 's' : ''} connected · {unlockedCount}/{totalCount} achievements unlocked
          </p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-gray-700">
        {[
          { label: 'Connected', value: connectedPlatforms.length, icon: Link },
          { label: 'Unlocked', value: unlockedCount, icon: Trophy },
          { label: 'Completion', value: `${completionPct}%`, icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3">
            <Icon size={18} className="text-purple-500" />
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">

        {/* PLATFORMS TAB */}
        {tab === 'platforms' && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gaming Platforms</h2>
            {GAMING_PLATFORMS.map(p => (
              <PlatformTile key={p.id} platform={p}
                isConnected={connectedPlatforms.includes(p.id)}
                onConnect={id => setConnectTarget(GAMING_PLATFORMS.find(x => x.id === id))}
                onDisconnect={async id => {
                  await fetch(`/api/gaming/connect/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
                  setConnectedPlatforms(prev => prev.filter(x => x !== id));
                }} />
            ))}
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sync Achievements</h2>
              <div className="flex flex-wrap gap-2">
                {connectedPlatforms.map(pId => {
                  const p = GAMING_PLATFORMS.find(x => x.id === pId);
                  if (!p) return null;
                  return (
                    <button key={pId} onClick={() => syncAchievements(pId)} disabled={syncingPlatform === pId}
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                      {syncingPlatform === pId ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Sync {p.label}
                    </button>
                  );
                })}
                {connectedPlatforms.length === 0 && (
                  <p className="text-sm text-gray-400">Connect a platform above to sync achievements.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {tab === 'achievements' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Achievements</h2>
              <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <option value="all">All Platforms</option>
                {GAMING_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {filteredAchievements.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-600">
                <Trophy size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No achievements yet — connect a platform and sync.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredAchievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
              </div>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {tab === 'progress' && (
          <div className="max-w-2xl space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Game Progress</h2>
            {progress.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-600">
                <BarChart3 size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No progress data — sync your platforms first.</p>
              </div>
            ) : progress.map(g => (
              <div key={g.game_id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{g.game_name || g.game_id}</p>
                    <p className="text-xs text-gray-500">{GAMING_PLATFORMS.find(p => p.id === g.platform)?.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{g.completion_pct?.toFixed(0) || 0}%</p>
                    <p className="text-xs text-gray-400">complete</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, g.completion_pct || 0)}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {[
                    { label: 'Hours', value: (g.play_time_minutes / 60).toFixed(1) },
                    { label: 'Level', value: g.current_level || '—' },
                    { label: 'Score', value: g.score ? g.score.toLocaleString() : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{value}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
                {g.last_played_at && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={10} /> Last played {new Date(g.last_played_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ENGINES & XR TAB */}
        {tab === 'engines' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Game Engines</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ENGINES.map(e => (
                  <div key={e.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white font-medium bg-gradient-to-r ${e.color} mb-2`}>
                      {e.tag}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{e.label}</p>
                    <p className="text-xs text-gray-400 mt-1">Project templates available</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">AR / VR / XR Frameworks</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {XR_FRAMEWORKS.map(f => (
                  <div key={f.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Glasses size={16} className="text-indigo-500" />
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{f.label}</p>
                    </div>
                    <p className="text-xs text-gray-400">{f.platform}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Supported Languages</h2>
              <div className="flex flex-wrap gap-2">
                {['C++', 'C#', 'Blueprint', 'GDScript', 'Python', 'Lua', 'Swift', 'Kotlin', 'JavaScript', 'WebAssembly', 'HLSL', 'GLSL'].map(lang => (
                  <span key={lang} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 rounded-full font-mono">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {connectTarget && (
        <ConnectModal platform={connectTarget} onClose={() => setConnectTarget(null)}
          onSave={id => { setConnectedPlatforms(prev => [...new Set([...prev, id])]); }} />
      )}
    </div>
  );
}
