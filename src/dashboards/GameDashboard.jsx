/*
 * Copyright © 2025-2026 Cameron Fox, Apache 2.0
 * File: src/dashboards/GameDashboard.jsx
 * Last updated: 2026-05-09
 */

import React, { useState, useEffect, useCallback } from 'react';

const API = (path) => `/api/games${path}`;
const token = () => localStorage.getItem('nexus_token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

const PLATFORMS_META = {
  epic:        { label: 'Epic Games / Unreal', color: 'bg-gray-700' },
  playstation: { label: 'Sony PlayStation',    color: 'bg-blue-800' },
  xbox:        { label: 'Xbox / Microsoft',    color: 'bg-green-800' },
  ubisoft:     { label: 'Ubisoft Connect',     color: 'bg-indigo-800' },
};

const MOCK_PROGRESS = [
  { id: 1, title: 'Nexus Realms', completion: 72, playtime: '48h 30m', lastPlayed: '2026-05-08T14:22:00Z' },
  { id: 2, title: 'Void Protocol', completion: 35, playtime: '12h 05m', lastPlayed: '2026-05-07T09:10:00Z' },
  { id: 3, title: 'Starforge Alpha', completion: 91, playtime: '130h 45m', lastPlayed: '2026-05-09T08:00:00Z' },
];

function PlatformBadge({ platform }) {
  const meta = PLATFORMS_META[platform] || { label: platform, color: 'bg-gray-600' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${meta.color}`}>{meta.label}</span>
  );
}

function CircleProgress({ pct }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="72" height="72" className="rotate-[-90deg]">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#374151" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke="#6366f1" strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x="36" y="36"
        textAnchor="middle" dominantBaseline="central"
        className="fill-white text-sm font-bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: '36px 36px', fontSize: '13px', fill: '#e5e7eb' }}
      >
        {pct}%
      </text>
    </svg>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg animate-bounce">
      {message}
    </div>
  );
}

function AddAchievementModal({ platforms, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', platform: platforms[0]?.id || '', game: '', points: 10, icon: '🏆' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputCls = 'bg-gray-700 text-gray-100 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-4">Add Achievement</h3>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Title" value={form.title} onChange={set('title')} />
          <select className={inputCls} value={form.platform} onChange={set('platform')}>
            {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Game" value={form.game} onChange={set('game')} />
          <input className={inputCls} type="number" placeholder="Points" value={form.points} onChange={set('points')} min={1} />
          <input className={inputCls} placeholder="Icon (emoji)" value={form.icon} onChange={set('icon')} maxLength={4} />
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm px-4 py-2">Cancel</button>
          <button
            onClick={() => onSave(form)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GameDashboard({ user }) {
  const [tab, setTab] = useState('platforms');
  const [platforms, setPlatforms] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [progress] = useState(MOCK_PROGRESS);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newId, setNewId] = useState(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await fetch(API('/platforms'), { headers: authHeaders() });
      if (res.ok) setPlatforms(await res.json());
    } catch { /* network error */ }
  }, []);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch(API('/achievements'), { headers: authHeaders() });
      if (res.ok) setAchievements(await res.json());
    } catch { /* network error */ }
  }, []);

  useEffect(() => {
    fetchPlatforms();
    fetchAchievements();
  }, [fetchPlatforms, fetchAchievements]);

  // Polling fallback for real-time achievement unlock events
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(API('/achievements/events'), { headers: authHeaders() });
        if (res.ok) {
          const events = await res.json();
          if (Array.isArray(events) && events.length > 0) {
            const latest = events[0];
            setToast(`Achievement Unlocked: ${latest.title || 'New achievement!'}`);
            fetchAchievements();
          }
        }
      } catch { /* polling silently fails */ }
    }, 15000);
    return () => clearInterval(poll);
  }, [fetchAchievements]);

  const handleConnect = async (platformId) => {
    setLoading(true);
    try {
      await fetch(API(`/platforms/${platformId}/connect`), { method: 'POST', headers: authHeaders() });
      await fetchPlatforms();
    } finally {
      setLoading(false);
    }
  };

  const handleAddAchievement = async (form) => {
    setShowModal(false);
    try {
      const res = await fetch(API('/achievements'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...form, points: Number(form.points) }),
      });
      if (res.ok) {
        const created = await res.json();
        setNewId(created.id);
        setAchievements((prev) => [created, ...prev]);
        setTimeout(() => setNewId(null), 1000);
      }
    } catch { /* ignore */ }
  };

  const totalPoints = achievements.reduce((s, a) => s + (Number(a.points) || 0), 0);

  const tabs = ['platforms', 'achievements', 'progress'];
  const tabLabel = { platforms: 'Platforms', achievements: 'Achievements', progress: 'Progress' };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {showModal && <AddAchievementModal platforms={platforms} onClose={() => setShowModal(false)} onSave={handleAddAchievement} />}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Dashboard</h1>
          {user?.name && <p className="text-gray-400 text-sm mt-0.5">Welcome, {user.name}</p>}
        </div>
        <div className="text-indigo-400 font-semibold text-sm">{totalPoints.toLocaleString()} pts total</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {/* Platforms Tab */}
      {tab === 'platforms' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(platforms.length ? platforms : Object.entries(PLATFORMS_META).map(([id, m]) => ({ id, name: m.label, connected: false, hasKey: false }))).map((p) => (
            <div key={p.id} className="bg-gray-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <div className="text-white font-semibold">{p.name}</div>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${p.connected ? 'bg-green-700 text-green-100' : 'bg-gray-600 text-gray-300'}`}>
                  {p.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <button
                onClick={() => handleConnect(p.id)}
                disabled={!p.hasKey || loading || p.connected}
                className="ml-4 px-4 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                {p.connected ? 'Connected' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Achievements Tab */}
      {tab === 'achievements' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-300 text-sm">{achievements.length} achievement{achievements.length !== 1 ? 's' : ''} · {totalPoints.toLocaleString()} pts</span>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              + Add Achievement
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`bg-gray-800 rounded-xl p-4 flex gap-3 transition-all duration-500 ${newId === a.id ? 'ring-2 ring-indigo-400 scale-105' : ''}`}
              >
                <div className="text-3xl flex-shrink-0">{a.icon || '🏆'}</div>
                <div className="min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{a.title}</div>
                  {a.description && <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{a.description}</div>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {a.platform && <PlatformBadge platform={a.platform} />}
                    {a.game && <span className="text-xs text-gray-400 truncate">{a.game}</span>}
                    <span className="text-xs text-yellow-400 font-bold ml-auto">{a.points} pts</span>
                  </div>
                  {a.unlockedAt && (
                    <div className="text-gray-500 text-xs mt-1">{new Date(a.unlockedAt).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            ))}
            {achievements.length === 0 && (
              <div className="col-span-3 text-center text-gray-500 py-12">No achievements yet. Add one!</div>
            )}
          </div>
        </div>
      )}

      {/* Progress Tab */}
      {tab === 'progress' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {progress.map((g) => (
            <div key={g.id} className="bg-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <CircleProgress pct={g.completion} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold truncate">{g.title}</div>
                  <div className="text-gray-400 text-xs mt-1">Playtime: {g.playtime}</div>
                  <div className="text-gray-500 text-xs mt-0.5">
                    Last played: {new Date(g.lastPlayed).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="mt-3 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${g.completion}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
