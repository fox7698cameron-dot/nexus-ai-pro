// src/components/AnalyticsDashboard.jsx | Nexus AI Pro | Date: 2026-06-07

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// CONSTANTS
// ============================================================

const PLATFORMS = [
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    colorClasses: {
      card:    'border-pink-500/40 bg-gradient-to-br from-gray-900 via-gray-950 to-pink-950',
      badge:   'bg-pink-500/20 text-pink-300 border border-pink-500/30',
      bar:     'bg-gradient-to-r from-pink-500 to-pink-300',
      iconBg:  'bg-black',
      accent:  'text-pink-400',
    },
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📸',
    colorClasses: {
      card:    'border-purple-500/40 bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950',
      badge:   'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-purple-500/30',
      bar:     'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500',
      iconBg:  'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500',
      accent:  'text-purple-400',
    },
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '👤',
    colorClasses: {
      card:    'border-blue-500/40 bg-gradient-to-br from-blue-950 via-gray-950 to-gray-900',
      badge:   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      bar:     'bg-gradient-to-r from-blue-600 to-blue-400',
      iconBg:  'bg-blue-600',
      accent:  'text-blue-400',
    },
  },
  {
    id: 'twitch',
    label: 'Twitch',
    icon: '🎮',
    colorClasses: {
      card:    'border-purple-600/40 bg-gradient-to-br from-purple-950 via-gray-950 to-gray-900',
      badge:   'bg-purple-600/20 text-purple-300 border border-purple-600/30',
      bar:     'bg-gradient-to-r from-purple-600 to-purple-400',
      iconBg:  'bg-purple-700',
      accent:  'text-purple-400',
    },
  },
  {
    id: 'discord',
    label: 'Discord',
    icon: '💬',
    colorClasses: {
      card:    'border-indigo-500/40 bg-gradient-to-br from-indigo-950 via-gray-950 to-gray-900',
      badge:   'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      bar:     'bg-gradient-to-r from-indigo-600 to-indigo-400',
      iconBg:  'bg-indigo-600',
      accent:  'text-indigo-400',
    },
  },
  {
    id: 'lemon8',
    label: 'Lemon8',
    icon: '🍋',
    colorClasses: {
      card:    'border-yellow-500/40 bg-gradient-to-br from-yellow-950 via-gray-950 to-gray-900',
      badge:   'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      bar:     'bg-gradient-to-r from-yellow-500 to-yellow-300',
      iconBg:  'bg-yellow-500',
      accent:  'text-yellow-400',
    },
  },
  {
    id: 'reddit',
    label: 'Reddit',
    icon: '🤖',
    colorClasses: {
      card:    'border-orange-500/40 bg-gradient-to-br from-orange-950 via-gray-950 to-gray-900',
      badge:   'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      bar:     'bg-gradient-to-r from-orange-600 to-orange-400',
      iconBg:  'bg-orange-600',
      accent:  'text-orange-400',
    },
  },
  {
    id: 'redgifs',
    label: 'RedGifs',
    icon: '▶️',
    colorClasses: {
      card:    'border-red-600/40 bg-gradient-to-br from-red-950 via-gray-950 to-gray-900',
      badge:   'bg-red-600/20 text-red-300 border border-red-600/30',
      bar:     'bg-gradient-to-r from-red-600 to-red-400',
      iconBg:  'bg-red-700',
      accent:  'text-red-400',
    },
  },
];

const PROJECT_TYPES = [
  { value: 'coding',   label: 'Coding',   badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  { value: 'game-dev', label: 'Game Dev', badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
  { value: 'ar-vr',   label: 'AR / VR',  badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' },
  { value: '3d',      label: '3D',        badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
];

const STATUS_STYLES = {
  active:    'bg-green-500/20 text-green-300 border border-green-500/30',
  paused:    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  completed: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
};

// ============================================================
// UTILITIES
// ============================================================

const fmt = {
  number: n => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  },
  pct: n => `${Number(n).toFixed(1)}%`,
  seconds: s => s > 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`,
};

function getPlatformConfig(id) {
  return PLATFORMS.find(p => p.id === id) || PLATFORMS[0];
}

function getProjectTypeConfig(type) {
  return PROJECT_TYPES.find(t => t.value === type) || PROJECT_TYPES[0];
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// --- Loading Skeleton ---
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-3 rounded bg-white/10" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

// --- Realtime Pulse Dot ---
function PulseDot({ active = true }) {
  if (!active) return null;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
    </span>
  );
}

// --- Retention Bar ---
function RetentionBar({ value, barClass }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 60 ? 'bg-green-500' : pct >= 35 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Retention</span>
        <span>{fmt.pct(pct)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass || color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// --- Mini Bar Chart (CSS only) ---
function BarChart({ history, barClass }) {
  if (!history || history.length === 0) return null;
  const maxViews = Math.max(...history.map(h => h.views), 1);
  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 mb-1.5">30-Day View Trend</p>
      <div className="flex items-end gap-px h-12">
        {history.map((point, i) => {
          const heightPct = Math.round((point.views / maxViews) * 100);
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm ${barClass} opacity-70 hover:opacity-100 transition-opacity`}
              style={{ height: `${Math.max(4, heightPct)}%` }}
              title={`${new Date(point.timestamp).toLocaleDateString()}: ${fmt.number(point.views)} views`}
            />
          );
        })}
      </div>
    </div>
  );
}

// --- Platform Card ---
function PlatformCard({ platform, data, realtimeActive, realtimeMetrics }) {
  const [expanded, setExpanded] = useState(false);
  const config  = getPlatformConfig(platform);
  const metrics = realtimeActive && realtimeMetrics ? realtimeMetrics : data?.metrics;

  if (!data || !metrics) return <SkeletonCard />;

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all duration-300 ${config.colorClasses.card} hover:scale-[1.01] hover:shadow-lg hover:shadow-black/40`}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${config.colorClasses.iconBg}`}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{config.label}</h3>
            <p className="text-xs text-gray-500 truncate max-w-[120px]">{data.accountId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {realtimeActive && <PulseDot />}
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.colorClasses.badge}`}>
            {fmt.number(metrics.followers)} followers
          </span>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Views</span>
          <span className={`font-medium ${config.colorClasses.accent}`}>{fmt.number(metrics.views)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Likes</span>
          <span className={`font-medium ${config.colorClasses.accent}`}>{fmt.number(metrics.likes)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Reach</span>
          <span className={`font-medium ${config.colorClasses.accent}`}>{fmt.number(metrics.reach)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Engagement</span>
          <span className={`font-medium ${config.colorClasses.accent}`}>{fmt.pct(metrics.engagementRate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Comments</span>
          <span className={`font-medium ${config.colorClasses.accent}`}>{fmt.number(metrics.comments)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Shares</span>
          <span className={`font-medium ${config.colorClasses.accent}`}>{fmt.number(metrics.shares)}</span>
        </div>
      </div>

      {/* Retention Bar */}
      {metrics.retention > 0 && (
        <RetentionBar value={metrics.retention} barClass={config.colorClasses.bar} />
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Impressions</span>
              <span className="text-white font-medium">{fmt.number(metrics.impressions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Clicks</span>
              <span className="text-white font-medium">{fmt.number(metrics.clicks)}</span>
            </div>
            {metrics.watchTime > 0 && (
              <div className="flex justify-between col-span-2">
                <span className="text-gray-400">Avg Watch Time</span>
                <span className="text-white font-medium">{fmt.seconds(metrics.watchTime)}</span>
              </div>
            )}
          </div>
          <BarChart history={data.history} barClass={config.colorClasses.bar} />
          <p className="text-xs text-gray-600 text-right">
            Connected {new Date(data.connectedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Expand hint */}
      <p className="text-xs text-gray-600 mt-2 text-right select-none">
        {expanded ? '▲ collapse' : '▼ expand details'}
      </p>
    </div>
  );
}

// --- Social Overview Banner ---
function OverviewBanner({ overview }) {
  if (!overview) return null;
  const agg = overview.aggregates;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Total Views',     value: fmt.number(agg.totalViews)     },
        { label: 'Total Followers', value: fmt.number(agg.totalFollowers) },
        { label: 'Total Reach',     value: fmt.number(agg.totalReach)     },
        { label: 'Avg Engagement',  value: fmt.pct(agg.avgEngagementRate) },
      ].map(stat => (
        <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-white">{stat.value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// --- Milestone Progress ---
function MilestoneList({ milestones }) {
  if (!milestones || milestones.length === 0) {
    return <p className="text-xs text-gray-500 italic">No milestones defined.</p>;
  }
  const done  = milestones.filter(m => m.completed).length;
  const total = milestones.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Progress: {done}/{total} milestones</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1 mt-2">
        {milestones.map((m, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className={m.completed ? 'text-green-400' : 'text-gray-500'}>
              {m.completed ? '✔' : '○'}
            </span>
            <span className={m.completed ? 'text-gray-400 line-through' : 'text-gray-200'}>
              {m.name}
            </span>
            {m.dueDate && (
              <span className="text-gray-600 ml-auto">{new Date(m.dueDate).toLocaleDateString()}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Project Card ---
function ProjectCard({ project, onDelete, realtimeActive, realtimeMetrics }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig   = getProjectTypeConfig(project.type);
  const metrics      = realtimeActive && realtimeMetrics ? realtimeMetrics : project.metrics;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{project.name}</h3>
          <p className="text-xs text-gray-500">
            Created {new Date(project.createdAt).toLocaleDateString()}
            {project.platform && ` · ${project.platform}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {realtimeActive && <PulseDot />}
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.badge}`}>
            {typeConfig.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status]}`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { label: 'Commits',     value: metrics.commits     },
          { label: 'Builds',      value: metrics.builds      },
          { label: 'Deploys',     value: metrics.deployments },
          { label: 'Bugs',        value: metrics.bugs,        warn: metrics.bugs > 10 },
          { label: 'Coverage',    value: fmt.pct(metrics.coverage) },
        ].map(stat => (
          <div
            key={stat.label}
            className={`rounded-lg border px-3 py-2 text-center ${
              stat.warn
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <p className={`text-lg font-bold ${stat.warn ? 'text-red-400' : 'text-white'}`}>
              {typeof stat.value === 'number' ? stat.value : stat.value}
            </p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Coverage Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Code Coverage</span>
          <span>{fmt.pct(metrics.coverage)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              metrics.coverage >= 80
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : metrics.coverage >= 50
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                : 'bg-gradient-to-r from-red-600 to-red-400'
            }`}
            style={{ width: `${metrics.coverage}%` }}
          />
        </div>
      </div>

      {/* Milestones Toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="text-xs text-gray-400 hover:text-white transition-colors w-full text-left"
      >
        {expanded ? '▲ Hide milestones' : `▼ Show milestones (${project.milestones.length})`}
      </button>

      {expanded && (
        <div className="pt-2 border-t border-white/10">
          <MilestoneList milestones={project.milestones} />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => onDelete(project.id)}
          className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded border border-red-500/20 hover:border-red-400/40"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// --- Add Project Modal ---
function AddProjectModal({ userId, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', type: 'coding', platform: '' });
  const [milestoneInput, setMilestoneInput] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const addMilestone = () => {
    const trimmed = milestoneInput.trim();
    if (!trimmed) return;
    setMilestones(m => [...m, { name: trimmed, dueDate: null, completed: false }]);
    setMilestoneInput('');
  };

  const removeMilestone = i => setMilestones(m => m.filter((_, idx) => idx !== i));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...form, milestones }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create project');
      onCreated(json.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Project Tracker</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Project Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Project"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              maxLength={80}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Project Type</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {PROJECT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Platform (optional)</label>
            <input
              type="text"
              value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              placeholder="e.g. GitHub, Itch.io, Steam"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              maxLength={40}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Milestones</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={milestoneInput}
                onChange={e => setMilestoneInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); } }}
                placeholder="Add a milestone and press Enter"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                maxLength={80}
              />
              <button
                type="button"
                onClick={addMilestone}
                className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-500/20 transition-colors"
              >
                +
              </button>
            </div>
            {milestones.length > 0 && (
              <ul className="mt-2 space-y-1">
                {milestones.map((m, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="text-gray-300">{m.name}</span>
                    <button
                      type="button"
                      onClick={() => removeMilestone(i)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Error Boundary (class component) ---
class ErrorBoundary extends Error {
  // Intentionally not a class component — using functional error display instead.
}
function ErrorDisplay({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * AnalyticsDashboard
 *
 * @param {object} props
 * @param {string} props.userId  - Current user identifier
 * @param {'dark'|'light'} props.theme - UI theme
 */
export default function AnalyticsDashboard({ userId, theme = 'dark' }) {
  const isDark = theme !== 'light';

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState('social');

  // --- Social state ---
  const [platformData,     setPlatformData]     = useState({});
  const [overview,         setOverview]         = useState(null);
  const [socialLoading,    setSocialLoading]    = useState(true);
  const [socialError,      setSocialError]      = useState(null);

  // --- Realtime state ---
  const [realtimeEnabled,  setRealtimeEnabled]  = useState(false);
  const [realtimeMetrics,  setRealtimeMetrics]  = useState({});
  const sseRefs = useRef({});  // { [platform]: EventSource }

  // --- Project state ---
  const [projects,         setProjects]         = useState([]);
  const [projectsLoading,  setProjectsLoading]  = useState(true);
  const [projectsError,    setProjectsError]    = useState(null);
  const [showAddModal,     setShowAddModal]      = useState(false);

  // Project realtime
  const [projectRTEnabled, setProjectRTEnabled] = useState(false);
  const [projectRTMetrics, setProjectRTMetrics] = useState({});
  const projectSseRefs = useRef({});

  // --- Sync state per platform ---
  const [syncingPlatforms, setSyncingPlatforms] = useState({});

  // ---- DATA FETCHING ----

  const fetchSocialData = useCallback(async () => {
    setSocialLoading(true);
    setSocialError(null);
    try {
      const [overviewRes, ...platformRes] = await Promise.all([
        fetch('/api/analytics/social/overview'),
        ...PLATFORMS.map(p => fetch(`/api/analytics/social/${p.id}`)),
      ]);
      const overviewJson = await overviewRes.json();
      if (overviewJson.success) setOverview(overviewJson.data);

      const platformMap = {};
      for (let i = 0; i < PLATFORMS.length; i++) {
        const json = await platformRes[i].json();
        if (json.success) platformMap[PLATFORMS[i].id] = json.data;
      }
      setPlatformData(platformMap);
    } catch (err) {
      setSocialError(err.message || 'Failed to load social analytics');
    } finally {
      setSocialLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res  = await fetch(`/api/analytics/projects?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch projects');
      setProjects(json.data.projects);
    } catch (err) {
      setProjectsError(err.message);
    } finally {
      setProjectsLoading(false);
    }
  }, [userId]);

  // ---- REALTIME (SOCIAL) ----

  const startSocialRealtime = useCallback(() => {
    PLATFORMS.forEach(({ id }) => {
      if (sseRefs.current[id]) return;
      const es = new EventSource(`/api/analytics/social/realtime/${id}`);
      es.addEventListener('metrics', e => {
        try {
          const payload = JSON.parse(e.data);
          setRealtimeMetrics(prev => ({ ...prev, [id]: payload.metrics }));
        } catch { /* ignore parse errors */ }
      });
      es.onerror = () => {
        es.close();
        delete sseRefs.current[id];
      };
      sseRefs.current[id] = es;
    });
  }, []);

  const stopSocialRealtime = useCallback(() => {
    Object.values(sseRefs.current).forEach(es => es.close());
    sseRefs.current = {};
    setRealtimeMetrics({});
  }, []);

  const toggleSocialRealtime = useCallback(() => {
    setRealtimeEnabled(prev => {
      if (prev) { stopSocialRealtime(); return false; }
      startSocialRealtime(); return true;
    });
  }, [startSocialRealtime, stopSocialRealtime]);

  // ---- REALTIME (PROJECTS) ----

  const startProjectRealtime = useCallback((projectList) => {
    projectList.forEach(({ id }) => {
      if (projectSseRefs.current[id]) return;
      const es = new EventSource(`/api/analytics/projects/${id}/realtime`);
      es.addEventListener('metrics', e => {
        try {
          const payload = JSON.parse(e.data);
          setProjectRTMetrics(prev => ({ ...prev, [id]: payload.metrics }));
        } catch { /* ignore */ }
      });
      es.onerror = () => {
        es.close();
        delete projectSseRefs.current[id];
      };
      projectSseRefs.current[id] = es;
    });
  }, []);

  const stopProjectRealtime = useCallback(() => {
    Object.values(projectSseRefs.current).forEach(es => es.close());
    projectSseRefs.current = {};
    setProjectRTMetrics({});
  }, []);

  const toggleProjectRealtime = useCallback(() => {
    setProjectRTEnabled(prev => {
      if (prev) { stopProjectRealtime(); return false; }
      startProjectRealtime(projects); return true;
    });
  }, [projects, startProjectRealtime, stopProjectRealtime]);

  // ---- PLATFORM SYNC ----

  const syncPlatform = useCallback(async platformId => {
    setSyncingPlatforms(prev => ({ ...prev, [platformId]: true }));
    try {
      const res  = await fetch(`/api/analytics/social/${platformId}/sync`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setPlatformData(prev => ({
          ...prev,
          [platformId]: { ...prev[platformId], metrics: json.data.metrics },
        }));
      }
    } catch { /* swallow — non-critical */ } finally {
      setSyncingPlatforms(prev => ({ ...prev, [platformId]: false }));
    }
  }, []);

  // ---- PROJECT CRUD ----

  const handleProjectCreated = useCallback(project => {
    setProjects(prev => [project, ...prev]);
    if (projectRTEnabled) {
      startProjectRealtime([project]);
    }
  }, [projectRTEnabled, startProjectRealtime]);

  const handleDeleteProject = useCallback(async projectId => {
    try {
      const res  = await fetch(`/api/analytics/projects/${projectId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (projectSseRefs.current[projectId]) {
          projectSseRefs.current[projectId].close();
          delete projectSseRefs.current[projectId];
        }
        setProjectRTMetrics(prev => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
      }
    } catch { /* ignore */ }
  }, []);

  // ---- LIFECYCLE ----

  useEffect(() => {
    fetchSocialData();
    fetchProjects();
    return () => {
      stopSocialRealtime();
      stopProjectRealtime();
    };
  }, [fetchSocialData, fetchProjects, stopSocialRealtime, stopProjectRealtime]);

  // ---- RENDER ----

  const rootClass = isDark
    ? 'min-h-screen bg-gray-950 text-white'
    : 'min-h-screen bg-gray-50 text-gray-900';

  return (
    <div className={rootClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ---- Page Header ---- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-sm text-gray-400 mt-1">Real-time insights across all platforms</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'social' && (
              <button
                onClick={toggleSocialRealtime}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  realtimeEnabled
                    ? 'border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <PulseDot active={realtimeEnabled} />
                {realtimeEnabled ? 'Realtime On' : 'Enable Realtime'}
              </button>
            )}
            {activeTab === 'projects' && (
              <button
                onClick={toggleProjectRealtime}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  projectRTEnabled
                    ? 'border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <PulseDot active={projectRTEnabled} />
                {projectRTEnabled ? 'Realtime On' : 'Enable Realtime'}
              </button>
            )}
          </div>
        </div>

        {/* ---- Tabs ---- */}
        <div className="flex gap-1 p-1 rounded-xl border border-white/10 bg-white/5 w-fit mb-8">
          {[
            { id: 'social',   label: 'Social Media'      },
            { id: 'projects', label: 'Project Tracking'  },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ================================================================
            SOCIAL MEDIA TAB
            ================================================================ */}
        {activeTab === 'social' && (
          <>
            {socialError && !socialLoading && (
              <ErrorDisplay message={socialError} onRetry={fetchSocialData} />
            )}

            {!socialError && (
              <>
                {/* Overview Banner */}
                {socialLoading
                  ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 animate-pulse h-16" />
                      ))}
                    </div>
                  )
                  : <OverviewBanner overview={overview} />
                }

                {/* Sync All button */}
                {!socialLoading && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => PLATFORMS.forEach(p => syncPlatform(p.id))}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                    >
                      ↻ Sync All Platforms
                    </button>
                  </div>
                )}

                {/* Platform Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {socialLoading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                    : PLATFORMS.map(p => (
                      <div key={p.id} className="relative">
                        <PlatformCard
                          platform={p.id}
                          data={platformData[p.id]}
                          realtimeActive={realtimeEnabled}
                          realtimeMetrics={realtimeMetrics[p.id]}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); syncPlatform(p.id); }}
                          disabled={syncingPlatforms[p.id]}
                          className="absolute top-3 right-3 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
                          title="Sync platform"
                        >
                          {syncingPlatforms[p.id] ? '…' : '↻'}
                        </button>
                      </div>
                    ))
                  }
                </div>
              </>
            )}
          </>
        )}

        {/* ================================================================
            PROJECT TRACKING TAB
            ================================================================ */}
        {activeTab === 'projects' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Project Trackers</h2>
                <p className="text-sm text-gray-400">
                  {projectsLoading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
              >
                + New Project
              </button>
            </div>

            {projectsError && !projectsLoading && (
              <ErrorDisplay message={projectsError} onRetry={fetchProjects} />
            )}

            {!projectsError && (
              <>
                {projectsLoading
                  ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                  )
                  : projects.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="text-5xl mb-4">📁</div>
                      <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
                      <p className="text-sm text-gray-400 mb-6">Create your first project tracker to start monitoring metrics.</p>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
                      >
                        Create Project
                      </button>
                    </div>
                  )
                  : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {projects.map(project => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onDelete={handleDeleteProject}
                          realtimeActive={projectRTEnabled}
                          realtimeMetrics={projectRTMetrics[project.id]}
                        />
                      ))}
                    </div>
                  )
                }
              </>
            )}
          </>
        )}
      </div>

      {/* ---- Add Project Modal ---- */}
      {showAddModal && (
        <AddProjectModal
          userId={userId}
          onClose={() => setShowAddModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}
