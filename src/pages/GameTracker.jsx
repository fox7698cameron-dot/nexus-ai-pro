// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { useState, useEffect } from 'react';
import {
  Gamepad2, Trophy, Star, Zap, Globe, Monitor, Smartphone, Link,
  CheckCircle, Award, TrendingUp, Activity, Cpu, BarChart3, Target, Flag, Crown, Medal
} from 'lucide-react';

const API = '/api';

const ENGINES = [
  { key: 'unreal', label: 'Unreal Engine', emoji: '🎮', connectPath: '/game/unreal/connect', fields: [{ name: 'projectPath', placeholder: '/path/to/project', label: 'Project Path' }] },
  { key: 'epic', label: 'Epic Games Store', emoji: '🏪', connectPath: '/game/epic/connect', fields: [{ name: 'publisherId', placeholder: 'publisher-id', label: 'Publisher ID' }] },
  { key: 'sony', label: 'PlayStation (Sony)', emoji: '🎯', connectPath: '/game/sony/connect', fields: [{ name: 'devAccountId', placeholder: 'dev-account-id', label: 'Dev Account ID' }] },
  { key: 'xbox', label: 'Xbox (Microsoft)', emoji: '🟢', connectPath: '/game/microsoft/connect', fields: [{ name: 'publisherId', placeholder: 'publisher-id', label: 'Publisher ID' }] },
  { key: 'ubisoft', label: 'Ubisoft Connect', emoji: '🔵', connectPath: '/game/ubisoft/connect', fields: [{ name: 'accountId', placeholder: 'account-id', label: 'Account ID' }] },
];

const RARITY_CONFIG = {
  common: { label: 'Common', color: 'text-gray-300', bg: 'bg-gray-700', border: 'border-gray-600', emoji: '⬜' },
  rare: { label: 'Rare', color: 'text-blue-300', bg: 'bg-blue-900/30', border: 'border-blue-700', emoji: '🟦' },
  epic: { label: 'Epic', color: 'text-purple-300', bg: 'bg-purple-900/30', border: 'border-purple-700', emoji: '🟪' },
  legendary: { label: 'Legendary', color: 'text-yellow-300', bg: 'bg-yellow-900/30', border: 'border-yellow-700', emoji: '🌟' },
};

const PLATFORM_ICONS = {
  pc: { icon: Monitor, label: 'PC' },
  mobile: { icon: Smartphone, label: 'Mobile' },
  web: { icon: Globe, label: 'Web' },
  console: { icon: Gamepad2, label: 'Console' },
};

function GaugeSvg({ value, max, label, color, unit = '' }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = 38, cx = 50, cy = 52;
  const startAngle = -210, sweep = 240;
  function polar(deg, rad) {
    const a = (deg * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  }
  function arc(start, deg) {
    const end = start + deg;
    const [sx, sy] = polar(start, r);
    const [ex, ey] = polar(end, r);
    const large = deg > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  }
  return (
    <svg viewBox="0 0 100 75" className="w-28 h-20">
      <path d={arc(startAngle, sweep)} fill="none" stroke="#1F2937" strokeWidth="7" strokeLinecap="round" />
      <path d={arc(startAngle, sweep * pct)} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">{value}{unit}</text>
      <text x={cx} y={cx + 20} textAnchor="middle" fontSize="7" fill="#6B7280">{label}</text>
    </svg>
  );
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 30, cx = 45, cy = 45, strokeW = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map(d => {
    const dash = (d.value / total) * circ;
    const slice = { ...d, dash, offset };
    offset += dash;
    return slice;
  });
  return (
    <svg viewBox="0 0 90 90" className="w-24 h-24">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1F2937" strokeWidth={strokeW} />
      {slices.map(s => (
        <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
          strokeWidth={strokeW} strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={-s.offset + circ / 4}
          style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      ))}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">{total}</text>
    </svg>
  );
}

function ProgressRing({ value }) {
  const r = 20, circ = 2 * Math.PI * r;
  const dash = (Math.min(100, value) / 100) * circ;
  return (
    <svg viewBox="0 0 50 50" className="w-12 h-12">
      <circle cx={25} cy={25} r={r} fill="none" stroke="#1F2937" strokeWidth={5} />
      <circle cx={25} cy={25} r={r} fill="none" stroke="#818CF8" strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      <text x={25} y={29} textAnchor="middle" fontSize="9" fill="white">{value}%</text>
    </svg>
  );
}

function EngineCard({ engine, connected, lastSync, onConnect }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    await onConnect(engine.connectPath, formData);
    setLoading(false);
    setShowForm(false);
  };

  return (
    <div className={`bg-gray-800 border rounded-xl p-4 flex flex-col gap-3 transition-all ${connected ? 'border-green-700' : 'border-gray-700'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{engine.emoji}</span>
          <div>
            <div className="text-sm font-semibold text-white">{engine.label}</div>
            {lastSync && <div className="text-xs text-gray-500">Synced {new Date(lastSync).toLocaleDateString()}</div>}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${connected ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-gray-700 text-gray-400'}`}>
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {!connected && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-700 text-blue-400 rounded-lg text-xs hover:bg-blue-600/30 transition-colors">
          <Link size={12} />Connect
        </button>
      )}

      {showForm && (
        <div className="flex flex-col gap-2">
          {engine.fields.map(f => (
            <input key={f.name} placeholder={f.placeholder}
              onChange={e => setFormData(d => ({ ...d, [f.name]: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500" />
          ))}
          <div className="flex gap-2">
            <button onClick={handleConnect} disabled={loading}
              className="flex-1 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-500 transition-colors disabled:opacity-50">
              {loading ? 'Connecting...' : 'Connect'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {connected && (
        <div className="flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle size={12} />Ready
        </div>
      )}
    </div>
  );
}

function AchievementCard({ achievement }) {
  const rarity = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
  return (
    <div className={`border rounded-xl p-3 flex items-start gap-3 ${rarity.bg} ${rarity.border}`}>
      <span className="text-2xl shrink-0">{rarity.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${rarity.color} truncate`}>{achievement.name}</div>
        <div className="text-xs text-gray-400 truncate">{achievement.description}</div>
        <div className="flex items-center gap-2 mt-1">
          {achievement.platform && (
            <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{achievement.platform}</span>
          )}
          <span className="text-xs text-yellow-400 flex items-center gap-0.5"><Star size={10} />{achievement.points}</span>
          <span className={`text-xs ${rarity.color}`}>{rarity.label}</span>
        </div>
        <div className="text-xs text-gray-600 mt-0.5">{achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString() : ''}</div>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, rank }) {
  const icons = [Crown, Medal, Award];
  const Icon = icons[rank - 1] || null;
  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];
  const masked = `${entry.userId.slice(0, 4)}${'*'.repeat(6)}${entry.userId.slice(-2)}`;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800">
      <div className={`w-8 text-center font-bold text-sm ${rankColors[rank - 1] || 'text-gray-400'}`}>
        {Icon ? <Icon size={16} className="mx-auto" /> : rank}
      </div>
      <div className="flex-1 text-sm text-gray-300 font-mono">{masked}</div>
      <div className="flex items-center gap-1 text-sm text-yellow-400 font-semibold">
        <Star size={12} />{entry.score.toLocaleString()}
      </div>
    </div>
  );
}

function UnlockAchievementModal({ onClose, onUnlock }) {
  const [form, setForm] = useState({ name: '', description: '', achievementId: '', gameId: '', platform: '', points: '', rarity: 'common' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-5">Unlock Achievement</h2>
        <div className="flex flex-col gap-3">
          <input value={form.name} onChange={set('name')} placeholder="Achievement name *"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          <input value={form.achievementId} onChange={set('achievementId')} placeholder="Achievement ID *"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          <input value={form.description} onChange={set('description')} placeholder="Description"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.gameId} onChange={set('gameId')} placeholder="Game ID"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <input value={form.platform} onChange={set('platform')} placeholder="Platform"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.points} onChange={set('points')} placeholder="Points"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <select value={form.rarity} onChange={set('rarity')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              {Object.keys(RARITY_CONFIG).map(r => <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={() => onUnlock({ ...form, points: parseInt(form.points) || 0 })}
              className="px-5 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Unlock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GameTracker() {
  const [connections, setConnections] = useState({});
  const [achievements, setAchievements] = useState([]);
  const [achProgress, setAchProgress] = useState({ total: 0, totalPoints: 0, byRarity: {} });
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameProjects, setGameProjects] = useState([]);
  const [gameProgress, setGameProgress] = useState([]);
  const [perfMetrics, setPerfMetrics] = useState({ fps: 60, drawCalls: 120, memoryMb: 512, shaderComplexity: 3 });
  const [selectedProject, setSelectedProject] = useState(null);
  const [showUnlock, setShowUnlock] = useState(false);

  const token = localStorage.getItem('nexus:token') || '';
  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const safeJson = async (promise) => { const r = await promise.catch(() => ({ ok: false })); return r.ok ? r.json().catch(() => null) : null; };
    const [achs, prog, lb, projs] = await Promise.all([
      safeJson(fetch(`${API}/achievements`, { headers: authHeaders })),
      safeJson(fetch(`${API}/achievements/progress`, { headers: authHeaders })),
      safeJson(fetch(`${API}/achievements/leaderboard`, { headers: authHeaders })),
      safeJson(fetch(`${API}/projects`, { headers: authHeaders })),
    ]);
    if (achs) setAchievements(achs);
    if (prog) setAchProgress(prog);
    if (lb) setLeaderboard(lb);
    if (projs) setGameProjects(projs.filter(p => p.type === 'game-dev'));
  }

  async function connectEngine(path, data) {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => ({ ok: false }));
    if (res.ok) {
      const key = path.split('/')[2];
      setConnections(c => ({ ...c, [key]: { connected: true, lastSync: new Date().toISOString() } }));
    }
  }

  async function unlockAchievement(data) {
    const res = await fetch(`${API}/achievements`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => ({ ok: false }));
    if (res.ok) {
      const ach = await res.json();
      setAchievements(prev => [ach, ...prev]);
      setAchProgress(p => ({
        ...p,
        total: p.total + 1,
        totalPoints: p.totalPoints + ach.points,
        byRarity: { ...p.byRarity, [ach.rarity]: (p.byRarity[ach.rarity] || 0) + 1 }
      }));
      setShowUnlock(false);
    }
  }

  const connectedCount = Object.values(connections).filter(c => c?.connected).length;

  const rarityChartData = Object.entries(RARITY_CONFIG).map(([key, cfg]) => ({
    label: cfg.label,
    value: achProgress.byRarity?.[key] || 0,
    color: { common: '#6B7280', rare: '#3B82F6', epic: '#A855F7', legendary: '#EAB308' }[key],
  }));

  const buildStatusColor = { complete: 'text-green-400', 'in-progress': 'bg-blue-900/20 text-blue-400', failed: 'text-red-400', pending: 'text-gray-400' };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-screen-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
              <Gamepad2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Game Development Hub
              </h1>
              <p className="text-xs text-gray-400">{connectedCount} engine{connectedCount !== 1 ? 's' : ''} connected</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {ENGINES.map(e => (
              <span key={e.key} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${connections[e.key]?.connected ? 'border-green-700 text-green-400' : 'border-gray-700 text-gray-500'}`}>
                {e.emoji} {e.label.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Engine Connections */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2"><Link size={15} />Engine Connections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {ENGINES.map(engine => (
              <EngineCard
                key={engine.key}
                engine={engine}
                connected={!!connections[engine.key]?.connected}
                lastSync={connections[engine.key]?.lastSync}
                onConnect={connectEngine}
              />
            ))}
          </div>
        </section>

        {/* Active Game Projects */}
        {gameProjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2"><Flag size={15} />Active Game Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameProjects.map(p => (
                <button key={p.id} onClick={() => setSelectedProject(p.id === selectedProject ? null : p.id)}
                  className={`text-left bg-gray-800 border rounded-xl p-4 flex items-start gap-4 transition-all hover:border-purple-600 ${p.id === selectedProject ? 'border-purple-600 ring-1 ring-purple-600' : 'border-gray-700'}`}>
                  <ProgressRing value={p.progress || 0} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.engine || 'No engine'}</div>
                    {p.platform && <div className="text-xs text-gray-500 mt-0.5">{p.platform}</div>}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {(p.tags || []).slice(0, 3).map(t => (
                        <span key={t} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded ${p.status === 'complete' ? 'bg-green-900/30 text-green-400' : p.status === 'in-progress' ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                    {p.status}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Performance Metrics for selected project */}
        {selectedProject && (
          <section className="mb-8 bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h2 className="text-base font-semibold text-gray-300 mb-4 flex items-center gap-2"><Cpu size={15} />Performance Metrics</h2>
            <div className="flex flex-wrap gap-6">
              <GaugeSvg value={perfMetrics.fps} max={120} label="FPS" color="#818CF8" />
              <GaugeSvg value={perfMetrics.drawCalls} max={1000} label="Draw Calls" color="#34D399" />
              <GaugeSvg value={perfMetrics.memoryMb} max={8192} label="Memory" color="#F59E0B" unit="MB" />
              <GaugeSvg value={perfMetrics.shaderComplexity} max={10} label="Shader Complexity" color="#F87171" />
            </div>
            <div className="flex gap-3 mt-4">
              {[['fps', 'FPS', 120], ['drawCalls', 'Draw Calls', 1000], ['memoryMb', 'Memory MB', 8192], ['shaderComplexity', 'Shader', 10]].map(([k, label, max]) => (
                <div key={k} className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">{label}</label>
                  <input type="number" min={0} max={max} value={perfMetrics[k]}
                    onChange={e => setPerfMetrics(m => ({ ...m, [k]: parseFloat(e.target.value) || 0 }))}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs w-24 focus:outline-none focus:border-purple-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Achievement Showcase */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2"><Trophy size={15} />Achievement Showcase</h2>
              <button onClick={() => setShowUnlock(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-600/20 border border-yellow-700 text-yellow-400 rounded-lg hover:bg-yellow-600/30 transition-colors">
                <Trophy size={12} />Unlock
              </button>
            </div>
            {achievements.length === 0 && (
              <div className="text-center py-12 text-gray-600 border border-dashed border-gray-700 rounded-xl">
                <Trophy size={32} className="mx-auto mb-2 opacity-30" />
                No achievements yet. Start unlocking!
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
            </div>
          </div>

          {/* Achievement Stats */}
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2"><BarChart3 size={15} />Achievement Stats</h2>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col items-center gap-4">
              <DonutChart data={rarityChartData} />
              <div className="w-full grid grid-cols-2 gap-2">
                {rarityChartData.map(d => (
                  <div key={d.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-400">{d.label}</span>
                    <span className="text-xs text-white ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
              <div className="w-full border-t border-gray-700 pt-3 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Points</span>
                  <span className="text-yellow-400 font-bold flex items-center gap-1"><Star size={12} />{achProgress.totalPoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Achievements</span>
                  <span className="text-white font-bold">{achProgress.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2"><Crown size={15} />Achievement Leaderboard</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            {leaderboard.length === 0 && <p className="text-center text-gray-600 py-6 text-sm">No leaderboard data yet.</p>}
            {leaderboard.map(entry => <LeaderboardRow key={entry.userId} entry={entry} rank={entry.rank} />)}
          </div>
        </section>

        {/* Game Progress */}
        <section>
          <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2"><Target size={15} />Game Progress</h2>
          {gameProgress.length === 0 && (
            <div className="text-center py-10 text-gray-600 border border-dashed border-gray-700 rounded-xl text-sm">
              No game progress tracked yet.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameProgress.map(gp => (
              <div key={gp.gameId} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                <ProgressRing value={gp.percentage || 0} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{gp.gameId}</div>
                  {gp.platform && <div className="text-xs text-gray-400">{gp.platform}</div>}
                  {gp.chapter && <div className="text-xs text-gray-500">Chapter: {gp.chapter}</div>}
                  <div className="text-xs text-gray-600 mt-1">{gp.updatedAt ? new Date(gp.updatedAt).toLocaleDateString() : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showUnlock && <UnlockAchievementModal onClose={() => setShowUnlock(false)} onUnlock={unlockAchievement} />}
    </div>
  );
}
