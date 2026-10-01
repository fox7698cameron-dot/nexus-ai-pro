// GameDevDashboard.jsx | 2026-10-01
// Real-time game/AR/VR/3D project tracking dashboard

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Code2, Gamepad2, Box, Cpu, GitBranch, CheckCircle2, Clock, AlertTriangle, Plug, RefreshCw } from 'lucide-react';

const PROJECT_TYPES = [
  { id: 'coding', label: 'Coding', icon: Code2, color: '#3B82F6' },
  { id: 'gamedev', label: 'Game Dev', icon: Gamepad2, color: '#8B5CF6' },
  { id: 'arvr', label: 'AR/VR', icon: Box, color: '#10B981' },
  { id: '3d', label: '3D Projects', icon: Cpu, color: '#F59E0B' },
];

const CONNECTORS = [
  { id: 'unreal', label: 'Unreal Engine', vendor: 'Epic Games', color: '#0EA5E9', status: 'connected' },
  { id: 'playstation', label: 'PlayStation', vendor: 'Sony', color: '#003087', status: 'connected' },
  { id: 'xbox', label: 'Xbox', vendor: 'Microsoft', color: '#107C10', status: 'disconnected' },
  { id: 'ubisoft', label: 'Ubisoft Connect', vendor: 'Ubisoft', color: '#0070D1', status: 'pending' },
];

function generateBuildHistory() {
  const statuses = ['success', 'success', 'success', 'failed', 'success', 'running'];
  return Array.from({ length: 8 }, (_, i) => ({
    id: `build-${1000 + i}`,
    branch: i % 3 === 0 ? 'feature/ai-npc' : i % 3 === 1 ? 'main' : 'fix/physics',
    status: statuses[i % statuses.length],
    time: `${2 + i * 3}m ${(i * 17) % 60}s`,
    commit: `a${(0xb3f + i).toString(16)}c`,
    ts: new Date(Date.now() - i * 3600000).toLocaleString(),
  }));
}

function generatePerformanceData() {
  return Array.from({ length: 20 }, (_, i) => ({
    tick: i,
    fps: Math.round(55 + Math.sin(i * 0.4) * 8 + Math.random() * 4),
    memory: Math.round(2400 + Math.cos(i * 0.3) * 200 + Math.random() * 100),
    buildTime: Math.round(40 + i * 0.5 + Math.random() * 5),
  }));
}

function generateAchievements(projectType) {
  const achievements = {
    coding: [
      { id: 1, name: 'First Commit', progress: 100, total: 100, unlocked: true },
      { id: 2, name: '100 Tests Passing', progress: 87, total: 100, unlocked: false },
      { id: 3, name: 'Zero Lint Errors', progress: 100, total: 100, unlocked: true },
      { id: 4, name: 'CI Pipeline', progress: 60, total: 100, unlocked: false },
    ],
    gamedev: [
      { id: 1, name: 'First Playable Build', progress: 100, total: 100, unlocked: true },
      { id: 2, name: '60 FPS Target', progress: 75, total: 100, unlocked: false },
      { id: 3, name: 'Level Design Complete', progress: 40, total: 100, unlocked: false },
      { id: 4, name: 'Multiplayer Ready', progress: 20, total: 100, unlocked: false },
    ],
    arvr: [
      { id: 1, name: 'Scene Anchoring', progress: 100, total: 100, unlocked: true },
      { id: 2, name: 'Hand Tracking', progress: 90, total: 100, unlocked: false },
      { id: 3, name: '90Hz Render', progress: 65, total: 100, unlocked: false },
      { id: 4, name: 'Multi-User Support', progress: 15, total: 100, unlocked: false },
    ],
    '3d': [
      { id: 1, name: 'Base Mesh Complete', progress: 100, total: 100, unlocked: true },
      { id: 2, name: 'UV Unwrap', progress: 100, total: 100, unlocked: true },
      { id: 3, name: 'Rigged & Animated', progress: 55, total: 100, unlocked: false },
      { id: 4, name: 'LODs Generated', progress: 30, total: 100, unlocked: false },
    ],
  };
  return achievements[projectType] || achievements.coding;
}

/** Error boundary */
class GameDevErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div className="p-6 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">GameDev dashboard error: {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function ProgressBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function BuildBadge({ status }) {
  const config = {
    success: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2 },
    failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: AlertTriangle },
    running: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: RefreshCw },
  };
  const c = config[status] || config.running;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon size={11} className={status === 'running' ? 'animate-spin' : ''} />
      {status}
    </span>
  );
}

export default function GameDevDashboard({ socket }) {
  const [activeType, setActiveType] = useState('gamedev');
  const [connectors, setConnectors] = useState(CONNECTORS);
  const [builds] = useState(generateBuildHistory);
  const [perf] = useState(generatePerformanceData);
  const [loading, setLoading] = useState({});

  const typeMeta = PROJECT_TYPES.find(t => t.id === activeType) || PROJECT_TYPES[0];
  const achievements = generateAchievements(activeType);

  const toggleConnector = useCallback(async (connectorId) => {
    setLoading(prev => ({ ...prev, [connectorId]: true }));
    try {
      const res = await fetch(`/api/game/connectors/${connectorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      if (res.ok) {
        const json = await res.json();
        setConnectors(prev => prev.map(c => c.id === connectorId ? { ...c, status: json.status } : c));
      }
    } catch {
      // Toggle optimistically
      setConnectors(prev => prev.map(c =>
        c.id === connectorId
          ? { ...c, status: c.status === 'connected' ? 'disconnected' : 'connected' }
          : c
      ));
    } finally {
      setLoading(prev => ({ ...prev, [connectorId]: false }));
    }
  }, []);

  // Real-time build status
  useEffect(() => {
    if (!socket) return;
    const handler = (event) => {
      console.info('[GameDev] build event', event);
    };
    socket.on('game:build', handler);
    return () => socket.off('game:build', handler);
  }, [socket]);

  return (
    <GameDevErrorBoundary>
      <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Game Dev Tracker</h1>
        </div>

        {/* Project type tabs */}
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                style={activeType === t.id ? { backgroundColor: t.color, color: '#fff' } : {}}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition
                  ${activeType === t.id ? 'border-transparent shadow' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Achievements panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Achievements</h2>
            <ul className="space-y-4">
              {achievements.map(a => (
                <li key={a.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${a.unlocked ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {a.unlocked ? '🏆 ' : ''}{a.name}
                    </span>
                    <span className="text-xs text-gray-400">{a.progress}/{a.total}</span>
                  </div>
                  <ProgressBar value={a.progress} max={a.total} color={a.unlocked ? typeMeta.color : '#6B7280'} />
                </li>
              ))}
            </ul>
          </div>

          {/* Performance metrics */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Avg FPS', value: Math.round(perf.reduce((s, d) => s + d.fps, 0) / perf.length) },
                { label: 'Memory (MB)', value: Math.round(perf.reduce((s, d) => s + d.memory, 0) / perf.length) },
                { label: 'Build (s)', value: Math.round(perf.reduce((s, d) => s + d.buildTime, 0) / perf.length) },
              ].map(m => (
                <div key={m.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{m.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={perf}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="fps" stroke={typeMeta.color} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="memory" stroke="#F59E0B" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Build history */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <GitBranch size={16} /> Build History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 pr-4">Build</th>
                  <th className="text-left py-2 pr-4">Branch</th>
                  <th className="text-left py-2 pr-4">Commit</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">Time</th>
                  <th className="text-left py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {builds.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500">{b.id}</td>
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{b.branch}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500">{b.commit}</td>
                    <td className="py-2 pr-4"><BuildBadge status={b.status} /></td>
                    <td className="py-2 pr-4 text-gray-500 flex items-center gap-1"><Clock size={11} />{b.time}</td>
                    <td className="py-2 text-xs text-gray-400">{b.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform connectors */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Plug size={16} /> Platform Connectors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {connectors.map(c => (
              <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800 dark:text-white">{c.label}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    c.status === 'connected' ? 'bg-green-500' :
                    c.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{c.vendor}</div>
                <div className="text-xs font-medium capitalize" style={{ color: c.color }}>{c.status}</div>
                <button
                  onClick={() => toggleConnector(c.id)}
                  disabled={loading[c.id]}
                  className="w-full text-xs py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  {loading[c.id] ? 'Connecting...' : c.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameDevErrorBoundary>
  );
}
