// src/components/ProjectTracker.jsx
// 2026-10-23 - Game/AR/VR/3D project tracker with achievements and build history

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, RefreshCw, Check, Gamepad2, Box, Layers } from 'lucide-react';
import { t, detectLang } from '../i18n/translations.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const PROJECT_TYPES = [
  { key: 'web',    label: 'Web App',         emoji: '🌐' },
  { key: 'mobile', label: 'Mobile',          emoji: '📱' },
  { key: 'game',   label: 'Game',            emoji: '🎮' },
  { key: 'ar_vr',  label: 'AR/VR',          emoji: '🥽' },
  { key: '3d',     label: '3D / Graphics',   emoji: '🧊' },
  { key: 'ai',     label: 'AI / ML',         emoji: '🤖' },
  { key: 'other',  label: 'Other',           emoji: '📦' },
];

const GAME_ENGINES = [
  { key: 'unreal', label: 'Unreal Engine', emoji: '⚡' },
  { key: 'unity',  label: 'Unity',         emoji: '🔵' },
  { key: 'godot',  label: 'Godot',         emoji: '🤖' },
  { key: 'custom', label: 'Custom',         emoji: '⚙️' },
];

const GAME_PLATFORMS = ['pc', 'console', 'mobile', 'vr', 'multi'];

const AR_HEADSETS = [
  { key: 'quest',     label: 'Meta Quest' },
  { key: 'vision_pro',label: 'Apple Vision Pro' },
  { key: 'psvr2',     label: 'PS VR2' },
  { key: 'index',     label: 'Valve Index' },
];

const RENDER_ENGINES = [
  { key: 'blender',   label: 'Blender' },
  { key: 'cinema4d',  label: 'Cinema 4D' },
  { key: 'unreal',    label: 'Unreal' },
  { key: 'unity',     label: 'Unity' },
];

const STATUS_STYLES = {
  planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  dev:       'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  testing:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  shipped:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  archived:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const CONNECTOR_META = [
  { key: 'epic_games',  label: 'Epic Games / Unreal', emoji: '⚡' },
  { key: 'playstation', label: 'Sony PlayStation',     emoji: '🎮' },
  { key: 'xbox',        label: 'Microsoft Xbox',       emoji: '🟢' },
  { key: 'ubisoft',     label: 'Ubisoft Connect',      emoji: '🔷' },
];

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('nexus:accessToken') || '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers };
  const res = await fetch(`/api/projects${path}`, { ...opts, headers });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || 'Request failed');
  }
  return res.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const label = { planning: 'Planning', dev: 'Development', testing: 'Testing', shipped: 'Shipped', archived: 'Archived' }[status] || status;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] || ''}`}>{label}</span>;
}

function ProgressBar({ value = 0, label }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span><span>{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function ConnectorStatus({ connectors }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CONNECTOR_META.map(c => {
        const status = connectors?.find(s => s.key === c.key);
        return (
          <div key={c.key} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-750 rounded-lg text-xs">
            <span>{c.emoji}</span>
            <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{c.label}</span>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status?.connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Create project form ──────────────────────────────────────────────────────
function CreateProjectForm({ onCreated, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('web');
  const [engine, setEngine] = useState('unreal');
  const [gamePlatform, setGamePlatform] = useState('pc');
  const [renderEngine, setRenderEngine] = useState('blender');
  const [arHeadsets, setArHeadsets] = useState([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleHeadset = (key) => setArHeadsets(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = { name, type, description, engine: type === 'game' ? engine : undefined, gamePlatform: type === 'game' ? gamePlatform : undefined, arHeadsets: type === 'ar_vr' ? arHeadsets : undefined, renderEngine: type === '3d' ? renderEngine : undefined };
      const project = await apiFetch('/', { method: 'POST', body: JSON.stringify(body) });
      onCreated(project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">New Project</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name" className={inputCls} required />
          <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
            {PROJECT_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
          </select>
          {type === 'game' && (
            <>
              <select value={engine} onChange={e => setEngine(e.target.value)} className={inputCls}>
                {GAME_ENGINES.map(e => <option key={e.key} value={e.key}>{e.emoji} {e.label}</option>)}
              </select>
              <select value={gamePlatform} onChange={e => setGamePlatform(e.target.value)} className={inputCls}>
                {GAME_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </>
          )}
          {type === 'ar_vr' && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Target headsets:</p>
              <div className="flex flex-wrap gap-2">
                {AR_HEADSETS.map(h => (
                  <button type="button" key={h.key} onClick={() => toggleHeadset(h.key)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${arHeadsets.includes(h.key) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 dark:text-gray-400'}`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {type === '3d' && (
            <select value={renderEngine} onChange={e => setRenderEngine(e.target.value)} className={inputCls}>
              {RENDER_ENGINES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          )}
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className={`${inputCls} h-20 resize-none`} />
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * @param {{ socket: object|null, userRole: string }} props
 */
export default function ProjectTracker({ socket, userRole }) {
  const lang = detectLang();
  const [projects, setProjects] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/');
      setProjects(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConnectors = useCallback(async () => {
    try {
      const data = await apiFetch('/connectors/status');
      setConnectors(data);
    } catch {
      setConnectors([]);
    }
  }, []);

  useEffect(() => { loadProjects(); loadConnectors(); }, [loadProjects, loadConnectors]);

  useEffect(() => {
    if (!socket) return;
    const handler = (d) => {
      if (d.action === 'created') setProjects(prev => [d.project, ...prev]);
      if (d.action === 'updated') setProjects(prev => prev.map(p => p.id === d.project.id ? d.project : p));
      if (d.action === 'deleted') setProjects(prev => prev.filter(p => p.id !== d.projectId));
    };
    socket.on('project:update', handler);
    return () => socket.off('project:update', handler);
  }, [socket]);

  const handleCreated = (project) => {
    setProjects(prev => [project, ...prev]);
    setShowCreate(false);
  };

  const typeInfo = (type) => PROJECT_TYPES.find(t => t.key === type) || PROJECT_TYPES[PROJECT_TYPES.length - 1];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="text-purple-600 dark:text-purple-400" size={24} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('nav.projects', lang)}</h2>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{projects.length}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={loadProjects} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} /> {t('projects.create', lang)}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 text-sm rounded-lg">{error}</div>}

      {/* Connector status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-3">Platform Connectors</h3>
        <ConnectorStatus connectors={connectors} />
      </div>

      {/* Project grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Box size={40} className="mx-auto mb-3 opacity-30" />
          <p>No projects yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const info = typeInfo(p.type);
            const milestonesDone = (p.milestones || []).filter(m => m.done).length;
            const milestonesTotal = (p.milestones || []).length;
            const progress = milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;

            return (
              <div key={p.id} onClick={() => setSelected(p.id === selected ? null : p.id)}
                className={`bg-white dark:bg-gray-800 rounded-xl border transition-all cursor-pointer hover:shadow-md ${selected === p.id ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{info.emoji}</span>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</h4>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  {p.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>}

                  {p.type === 'game' && (
                    <div className="flex gap-1 flex-wrap">
                      {GAME_ENGINES.find(e => e.key === p.engine) && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{GAME_ENGINES.find(e => e.key === p.engine)?.emoji} {p.engine}</span>
                      )}
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{p.gamePlatform}</span>
                    </div>
                  )}

                  {p.type === 'ar_vr' && (p.arHeadsets || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.arHeadsets.map(h => (
                        <span key={h} className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                          {AR_HEADSETS.find(hs => hs.key === h)?.label || h}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.type === '3d' && p.renderEngine && (
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                      {RENDER_ENGINES.find(r => r.key === p.renderEngine)?.label || p.renderEngine}
                    </span>
                  )}

                  {milestonesTotal > 0 && <ProgressBar value={progress} label={`${milestonesDone}/${milestonesTotal} milestones`} />}
                </div>

                {selected === p.id && p.achievements?.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('projects.achievements', lang)}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.achievements.map(a => (
                        <span key={a.id} title={a.description} className="text-sm" aria-label={a.name}>{a.icon}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selected === p.id && p.builds?.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent Builds</p>
                    <div className="space-y-1">
                      {p.builds.slice(-3).reverse().map(b => (
                        <div key={b.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'success' ? 'bg-green-500' : b.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                          <span>{b.version}</span>
                          <span>·</span>
                          <span>{b.platform}</span>
                          <span className="ml-auto">{new Date(b.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateProjectForm onCreated={handleCreated} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
