// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File: src/components/GameDevDashboard.jsx
// Created: 2026-08-13
// Game Development Project Tracking Dashboard

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  Gamepad2, Layers, Code2, Cpu, Globe, Smartphone, Monitor,
  Trophy, Star, Zap, GitBranch, GitCommit, CheckCircle2, XCircle,
  Clock, AlertCircle, Play, Pause, RefreshCw, Plus, ChevronRight,
  ChevronDown, Users, Target, Flag, BarChart3, TrendingUp, Shield,
  Package, Plug, Settings, Filter, Search, Bell, Moon, Sun, Wifi,
  WifiOff, Upload, Download, Activity, Boxes, Rocket, Wrench,
  LayoutDashboard, ChevronUp, ExternalLink, Eye, Terminal,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = '/api/gamedev';

const ENGINE_ICONS = {
  unreal:  '⬡',
  unity:   '◈',
  godot:   '◆',
  custom:  '⚙',
  none:    '–',
};

const STATUS_COLORS = {
  active:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  paused:    { bg: 'bg-amber-500/15',   text: 'text-amber-400',   ring: 'ring-amber-500/30' },
  planning:  { bg: 'bg-sky-500/15',     text: 'text-sky-400',     ring: 'ring-sky-500/30' },
  completed: { bg: 'bg-violet-500/15',  text: 'text-violet-400',  ring: 'ring-violet-500/30' },
  archived:  { bg: 'bg-slate-500/15',   text: 'text-slate-400',   ring: 'ring-slate-500/30' },
};

const BUILD_COLORS = {
  passing:   'text-emerald-400',
  failing:   'text-red-400',
  pending:   'text-amber-400',
  cancelled: 'text-slate-400',
  skipped:   'text-slate-500',
};

const TYPE_ICONS = {
  game:   <Gamepad2 size={14} />,
  ar:     <Layers size={14} />,
  vr:     <Boxes size={14} />,
  xr:     <Globe size={14} />,
  '3d':   <Cpu size={14} />,
  mobile: <Smartphone size={14} />,
  web:    <Monitor size={14} />,
  tool:   <Wrench size={14} />,
};

const PLATFORM_META = {
  epic:     { label: 'Epic / Unreal', color: 'text-sky-400',     icon: '⬡' },
  psn:      { label: 'PlayStation',   color: 'text-blue-400',    icon: '⬟' },
  xbox:     { label: 'Xbox',          color: 'text-emerald-400', icon: '⊞' },
  ubisoft:  { label: 'Ubisoft',       color: 'text-amber-400',   icon: '◈' },
  steam:    { label: 'Steam',         color: 'text-indigo-400',  icon: '⊛' },
  ios:      { label: 'iOS',           color: 'text-violet-400',  icon: '' },
  android:  { label: 'Android',       color: 'text-lime-400',    icon: '⟳' },
  web:      { label: 'Web',           color: 'text-orange-400',  icon: '⊕' },
};

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('gamedev-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('gamedev-theme', dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, () => setDark(d => !d)];
}

function useWebSocket(url, onMessage) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen  = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        retryRef.current = setTimeout(connect, 5000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        try { onMessage(JSON.parse(ev.data)); } catch (_) {}
      };
    } catch (_) {
      retryRef.current = setTimeout(connect, 5000);
    }
  }, [url, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return connected;
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token') || '';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ children, variant = 'default', className = '' }) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1';
  const variants = {
    default:   'bg-slate-700/50 text-slate-300 ring-slate-600/40',
    success:   'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    warning:   'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    error:     'bg-red-500/15 text-red-400 ring-red-500/30',
    info:      'bg-sky-500/15 text-sky-400 ring-sky-500/30',
    violet:    'bg-violet-500/15 text-violet-400 ring-violet-500/30',
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.archived;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

function BuildBadge({ status }) {
  const icons = {
    passing:   <CheckCircle2 size={12} />,
    failing:   <XCircle size={12} />,
    pending:   <Clock size={12} />,
    cancelled: <AlertCircle size={12} />,
    skipped:   <AlertCircle size={12} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono ${BUILD_COLORS[status] || 'text-slate-400'}`}>
      {icons[status] || <AlertCircle size={12} />}
      {status}
    </span>
  );
}

function CoverageBar({ value }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-400 w-8 text-right">{value}%</span>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, trend, color = 'text-slate-200' }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
        <span className="text-slate-500">{icon}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {Math.abs(trend)}% this sprint
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, count, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <span className="text-slate-400">{icon}</span>
        {title}
        {count !== undefined && (
          <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 text-xs tabular-nums">{count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}

function PlatformConnector({ platform, onSync, syncing }) {
  const meta = PLATFORM_META[platform.id] || {};
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-lg">
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-200 truncate">{platform.shortName}</span>
          {platform.connected
            ? <Badge variant="success">connected</Badge>
            : <Badge variant="error">disconnected</Badge>}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">SDK {platform.sdkVersion}</div>
      </div>
      <button
        onClick={() => onSync(platform.id)}
        disabled={!platform.connected || syncing === platform.id}
        className="flex-shrink-0 p-1.5 rounded-md bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        title="Sync platform"
        aria-label={`Sync ${platform.shortName}`}
      >
        <RefreshCw size={13} className={syncing === platform.id ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}

function MilestoneRow({ milestone }) {
  const overdue = !milestone.completed && milestone.dueDate && new Date(milestone.dueDate) < new Date();
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${milestone.completed ? 'border-emerald-500 bg-emerald-500/20' : overdue ? 'border-red-500' : 'border-slate-600'}`}>
        {milestone.completed && <CheckCircle2 size={10} className="text-emerald-400" />}
      </div>
      <span className={`flex-1 text-sm truncate ${milestone.completed ? 'line-through text-slate-500' : overdue ? 'text-red-400' : 'text-slate-300'}`}>
        {milestone.title}
      </span>
      {milestone.dueDate && (
        <span className={`text-xs flex-shrink-0 ${overdue && !milestone.completed ? 'text-red-400' : 'text-slate-500'}`}>
          {new Date(milestone.dueDate).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

function TeamMemberPill({ member }) {
  const roleColors = {
    lead:      'bg-violet-500/20 text-violet-300',
    developer: 'bg-sky-500/20 text-sky-300',
    artist:    'bg-pink-500/20 text-pink-300',
    designer:  'bg-amber-500/20 text-amber-300',
    qa:        'bg-emerald-500/20 text-emerald-300',
    producer:  'bg-orange-500/20 text-orange-300',
  };
  const initials = member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-700/50" title={`${member.name} (${member.role})`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${roleColors[member.role] || 'bg-slate-600 text-slate-300'}`}>
        {initials}
      </div>
      <span className="text-xs text-slate-300 max-w-[80px] truncate">{member.name}</span>
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const prog = project.milestones?.length
    ? Math.round((project.milestones.filter(m => m.completed).length / project.milestones.length) * 100)
    : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(project)}
      className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
        selected
          ? 'bg-slate-700/60 border-sky-600/50 ring-1 ring-sky-600/30'
          : 'bg-slate-800/50 border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/70'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-slate-400">{TYPE_ICONS[project.type] || <Gamepad2 size={14} />}</span>
          <h3 className="text-sm font-semibold text-slate-100 truncate">{project.name}</h3>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
      )}

      {/* Engine + platforms */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {project.engine !== 'none' && (
          <Badge variant="info">
            <span className="text-[11px]">{ENGINE_ICONS[project.engine]}</span>
            {project.engine}
          </Badge>
        )}
        {(project.targetPlatforms || []).slice(0, 4).map(p => (
          <span key={p} className={`text-xs font-medium ${(PLATFORM_META[p] || {}).color || 'text-slate-400'}`}>
            {(PLATFORM_META[p] || {}).label || p}
          </span>
        ))}
        {(project.targetPlatforms || []).length > 4 && (
          <span className="text-xs text-slate-500">+{project.targetPlatforms.length - 4}</span>
        )}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-xs font-bold text-slate-200 tabular-nums">{(project.commitCount || 0).toLocaleString()}</div>
          <div className="text-[10px] text-slate-500">commits</div>
        </div>
        <div className="text-center">
          <BuildBadge status={project.buildStatus || 'pending'} />
          <div className="text-[10px] text-slate-500 mt-0.5">build</div>
        </div>
        <div className="text-center">
          <div className={`text-xs font-bold tabular-nums ${project.testCoverage >= 80 ? 'text-emerald-400' : project.testCoverage >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {project.testCoverage ?? 0}%
          </div>
          <div className="text-[10px] text-slate-500">coverage</div>
        </div>
      </div>

      {/* Milestone progress */}
      {project.milestones?.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Milestones</span>
            <span className="text-[10px] text-slate-400">{project.milestones.filter(m => m.completed).length}/{project.milestones.length}</span>
          </div>
          <CoverageBar value={prog} />
        </div>
      )}

      {/* Team avatars */}
      {project.teamMembers?.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {project.teamMembers.slice(0, 5).map((m, i) => (
            <TeamMemberPill key={i} member={m} />
          ))}
          {project.teamMembers.length > 5 && (
            <span className="text-xs text-slate-500">+{project.teamMembers.length - 5}</span>
          )}
        </div>
      )}

      <ChevronRight
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-slate-400 transition-colors"
      />
    </div>
  );
}

function ProjectDetail({ project, onClose }) {
  const [tab, setTab] = useState('overview');
  const tabs = ['overview', 'milestones', 'team', 'build', 'plugins'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{TYPE_ICONS[project.type] || <Gamepad2 size={16} />}</span>
          <h2 className="text-base font-semibold text-slate-100">{project.name}</h2>
          <StatusBadge status={project.status} />
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none" aria-label="Close detail">&times;</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 border-b border-slate-700/40">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors capitalize ${
              tab === t
                ? 'bg-slate-700 text-slate-100 border-b-2 border-sky-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {tab === 'overview' && (
          <>
            {project.description && (
              <p className="text-sm text-slate-400">{project.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Commits"    value={(project.commitCount || 0).toLocaleString()} icon={<GitCommit size={14} />} trend={12} />
              <MetricCard label="Coverage"   value={`${project.testCoverage ?? 0}%`} icon={<Shield size={14} />} color={project.testCoverage >= 80 ? 'text-emerald-400' : 'text-amber-400'} />
              <MetricCard label="Sprint"     value={`${project.sprintLength}wk`} icon={<Activity size={14} />} sub="sprint length" />
              <MetricCard label="Engine"     value={project.engine !== 'none' ? project.engine : 'N/A'} icon={<Cpu size={14} />} sub={project.engineVersion ? `v${project.engineVersion}` : undefined} />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Build Status</div>
              <BuildBadge status={project.buildStatus || 'pending'} />
              {project.lastCommit && (
                <p className="mt-2 text-xs text-slate-500 font-mono truncate">{project.lastCommit}</p>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Target Platforms</div>
              <div className="flex flex-wrap gap-2">
                {(project.targetPlatforms || []).map(p => {
                  const m = PLATFORM_META[p] || {};
                  return (
                    <span key={p} className={`text-sm font-medium ${m.color || 'text-slate-400'}`}>
                      {m.icon} {m.label || p}
                    </span>
                  );
                })}
              </div>
            </div>
            {project.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {project.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}
              </div>
            )}
            {project.repository && (
              <a href={project.repository} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
                <GitBranch size={12} /> Repository <ExternalLink size={10} />
              </a>
            )}
          </>
        )}

        {tab === 'milestones' && (
          <div>
            {(project.milestones || []).length === 0
              ? <p className="text-sm text-slate-500">No milestones defined.</p>
              : project.milestones.map((m, i) => <MilestoneRow key={m.id || i} milestone={m} />)
            }
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-2">
            {(project.teamMembers || []).length === 0
              ? <p className="text-sm text-slate-500">No team members assigned.</p>
              : project.teamMembers.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">{m.name}</div>
                      <div className="text-xs text-slate-500 capitalize">{m.role}</div>
                    </div>
                    <Badge variant={m.role === 'lead' ? 'violet' : 'default'}>{m.role}</Badge>
                  </div>
                ))
            }
          </div>
        )}

        {tab === 'build' && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Build Targets</div>
              {(project.buildTargets || []).length === 0
                ? <p className="text-sm text-slate-500">No build targets configured.</p>
                : project.buildTargets.map((bt, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 mb-2">
                      <span className={`text-sm ${(PLATFORM_META[bt.platform] || {}).color || 'text-slate-400'}`}>
                        {(PLATFORM_META[bt.platform] || {}).icon}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-200">{(PLATFORM_META[bt.platform] || {}).label || bt.platform}</div>
                        <div className="text-xs text-slate-500 capitalize">{bt.environment}</div>
                      </div>
                      <Badge variant={bt.enabled ? 'success' : 'default'}>{bt.enabled ? 'enabled' : 'disabled'}</Badge>
                    </div>
                  ))
              }
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Test Coverage</div>
              <CoverageBar value={project.testCoverage ?? 0} />
            </div>
          </div>
        )}

        {tab === 'plugins' && (
          <PluginPanel engine={project.engine} />
        )}
      </div>
    </div>
  );
}

function PluginPanel({ engine }) {
  const PLUGINS = {
    unreal: [
      { name: 'Chaos Physics', category: 'Physics', version: '5.4.0', enabled: true },
      { name: 'NiagaraFX',    category: 'VFX',     version: '5.4.0', enabled: true },
      { name: 'MetaSound',    category: 'Audio',   version: '5.4.0', enabled: false },
      { name: 'Online Subsystem EOS', category: 'Online', version: '5.4.0', enabled: true },
    ],
    unity: [
      { name: 'Universal RP',  category: 'Rendering', version: '14.0.9', enabled: true },
      { name: 'AR Foundation', category: 'AR/XR',     version: '5.1.0',  enabled: true },
      { name: 'Cinemachine',   category: 'Camera',    version: '2.10.0', enabled: true },
      { name: 'Visual Scripting', category: 'Tools', version: '1.9.0', enabled: false },
    ],
    godot: [
      { name: 'GDScript LSP',  category: 'IDE',     version: '4.3', enabled: true },
      { name: 'WebXR',         category: 'XR',      version: '4.3', enabled: false },
    ],
    custom: [],
    none:   [],
  };

  const plugins = PLUGINS[engine] || [];
  if (plugins.length === 0) {
    return <p className="text-sm text-slate-500">No plugin registry for engine "{engine}".</p>;
  }

  return (
    <div className="space-y-2">
      {plugins.map((p, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
          <Plug size={14} className="text-slate-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200">{p.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge>{p.category}</Badge>
              <span className="text-xs text-slate-500">v{p.version}</span>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} title={p.enabled ? 'Enabled' : 'Disabled'} />
        </div>
      ))}
    </div>
  );
}

function AchievementCard({ achievement }) {
  const rarityColors = {
    common:    'text-slate-400',
    uncommon:  'text-emerald-400',
    rare:      'text-sky-400',
    epic:      'text-violet-400',
    legendary: 'text-amber-400',
  };
  const platform = PLATFORM_META[achievement.platform] || {};
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border transition-colors ${achievement.unlockedAt ? 'border-emerald-700/30 bg-emerald-500/5' : 'border-slate-700/40'}`}>
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xl ${achievement.unlockedAt ? 'bg-emerald-500/20' : 'bg-slate-700 grayscale opacity-40'}`}>
        <Trophy size={18} className={achievement.unlockedAt ? 'text-amber-400' : 'text-slate-500'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-slate-200 truncate">{achievement.title}</span>
          <span className={`text-xs font-medium ${rarityColors[achievement.rarity] || 'text-slate-400'}`}>
            {achievement.rarity}
          </span>
        </div>
        <div className="text-xs text-slate-500 truncate">{achievement.description}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs font-bold text-amber-400">{achievement.points}pt</div>
        <div className={`text-xs ${platform.color || 'text-slate-500'}`}>{platform.label || achievement.platform}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function GameDevDashboard() {
  const [darkMode, toggleTheme] = useTheme();
  const [projects, setProjects]         = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [platforms, setPlatforms]       = useState([]);
  const [selected, setSelected]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [errors, setErrors]             = useState({});
  const [syncing, setSyncing]           = useState(null);
  const [syncMsg, setSyncMsg]           = useState(null);
  const [filter, setFilter]             = useState({ status: '', type: '', search: '' });
  const [showNotif, setShowNotif]       = useState(false);
  const [notifs, setNotifs]             = useState([]);
  const [activeView, setActiveView]     = useState('projects'); // projects | achievements | platforms

  // WebSocket for real-time updates
  const wsUrl = useMemo(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/gamedev`;
  }, []);

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'project:updated') {
      setProjects(prev => prev.map(p => p.id === msg.data.id ? msg.data : p));
      setNotifs(n => [{ id: Date.now(), text: `Project "${msg.data.name}" updated.`, ts: new Date() }, ...n.slice(0, 9)]);
    }
    if (msg.type === 'build:status') {
      setProjects(prev => prev.map(p => p.id === msg.projectId ? { ...p, buildStatus: msg.status } : p));
    }
    if (msg.type === 'achievement:unlocked') {
      setAchievements(prev => prev.map(a => a.id === msg.achievementId ? { ...a, unlockedAt: new Date().toISOString() } : a));
      setNotifs(n => [{ id: Date.now(), text: `Achievement unlocked: "${msg.title}"`, ts: new Date() }, ...n.slice(0, 9)]);
    }
  }, []);

  const wsConnected = useWebSocket(wsUrl, handleWsMessage);

  // Load data
  const loadAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      apiFetch('/projects'),
      apiFetch('/achievements'),
      apiFetch('/platforms'),
    ]);

    const [proj, ach, plat] = results;

    if (proj.status === 'fulfilled') setProjects(proj.value.data || []);
    else setErrors(e => ({ ...e, projects: proj.reason.message }));

    if (ach.status === 'fulfilled') setAchievements(ach.value.data || []);
    else setErrors(e => ({ ...e, achievements: ach.reason.message }));

    if (plat.status === 'fulfilled') setPlatforms(plat.value.data || []);
    else setErrors(e => ({ ...e, platforms: plat.reason.message }));

    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSync = useCallback(async (platformId) => {
    setSyncing(platformId);
    setSyncMsg(null);
    try {
      const res = await apiFetch(`/sync/${platformId}`, { method: 'POST', body: { syncType: 'all', force: false } });
      setSyncMsg({ ok: true, text: `Sync queued (job ${res.jobId.slice(0, 8)}…)` });
      setNotifs(n => [{ id: Date.now(), text: `Sync started for ${PLATFORM_META[platformId]?.label || platformId}`, ts: new Date() }, ...n.slice(0, 9)]);
    } catch (err) {
      setSyncMsg({ ok: false, text: err.message });
    } finally {
      setSyncing(null);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filter.status && p.status !== filter.status) return false;
      if (filter.type   && p.type   !== filter.type)   return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [projects, filter]);

  // Summary stats
  const stats = useMemo(() => ({
    total:    projects.length,
    active:   projects.filter(p => p.status === 'active').length,
    passing:  projects.filter(p => p.buildStatus === 'passing').length,
    commits:  projects.reduce((s, p) => s + (p.commitCount || 0), 0),
    achTotal: achievements.length,
    achUnlocked: achievements.filter(a => a.unlockedAt).length,
    connectedPlatforms: platforms.filter(p => p.connected).length,
  }), [projects, achievements, platforms]);

  const navItems = [
    { id: 'projects',     label: 'Projects',      icon: <LayoutDashboard size={15} /> },
    { id: 'achievements', label: 'Achievements',  icon: <Trophy size={15} /> },
    { id: 'platforms',    label: 'Platforms',     icon: <Plug size={15} /> },
  ];

  const themeClass = darkMode
    ? 'bg-slate-900 text-slate-100'
    : 'bg-slate-100 text-slate-900';

  return (
    <div className={`min-h-screen ${themeClass} transition-colors duration-300`}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Gamepad2 size={20} className="text-sky-400" />
          <span className="font-bold text-sm tracking-tight text-slate-100 hidden sm:block">GameDev Dashboard</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Search projects…"
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* WS indicator */}
          <div className={`flex items-center gap-1 text-xs ${wsConnected ? 'text-emerald-400' : 'text-slate-500'}`} title={wsConnected ? 'Live updates connected' : 'Reconnecting…'}>
            {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span className="hidden sm:block">{wsConnected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotif(v => !v)}
              className="relative p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={15} />
              {notifs.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-sky-500 border border-slate-900" />
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Notifications</span>
                  <button onClick={() => setNotifs([])} className="text-xs text-slate-500 hover:text-slate-300">Clear</button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-700/50">
                  {notifs.length === 0
                    ? <p className="text-xs text-slate-500 p-3">No notifications.</p>
                    : notifs.map(n => (
                        <div key={n.id} className="px-3 py-2">
                          <p className="text-xs text-slate-300">{n.text}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{n.ts.toLocaleTimeString()}</p>
                        </div>
                      ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={loadAll}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh data"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Sync toast */}
      {syncMsg && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${syncMsg.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {syncMsg.text}
        </div>
      )}

      {/* Main layout */}
      <div className="flex min-h-[calc(100vh-52px)]">
        {/* Sidebar nav */}
        <nav className="w-14 md:w-48 flex-shrink-0 bg-slate-900 border-r border-slate-800 pt-4 px-2 flex flex-col gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveView(item.id); setSelected(null); }}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors w-full ${
                activeView === item.id
                  ? 'bg-sky-600/20 text-sky-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span className="hidden md:block">{item.label}</span>
            </button>
          ))}

          <div className="mt-auto pb-4">
            <button className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors w-full">
              <Settings size={15} />
              <span className="hidden md:block">Settings</span>
            </button>
          </div>
        </nav>

        {/* Content area */}
        <main className="flex-1 min-w-0 flex overflow-hidden">
          {/* Left panel */}
          <div className={`flex-1 flex flex-col overflow-hidden ${selected ? 'hidden lg:flex' : 'flex'}`}>
            {/* Summary metrics */}
            <div className="px-4 md:px-6 pt-5 pb-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                <MetricCard label="Projects"     value={stats.total}    sub={`${stats.active} active`}      icon={<Gamepad2 size={14} />} color="text-sky-400" />
                <MetricCard label="Passing"      value={stats.passing}  sub="build pipelines"               icon={<CheckCircle2 size={14} />} color="text-emerald-400" />
                <MetricCard label="Commits"      value={stats.commits.toLocaleString()} sub="total"         icon={<GitCommit size={14} />} />
                <MetricCard label="Achievements" value={`${stats.achUnlocked}/${stats.achTotal}`} sub="unlocked" icon={<Trophy size={14} />} color="text-amber-400" />
                <MetricCard label="Platforms"    value={stats.connectedPlatforms} sub={`of ${platforms.length} connected`} icon={<Plug size={14} />} color="text-violet-400" />
                <MetricCard label="Sprint Avg"   value="2wk" sub="cadence"                                  icon={<Activity size={14} />} />
              </div>

              {/* Filters (projects only) */}
              {activeView === 'projects' && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Filter size={13} className="text-slate-500" />
                  <select
                    value={filter.status}
                    onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                    className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500"
                    aria-label="Filter by status"
                  >
                    <option value="">All statuses</option>
                    {['active','planning','paused','completed','archived'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={filter.type}
                    onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
                    className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500"
                    aria-label="Filter by type"
                  >
                    <option value="">All types</option>
                    {['game','ar','vr','xr','3d','mobile','web','tool'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {(filter.status || filter.type || filter.search) && (
                    <button
                      onClick={() => setFilter({ status: '', type: '', search: '' })}
                      className="text-xs text-sky-400 hover:text-sky-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* View body */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw size={22} className="animate-spin text-slate-500" />
                </div>
              )}

              {!loading && activeView === 'projects' && (
                <>
                  <SectionHeader
                    icon={<Gamepad2 size={15} />}
                    title="Projects"
                    count={filteredProjects.length}
                    action={
                      <button className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                        <Plus size={13} /> New project
                      </button>
                    }
                  />
                  {errors.projects && (
                    <p className="text-sm text-red-400 mb-3">{errors.projects}</p>
                  )}
                  {filteredProjects.length === 0
                    ? <p className="text-sm text-slate-500 py-8 text-center">No projects match the current filters.</p>
                    : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          {filteredProjects.map(p => (
                            <ProjectCard
                              key={p.id}
                              project={p}
                              selected={selected?.id === p.id}
                              onSelect={setSelected}
                            />
                          ))}
                        </div>
                      )
                  }
                </>
              )}

              {!loading && activeView === 'achievements' && (
                <>
                  <SectionHeader icon={<Trophy size={15} />} title="Achievements" count={achievements.length} />
                  {errors.achievements && (
                    <p className="text-sm text-red-400 mb-3">{errors.achievements}</p>
                  )}
                  <div className="space-y-2">
                    {achievements.length === 0
                      ? <p className="text-sm text-slate-500 py-8 text-center">No achievements found.</p>
                      : achievements.map(a => <AchievementCard key={a.id} achievement={a} />)
                    }
                  </div>
                </>
              )}

              {!loading && activeView === 'platforms' && (
                <>
                  <SectionHeader icon={<Plug size={15} />} title="Platform Connectors" count={platforms.length} />
                  {errors.platforms && (
                    <p className="text-sm text-red-400 mb-3">{errors.platforms}</p>
                  )}
                  {syncMsg && (
                    <div className={`mb-3 px-3 py-2 rounded-lg text-sm ${syncMsg.ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {syncMsg.text}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {platforms.map(p => (
                      <PlatformConnector key={p.id} platform={p} onSync={handleSync} syncing={syncing} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full lg:w-96 xl:w-[420px] flex-shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col overflow-hidden">
              <ProjectDetail project={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
