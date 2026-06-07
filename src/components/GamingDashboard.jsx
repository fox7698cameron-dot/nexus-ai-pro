// src/components/GamingDashboard.jsx | Nexus AI Pro | Date: 2026-06-07
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Enterprise gaming & XR project dashboard — React 18, Tailwind CSS, dark mode

import React, { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TABS = [
  { id: 'projects',    label: 'Game Projects' },
  { id: 'xr',         label: 'XR Projects' },
  { id: 'achievements',label: 'Achievements' },
  { id: 'connectors', label: 'Platform Connectors' },
  { id: 'leaderboard',label: 'Leaderboards' },
];

const PLATFORM_META = {
  unreal:      { label: 'Unreal Engine',   icon: '⚡', vendor: 'Epic Games'  },
  epic:        { label: 'Epic Games Store', icon: '🎮', vendor: 'Epic Games'  },
  playstation: { label: 'PlayStation',     icon: '🎮', vendor: 'Sony'        },
  xbox:        { label: 'Xbox',            icon: '🟢', vendor: 'Microsoft'   },
  ubisoft:     { label: 'Ubisoft Connect', icon: '🔷', vendor: 'Ubisoft'     },
};

const ENGINE_COLORS = {
  unreal: 'bg-blue-600 text-white',
  unity:  'bg-gray-600 text-white',
  godot:  'bg-purple-600 text-white',
  custom: 'bg-yellow-600 text-black',
};

const XR_TYPE_COLORS = {
  ar:    'bg-green-500 text-white',
  vr:    'bg-purple-600 text-white',
  mixed: 'bg-blue-500 text-white',
  '3d':  'bg-orange-500 text-white',
};

const XR_TYPE_LABELS = { ar: 'AR', vr: 'VR', mixed: 'Mixed Reality', '3d': '3D' };

const ACHIEVEMENT_PLATFORM_FILTERS = ['All', 'playstation', 'xbox', 'epic', 'ubisoft'];

const DEMO_GAME_ID = 'nexus-demo-001';

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------
async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/gaming${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Request failed: ${res.status}`);
  return json;
}

// ---------------------------------------------------------------------------
// Reusable UI primitives
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-red-900/40 border border-red-500 text-red-300 text-sm">
      <span className="text-red-400">⚠</span>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-200 transition-colors" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

function Badge({ className = '', children }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function ProgressBar({ pct, colorClass = 'bg-indigo-500' }) {
  const safeVal = Math.min(100, Math.max(0, Number(pct) || 0));
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${safeVal}%` }}
        role="progressbar"
        aria-valuenow={safeVal}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

/** CSS-only sparkline — renders an array of {fps} values as vertical bars */
function FpsSparkline({ history = [] }) {
  if (!history.length) return <span className="text-gray-500 text-xs">No data</span>;
  const max = Math.max(...history.map(h => h.fps ?? h.fpsActual ?? 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-8" aria-label="FPS sparkline">
      {history.map((h, i) => {
        const val = h.fps ?? h.fpsActual ?? 0;
        const heightPct = Math.round((val / max) * 100);
        const color = val >= 60 ? 'bg-green-500' : val >= 30 ? 'bg-yellow-500' : 'bg-red-500';
        return (
          <div
            key={i}
            title={`${val} FPS`}
            className={`flex-1 rounded-sm ${color} transition-all`}
            style={{ height: `${heightPct}%`, minHeight: '2px' }}
          />
        );
      })}
    </div>
  );
}

/** Memory bar chart — renders memoryMB values */
function MemoryChart({ history = [] }) {
  if (!history.length) return <span className="text-gray-500 text-xs">No data</span>;
  const max = Math.max(...history.map(h => h.memoryMB ?? 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-8" aria-label="Memory chart">
      {history.map((h, i) => {
        const val = h.memoryMB ?? 0;
        const heightPct = Math.round((val / max) * 100);
        return (
          <div
            key={i}
            title={`${val} MB`}
            className="flex-1 rounded-sm bg-cyan-500 transition-all"
            style={{ height: `${heightPct}%`, minHeight: '2px' }}
          />
        );
      })}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, error, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition';
const selectCls = `${inputCls} appearance-none`;

// ---------------------------------------------------------------------------
// ============================================================
//  TAB: GAME PROJECTS
// ============================================================
// ---------------------------------------------------------------------------

const EMPTY_PROJECT_FORM = { name: '', engine: 'unreal', genre: 'action', platforms: '', teamSize: '1' };

function ProjectCard({ project, onSelect }) {
  const statusColor = { active: 'bg-green-500', paused: 'bg-yellow-500', shipped: 'bg-blue-500', cancelled: 'bg-red-500' };
  const buildStatusColor = { success: 'text-green-400', running: 'text-yellow-400', failed: 'text-red-400', null: 'text-gray-500' };

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col gap-3 hover:border-indigo-500 transition-colors cursor-pointer group"
      onClick={() => onSelect(project)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onSelect(project); }}
      aria-label={`Open project ${project.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{project.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{project.genre}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${statusColor[project.status] ?? 'bg-gray-500'}`} />
          <Badge className={ENGINE_COLORS[project.engine] ?? 'bg-gray-600 text-white'}>{project.engine}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {(project.platforms ?? []).map(p => (
          <Badge key={p} className="bg-gray-700 text-gray-300">{p}</Badge>
        ))}
      </div>

      <div className="text-xs text-gray-400">Team: {project.teamSize} member{project.teamSize !== 1 ? 's' : ''}</div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Progress</span><span>{project.completionPct}%</span>
        </div>
        <ProgressBar pct={project.completionPct} />
      </div>

      {project.lastBuildAt && (
        <div className={`text-xs ${buildStatusColor[project.lastBuildStatus] ?? 'text-gray-400'}`}>
          Last build: {new Date(project.lastBuildAt).toLocaleString()} — {project.lastBuildStatus ?? 'unknown'}
        </div>
      )}
    </div>
  );
}

function ProjectDetailModal({ project, onClose, onBuild }) {
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildResult, setBuildResult] = useState(null);
  const [metricsError, setMetricsError] = useState('');

  useEffect(() => {
    if (!project) return;
    setLoadingMetrics(true);
    setMetricsError('');
    apiFetch(`/projects/${project.id}/metrics`)
      .then(r => setMetrics(r.data.metrics))
      .catch(e => setMetricsError(e.message))
      .finally(() => setLoadingMetrics(false));
  }, [project]);

  const handleBuild = useCallback(async () => {
    setBuildLoading(true);
    setBuildResult(null);
    try {
      const r = await apiFetch(`/projects/${project.id}/build`, { method: 'POST' });
      setBuildResult({ ok: true, message: r.message, buildId: r.data.buildId });
      if (onBuild) onBuild(project.id);
    } catch (e) {
      setBuildResult({ ok: false, message: e.message });
    } finally {
      setBuildLoading(false);
    }
  }, [project, onBuild]);

  if (!project) return null;

  return (
    <Modal open={Boolean(project)} onClose={onClose} title={project.name}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Engine</span>
            <div><Badge className={ENGINE_COLORS[project.engine] ?? 'bg-gray-600 text-white'}>{project.engine}</Badge></div>
          </div>
          <div>
            <span className="text-gray-400">Genre</span>
            <div className="text-white capitalize">{project.genre}</div>
          </div>
          <div>
            <span className="text-gray-400">Team</span>
            <div className="text-white">{project.teamSize} members</div>
          </div>
          <div>
            <span className="text-gray-400">Status</span>
            <div className="text-white capitalize">{project.status}</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Completion</span><span>{project.completionPct}%</span>
          </div>
          <ProgressBar pct={project.completionPct} />
        </div>

        {loadingMetrics ? (
          <Spinner />
        ) : metricsError ? (
          <p className="text-red-400 text-xs">{metricsError}</p>
        ) : metrics ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['FPS',        `${metrics.framesPerSecond} fps`],
                ['Memory',     `${metrics.memoryMB} MB`],
                ['Load Time',  `${metrics.loadTimeMs} ms`],
                ['Draw Calls', metrics.drawCalls],
                ['Triangles',  metrics.triangleCount.toLocaleString()],
                ['Build Size', `${(metrics.buildSizeKB / 1024).toFixed(1)} MB`],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-900 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-0.5">{k}</div>
                  <div className="text-white font-semibold">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">FPS History</div>
              <FpsSparkline history={metrics.history} />
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Memory History</div>
              <MemoryChart history={metrics.history} />
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={handleBuild}
            disabled={buildLoading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {buildLoading ? 'Queuing…' : 'Trigger Build'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {buildResult && (
          <div className={`text-sm px-3 py-2 rounded-lg ${buildResult.ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
            {buildResult.message}
            {buildResult.buildId && <span className="text-gray-400 ml-2 text-xs">#{buildResult.buildId.slice(0, 8)}</span>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function GameProjectsTab() {
  const [projects, setProjects]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [showCreate, setShowCreate]       = useState(false);
  const [form, setForm]                   = useState(EMPTY_PROJECT_FORM);
  const [formErrors, setFormErrors]       = useState({});
  const [saving, setSaving]               = useState(false);
  const [selectedProject, setSelected]   = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await apiFetch('/projects');
      setProjects(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const validateForm = useCallback(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.engine) errs.engine = 'Engine is required.';
    if (!form.genre) errs.genre = 'Genre is required.';
    if (!form.platforms.trim()) errs.platforms = 'At least one platform is required.';
    const ts = parseInt(form.teamSize, 10);
    if (isNaN(ts) || ts < 1) errs.teamSize = 'Team size must be a positive integer.';
    return errs;
  }, [form]);

  const handleCreate = useCallback(async e => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    setFormErrors({});
    try {
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name:      form.name.trim(),
          engine:    form.engine,
          genre:     form.genre,
          platforms: form.platforms.split(',').map(s => s.trim()).filter(Boolean),
          teamSize:  parseInt(form.teamSize, 10),
        }),
      });
      setShowCreate(false);
      setForm(EMPTY_PROJECT_FORM);
      loadProjects();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [form, validateForm, loadProjects]);

  const handleBuild = useCallback(projectId => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, lastBuildAt: Date.now(), lastBuildStatus: 'running' } : p
    ));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Game Projects</h2>
          <p className="text-gray-400 text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors shadow-lg"
        >
          <span className="text-lg leading-none">+</span> New Project
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? <Spinner /> : (
        projects.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-3">🎮</div>
            <p>No game projects yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={setSelected} />
            ))}
          </div>
        )
      )}

      {/* Create Project Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormErrors({}); }} title="Create Game Project">
        <form onSubmit={handleCreate} noValidate className="space-y-1">
          <FormField label="Project Name" error={formErrors.name}>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Game"
              maxLength={200}
              required
            />
          </FormField>

          <FormField label="Engine" error={formErrors.engine}>
            <select className={selectCls} value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))}>
              {['unreal', 'unity', 'godot', 'custom'].map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
            </select>
          </FormField>

          <FormField label="Genre" error={formErrors.genre}>
            <select className={selectCls} value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}>
              {['action','rpg','strategy','sports','simulation','puzzle','shooter','adventure','horror','racing','fighting','platformer','other']
                .map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </FormField>

          <FormField label="Target Platforms (comma-separated)" error={formErrors.platforms}>
            <input
              className={inputCls}
              value={form.platforms}
              onChange={e => setForm(f => ({ ...f, platforms: e.target.value }))}
              placeholder="PC, PS5, Xbox Series X"
              maxLength={500}
            />
          </FormField>

          <FormField label="Team Size" error={formErrors.teamSize}>
            <input
              className={inputCls}
              type="number"
              min="1"
              max="10000"
              value={form.teamSize}
              onChange={e => setForm(f => ({ ...f, teamSize: e.target.value }))}
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Creating…' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setFormErrors({}); }}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelected(null)}
        onBuild={handleBuild}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ============================================================
//  TAB: XR PROJECTS
// ============================================================
// ---------------------------------------------------------------------------

const EMPTY_XR_FORM = { name: '', type: 'vr', engine: 'unreal', targetPlatform: 'quest' };

function XRProjectCard({ project, onSelect }) {
  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col gap-3 hover:border-indigo-500 transition-colors cursor-pointer group"
      onClick={() => onSelect(project)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onSelect(project); }}
      aria-label={`Open XR project ${project.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-white truncate group-hover:text-indigo-400 transition-colors flex-1">{project.name}</h3>
        <Badge className={XR_TYPE_COLORS[project.type] ?? 'bg-gray-600 text-white'}>
          {XR_TYPE_LABELS[project.type] ?? project.type}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1 text-xs">
        <Badge className={ENGINE_COLORS[project.engine] ?? 'bg-gray-600 text-white'}>{project.engine}</Badge>
        <Badge className="bg-gray-700 text-gray-300 capitalize">{project.targetPlatform}</Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Progress</span><span>{project.completionPct}%</span>
        </div>
        <ProgressBar pct={project.completionPct} colorClass={`${XR_TYPE_COLORS[project.type]?.split(' ')[0] ?? 'bg-indigo-500'}`} />
      </div>
    </div>
  );
}

function XRPerformanceModal({ project, onClose }) {
  const [perf, setPerf]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!project) return;
    setLoading(true);
    setError('');
    apiFetch(`/xr-projects/${project.id}/performance`)
      .then(r => setPerf(r.data.performance))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [project]);

  if (!project) return null;

  const fpsGood = perf && perf.fpsActual >= perf.fpsTarget * 0.9;

  return (
    <Modal open={Boolean(project)} onClose={onClose} title={`${project.name} — Performance`}>
      <div className="space-y-5">
        <div className="flex gap-2 flex-wrap">
          <Badge className={XR_TYPE_COLORS[project.type] ?? 'bg-gray-600 text-white'}>{XR_TYPE_LABELS[project.type] ?? project.type}</Badge>
          <Badge className={ENGINE_COLORS[project.engine] ?? 'bg-gray-600 text-white'}>{project.engine}</Badge>
          <Badge className="bg-gray-700 text-gray-300 capitalize">{project.targetPlatform}</Badge>
        </div>

        {loading ? <Spinner /> : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : perf ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['FPS Target',  `${perf.fpsTarget} fps`],
                ['FPS Actual',  `${perf.fpsActual} fps`, fpsGood ? 'text-green-400' : 'text-red-400'],
                ['Latency',     `${perf.latencyMs} ms`],
                ['Render Time', `${perf.renderTimeMs} ms`],
                ['GPU Load',    `${perf.gpuUtilization}%`],
                ['CPU Load',    `${perf.cpuUtilization}%`],
              ].map(([k, v, cls = 'text-white']) => (
                <div key={k} className="bg-gray-900 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-0.5">{k}</div>
                  <div className={`font-semibold ${cls}`}>{v}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-gray-400 mb-0.5">Thermal State</div>
                <div className={`font-medium capitalize ${perf.thermalState === 'nominal' ? 'text-green-400' : perf.thermalState === 'fair' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {perf.thermalState}
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-gray-400 mb-0.5">Battery Impact</div>
                <div className={`font-medium capitalize ${perf.batteryImpact === 'low' ? 'text-green-400' : perf.batteryImpact === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {perf.batteryImpact}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">FPS Trend</div>
              <FpsSparkline history={perf.history} />
            </div>
          </div>
        ) : null}

        <button onClick={onClose} className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors">
          Close
        </button>
      </div>
    </Modal>
  );
}

function XRProjectsTab() {
  const [projects, setProjects]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(EMPTY_XR_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]         = useState(false);
  const [selected, setSelected]     = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await apiFetch('/xr-projects');
      setProjects(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const validateForm = useCallback(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    return errs;
  }, [form]);

  const handleCreate = useCallback(async e => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    setFormErrors({});
    try {
      await apiFetch('/xr-projects', {
        method: 'POST',
        body: JSON.stringify({
          name:           form.name.trim(),
          type:           form.type,
          engine:         form.engine,
          targetPlatform: form.targetPlatform,
        }),
      });
      setShowCreate(false);
      setForm(EMPTY_XR_FORM);
      loadProjects();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [form, validateForm, loadProjects]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">XR / AR / VR Projects</h2>
          <p className="text-gray-400 text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors shadow-lg"
        >
          <span className="text-lg leading-none">+</span> New XR Project
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? <Spinner /> : (
        projects.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-3">🥽</div>
            <p>No XR projects yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => (
              <XRProjectCard key={p.id} project={p} onSelect={setSelected} />
            ))}
          </div>
        )
      )}

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormErrors({}); }} title="Create XR Project">
        <form onSubmit={handleCreate} noValidate className="space-y-1">
          <FormField label="Project Name" error={formErrors.name}>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My VR Experience"
              maxLength={200}
              required
            />
          </FormField>

          <FormField label="XR Type">
            <select className={selectCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {[['ar','Augmented Reality (AR)'], ['vr','Virtual Reality (VR)'], ['mixed','Mixed Reality'], ['3d','3D']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Engine">
            <select className={selectCls} value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))}>
              {['unreal', 'unity', 'blender', 'custom'].map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
            </select>
          </FormField>

          <FormField label="Target Platform">
            <select className={selectCls} value={form.targetPlatform} onChange={e => setForm(f => ({ ...f, targetPlatform: e.target.value }))}>
              {['quest', 'vive', 'arkit', 'arcore', 'hololens', 'custom'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </FormField>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Creating…' : 'Create XR Project'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setFormErrors({}); }}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <XRPerformanceModal project={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ============================================================
//  TAB: ACHIEVEMENTS
// ============================================================
// ---------------------------------------------------------------------------

function AchievementsTab({ userId }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState('All');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const r = await apiFetch(`/achievements/user/${userId}`);
      setData(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const achievements = data?.data ?? [];
  const stats        = data?.stats ?? { total: 0, unlocked: 0, locked: 0, completionPct: 0 };

  const filtered = filter === 'All'
    ? achievements
    : achievements.filter(a => a.platform === filter.toLowerCase());

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Achievements</h2>
        <p className="text-gray-400 text-sm">{stats.unlocked} / {stats.total} unlocked — {stats.completionPct}% complete</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          ['Unlocked', stats.unlocked, 'text-green-400'],
          ['Locked',   stats.locked,   'text-red-400'],
          ['Total',    stats.total,     'text-indigo-400'],
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${cls}`}>{val}</div>
            <div className="text-gray-400 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Completion bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Overall completion</span><span>{stats.completionPct}%</span>
        </div>
        <ProgressBar pct={stats.completionPct} colorClass="bg-yellow-500" />
      </div>

      {/* Platform filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ACHIEVEMENT_PLATFORM_FILTERS.map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
              filter === p
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-transparent border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🏆</div>
          <p>{achievements.length === 0 ? 'No achievements synced yet.' : 'No achievements match this filter.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div
              key={a.id}
              className={`bg-gray-800 border rounded-xl p-4 flex gap-3 transition-colors ${
                a.unlocked ? 'border-yellow-600/60 bg-yellow-900/10' : 'border-gray-700 opacity-70'
              }`}
            >
              <div className="text-3xl shrink-0 leading-none pt-0.5" aria-hidden="true">{a.icon ?? '🏆'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-white text-sm truncate">{a.title}</h3>
                  {a.unlocked && <Badge className="bg-yellow-600 text-black">Unlocked</Badge>}
                </div>
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">{a.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <Badge className="bg-gray-700 text-gray-300 capitalize">{a.platform}</Badge>
                  <span className="text-indigo-400 font-medium">{a.points} pts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ============================================================
//  TAB: PLATFORM CONNECTORS
// ============================================================
// ---------------------------------------------------------------------------

function ConnectorCard({ connector, onConnect, onDisconnect }) {
  const meta = PLATFORM_META[connector.platform] ?? { label: connector.platform, icon: '🔌', vendor: '' };

  return (
    <div className={`bg-gray-800 border rounded-xl p-5 flex flex-col gap-4 transition-colors ${
      connector.connected ? 'border-green-600/60 bg-green-900/5' : 'border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">{meta.icon}</span>
          <div>
            <h3 className="font-bold text-white">{meta.label}</h3>
            <p className="text-xs text-gray-400">{meta.vendor}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${connector.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-xs font-medium ${connector.connected ? 'text-green-400' : 'text-red-400'}`}>
            {connector.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {connector.connected && (
        <div className="text-xs text-gray-400 space-y-0.5">
          <div>Account: <span className="text-gray-300">{connector.accountId}</span></div>
          {connector.connectedAt && (
            <div>Connected: <span className="text-gray-300">{new Date(connector.connectedAt).toLocaleDateString()}</span></div>
          )}
          {connector.lastSync && (
            <div>Last sync: <span className="text-gray-300">{new Date(connector.lastSync).toLocaleString()}</span></div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {connector.connected ? (
          <button
            onClick={() => onDisconnect(connector.platform)}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => onConnect(connector.platform)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

function ConnectModal({ platform, open, onClose, onSuccess }) {
  const [accountId, setAccountId] = useState('');
  const [apiKey, setApiKey]       = useState('');
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!open) { setAccountId(''); setApiKey(''); setErrors({}); setServerError(''); }
  }, [open]);

  const meta = PLATFORM_META[platform] ?? { label: platform };

  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    const errs = {};
    if (!accountId.trim()) errs.accountId = 'Account ID is required.';
    if (!apiKey.trim()) errs.apiKey = 'API key is required.';
    else if (apiKey.length < 16) errs.apiKey = 'API key must be at least 16 characters.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError('');
    try {
      await apiFetch(`/platforms/${platform}/connect`, {
        method: 'POST',
        body: JSON.stringify({ accountId: accountId.trim(), apiKey }),
      });
      onSuccess();
      onClose();
    } catch (e) {
      setServerError(e.message);
    } finally {
      setSaving(false);
    }
  }, [platform, accountId, apiKey, onSuccess, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={`Connect ${meta.label}`}>
      <form onSubmit={handleSubmit} noValidate className="space-y-1">
        <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />

        <FormField label="Account ID" error={errors.accountId}>
          <input
            className={inputCls}
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            placeholder="your-account-id"
            autoComplete="username"
            maxLength={128}
          />
        </FormField>

        <FormField label="API Key" error={errors.apiKey}>
          <input
            className={inputCls}
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="••••••••••••••••"
            autoComplete="current-password"
            maxLength={512}
          />
          <p className="mt-1 text-xs text-gray-500">Your API key is hashed before storage and never returned in plaintext.</p>
        </FormField>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {saving ? 'Connecting…' : 'Connect'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PlatformConnectorsTab() {
  const [connectors, setConnectors]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [connectModal, setConnectModal] = useState(null); // platform id
  const [disconnecting, setDisconnecting] = useState(null);

  const loadConnectors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await apiFetch('/platforms');
      setConnectors(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  const handleDisconnect = useCallback(async platform => {
    if (!window.confirm(`Disconnect from ${PLATFORM_META[platform]?.label ?? platform}?`)) return;
    setDisconnecting(platform);
    setError('');
    try {
      await apiFetch(`/platforms/${platform}/disconnect`, { method: 'DELETE' });
      loadConnectors();
    } catch (e) {
      setError(e.message);
    } finally {
      setDisconnecting(null);
    }
  }, [loadConnectors]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Platform Connectors</h2>
        <p className="text-gray-400 text-sm">
          {connectors.filter(c => c.connected).length} of {connectors.length} platforms connected
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {connectors.map(c => (
            <ConnectorCard
              key={c.platform}
              connector={{ ...c, disconnecting: disconnecting === c.platform }}
              onConnect={p => setConnectModal(p)}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      <ConnectModal
        platform={connectModal}
        open={Boolean(connectModal)}
        onClose={() => setConnectModal(null)}
        onSuccess={loadConnectors}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ============================================================
//  TAB: LEADERBOARDS
// ============================================================
// ---------------------------------------------------------------------------

function LeaderboardsTab() {
  const [gameId, setGameId]   = useState(DEMO_GAME_ID);
  const [input, setInput]     = useState(DEMO_GAME_ID);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async (id) => {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await apiFetch(`/leaderboard/${encodeURIComponent(id.trim())}`);
      setRows(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(gameId); }, [gameId, load]);

  const handleSearch = useCallback(e => {
    e.preventDefault();
    setGameId(input);
  }, [input]);

  const rankBadgeClass = rank => {
    if (rank === 1) return 'bg-yellow-500 text-black';
    if (rank === 2) return 'bg-gray-400 text-black';
    if (rank === 3) return 'bg-amber-700 text-white';
    return 'bg-gray-700 text-gray-300';
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Leaderboards</h2>
        <form onSubmit={handleSearch} className="flex gap-2 mt-3">
          <input
            className={`${inputCls} flex-1`}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Game ID…"
            maxLength={128}
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Load
          </button>
        </form>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? <Spinner /> : rows.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🏅</div>
          <p>No leaderboard data for this game.</p>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/50">
                  {['Rank', 'Player', 'Score', 'Platform', 'Recorded'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={`${row.player}-${i}`}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${i === 0 ? 'bg-yellow-900/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Badge className={rankBadgeClass(row.rank)}>#{row.rank}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{row.player}</td>
                    <td className="px-4 py-3 text-indigo-400 font-semibold tabular-nums">{row.score.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-gray-700 text-gray-300 capitalize">{row.platform}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {row.recordedAt ? new Date(row.recordedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ============================================================
//  ROOT: GamingDashboard
// ============================================================
// ---------------------------------------------------------------------------

/**
 * GamingDashboard
 *
 * @param {{ userId: string, theme?: 'dark'|'light' }} props
 */
export default function GamingDashboard({ userId, theme = 'dark' }) {
  const [activeTab, setActiveTab] = useState('projects');

  const tabContent = {
    projects:     <GameProjectsTab />,
    xr:           <XRProjectsTab />,
    achievements: <AchievementsTab userId={userId} />,
    connectors:   <PlatformConnectorsTab />,
    leaderboard:  <LeaderboardsTab />,
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'} font-sans`}>
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🎮</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Nexus Gaming</h1>
            <p className="text-xs text-gray-400 leading-none">AI Pro Platform</p>
          </div>
          {userId && (
            <span className="ml-auto text-xs text-gray-500">
              User: <span className="text-gray-300">{userId}</span>
            </span>
          )}
        </div>
      </header>

      {/* Navigation tabs */}
      <nav
        className="sticky top-[57px] z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 sm:px-6"
        aria-label="Dashboard sections"
      >
        <div className="max-w-7xl mx-auto flex gap-0 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {tabContent[activeTab] ?? null}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-4 sm:px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <span>Nexus AI Pro — Gaming Platform</span>
          <span>Copyright &copy; 2025-2026 Cameron Fox</span>
        </div>
      </footer>
    </div>
  );
}
