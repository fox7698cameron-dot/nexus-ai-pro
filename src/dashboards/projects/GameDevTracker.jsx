// 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import { Gamepad2, Cpu, HardDrive, Bug, Package, Zap, Trophy, Monitor, Plus, RefreshCw, X, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';

const API_BASE = '/api/projects/gamedev';

const ENGINES          = ['Unreal Engine 5', 'Unity 2023', 'Godot 4', 'CryEngine', 'Custom'];
const BUILD_STAGES     = ['Dev', 'Alpha', 'Beta', 'RC', 'Gold'];
const TARGET_PLATFORMS = ['PC', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch', 'iOS', 'Android', 'Meta Quest', 'PSVR2'];

const MOCK_BUILD = {
  engine: 'Unreal Engine 5', engineVersion: '5.3.2', stage: 'Beta', version: '0.7.4',
  targetFPS: 60, currentFPS: 54,
  targetPlatforms: ['PC', 'PlayStation 5', 'Xbox Series X'],
  assetStats: { meshes: 1247, textures: 3819, audio: 284, animations: 623, blueprints: 412 },
  bugs: [
    { id: 'BUG-001', title: 'Player clips through wall geometry', severity: 'high',     status: 'open' },
    { id: 'BUG-002', title: 'Audio desync in cutscenes',          severity: 'medium',   status: 'in-progress' },
    { id: 'BUG-003', title: 'UI flicker on PS5 at 120Hz',         severity: 'low',      status: 'open' },
    { id: 'BUG-004', title: 'Save corruption edge case',           severity: 'critical', status: 'in-progress' },
  ],
  achievements: [
    { id: 'ACH_001', name: 'First Steps',    description: 'Complete the tutorial',                  type: 'bronze',   unlockRate: 87 },
    { id: 'ACH_002', name: 'Speed Runner',   description: 'Complete level 1 in under 3 minutes',    type: 'silver',   unlockRate: 23 },
    { id: 'ACH_003', name: 'Completionist',  description: 'Collect all collectibles',                type: 'gold',     unlockRate: 4  },
    { id: 'ACH_004', name: 'Untouchable',    description: 'Complete a level without taking damage',  type: 'platinum', unlockRate: 1  },
  ],
};

const MOCK_BUILDS_HISTORY = [
  { id: 'b1', version: '0.5.0', status: 'alpha',  buildNumber: 1001, buildTime: 240, createdAt: Date.now() - 4 * 86400000 },
  { id: 'b2', version: '0.6.0', status: 'alpha',  buildNumber: 1002, buildTime: 268, createdAt: Date.now() - 3 * 86400000 },
  { id: 'b3', version: '0.7.0', status: 'beta',   buildNumber: 1003, buildTime: 291, createdAt: Date.now() - 2 * 86400000 },
  { id: 'b4', version: '0.7.4', status: 'beta',   buildNumber: 1004, buildTime: 257, createdAt: Date.now() - 1 * 86400000 },
];

const PERF_DATA = [
  { metric: 'FPS',           target: 60,    current: 54    },
  { metric: 'Draw Calls',    target: 2000,  current: 1843  },
  { metric: 'Poly Count (K)',target: 2000,  current: 1654  },
  { metric: 'VRAM (MB)',     target: 8192,  current: 6241  },
  { metric: 'RAM (MB)',      target: 16384, current: 12800 },
  { metric: 'Load Time (s)', target: 10,    current: 7.4   },
];

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const ACH_COLORS      = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' };
const STATUS_COLORS   = {
  dev: 'bg-gray-600 text-gray-300', alpha: 'bg-blue-900/50 text-blue-300',
  beta: 'bg-yellow-900/50 text-yellow-300', RC: 'bg-orange-900/50 text-orange-300', gold: 'bg-green-900/50 text-green-300',
};

export default function GameDevTracker() {
  const [build,      setBuild]      = useState(MOCK_BUILD);
  const [builds,     setBuilds]     = useState(MOCK_BUILDS_HISTORY);
  const [activeTab,  setActiveTab]  = useState('overview');
  const [showBuildForm, setShowBuildForm] = useState(false);
  const [newBuild,   setNewBuild]   = useState({ version: '', status: 'dev' });
  const [loading,    setLoading]    = useState(false);
  const [newBug,     setNewBug]     = useState({ title: '', severity: 'medium' });
  const [showBugForm, setShowBugForm] = useState(false);

  const fetchBuilds = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/builds`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.builds?.length) setBuilds(d.builds);
    } catch { /* use mock */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBuilds(); }, []);

  const addBuild = async () => {
    if (!newBuild.version.trim()) return;
    const b = { id: `b-${Date.now()}`, ...newBuild, buildNumber: 1000 + builds.length + 1, buildTime: 0, createdAt: Date.now() };
    setBuilds(prev => [...prev, b]);
    setShowBuildForm(false);
    setNewBuild({ version: '', status: 'dev' });
    try {
      await fetch(`${API_BASE}/builds`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newBuild, projectId: 'default', engine: build.engine, platforms: build.targetPlatforms }),
      });
    } catch { /* silent */ }
  };

  const addBug = () => {
    if (!newBug.title.trim()) return;
    setBuild(prev => ({ ...prev, bugs: [...prev.bugs, { id: `BUG-${String(prev.bugs.length + 1).padStart(3,'0')}`, ...newBug, status: 'open' }] }));
    setNewBug({ title: '', severity: 'medium' });
    setShowBugForm(false);
  };

  const fpsHealth = (build.currentFPS / build.targetFPS) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Gamepad2 size={20} className="text-purple-400" /> Game Dev Tracker
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{build.engine} {build.engineVersion}</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30">
            {build.stage} v{build.version}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2 overflow-x-auto">
        {['overview', 'performance', 'bugs', 'assets', 'builds', 'achievements'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-t-lg transition font-medium whitespace-nowrap ${activeTab === tab ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <Zap size={20} className={`mx-auto mb-2 ${fpsHealth >= 90 ? 'text-green-400' : fpsHealth >= 75 ? 'text-yellow-400' : 'text-red-400'}`} />
              <p className="text-2xl font-bold text-white">{build.currentFPS}</p>
              <p className="text-xs text-gray-400">FPS (target: {build.targetFPS})</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <Bug size={20} className="mx-auto mb-2 text-red-400" />
              <p className="text-2xl font-bold text-white">{build.bugs.filter(b => b.status === 'open').length}</p>
              <p className="text-xs text-gray-400">Open Bugs</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <Package size={20} className="mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-white">{Object.values(build.assetStats).reduce((a, b) => a + b, 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400">Total Assets</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <Trophy size={20} className="mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold text-white">{build.achievements.length}</p>
              <p className="text-xs text-gray-400">Achievements</p>
            </div>
          </div>

          {/* Engine + version */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Engine</h3>
            <div className="flex gap-2 flex-wrap">
              {ENGINES.map(e => (
                <button key={e} onClick={() => setBuild(prev => ({ ...prev, engine: e }))}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${build.engine === e ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Target platforms */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Monitor size={16} /> Target Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {TARGET_PLATFORMS.map(p => (
                <button key={p} onClick={() => setBuild(prev => ({
                  ...prev,
                  targetPlatforms: prev.targetPlatforms.includes(p) ? prev.targetPlatforms.filter(x => x !== p) : [...prev.targetPlatforms, p],
                }))}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${build.targetPlatforms.includes(p) ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Build stage pipeline */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Build Stage</h3>
            <div className="flex items-center gap-1 flex-wrap">
              {BUILD_STAGES.map((stage, i) => (
                <React.Fragment key={stage}>
                  <button onClick={() => setBuild(prev => ({ ...prev, stage }))}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition ${BUILD_STAGES.indexOf(build.stage) >= i ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                    {i + 1}
                  </button>
                  {i < BUILD_STAGES.length - 1 && (
                    <div className={`w-8 h-0.5 ${BUILD_STAGES.indexOf(build.stage) > i ? 'bg-purple-600' : 'bg-gray-700'}`} />
                  )}
                </React.Fragment>
              ))}
              <span className="ml-3 text-sm text-purple-300 font-medium">{build.stage}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Performance ── */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Target vs Current</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={PERF_DATA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis dataKey="metric" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Bar dataKey="target"  fill="#374151" name="Target"  radius={[0, 4, 4, 0]} />
                <Bar dataKey="current" fill="#8b5cf6" name="Current" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* FPS health bar */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300">FPS Health</span>
              <span className={fpsHealth >= 90 ? 'text-green-400' : fpsHealth >= 75 ? 'text-yellow-400' : 'text-red-400'}>{fpsHealth.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, fpsHealth)}%`, background: fpsHealth >= 90 ? '#22c55e' : fpsHealth >= 75 ? '#eab308' : '#ef4444' }} />
            </div>
            <p className="text-xs text-gray-500">{build.currentFPS} / {build.targetFPS} FPS target</p>
          </div>
        </div>
      )}

      {/* ── Bugs ── */}
      {activeTab === 'bugs' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowBugForm(s => !s)}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs rounded-lg transition border border-red-500/30">
              <Plus size={12} /> Report Bug
            </button>
          </div>
          {showBugForm && (
            <div className="p-4 bg-gray-800 rounded-xl border border-red-500/30 space-y-2">
              <input value={newBug.title} onChange={e => setNewBug(p => ({ ...p, title: e.target.value }))} placeholder="Bug description *"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none" />
              <select value={newBug.severity} onChange={e => setNewBug(p => ({ ...p, severity: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={addBug} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition">Add Bug</button>
                <button onClick={() => setShowBugForm(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg transition">Cancel</button>
              </div>
            </div>
          )}
          {build.bugs.map(bug => (
            <div key={bug.id} className="p-4 bg-gray-800 rounded-xl border border-gray-700 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-500">{bug.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ background: (SEVERITY_COLORS[bug.severity] || '#6b7280') + '22', color: SEVERITY_COLORS[bug.severity] }}>
                    {bug.severity}
                  </span>
                </div>
                <p className="text-sm text-white">{bug.title}</p>
              </div>
              <button onClick={() => setBuild(prev => ({ ...prev, bugs: prev.bugs.map(b => b.id === bug.id ? { ...b, status: b.status === 'open' ? 'in-progress' : 'closed' } : b) }))}
                className={`text-xs px-3 py-1 rounded-full shrink-0 ${bug.status === 'open' ? 'bg-red-600/20 text-red-400' : bug.status === 'in-progress' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-green-600/20 text-green-400'}`}>
                {bug.status}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Assets ── */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(build.assetStats).map(([key, val]) => (
            <div key={key} className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <Package size={20} className="mx-auto mb-2 text-purple-400" />
              <p className="text-xl font-bold text-white">{val.toLocaleString()}</p>
              <p className="text-xs text-gray-400 capitalize">{key}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Builds History ── */}
      {activeTab === 'builds' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Build History</h3>
            <div className="flex gap-2">
              <button onClick={() => setShowBuildForm(s => !s)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 text-purple-300 text-xs rounded-lg border border-purple-500/30 hover:bg-purple-600/30 transition">
                <Plus size={12} /> New Build
              </button>
              <button onClick={fetchBuilds} disabled={loading}
                className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          {showBuildForm && (
            <div className="p-4 bg-gray-800 rounded-xl border border-purple-500/30 space-y-2">
              <input value={newBuild.version} onChange={e => setNewBuild(p => ({ ...p, version: e.target.value }))} placeholder="Version (e.g. 0.8.0) *"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none" />
              <select value={newBuild.status} onChange={e => setNewBuild(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                {BUILD_STAGES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={addBuild} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition">Create</button>
                <button onClick={() => setShowBuildForm(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
              </div>
            </div>
          )}
          {[...builds].reverse().map(b => (
            <div key={b.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700 gap-3">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-700 text-gray-300'}`}>{b.status}</span>
                <span className="text-sm font-mono text-white">v{b.version}</span>
                <span className="text-xs text-gray-500">#{b.buildNumber}</span>
              </div>
              <div className="text-xs text-gray-500">{b.buildTime > 0 ? `${b.buildTime}s` : '—'} · {new Date(b.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Achievements ── */}
      {activeTab === 'achievements' && (
        <div className="space-y-3">
          {build.achievements.map(ach => (
            <div key={ach.id} className="p-4 bg-gray-800 rounded-xl border border-gray-700 flex items-center gap-4">
              <Trophy size={24} style={{ color: ACH_COLORS[ach.type] }} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">{ach.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded capitalize text-gray-400" style={{ color: ACH_COLORS[ach.type] }}>{ach.type}</span>
                </div>
                <p className="text-xs text-gray-400">{ach.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500">Unlock rate</p>
                <p className="text-lg font-bold text-white">{ach.unlockRate}%</p>
                <div className="w-16 h-1.5 bg-gray-700 rounded-full mt-1 ml-auto">
                  <div className="h-full rounded-full" style={{ width: `${ach.unlockRate}%`, background: ACH_COLORS[ach.type] }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
