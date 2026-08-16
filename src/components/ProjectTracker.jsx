/**
 * nexus-ai-pro/src/components/ProjectTracker.jsx
 * Real-time project tracking: coding, game development, AR/VR/3D
 * Includes game achievement and progress tracking
 * Date: 2026-08-16
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Code, Gamepad2, Layers, Cpu, Plus, RefreshCw, ChevronDown,
  ChevronRight, CheckCircle2, Circle, Clock, AlertCircle,
  GitBranch, Bug, Wrench, Star, Trophy, Zap, Play,
  BarChart3, Activity, Users, Calendar, Tag, Globe,
  ArrowLeft
} from 'lucide-react';

const TYPE_ICONS = {
  CODING:     Code,
  GAME_DEV:   Gamepad2,
  AR_VR:      Layers,
  THREE_D:    Cpu,
  MOBILE_APP: Cpu,
  WEB_APP:    Globe,
  AI_ML:      Zap,
  BLOCKCHAIN: GitBranch,
};

const STATUS_COLORS = {
  active:    'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  paused:    'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
  completed: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  archived:  'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800',
};

const BUILD_STATUS = {
  success:   { color: 'text-green-600', label: '✅ Passing' },
  failed:    { color: 'text-red-600',   label: '❌ Failed' },
  building:  { color: 'text-blue-600',  label: '🔄 Building' },
  pending:   { color: 'text-yellow-600',label: '⏳ Pending' },
  cancelled: { color: 'text-gray-500',  label: '⏹ Cancelled' },
};

const GAME_PLATFORMS = {
  unreal:   { name: 'Unreal Engine', icon: '🔵' },
  unity:    { name: 'Unity',         icon: '⚫' },
  epic:     { name: 'Epic Store',    icon: '🏪' },
  steam:    { name: 'Steam',         icon: '💨' },
  psn:      { name: 'PlayStation',   icon: '🎮' },
  xbox:     { name: 'Xbox',          icon: '🟢' },
  ubisoft:  { name: 'Ubisoft',       icon: '🔷' },
  nintendo: { name: 'Nintendo',      icon: '🔴' },
};

function NewProjectModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'CODING', status: 'active', description: '', gamePlatform: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const types = [
    { id: 'CODING', label: 'Coding', icon: '💻' },
    { id: 'GAME_DEV', label: 'Game Dev', icon: '🎮' },
    { id: 'AR_VR', label: 'AR/VR', icon: '🥽' },
    { id: 'THREE_D', label: '3D/Animation', icon: '🧊' },
    { id: 'MOBILE_APP', label: 'Mobile App', icon: '📱' },
    { id: 'WEB_APP', label: 'Web App', icon: '🌐' },
    { id: 'AI_ML', label: 'AI/ML', icon: '🤖' },
    { id: 'BLOCKCHAIN', label: 'Blockchain', icon: '⛓️' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">New Project</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="My awesome project"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Type</label>
            <div className="grid grid-cols-4 gap-2">
              {types.map(t => (
                <button
                  key={t.id}
                  onClick={() => set('type', t.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${form.type === t.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
                >
                  <span className="text-lg">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {(form.type === 'GAME_DEV' || form.type === 'AR_VR') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game Platform</label>
              <select
                value={form.gamePlatform}
                onChange={e => set('gamePlatform', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select platform…</option>
                {Object.entries(GAME_PLATFORMS).map(([id, p]) => (
                  <option key={id} value={id}>{p.icon} {p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="What is this project about?"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (form.name.trim()) onSave(form); }}
            disabled={!form.name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const TypeIcon = TYPE_ICONS[project.type] || Code;
  const bs = BUILD_STATUS[project.metrics?.buildStatus] || BUILD_STATUS.pending;
  const gp = project.gamePlatform ? GAME_PLATFORMS[project.gamePlatform] : null;

  return (
    <div onClick={onClick} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TypeIcon size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{project.name}</p>
            {gp && <p className="text-xs text-gray-400 dark:text-gray-500">{gp.icon} {gp.name}</p>}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
          {project.status}
        </span>
      </div>
      {project.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{project.description}</p>
      )}
      <div className="grid grid-cols-3 gap-2 text-xs border-t border-gray-50 dark:border-gray-700 pt-3">
        <div>
          <p className="text-gray-400 dark:text-gray-500">Build</p>
          <p className={`font-medium ${bs.color}`}>{bs.label}</p>
        </div>
        <div>
          <p className="text-gray-400 dark:text-gray-500">Coverage</p>
          <p className="font-medium text-gray-700 dark:text-gray-300">{project.metrics?.testCoverage || 0}%</p>
        </div>
        <div>
          <p className="text-gray-400 dark:text-gray-500">Commits</p>
          <p className="font-medium text-gray-700 dark:text-gray-300">{project.metrics?.commits || 0}</p>
        </div>
      </div>
    </div>
  );
}

function AchievementCard({ achievement }) {
  const unlocked = !!achievement.unlockedAt;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${unlocked ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-60'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${unlocked ? 'bg-yellow-200 dark:bg-yellow-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
        {unlocked ? '🏆' : '🔒'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{achievement.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{achievement.description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{achievement.points} pts</p>
        {unlocked && <p className="text-xs text-gray-400">{new Date(achievement.unlockedAt).toLocaleDateString()}</p>}
      </div>
    </div>
  );
}

export default function ProjectTracker({ token }) {
  const [projects, setProjects] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    try {
      const params = typeFilter !== 'all' ? `?type=${typeFilter}` : '';
      const resp = await fetch(`/api/projects${params}`, { headers });
      if (!resp.ok) throw new Error('Failed to load projects');
      const data = await resp.json();
      setProjects(data.projects || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, typeFilter]);

  const fetchAchievements = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch('/api/projects/achievements/me', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setAchievements(data.achievements || []);
      }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    fetchProjects();
    fetchAchievements();
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, [fetchProjects, fetchAchievements]);

  const createProject = async (form) => {
    const resp = await fetch('/api/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify(form),
    });
    if (resp.ok) {
      setShowNew(false);
      fetchProjects();
    }
  };

  const deleteProject = async (id) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchProjects();
  };

  const totalPoints = achievements.filter(a => a.unlockedAt).reduce((s, a) => s + a.points, 0);
  const types = ['all', 'CODING', 'GAME_DEV', 'AR_VR', 'THREE_D', 'MOBILE_APP', 'WEB_APP', 'AI_ML', 'BLOCKCHAIN'];

  if (selected) {
    const p = selected;
    const TypeIcon = TYPE_ICONS[p.type] || Code;
    const bs = BUILD_STATUS[p.metrics?.buildStatus] || BUILD_STATUS.pending;
    return (
      <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to projects
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><TypeIcon size={22} className="text-blue-600 dark:text-blue-400" /></div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{p.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{p.typeInfo?.label || p.type}</p>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[p.status]}`}>{p.status}</span>
          </div>
          {p.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{p.description}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Build', value: bs.label, color: bs.color },
              { label: 'Coverage', value: `${p.metrics?.testCoverage || 0}%` },
              { label: 'Commits', value: p.metrics?.commits || 0 },
              { label: 'Open Issues', value: p.metrics?.openIssues || 0 },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className={`font-bold text-lg ${color || 'text-gray-900 dark:text-white'}`}>{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>
          {p.gamePlatformInfo && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-3">
              <span className="text-lg">{GAME_PLATFORMS[p.gamePlatform]?.icon}</span>
              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">{p.gamePlatformInfo.name}</span>
            </div>
          )}
          {/* Tasks */}
          {p.tasks?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Tasks ({p.tasks.length})</h3>
              <div className="space-y-1.5">
                {p.tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Circle size={14} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{t.title}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${t.priority === 'critical' ? 'bg-red-100 text-red-700' : t.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{t.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => deleteProject(p.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">Archive Project</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-purple-500" size={22} /> Project Tracker
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Coding · Game Dev · AR/VR · 3D · AI/ML</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchProjects(); fetchAchievements(); }} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-4">
        {[
          { id: 'projects', label: 'Projects', count: projects.length },
          { id: 'achievements', label: '🏆 Achievements', count: achievements.filter(a => a.unlockedAt).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab.label} <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <>
          {/* Type filter */}
          <div className="flex gap-2 flex-wrap">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${typeFilter === t ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {t === 'all' ? 'All' : t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading && projects.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Code size={40} />
              <p className="font-medium">No projects yet</p>
              <button onClick={() => setShowNew(true)} className="text-sm text-purple-600 hover:text-purple-700">Create your first project</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 flex items-center gap-4">
            <Trophy size={32} className="text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{totalPoints} pts</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500">{achievements.filter(a => a.unlockedAt).length} of {achievements.length} unlocked</p>
            </div>
          </div>
          {achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onSave={createProject} />}
    </div>
  );
}
