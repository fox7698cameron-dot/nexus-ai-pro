// ================================================
// NEXUS AI PRO - Game Dev Tracker Component
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, TrendingUp, BarChart2, Layers,
  Zap, RefreshCw, Plus, X, CheckCircle2, AlertCircle,
  Link, Link2Off, Clock, Users, Star, Award,
  Box, Monitor, Cpu, Package, Activity
} from 'lucide-react';

// ------------------------------------------------
// Constants
// ------------------------------------------------
const PLATFORM_UI = {
  unreal: { emoji: '🎮', color: 'from-blue-600 to-blue-900', accent: 'blue', label: 'Unreal Engine' },
  epic: { emoji: '🏪', color: 'from-gray-700 to-gray-900', accent: 'gray', label: 'Epic Games' },
  sony: { emoji: '🔵', color: 'from-blue-800 to-indigo-900', accent: 'indigo', label: 'PlayStation' },
  microsoft: { emoji: '🟢', color: 'from-green-700 to-green-900', accent: 'green', label: 'Xbox' },
  ubisoft: { emoji: '🔷', color: 'from-sky-700 to-sky-900', accent: 'sky', label: 'Ubisoft Connect' }
};

const PLATFORM_FIELDS = {
  unreal: [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'ue5-api-key-...' },
    { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'proj_...' },
    { key: 'engineVersion', label: 'Engine Version', type: 'text', placeholder: '5.3' }
  ],
  epic: [
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'eg1~...' },
    { key: 'accountId', label: 'Account ID', type: 'text', placeholder: 'account_...' }
  ],
  sony: [
    { key: 'devNetApiKey', label: 'DevNet API Key', type: 'password', placeholder: 'psn-dev-...' },
    { key: 'titleId', label: 'Title ID', type: 'text', placeholder: 'NPWR...' },
    { key: 'env', label: 'Environment', type: 'select', options: ['dev', 'qa', 'prod'] }
  ],
  microsoft: [
    { key: 'sandboxId', label: 'Sandbox ID', type: 'text', placeholder: 'SANDBOX.0' },
    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'client-uuid' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '...' }
  ],
  ubisoft: [
    { key: 'appId', label: 'App ID', type: 'text', placeholder: 'ubi-app-...' },
    { key: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'production'] }
  ]
};

const BUILD_STATUS_STYLES = {
  success: 'text-green-400 bg-green-400/10',
  failed: 'text-red-400 bg-red-400/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
  running: 'text-blue-400 bg-blue-400/10',
  cancelled: 'text-gray-400 bg-gray-400/10'
};

// ------------------------------------------------
// API helpers
// ------------------------------------------------
async function gdFetch(path, options = {}) {
  const res = await fetch(`/api/gamedev${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ------------------------------------------------
// SVG Sparkline
// ------------------------------------------------
function Sparkline({ data, color = '#3b82f6', width = 120, height = 36 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${pts.join(' L ')}`;
  const areaD = `M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ------------------------------------------------
// XP Bar
// ------------------------------------------------
function XPBar({ xp, xpToNext }) {
  const pct = Math.min(100, (xp / xpToNext) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{xp.toLocaleString()} XP</span>
        <span>{xpToNext.toLocaleString()} XP</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------
// Retention Pills
// ------------------------------------------------
function RetentionPills({ retention }) {
  const pills = [
    { label: 'Day 1', value: retention?.day1, color: 'bg-green-500' },
    { label: 'Day 7', value: retention?.day7, color: 'bg-blue-500' },
    { label: 'Day 30', value: retention?.day30, color: 'bg-purple-500' }
  ];
  return (
    <div className="flex gap-3 flex-wrap">
      {pills.map(p => (
        <div key={p.label} className="flex flex-col items-center gap-1">
          <div className="text-xs text-gray-500">{p.label}</div>
          <div className={`px-2.5 py-1 rounded-full text-white text-xs font-bold ${p.color}`}>
            {p.value}%
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------
// Connect Modal
// ------------------------------------------------
function ConnectModal({ platform, onClose, onConnected }) {
  const fields = PLATFORM_FIELDS[platform.id] || [];
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ui = PLATFORM_UI[platform.id];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await gdFetch(`/connectors/${platform.id}/connect`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      onConnected();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className={`bg-gradient-to-r ${ui?.color} p-5 rounded-t-2xl flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{ui?.emoji}</span>
            <div>
              <h3 className="font-bold text-white text-lg">{platform.name}</h3>
              <p className="text-white/70 text-xs">{platform.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  value={form[field.key] || ''}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={form[field.key] || ''}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Link size={14} />}
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------
// Connector Card
// ------------------------------------------------
function ConnectorCard({ connector, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const ui = PLATFORM_UI[connector.id];

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      await gdFetch(`/connectors/${connector.id}/disconnect`, { method: 'DELETE' });
      onRefresh();
    } catch {} finally {
      setDisconnecting(false);
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <>
      <div className={`relative bg-gradient-to-br ${ui?.color} border border-white/10 rounded-2xl p-5 overflow-hidden`}>
        {/* Connected indicator */}
        {connector.connected && (
          <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
        )}

        <div className="flex items-start gap-3 mb-4">
          <span className="text-4xl">{ui?.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base leading-tight">{connector.name}</h3>
            <p className="text-white/60 text-xs mt-0.5">{connector.category}</p>
          </div>
        </div>

        <p className="text-white/70 text-xs mb-4 leading-relaxed">{connector.description}</p>

        {connector.connected ? (
          <div className="space-y-3">
            <div className="bg-black/20 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <CheckCircle2 size={12} className="text-green-400" />
                Connected: <span className="text-white font-medium">{connector.accountLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Clock size={10} />
                Last sync: {timeAgo(connector.lastSyncAt)}
              </div>
            </div>
            <button
              onClick={disconnect}
              disabled={disconnecting}
              className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-red-500/30 border border-white/20 hover:border-red-500/50 text-white text-xs font-medium rounded-xl transition-all"
            >
              {disconnecting ? <RefreshCw size={12} className="animate-spin" /> : <Link2Off size={12} />}
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-medium rounded-xl transition-all"
          >
            <Link size={12} /> Connect Platform
          </button>
        )}
      </div>

      {showModal && (
        <ConnectModal
          platform={connector}
          onClose={() => setShowModal(false)}
          onConnected={onRefresh}
        />
      )}
    </>
  );
}

// ------------------------------------------------
// Achievement Manager
// ------------------------------------------------
function AchievementManager() {
  const [achievements, setAchievements] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', points: 10, icon: '🏆', condition: '', platform: 'all' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await gdFetch('/achievements');
      setAchievements(data.achievements || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await gdFetch('/achievements', { method: 'POST', body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ name: '', description: '', points: 10, icon: '🏆', condition: '', platform: 'all' });
      load();
    } catch {} finally {
      setLoading(false);
    }
  };

  const POINT_TIERS = [
    { min: 0, max: 15, color: 'text-gray-400', label: 'Bronze' },
    { min: 15, max: 40, color: 'text-yellow-400', label: 'Silver' },
    { min: 40, max: 75, color: 'text-yellow-300', label: 'Gold' },
    { min: 75, max: Infinity, color: 'text-purple-300', label: 'Platinum' }
  ];

  const getTier = (pts) => POINT_TIERS.find(t => pts >= t.min && pts < t.max) || POINT_TIERS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" /> Achievements
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus size={12} /> New Achievement
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="First Blood"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Win your first match"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Icon (emoji)</label>
              <input
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="🏆"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Points</label>
              <input
                type="number"
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                min={1}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Condition (optional)</label>
              <input
                value={form.condition}
                onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                placeholder="wins >= 1"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Platform</label>
              <select
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="all">All Platforms</option>
                <option value="sony">PlayStation</option>
                <option value="microsoft">Xbox</option>
                <option value="epic">Epic Games</option>
                <option value="steam">Steam</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5">
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />} Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-1.5 text-gray-400 hover:text-white text-xs transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
        {achievements.map(a => {
          const tier = getTier(a.points);
          return (
            <div key={a.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-start gap-3">
              <div className="text-3xl leading-none flex-shrink-0">{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-white truncate">{a.name}</span>
                  <span className={`text-xs font-bold flex-shrink-0 ${tier.color}`}>{a.points}pts</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{a.description}</p>
                {a.condition && (
                  <code className="text-xs text-yellow-400/70 mt-1 block">{a.condition}</code>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
                  {a.platform !== 'all' && (
                    <span className="text-xs text-gray-600 capitalize">{a.platform}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------
// Game Progress Panel
// ------------------------------------------------
function GameProgress() {
  const DEMO_GAME_IDS = ['galaxy-raiders', 'neon-city', 'void-realm'];
  const [gameId, setGameId] = useState(DEMO_GAME_IDS[0]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    gdFetch(`/progress/${gameId}`)
      .then(setProgress)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gameId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Star size={16} className="text-yellow-400" /> Game Progress
        </h3>
        <select
          value={gameId}
          onChange={e => setGameId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {DEMO_GAME_IDS.map(id => (
            <option key={id} value={id}>{id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-800 rounded-lg" />)}
        </div>
      ) : progress ? (
        <div className="space-y-4">
          {/* Completion */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Completion</span>
              <span className="text-2xl font-bold text-white">{progress.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${progress.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{progress.level}</div>
              <div className="text-xs text-gray-500">Level</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{progress.hoursPlayed}h</div>
              <div className="text-xs text-gray-500">Played</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{progress.achievements}</div>
              <div className="text-xs text-gray-500">Achievements</div>
            </div>
          </div>

          {/* XP */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Experience</span>
              <span className="text-xs text-gray-500">Level {progress.level}</span>
            </div>
            <XPBar xp={progress.xp} xpToNext={progress.xpToNextLevel} />
          </div>

          {/* Trophies */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h4 className="text-xs text-gray-400 mb-3">Trophies</h4>
            <div className="flex gap-4">
              {[
                { type: 'platinum', emoji: '💎', color: 'text-purple-300' },
                { type: 'gold', emoji: '🥇', color: 'text-yellow-300' },
                { type: 'silver', emoji: '🥈', color: 'text-gray-300' },
                { type: 'bronze', emoji: '🥉', color: 'text-orange-400' }
              ].map(({ type, emoji, color }) => (
                <div key={type} className="flex flex-col items-center gap-1">
                  <span className="text-xl">{emoji}</span>
                  <span className={`text-sm font-bold ${color}`}>{progress.trophies?.[type] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------
// Build Tracker
// ------------------------------------------------
function BuildTracker() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ platform: 'windows', version: '', status: 'pending', buildTimeSeconds: '', sizeBytes: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gdFetch('/builds');
      setBuilds(data.builds || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addBuild = async (e) => {
    e.preventDefault();
    try {
      await gdFetch('/builds', { method: 'POST', body: JSON.stringify(form) });
      setShowAdd(false);
      setForm({ platform: 'windows', version: '', status: 'pending', buildTimeSeconds: '', sizeBytes: '', notes: '' });
      load();
    } catch {}
  };

  const fmtBytes = (bytes) => {
    if (!bytes) return '—';
    const gb = bytes / 1e9;
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
  };

  const fmtTime = (s) => {
    if (!s) return '—';
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  };

  const PLATFORM_ICONS = {
    windows: '🪟', ps5: '🔵', xbox: '🟢', steam: '♨️',
    android: '🤖', ios: '🍎', linux: '🐧', macos: '🍏', switch: '🕹️'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Package size={16} className="text-blue-400" /> Build History
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus size={12} /> Record Build
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addBuild} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Platform</label>
              <select
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {Object.keys(PLATFORM_ICONS).map(p => <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Version</label>
              <input
                value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                placeholder="1.2.0"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {['pending', 'running', 'success', 'failed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Build Time (s)</label>
              <input
                type="number"
                value={form.buildTimeSeconds}
                onChange={e => setForm(f => ({ ...f, buildTimeSeconds: e.target.value }))}
                placeholder="245"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Size (bytes)</label>
              <input
                type="number"
                value={form.sizeBytes}
                onChange={e => setForm(f => ({ ...f, sizeBytes: e.target.value }))}
                placeholder="2500000000"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Release candidate"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors flex items-center gap-1"><Plus size={12} /> Record</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-gray-400 hover:text-white text-xs transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800">
              <th className="text-left pb-2 pr-3">Platform</th>
              <th className="text-left pb-2 pr-3">Version</th>
              <th className="text-left pb-2 pr-3">Status</th>
              <th className="text-left pb-2 pr-3">Time</th>
              <th className="text-left pb-2 pr-3">Size</th>
              <th className="text-left pb-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td></tr>
            ) : builds.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">No builds recorded</td></tr>
            ) : builds.map(b => (
              <tr key={b.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="py-2.5 pr-3">
                  <span>{PLATFORM_ICONS[b.platform] || '🖥️'}</span>
                  <span className="ml-1.5 text-gray-300 capitalize">{b.platform}</span>
                </td>
                <td className="py-2.5 pr-3 text-gray-300 font-mono text-xs">v{b.version}</td>
                <td className="py-2.5 pr-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${BUILD_STATUS_STYLES[b.status] || BUILD_STATUS_STYLES.pending}`}>
                    {b.status}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-gray-400 text-xs">{fmtTime(b.buildTimeSeconds)}</td>
                <td className="py-2.5 pr-3 text-gray-400 text-xs">{fmtBytes(b.sizeBytes)}</td>
                <td className="py-2.5 text-gray-500 text-xs truncate max-w-[120px]">{b.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------
// Analytics Dashboard
// ------------------------------------------------
function AnalyticsDashboard() {
  const DEMO_GAME_IDS = ['galaxy-raiders', 'neon-city', 'void-realm'];
  const [gameId, setGameId] = useState(DEMO_GAME_IDS[0]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    gdFetch(`/analytics/${gameId}`)
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gameId]);

  const dauData = analytics?.dailyStats?.map(d => d.dailyActiveUsers) || [];
  const revData = analytics?.dailyStats?.map(d => d.revenue) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <BarChart2 size={16} className="text-purple-400" /> Analytics
        </h3>
        <select
          value={gameId}
          onChange={e => setGameId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
        >
          {DEMO_GAME_IDS.map(id => (
            <option key={id} value={id}>{id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl" />)}
        </div>
      ) : analytics ? (
        <div className="space-y-4">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
              <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Users size={10} /> Total Players</div>
              <div className="text-xl font-bold text-white">{(analytics.totalPlayers / 1000).toFixed(1)}k</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
              <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Activity size={10} /> MAU</div>
              <div className="text-xl font-bold text-white">{(analytics.monthlyActiveUsers / 1000).toFixed(1)}k</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
              <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Clock size={10} /> Avg Session</div>
              <div className="text-xl font-bold text-white">{analytics.avgSessionMinutes}m</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
              <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><TrendingUp size={10} /> ARPU</div>
              <div className="text-xl font-bold text-white">${analytics.avgRevenuePerUser}</div>
            </div>
          </div>

          {/* Sparklines Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">Daily Active Users (30d)</span>
                <span className="text-xs font-bold text-blue-400">
                  {dauData.length > 0 ? `${dauData[dauData.length - 1].toLocaleString()} today` : ''}
                </span>
              </div>
              <Sparkline data={dauData} color="#3b82f6" width={200} height={48} />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">Revenue (30d)</span>
                <span className="text-xs font-bold text-green-400">
                  ${analytics.totalRevenue.toLocaleString()} total
                </span>
              </div>
              <Sparkline data={revData} color="#22c55e" width={200} height={48} />
            </div>
          </div>

          {/* Retention */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-3">Retention</div>
            <RetentionPills retention={analytics.retention} />
          </div>

          {/* Top Countries */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-3">Top Countries</div>
            <div className="space-y-2">
              {(analytics.topCountries || []).map((c, i) => {
                const pct = Math.round((c.players / analytics.totalPlayers) * 100);
                return (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-white font-mono w-8">{c.country}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{c.players.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------
// Leaderboard Preview
// ------------------------------------------------
function LeaderboardPreview() {
  const DEMO_GAME_IDS = ['galaxy-raiders', 'neon-city', 'void-realm'];
  const [gameId, setGameId] = useState(DEMO_GAME_IDS[0]);
  const [board, setBoard] = useState([]);

  useEffect(() => {
    gdFetch(`/leaderboard/${gameId}?limit=10`)
      .then(d => setBoard(d.leaderboard || []))
      .catch(() => {});
  }, [gameId]);

  const RANK_STYLES = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];
  const FLAG_MAP = { US: '🇺🇸', JP: '🇯🇵', DE: '🇩🇪', GB: '🇬🇧', KR: '🇰🇷', CA: '🇨🇦', AU: '🇦🇺', FR: '🇫🇷', BR: '🇧🇷', MX: '🇲🇽' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Award size={16} className="text-orange-400" /> Leaderboard
        </h3>
        <select
          value={gameId}
          onChange={e => setGameId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
        >
          {DEMO_GAME_IDS.map(id => (
            <option key={id} value={id}>{id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {board.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              entry.rank <= 3 ? 'bg-gray-800 border border-gray-700' : 'hover:bg-gray-800/50'
            }`}
          >
            <span className={`text-sm font-bold w-5 text-center flex-shrink-0 ${RANK_STYLES[entry.rank - 1] || 'text-gray-500'}`}>
              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
            </span>
            <span className="text-sm flex-shrink-0">{FLAG_MAP[entry.country] || '🌐'}</span>
            <span className="text-sm text-white font-medium flex-1 truncate">{entry.username}</span>
            <span className="text-xs text-gray-400">Lv.{entry.level}</span>
            <span className="text-xs font-mono font-bold text-white">{entry.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------
// Main GameDevTracker component
// ------------------------------------------------
export default function GameDevTracker({ socket }) {
  const [connectors, setConnectors] = useState([]);
  const [tab, setTab] = useState('connectors');
  const [loadingConnectors, setLoadingConnectors] = useState(true);

  const loadConnectors = useCallback(async () => {
    setLoadingConnectors(true);
    try {
      const data = await gdFetch('/connectors');
      setConnectors(data.connectors || []);
    } catch {} finally {
      setLoadingConnectors(false);
    }
  }, []);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  // Real-time connector updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    socket.on('gamedev:connector:updated', loadConnectors);
    socket.on('gamedev:build:complete', () => {
      if (tab === 'builds') {
        // Build tracker self-refreshes
      }
    });
    return () => {
      socket.off('gamedev:connector:updated', loadConnectors);
      socket.off('gamedev:build:complete');
    };
  }, [socket, tab, loadConnectors]);

  const connectedCount = connectors.filter(c => c.connected).length;

  const TABS = [
    { id: 'connectors', label: 'Connectors', icon: Link },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'progress', label: 'Progress', icon: Star },
    { id: 'builds', label: 'Builds', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Award }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 size={24} className="text-purple-400" />
            Game Dev Tracker
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {connectedCount} of {connectors.length} platforms connected
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* XR/AR/VR type indicators */}
          {[
            { label: 'AR', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
            { label: 'VR', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
            { label: '3D', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' }
          ].map(t => (
            <span key={t.label} className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1 ${t.color}`}>
              <Box size={10} /> {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              tab === t.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        {tab === 'connectors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Platform Connectors</h3>
              <button onClick={loadConnectors} className="text-gray-400 hover:text-white transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
            {loadingConnectors ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-48 bg-gray-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectors.map(c => (
                  <ConnectorCard key={c.id} connector={c} onRefresh={loadConnectors} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && <AchievementManager />}
        {tab === 'progress' && <GameProgress />}
        {tab === 'builds' && <BuildTracker />}
        {tab === 'analytics' && <AnalyticsDashboard />}
        {tab === 'leaderboard' && <LeaderboardPreview />}
      </div>
    </div>
  );
}
